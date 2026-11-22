import { useEffect, useState } from 'react'
import { cleMois, messageRevenu, moisDeDate, moisDecale, nomDuMois, type CleMois } from '../../domain/revenus'
import { PREMIER_MOIS } from '../../domain/calendrier'
import { montantPret, type NaturePret, type Pret } from '../../domain/prets'
import type { RevenuMensuel } from '../../domain/types'
import { formaterEuros, lireMontant } from '../../lib/argent'
import { messageErreur } from '../../lib/erreurs'
import { enregistrerPret, listerPrets } from '../../services/prets'
import { useFoyerPret } from '../foyer/FoyerContext'
import { enregistrerCredit, enregistrerRevenu, mesRevenus } from '../../services/revenus'

/** Mes revenus saisis ; null tant que ce n'est pas chargé ou si la table n'existe pas encore (migration 0011). */
function useMesRevenus(idMoi: string) {
  const [revenus, setRevenus] = useState<RevenuMensuel[] | null>(null)
  useEffect(() => {
    let annule = false
    mesRevenus(idMoi)
      .then((r) => !annule && setRevenus(r))
      .catch(() => !annule && setRevenus(null))
    return () => {
      annule = true
    }
  }, [idMoi])
  return [revenus, setRevenus] as const
}

const moisPrecedent = (): CleMois => moisDecale(moisDeDate(new Date()), -1)

/**
 * Carte en haut des tâches et des dépenses tant que le revenu du mois dernier n'est pas saisi :
 * la part juste des dépenses et son report trimestriel en dépendent.
 */
export function CarteRevenuManquant({ idMoi }: { idMoi: string }) {
  const [revenus, setRevenus] = useMesRevenus(idMoi)
  const [saisie, setSaisie] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const mois = moisPrecedent()

  if (!revenus || revenus.some((r) => r.month.startsWith(mois))) return null

  async function valider(e: React.FormEvent) {
    e.preventDefault()
    const centimes = saisie.trim() === '0' ? 0 : lireMontant(saisie)
    if (centimes === null) return setErreur('Indique un montant, même 0.')
    try {
      const revenu = await enregistrerRevenu(idMoi, mois, centimes)
      setRevenus([...(revenus ?? []), revenu])
    } catch (err) {
      setErreur(messageErreur(err))
    }
  }

  return (
    <form onSubmit={valider} className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold">💶 ton revenu net de {nomDuMois(mois)} ?</p>
      <p className="text-xs text-encre/60">Il sert à calculer la part juste des dépenses, au plus près de vos vrais revenus.</p>
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          aria-label={`revenu net de ${nomDuMois(mois)}`}
          placeholder="0,00 €"
          className="min-w-0 flex-1 rounded-xl bg-creme px-3 py-2 text-lg font-bold outline-none"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
        />
        <button type="submit" className="rounded-xl bg-orange px-4 font-semibold text-white active:scale-95">
          ok
        </button>
      </div>
      {erreur && <p className="text-xs text-red-700">{erreur}</p>}
    </form>
  )
}

/**
 * Première année proposée dans les réglages : l'année civile qui précède le lancement de l'app (2025),
 * pour avoir des 12 mois glissants complets dès le départ et une année N-1 de comparaison.
 */
const PREMIERE_ANNEE = PREMIER_MOIS.annee - 1

/** Moyenne mensuelle des mois renseignés d'une année, ou null si aucun. */
function moyenneAnnuelle(revenus: RevenuMensuel[], annee: number): number | null {
  const siens = revenus.filter((r) => r.month.startsWith(`${annee}-`))
  return siens.length === 0 ? null : Math.round(siens.reduce((t, r) => t + r.amount_cents, 0) / siens.length)
}

/**
 * Réglages : mes revenus, année par année (rien n'est jamais effacé ; un nouveau mois s'ouvre au fil du temps),
 * avec la moyenne de l'année et un bravo quand elle grimpe.
 */
