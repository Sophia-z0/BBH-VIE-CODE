import { aujourdhui } from '../domain/calendrier'
import { semaineDe } from '../domain/semaine'
import { versChampDateHeure } from '../lib/dates'
import { classePuce } from './Puce'

/** « maintenant » par défaut ; sinon une date-heure dans la semaine de jeu en cours. */
export function ChoixQuand({ quand, setQuand }: { quand: string | null; setQuand: (v: string | null) => void }) {
  if (quand === null) {
    return (
      <button type="button" className={classePuce(false)} onClick={() => setQuand(versChampDateHeure(new Date()))}>
        🕐 maintenant
      </button>
    )
  }
  return (
    <span className="flex items-center gap-1">
      <input
        type="datetime-local"
        className={`${classePuce(true)} [color-scheme:dark]`}
        min={versChampDateHeure(semaineDe().debut)}
        max={versChampDateHeure(new Date())}
        value={quand}
        onChange={(e) => setQuand(e.target.value)}
      />
      <button type="button" aria-label="revenir à maintenant" className="px-1 text-encre/50" onClick={() => setQuand(null)}>
        ✕
      </button>
    </span>
  )
}

/**
 * « quand » pré-rempli pour un jour choisi dans le calendrier (AAAA-MM-JJ) : null (maintenant)
 * pour aujourd'hui ou sans jour ; sinon midi ce jour-là, ramené dans la semaine de jeu en cours.
 */
export function quandDuJour(jour: string | null): string | null {
  if (!jour || !/^\d{4}-\d{2}-\d{2}$/.test(jour) || jour === aujourdhui()) return null
  const debut = semaineDe().debut
  const midi = new Date(`${jour}T12:00`)
  if (Number.isNaN(midi.getTime()) || midi > new Date()) return null
  return versChampDateHeure(midi < debut ? new Date(debut.getTime() + 60_000) : midi)
}

/** Instant choisi : la date saisie, ou maintenant. */
export function instantChoisi(quand: string | null): Date {
  return quand ? new Date(quand) : new Date()
}
