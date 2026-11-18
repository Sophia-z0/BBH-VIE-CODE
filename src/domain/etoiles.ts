import type { LogTache } from './types'

/** Étoiles gagnées par la personne qui a logué : moitié si la tâche a été faite à deux. */
export function etoilesDuLog(log: Pick<LogTache, 'stars' | 'shared'>): number {
  return log.shared ? log.stars / 2 : log.stars
}

export function totalEtoiles(logs: Pick<LogTache, 'stars' | 'shared'>[]): number {
  return logs.reduce((total, log) => total + etoilesDuLog(log), 0)
}

/** 3 → « 3 », 1,5 → « 1,5 » */
export function formaterEtoiles(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}
