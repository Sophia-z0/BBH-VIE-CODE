import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Bouton } from '../../components/Bouton'
import type { Categorie, DepenseRecurrente } from '../../domain/types'
import { formaterEuros, lireMontant } from '../../lib/argent'
import { messageErreur } from '../../lib/erreurs'
import {
  creerRecurrente,
  listerCategories,
  listerRecurrentes,
  modifierRecurrente,
  supprimerRecurrente,
} from '../../services/depenses'
import { useFoyerPret } from '../foyer/FoyerContext'

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** Abonnements et charges : créés automatiquement à chaque échéance, sans ressaisie. */
export function EcranRecurrentes() {
  const { moi, membres } = useFoyerPret()
  const [recurrentes, setRecurrentes] = useState<DepenseRecurrente[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([listerRecurrentes(), listerCategories()])
      setRecurrentes(r)
      setCategories(c)
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }, [])

  useEffect(() => {
    void recharger()
  }, [recharger])

  async function agir(action: () => Promise<void>) {
    setErreur(null)
    try {
      await action()
      await recharger()
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  const categorie = (id: string) => categories.find((c) => c.id === id)
  const payeur = (id: string) => membres.find((p) => p.id === id)

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔁 récurrentes</h1>
        <Link to="/depenses" className="text-sm text-encre/60 underline">
          ← retour
        </Link>
      </div>
      <p className="text-sm text-encre/60">
        Chaque échéance crée la dépense toute seule, au nom de la personne qui paie. Chacun·e gère les siennes.
      </p>

      {categories.length > 0 && <NouvelleRecurrente categories={categories.filter((c) => c.active)} onAjout={(r) => agir(() => creerRecurrente(r))} />}

      {erreur && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreur}</p>}

      <ul className="flex flex-col gap-3">
        {recurrentes.map((r) => {
          const p = payeur(r.user_id)
          const mienne = r.user_id === moi.id
          return (
            <li key={r.id} className={`flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ${r.active ? '' : 'opacity-50'}`}>
              <span className="text-2xl">{categorie(r.category_id)?.emoji}</span>
              <span className="flex-1 text-sm">
                <span className="font-semibold">{categorie(r.category_id)?.name}</span>
                {r.tag && <span className="text-encre/60"> · {r.tag}</span>}
                <br />
                <span className="text-encre/60">
                  {formaterEuros(r.amount_cents)} le {r.day_of_month}
                  {r.frequency === 'annuel' && r.month_of_year ? ` ${MOIS[r.month_of_year - 1]}` : ' du mois'} ·{' '}
                  <span style={{ color: p?.color }}>●</span> {p?.display_name}
                </span>
              </span>
              {mienne && (
                <span className="flex flex-col items-end gap-1 text-xs">
                  <button type="button" className="font-semibold text-orange" onClick={() => agir(() => modifierRecurrente(r.id, { active: !r.active }))}>
                    {r.active ? 'pause' : 'reprendre'}
                  </button>
                  <button type="button" className="text-encre/50 underline" onClick={() => agir(() => supprimerRecurrente(r.id))}>
                    supprimer
                  </button>
                </span>
              )}
            </li>
          )
        })}
        {recurrentes.length === 0 && <li className="text-center text-sm text-encre/50">Aucune dépense récurrente pour l'instant.</li>}
      </ul>
    </div>
  )
}

type NouvelleRecurrenteChamps = Pick<DepenseRecurrente, 'category_id' | 'amount_cents' | 'tag' | 'frequency' | 'day_of_month' | 'month_of_year'>

function NouvelleRecurrente({ categories, onAjout }: { categories: Categorie[]; onAjout: (r: NouvelleRecurrenteChamps) => Promise<void> }) {
  const recurrentesParDefaut = categories.filter((c) => c.is_recurring)
  const [categorieId, setCategorieId] = useState((recurrentesParDefaut[0] ?? categories[0]).id)
  const [montant, setMontant] = useState('')
  const [tag, setTag] = useState('')
  const [frequence, setFrequence] = useState<'mensuel' | 'annuel'>('mensuel')
  const [jour, setJour] = useState(1)
  const [mois, setMois] = useState(1)
  const [erreur, setErreur] = useState<string | null>(null)

  async function ajouter(evenement: FormEvent) {
    evenement.preventDefault()
    const centimes = lireMontant(montant)
    if (centimes === null) return setErreur('Montant invalide')
    setErreur(null)
    await onAjout({
      category_id: categorieId,
      amount_cents: centimes,
      tag: tag.trim() || null,
      frequency: frequence,
      day_of_month: jour,
      month_of_year: frequence === 'annuel' ? mois : null,
    })
    setMontant('')
    setTag('')
  }

  const champ = 'rounded-lg bg-white px-3 py-2 text-sm'

  return (
    <form onSubmit={ajouter} className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-orange/30 p-3">
      <select aria-label="catégorie" className={champ} value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.emoji} {c.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input aria-label="montant" inputMode="decimal" placeholder="montant €" required className={`${champ} w-28`} value={montant} onChange={(e) => setMontant(e.target.value)} />
        <input aria-label="étiquette" placeholder="étiquette (optionnel)" maxLength={40} className={`${champ} min-w-0 flex-1`} value={tag} onChange={(e) => setTag(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select aria-label="fréquence" className={champ} value={frequence} onChange={(e) => setFrequence(e.target.value as 'mensuel' | 'annuel')}>
          <option value="mensuel">chaque mois</option>
          <option value="annuel">chaque année</option>
        </select>
        le
        <select aria-label="jour" className={champ} value={jour} onChange={(e) => setJour(Number(e.target.value))}>
          {Array.from({ length: 28 }, (_, i) => i + 1).map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
        {frequence === 'annuel' && (
          <select aria-label="mois" className={champ} value={mois} onChange={(e) => setMois(Number(e.target.value))}>
            {MOIS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>
      {erreur && <p className="text-sm text-red-800">{erreur}</p>}
      <Bouton type="submit" className="py-2 text-base">
        ajouter
      </Bouton>
    </form>
  )
}
