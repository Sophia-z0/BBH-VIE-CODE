import { useCallback, useEffect, useState } from 'react'
import type { LogTache, Tache } from '../../domain/types'
import { jourParis } from '../../domain/calendrier'
import { semaineDe } from '../../domain/semaine'
import { messageErreur } from '../../lib/erreurs'
import { listerTaches, mesLogsDepuis } from '../../services/taches'

/** Catalogue de tâches du foyer, mes logs de la semaine de jeu en cours, et mes jours actifs récents (série). */
export function useTachesSemaine(idUtilisateur: string) {
  const [taches, setTaches] = useState<Tache[]>([])
  const [mesLogs, setMesLogs] = useState<LogTache[]>([])
  const [joursActifs, setJoursActifs] = useState<string[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    try {
      const ilYA60Jours = new Date(Date.now() - 60 * 86_400_000)
      const [catalogue, logs, recents] = await Promise.all([
        listerTaches(),
        mesLogsDepuis(idUtilisateur, semaineDe().debut),
        mesLogsDepuis(idUtilisateur, ilYA60Jours),
      ])
      setTaches(catalogue)
      setMesLogs(logs)
      setJoursActifs([...new Set(recents.map((l) => jourParis(l.done_at)))])
      setErreur(null)
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setChargement(false)
    }
  }, [idUtilisateur])

  useEffect(() => {
    void recharger()
  }, [recharger])

  return { taches, mesLogs, setMesLogs, joursActifs, chargement, erreur, recharger }
}
