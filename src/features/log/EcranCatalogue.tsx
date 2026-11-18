import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Bouton } from '../../components/Bouton'
import type { Tache } from '../../domain/types'
import { messageErreur } from '../../lib/erreurs'
import { creerTache, modifierTache } from '../../services/taches'
import { useFoyerPret } from '../foyer/FoyerContext'
import { useTachesSemaine } from './useTachesSemaine'

/** Ajouter, renommer, regrouper, changer les étoiles ou désactiver les tâches du foyer. */
export function EcranCatalogue() {
  const { moi } = useFoyerPret()
  const { taches, chargement, erreur, recharger } = useTachesSemaine(moi.id)
  const [message, setMessage] = useState<string | null>(null)

  const groupes = useMemo(() => [...new Set(taches.map((t) => t.group_name))].sort(), [taches])
  const actives = taches.filter((t) => t.active)
  const inactives = taches.filter((t) => !t.active)

  async function enregistrer(id: string, champs: Partial<Tache>) {
    try {
      await modifierTache(id, champs)
      await recharger()
    } catch (e) {
      setMessage(messageErreur(e))
    }
  }

  if (chargement) return <p className="mt-20 animate-pulse text-center text-4xl">⭐</p>
  if (erreur) return <p className="mt-10 rounded-xl bg-red-100 p-4 text-red-800">{erreur}</p>

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">nos tâches</h1>
        <Link to="/" className="text-sm text-encre/60 underline">
          ← retour
        </Link>
      </div>

      <NouvelleTache householdId={moi.household_id} groupes={groupes} onAjout={recharger} />

      {message && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{message}</p>}

      <datalist id="groupes-taches">
        {groupes.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      <ul className="flex flex-col gap-3">
        {actives.map((tache) => (
          <LigneTache key={tache.id} tache={tache} onChange={(champs) => enregistrer(tache.id, champs)} />
        ))}
      </ul>

      {inactives.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-encre/50">tâches retirées</h2>
          <ul className="flex flex-col gap-2">
            {inactives.map((tache) => (
              <li key={tache.id} className="flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 text-encre/60">
                <span>{tache.emoji}</span>
                <span className="flex-1 text-sm">{tache.name}</span>
                <button type="button" className="text-sm font-semibold text-orange" onClick={() => enregistrer(tache.id, { active: true })}>
                  remettre
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** Chaque champ est enregistré dès qu'on le quitte. */
function LigneTache({ tache, onChange }: { tache: Tache; onChange: (champs: Partial<Tache>) => void }) {
  const [nom, setNom] = useState(tache.name)
  const [groupe, setGroupe] = useState(tache.group_name)
  const [emoji, setEmoji] = useState(tache.emoji)

  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <input
          aria-label="émoji"
          className="w-12 rounded-lg bg-creme p-2 text-center text-2xl"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          onBlur={() => emoji.trim() && emoji !== tache.emoji && onChange({ emoji: emoji.trim() })}
        />
        <input
          aria-label="nom de la tâche"
          className="min-w-0 flex-1 rounded-lg bg-creme px-3 py-2 font-semibold"
          value={nom}
          maxLength={80}
          onChange={(e) => setNom(e.target.value)}
          onBlur={() => nom.trim() && nom !== tache.name && onChange({ name: nom.trim() })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ChoixEtoiles valeur={tache.stars} onChange={(stars) => onChange({ stars })} />
        <input
          aria-label="groupe"
          list="groupes-taches"
          className="w-32 rounded-lg bg-creme px-3 py-1 text-sm"
          value={groupe}
          onChange={(e) => setGroupe(e.target.value)}
          onBlur={() => groupe.trim() && groupe !== tache.group_name && onChange({ group_name: groupe.trim() })}
        />
        <button type="button" className="ml-auto text-sm text-encre/50 underline" onClick={() => onChange({ active: false })}>
          retirer
        </button>
      </div>
    </li>
  )
}

function ChoixEtoiles({ valeur, onChange }: { valeur: number; onChange: (n: number) => void }) {
  return (
    <span className="flex" role="radiogroup" aria-label="étoiles">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valeur === n}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          className={`text-xl transition active:scale-90 ${n <= valeur ? '' : 'opacity-25 grayscale'}`}
          onClick={() => onChange(n)}
        >
          ⭐
        </button>
      ))}
    </span>
  )
}

function NouvelleTache({ householdId, groupes, onAjout }: { householdId: string; groupes: string[]; onAjout: () => Promise<void> }) {
  const [nom, setNom] = useState('')
  const [groupe, setGroupe] = useState(groupes[0] ?? 'ménage')
  const [emoji, setEmoji] = useState('✨')
  const [etoiles, setEtoiles] = useState(2)
  const [erreur, setErreur] = useState<string | null>(null)

  async function ajouter(evenement: FormEvent) {
    evenement.preventDefault()
    try {
      await creerTache(householdId, { name: nom.trim(), group_name: groupe.trim() || 'ménage', emoji: emoji.trim() || '✨', stars: etoiles })
      setNom('')
      await onAjout()
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  return (
    <form onSubmit={ajouter} className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-orange/30 p-3">
      <div className="flex items-center gap-2">
        <input aria-label="émoji" className="w-12 rounded-lg bg-white p-2 text-center text-2xl" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        <input
          aria-label="nouvelle tâche"
          placeholder="nouvelle tâche"
          required
          maxLength={80}
          className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ChoixEtoiles valeur={etoiles} onChange={setEtoiles} />
        <input aria-label="groupe" list="groupes-taches" className="w-32 rounded-lg bg-white px-3 py-1 text-sm" value={groupe} onChange={(e) => setGroupe(e.target.value)} />
      </div>
      {erreur && <p className="text-sm text-red-800">{erreur}</p>}
      <Bouton type="submit" className="py-2 text-base">
        ajouter
      </Bouton>
    </form>
  )
}