export function HistoriqueRevenus({ idMoi }: { idMoi: string }) {
  const [revenus, setRevenus] = useMesRevenus(idMoi)
  const actuel = moisDeDate(new Date())
  const anneeActuelle = Number(actuel.slice(0, 4))
  const [annee, setAnnee] = useState(anneeActuelle)
  const [message, setMessage] = useState<string | null>(null)
  const [prets, setPrets] = useState<Pret[]>([])
  const { membres } = useFoyerPret()
  const autre = membres.find((m) => m.id !== idMoi)
  useEffect(() => {
    let annule = false
    listerPrets().then((liste) => !annule && setPrets(liste))
    return () => {
      annule = true
    }
  }, [])
  if (!revenus) return null

  const annees = Array.from({ length: anneeActuelle - PREMIERE_ANNEE + 1 }, (_, i) => anneeActuelle - i)
  // Mois de l'année choisie jusqu'au mois en cours, le plus récent en haut.
  const liste = Array.from({ length: 12 }, (_, i) => cleMois(annee, 12 - i)).filter((m) => m <= actuel)
  const montantDe = (mois: CleMois) => revenus.find((r) => r.month.startsWith(mois))?.amount_cents
  const moyenne = moyenneAnnuelle(revenus, annee)
  const moyennePrecedente = moyenneAnnuelle(revenus, annee - 1)

  async function enregistrer(mois: CleMois, texte: string) {
    if (texte.trim() === '') return
    const centimes = texte.trim() === '0' ? 0 : lireMontant(texte)
    if (centimes === null) return setMessage('Montant illisible.')
    if (centimes === montantDe(mois)) return
    try {
      const revenu = await enregistrerRevenu(idMoi, mois, centimes)
      const nouveaux = [...(revenus ?? []).filter((r) => !r.month.startsWith(mois)), revenu]
      setRevenus(nouveaux)
      setMessage(messageRevenu(idMoi, revenus ?? [], nouveaux, mois) ?? `${nomDuMois(mois)} : ${formaterEuros(centimes)} enregistré.`)
    } catch (e) {
      setMessage(messageErreur(e))
    }
  }

  const creditDe = (mois: CleMois) => revenus.find((r) => r.month.startsWith(mois))?.loan_cents ?? null

  async function enregistrerLeCredit(mois: CleMois, texte: string) {
    const centimes = texte.trim() === '' ? null : texte.trim() === '0' ? 0 : lireMontant(texte)
    if (texte.trim() !== '' && centimes === null) return setMessage('Montant illisible.')
    if (centimes === creditDe(mois)) return
    try {
      const revenu = await enregistrerCredit(idMoi, mois, centimes)
      setRevenus([...(revenus ?? []).filter((r) => !r.month.startsWith(mois)), revenu])
      setMessage(`${nomDuMois(mois)} : crédimmo ${centimes === null ? 'effacé' : `de ${formaterEuros(centimes)} enregistré`}.`)
    } catch (e) {
      setMessage(messageErreur(e))
    }
  }
  /** Ce que je prête ou rembourse à l'autre ce mois-là (on inscrit l'argent qui sort de sa poche). */
  async function enregistrerLePret(mois: CleMois, nature: NaturePret, texte: string) {
    const centimes = texte.trim() === '' ? null : texte.trim() === '0' ? 0 : lireMontant(texte)
    if (texte.trim() !== '' && centimes === null) return setMessage('Montant illisible.')
    if ((centimes || undefined) === montantPret(idMoi, prets, mois, nature)) return
    try {
      const pret = await enregistrerPret(idMoi, mois, nature, centimes)
      const autres = prets.filter((p) => !(p.from_user === idMoi && p.kind === nature && p.month.startsWith(mois)))
      setPrets(pret ? [...autres, pret] : autres)
      const quoi = nature === 'pret' ? 'prêt 2bebz' : 'remboursement'
      setMessage(`${nomDuMois(mois)} : ${quoi} ${pret ? `de ${formaterEuros(pret.amount_cents)} enregistré` : 'effacé'}.`)
    } catch (e) {
      setMessage(messageErreur(e))
    }
  }
  const enEuros = (centimes: number | null | undefined) => (centimes === null || centimes === undefined ? '' : String(centimes / 100).replace('.', ','))

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">mes revenus</h2>
        <select
          aria-label="année"
          className="rounded-xl bg-white px-3 py-1 font-semibold shadow-sm"
          value={annee}
          onChange={(e) => {
            setAnnee(Number(e.target.value))
            setMessage(null)
          }}
        >
          {annees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-encre/60">
        Revenu net de chaque mois. La part juste des dépenses suit la moyenne de tes 6 derniers mois ; chaque trimestre, l'écart avec
        tes revenus réels est reporté sur le trimestre suivant. Le crédimmo du mois est déduit pour calculer la part du revenu dépensée
        pour le foyer et ton minimum perso.
      </p>
      <p className="text-xs text-encre/60">
        🤝 Prêt 2bebz (cases roses) : on inscrit seulement l'argent qui sort de sa poche, ce que tu prêtes à l'autre ou ce que tu lui rembourses.
        L'autre n'inscrit rien pour le même mouvement. Le remboursement est déduit de ton revenu, comme le crédimmo ; le prêt, non.
        {autre && ` La ligne « 📥 de ${autre.display_name} » est en lecture seule : c'est ${autre.display_name} qui inscrit ce qu'${autre.gender ?? 'iel'} te prête ou te rembourse.`}{' '}
        Le solde est dans les stats.
      </p>
      <div className="flex items-baseline justify-between rounded-2xl bg-white px-4 py-3">
        <span className="text-sm">moyenne {annee}</span>
        <span className="text-right">
          <span className="text-lg font-bold">{moyenne === null ? '—' : `${formaterEuros(moyenne)} / mois`}</span>
          {moyenne !== null && moyennePrecedente !== null && moyenne > moyennePrecedente && (
            <span className="block text-xs text-encre/60">🚀 plus que ta moyenne {annee - 1} ({formaterEuros(moyennePrecedente)})</span>
          )}
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-orange/10 rounded-2xl bg-white">
        <li className="flex items-center gap-2 px-4 pt-2 text-xs text-encre/50">
          <span className="flex-1" />
          <span className="w-24 text-right">revenu net</span>
          <span className="w-20 text-right">crédimmo</span>
        </li>
        {liste.map((mois) => (
          <li key={mois} className="flex flex-col gap-1 px-4 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1">{nomDuMois(mois)}</span>
              <input
                key={montantDe(mois) ?? 'vide'}
                inputMode="decimal"
                aria-label={`revenu net de ${nomDuMois(mois)}`}
                placeholder="—"
                defaultValue={enEuros(montantDe(mois))}
                onBlur={(e) => enregistrer(mois, e.target.value)}
                className="w-24 rounded-lg bg-creme px-2 py-1 text-right font-semibold outline-none"
              />
              {/* Le crédit complète un revenu déjà saisi. */}
              <input
                key={`credit-${creditDe(mois) ?? 'vide'}`}
                inputMode="decimal"
                aria-label={`crédimmo de ${nomDuMois(mois)}`}
                placeholder="—"
                disabled={montantDe(mois) === undefined}
                defaultValue={enEuros(creditDe(mois))}
                onBlur={(e) => enregistrerLeCredit(mois, e.target.value)}
                className="w-20 rounded-lg bg-creme px-2 py-1 text-right outline-none disabled:opacity-30"
              />
            </div>
            {/* Prêt 2bebz : indépendant du revenu, saisissable même sans revenu ce mois-là ; cases roses, comme les dépenses. */}
            <div className="mt-1 flex items-center gap-2 border-t border-dashed border-rose/30 pt-2 text-xs text-encre/60">
              <span className="min-w-0 flex-1">📤 à {autre?.display_name ?? "l'autre"}</span>
              {(['pret', 'remboursement'] as const).map((nature) => (
                <input
                  key={`${nature}-${montantPret(idMoi, prets, mois, nature) ?? 'vide'}`}
                  inputMode="decimal"
                  aria-label={`${nature === 'pret' ? 'prêt 2bebz' : 'remboursement'} de ${nomDuMois(mois)}`}
                  placeholder={nature === 'pret' ? 'prêt 2bebz' : 'remboursé'}
                  defaultValue={enEuros(montantPret(idMoi, prets, mois, nature))}
                  onBlur={(e) => enregistrerLePret(mois, nature, e.target.value)}
                  className={`${nature === 'pret' ? 'w-24' : 'w-20'} rounded-lg bg-rose/10 px-2 py-1 text-right text-encre outline-none placeholder:text-encre/30`}
                />
              ))}
            </div>
            {/* Ce que l'autre a inscrit ce mois-là (argent sorti de sa poche) : lecture seule. */}
            {autre && (['pret', 'remboursement'] as const).some((n) => montantPret(autre.id, prets, mois, n) !== undefined) && (
              <div className="flex items-center gap-2 text-xs text-encre/60">
                <span className="min-w-0 flex-1">📥 de {autre.display_name}</span>
                {(['pret', 'remboursement'] as const).map((nature) => {
                  const montant = montantPret(autre.id, prets, mois, nature)
                  return (
                    <span
                      key={nature}
                      aria-label={`${nature === 'pret' ? 'prêt' : 'remboursement'} de ${autre.display_name} en ${nomDuMois(mois)}`}
                      className={`${nature === 'pret' ? 'w-24' : 'w-20'} rounded-lg bg-encre/5 px-2 py-1 text-right ${montant === undefined ? 'text-encre/30' : 'font-bold text-orange'}`}
                    >
                      {montant === undefined ? '—' : formaterEuros(montant)}
                    </span>
                  )
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
      {message && <p className="text-sm font-semibold text-encre/70">{message}</p>}
    </section>
  )
}
