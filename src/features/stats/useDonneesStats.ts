import { useEffect, useState } from 'react'
import { aujourdhui } from '../../domain/calendrier'
import { semaineDe } from '../../domain/semaine'
import type { Cadeau, Categorie, Depense, LogTache, Absence, RevenuMensuel, Tache } from '../../domain/types'
import { messageErreur } from '../../lib/erreurs'
import { cadeauxEntre, depensesEntre, listerCategories } from '../../services/depenses'
import { listerAbsences } from '../../services/presence'
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
}

/** Tout l'historique révélé du foyer, chargé une fois pour l'écran de stats. */
export function useDonneesStats() {
  const [donnees, setDonnees] = useState<DonneesStats | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    const dernierReveal = semaineDe().debut
    const origine = new Date(0)
    Promise.all([
      logsEntre(origine, dernierReveal),
      depensesEntre(origine, dernierReveal),
      cadeauxEntre(origine, dernierReveal),
      listerAbsences('2000-01-01', aujourdhui()),
      listerTaches(),
      listerCategories(),
      // Table créée par la migration 0011 : sans elle, aucun revenu mensuel.
      listerRevenus().catch(() => []),
    ])
      .then(([logs, depenses, cadeaux, absences, taches, categories, revenus]) => {
        if (!annule) setDonnees({ dernierReveal, logs, depenses, cadeaux, absences, taches, categories, revenus })
      })
      .catch((e) => !annule && setErreur(messageErreur(e)))
    return () => {
      annule = true
    }
  }, [])

  return { donnees, erreur }
}
