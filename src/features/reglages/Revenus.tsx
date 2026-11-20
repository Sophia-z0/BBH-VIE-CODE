import { useEffect, useState } from 'react'
import { moisDeDate, moisDecale, nomDuMois, type CleMois } from '../../domain/revenus'
import type { RevenuMensuel } from '../../domain/types'
import { formaterEuros, lireMontant } from '../../lib/argent'
import { messageErreur } from '../../lib/erreurs'
import { enregistrerRevenu, mesRevenus } from '../../services/revenus'

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

/** Réglages : mes revenus des 12 derniers mois, modifiables (enregistrés en quittant le champ). */
export function HistoriqueRevenus({ idMoi }: { idMoi: string }) {
  const [revenus, setRevenus] = useMesRevenus(idMoi)
  const [message, setMessage] = useState<string | null>(null)
  if (!revenus) return null

  const actuel = moisDeDate(new Date())
  const liste = Array.from({ length: 12 }, (_, i) => moisDecale(actuel, -i))
  const montantDe = (mois: CleMois) => revenus.find((r) => r.month.startsWith(mois))?.amount_cents

  async function enregistrer(mois: CleMois, texte: string) {
    if (texte.trim() === '') return
    const centimes = texte.trim() === '0' ? 0 : lireMontant(texte)
    if (centimes === null) return setMessage('Montant illisible.')
    if (centimes === montantDe(mois)) return
    try {
      const revenu = await enregistrerRevenu(idMoi, mois, centimes)
      setRevenus([...(revenus ?? []).filter((r) => !r.month.startsWith(mois)), revenu])
      setMessage(`${nomDuMois(mois)} : ${formaterEuros(centimes)} enregistré.`)
    } catch (e) {
      setMessage(messageErreur(e))
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-bold">mes revenus</h2>
      <p className="text-xs text-encre/60">
        Revenu net de chaque mois. La part juste des dépenses suit la moyenne de tes 6 derniers mois ; chaque trimestre, l'écart avec
        tes revenus réels est reporté sur le trimestre suivant.
      </p>
      <ul className="flex flex-col divide-y divide-orange/10 rounded-2xl bg-white">
        {liste.map((mois) => (
          <li key={mois} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span>{nomDuMois(mois)}</span>
            <input
              key={montantDe(mois) ?? 'vide'}
              inputMode="decimal"
              aria-label={`revenu net de ${nomDuMois(mois)}`}
              placeholder="—"
              defaultValue={montantDe(mois) === undefined ? '' : String((montantDe(mois) ?? 0) / 100).replace('.', ',')}
              onBlur={(e) => enregistrer(mois, e.target.value)}
              className="w-28 rounded-lg bg-creme px-2 py-1 text-right font-semibold outline-none"
            />
          </li>
        ))}
      </ul>
      {message && <p className="text-xs text-encre/60">{message}</p>}
    </section>
  )
}
