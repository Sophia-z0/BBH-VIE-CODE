import { useCallback, useEffect, useState } from 'react'
import type { LogTache, Tache } from '../../domain/types'
import { semaineDe } from '../../domain/semaine'
import { messageErreur } from '../../lib/erreurs'
import { listerTaches, mesLogsDepuis } from '../../services/taches'

/** Catalogue de tâches du foyer + mes logs de la semaine de jeu en cours. */
export function useTachesSemaine(idUtilisateur: string) {
  const [taches, setTaches] = useState<Tache[]>([])
  const [mesLogs, setMesLogs] = useState<LogTache[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    try {
      const [catalogue, logs] = await Promise.all([listerTaches(), mesLogsDepuis(idUtilisateur, semaineDe().debut)])
      setTaches(catalogue)
      setMesLogs(logs)
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

  return { taches, mesLogs, setMesLogs, chargement, erreur, recharger }
}
