import { useEffect, useState } from 'react'
import { aujourdhui, DEBUT_APP } from '../../domain/calendrier'
import { semaineDe } from '../../domain/semaine'
import type { Pret } from '../../domain/prets'
import type { Cadeau, Categorie, Depense, LogTache, Absence, RevenuMensuel, Tache } from '../../domain/types'
import { messageErreur } from '../../lib/erreurs'
import { cadeauxEntre, depensesEntre, listerCategories } from '../../services/depenses'
import { listerAbsences } from '../../services/presence'
import { listerPrets } from '../../services/prets'
import { listerRevenus } from '../../services/revenus'
import { listerTaches, logsEntre } from '../../services/taches'

export interface DonneesStats {
  /** Fin de la dernière semaine révélée : rien n'est compté après. */
  dernierReveal: Date
  logs: LogTache[]
  depenses: Depense[]
  cadeaux: Cadeau[]
  absences: Absence[]
  taches: Tache[]
  categories: Categorie[]
  revenus: RevenuMensuel[]
  /** Prêts 2bebz du foyer (migration 0015), visibles par les deux. */
  prets: Pret[]
  /** Logs de la semaine en cours (pas encore révélée) : seulement les miens comptent, pour mes objectifs. */
  logsEnCours: LogTache[]
}

/** Tout l'historique révélé du foyer, chargé une fois pour l'écran de stats. */
export function useDonneesStats() {
  const [donnees, setDonnees] = useState<DonneesStats | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    const dernierReveal = semaineDe().debut
    // Rien avant le premier mois de l'app : ces données fausseraient les stats.
    const origine = DEBUT_APP
    Promise.all([
      logsEntre(origine, dernierReveal),
      depensesEntre(origine, dernierReveal),
      cadeauxEntre(origine, dernierReveal),
      listerAbsences('2000-01-01', aujourdhui()),
      listerTaches(),
      listerCategories(),
      // Table créée par la migration 0011 : sans elle, aucun revenu mensuel.
      listerRevenus().catch(() => []),
      logsEntre(dernierReveal, new Date()),
      listerPrets(),
    ])
      .then(([logs, depenses, cadeaux, absences, taches, categories, revenus, logsEnCours, prets]) => {
        if (!annule) setDonnees({ dernierReveal, logs, depenses, cadeaux, absences, taches, categories, revenus, logsEnCours, prets })
      })
      .catch((e) => !annule && setErreur(messageErreur(e)))
    return () => {
      annule = true
    }
  }, [])

  return { donnees, erreur }
}
