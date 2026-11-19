import { etoilesDuLog } from './etoiles'
import { heureMuraleParis, parisVersInstant, semaineDe, type Semaine } from './semaine'
import type { LogTache } from './types'

/** Jour calendaire au format AAAA-MM-JJ (même format que les nuits d'absence en base). */
export type CleJour = string

const deuxChiffres = (n: number) => String(n).padStart(2, '0')

export function cleJour(annee: number, mois: number, jour: number): CleJour {
  // Date.UTC normalise les débordements (jour 32 → mois suivant).
  const d = new Date(Date.UTC(annee, mois - 1, jour))
  return `${d.getUTCFullYear()}-${deuxChiffres(d.getUTCMonth() + 1)}-${deuxChiffres(d.getUTCDate())}`
}

export function decomposer(cle: CleJour): { annee: number; mois: number; jour: number } {
  const [annee, mois, jour] = cle.split('-').map(Number)
  return { annee, mois, jour }
}

/** Jour (heure de Paris) où un instant a eu lieu. */
export function jourParis(instant: Date | string): CleJour {
  const m = heureMuraleParis(new Date(instant))
  return cleJour(m.annee, m.mois, m.jour)
}

export function aujourdhui(): CleJour {
  return jourParis(new Date())
}

/**
 * Grille du mois en semaines du lundi au dimanche. Chaque ligne correspond à la semaine
 * de jeu qui se termine le dimanche de la ligne, à 18h.
 */
export function grilleDuMois(annee: number, mois: number): CleJour[][] {
  const premier = new Date(Date.UTC(annee, mois - 1, 1))
  const decalageLundi = (premier.getUTCDay() + 6) % 7
  const dernier = new Date(Date.UTC(annee, mois, 0)).getUTCDate()
  const semaines: CleJour[][] = []
  for (let debut = 1 - decalageLundi; debut <= dernier; debut += 7) {
    semaines.push(Array.from({ length: 7 }, (_, i) => cleJour(annee, mois, debut + i)))
  }
  return semaines
}

/** Semaine de jeu d'une ligne de la grille (celle qui finit le dimanche de la ligne). */
export function semaineDeLigne(ligne: CleJour[]): Semaine {
  const { annee, mois, jour } = decomposer(ligne[6])
  return semaineDe(parisVersInstant(annee, mois, jour, 12))
}

/** Les 7 nuits d'une semaine de jeu : du dimanche de début au samedi. */
export function nuitsDeSemaine(semaine: Semaine): CleJour[] {
  const { annee, mois, jour } = decomposer(jourParis(semaine.debut))
  return Array.from({ length: 7 }, (_, i) => cleJour(annee, mois, jour + i))
}

/** Une nuit est modifiable tant que sa semaine de jeu n'est pas révélée. */
export function nuitModifiable(nuit: CleJour, maintenant = new Date()): boolean {
  const { annee, mois, jour } = decomposer(nuit)
  return semaineDe(parisVersInstant(annee, mois, jour, 22)).fin > maintenant
}

/**
 * Tâches faites à deux loguées par les deux personnes : deux logs « à deux » de la même
 * tâche, le même jour (Paris), par deux personnes différentes, sont la même tâche.
 * Appariement un pour un, au plus proche dans le temps ; renvoie l'id du log le plus tardif
 * de chaque paire, qui ne doit pas être compté.
 */
export function logsEnDouble(logs: LogTache[]): Set<string> {
  const groupes = new Map<string, LogTache[]>()
  for (const log of logs) {
    if (!log.shared) continue
    const cle = `${log.task_id}|${jourParis(log.done_at)}`
    groupes.set(cle, [...(groupes.get(cle) ?? []), log])
  }

  const doublons = new Set<string>()
  for (const groupe of groupes.values()) {
    const paires: { a: LogTache; b: LogTache; ecart: number }[] = []
    for (const a of groupe) {
      for (const b of groupe) {
        if (a.user_id < b.user_id) {
          paires.push({ a, b, ecart: Math.abs(Date.parse(a.done_at) - Date.parse(b.done_at)) })
        }
      }
    }
    paires.sort((x, y) => x.ecart - y.ecart)
    const pris = new Set<string>()
    for (const { a, b } of paires) {
      if (pris.has(a.id) || pris.has(b.id)) continue
      pris.add(a.id)
      pris.add(b.id)
      const tardif = Date.parse(a.done_at) > Date.parse(b.done_at) || (a.done_at === b.done_at && a.id > b.id) ? a : b
      doublons.add(tardif.id)
    }
  }
  return doublons
}

/**
 * Étoiles d'une personne sur une liste de logs : les siens, plus la moitié des tâches
 * faites à deux loguées par l'autre. Une tâche à deux loguée par les deux ne compte qu'une fois.
 */
export function etoilesDe(idPersonne: string, logs: LogTache[]): number {
  const doublons = logsEnDouble(logs)
  return logs.reduce((total, log) => {
    if (doublons.has(log.id)) return total
    if (log.user_id === idPersonne) return total + etoilesDuLog(log)
    if (log.shared) return total + log.stars / 2
    return total
  }, 0)
}
