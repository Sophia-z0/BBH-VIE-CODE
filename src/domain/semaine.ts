/**
 * Semaine de jeu BBH VIE : du dimanche 18h (Europe/Paris) au dimanche 18h suivant.
 * Les résultats d'une semaine sont révélés à sa fin ; avant, chacun·e ne voit que ses propres logs.
 *
 * Calculs faits en heure murale de Paris pour rester justes lors des changements d'heure.
 */

export const FUSEAU = 'Europe/Paris'
const HEURE_REVEAL = 18

export interface Semaine {
  /** Instant de début (inclus) : dimanche 18h, heure de Paris. */
  debut: Date
  /** Instant de fin (exclu) et du reveal : dimanche suivant 18h, heure de Paris. */
  fin: Date
}

interface HeureMurale {
  annee: number
  mois: number // 1-12
  jour: number
  heure: number
  minute: number
  jourSemaine: number // 0 = dimanche
}

const formateur = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSEAU,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  weekday: 'short',
  hourCycle: 'h23',
})

const JOURS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Date et heure telles qu'affichées sur une horloge à Paris. */
export function heureMuraleParis(instant: Date): HeureMurale {
  const parts = Object.fromEntries(formateur.formatToParts(instant).map((p) => [p.type, p.value]))
  return {
    annee: Number(parts.year),
    mois: Number(parts.month),
    jour: Number(parts.day),
    heure: Number(parts.hour),
    minute: Number(parts.minute),
    jourSemaine: JOURS.indexOf(parts.weekday),
  }
}

/** Convertit une heure murale de Paris en instant UTC. */
function parisVersInstant(annee: number, mois: number, jour: number, heure: number): Date {
  const commeSiUtc = Date.UTC(annee, mois - 1, jour, heure)
  // Décalage de Paris à cet instant (1h ou 2h), recalculé une fois pour les bords de changement d'heure.
  let instant = commeSiUtc - decalageParis(new Date(commeSiUtc))
  instant = commeSiUtc - decalageParis(new Date(instant))
  return new Date(instant)
}

function decalageParis(instant: Date): number {
  const m = heureMuraleParis(instant)
  return Date.UTC(m.annee, m.mois - 1, m.jour, m.heure, m.minute) - Math.floor(instant.getTime() / 60000) * 60000
}

/** Semaine de jeu qui contient l'instant donné. */
export function semaineDe(instant: Date = new Date()): Semaine {
  const m = heureMuraleParis(instant)
  // Nombre de jours à remonter jusqu'au dimanche de début.
  let recul = m.jourSemaine
  if (m.jourSemaine === 0 && m.heure < HEURE_REVEAL) recul = 7

  const dimanche = new Date(Date.UTC(m.annee, m.mois - 1, m.jour - recul))
  const debut = parisVersInstant(dimanche.getUTCFullYear(), dimanche.getUTCMonth() + 1, dimanche.getUTCDate(), HEURE_REVEAL)
  const fin = parisVersInstant(dimanche.getUTCFullYear(), dimanche.getUTCMonth() + 1, dimanche.getUTCDate() + 7, HEURE_REVEAL)
  return { debut, fin }
}

/** Vrai si les résultats de la semaine contenant cet instant sont déjà révélés. */
export function estRevele(instant: Date, maintenant: Date = new Date()): boolean {
  return semaineDe(instant).fin.getTime() <= maintenant.getTime()
}

/** Un log n'est accepté que dans la semaine en cours (ni passé révélé, ni futur). */
export function estDansSemaineEnCours(instant: Date, maintenant: Date = new Date()): boolean {
  const { debut } = semaineDe(maintenant)
  return instant.getTime() >= debut.getTime() && instant.getTime() <= maintenant.getTime()
}
