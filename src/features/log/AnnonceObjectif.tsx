import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Celebration } from '../../components/Celebration'
import { objectifsDe, type Objectif } from '../../domain/badges'
import { DEBUT_APP } from '../../domain/calendrier'
import { semaineDe } from '../../domain/semaine'
import type { LogTache, Tache } from '../../domain/types'
import { logsEntre } from '../../services/taches'

/**
 * Repère l'objectif que je viens d'atteindre en loguant (historique révélé + ma semaine en cours).
 * Les objectifs déjà atteints à l'ouverture de l'écran ne sont pas annoncés.
 */
export function useObjectifAtteint(idMoi: string, mesLogs: LogTache[], taches: Tache[], pret: boolean) {
  const [historique, setHistorique] = useState<LogTache[] | null>(null)
  useEffect(() => {
    let annule = false
    logsEntre(DEBUT_APP, semaineDe().debut)
      .then((logs) => !annule && setHistorique(logs))
      .catch(() => {})
    return () => {
      annule = true
    }
  }, [])

  const atteints = useMemo(() => {
    if (!historique || !pret) return null
    const groupes = new Map(taches.map((t) => [t.id, t.group_name]))
    return objectifsDe(idMoi, [...historique, ...mesLogs], groupes).filter((o) => o.actuel >= o.cible)
  }, [historique, pret, taches, idMoi, mesLogs])

  const precedents = useRef<Set<string> | null>(null)
  const [annonce, setAnnonce] = useState<Objectif | null>(null)
  useEffect(() => {
    if (!atteints) return
    const avant = precedents.current
    const neuf = avant ? atteints.find((o) => !avant.has(o.titre)) : undefined
    if (neuf) setAnnonce(neuf)
    precedents.current = new Set(atteints.map((o) => o.titre))
  }, [atteints])

  // Stable : la carte ne relance ni sa vibration ni son minuteur à chaque rendu de l'écran.
  const fermer = useCallback(() => setAnnonce(null), [])
  return { annonce, fermer }
}

/** Carte « objectif atteint », avec gerbe d'émojis ; se referme seule ou au toucher. */
export function AnnonceObjectif({ objectif, onFermer }: { objectif: Objectif; onFermer: () => void }) {
  useEffect(() => {
    navigator.vibrate?.([20, 60, 20])
    const minuteur = setTimeout(onFermer, 6000)
    return () => clearTimeout(minuteur)
  }, [onFermer])
  return (
    <button type="button" onClick={onFermer} className="fixed inset-0 z-[55] flex items-center justify-center bg-encre/30 p-6">
      <Celebration cle={1} />
      <span className="entree-ceremonie flex max-w-xs flex-col items-center gap-2 rounded-3xl bg-white p-6 text-center shadow-xl">
        <span className="remise-badge text-7xl" style={{ '--delai': '150ms' } as CSSProperties}>
          {objectif.emoji}
        </span>
        <span className="text-xl font-extrabold">objectif atteint !</span>
        <span className="font-semibold">{objectif.titre}</span>
        <span className="text-sm text-encre/60">Remise officielle dimanche, à la cérémonie 🏆</span>
      </span>
    </button>
  )
}
