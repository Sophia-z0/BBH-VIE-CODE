import { useCallback, useEffect, useState } from 'react'
import { grilleDuMois, nuitsDeSemaine, semaineDeLigne, type CleJour } from '../../domain/calendrier'
import type { Absence, Cadeau, Categorie, Depense, LogTache, Tache } from '../../domain/types'
import { messageErreur } from '../../lib/erreurs'
import { cadeauxEntre, depensesEntre, listerCategories } from '../../services/depenses'
import { listerAbsences } from '../../services/presence'
import { listerTaches, logsEntre } from '../../services/taches'

/** Données visibles pour la grille d'un mois : logs, dépenses, cadeaux, absences, et catalogues (pour les noms). */
export function useCalendrier(annee: number, mois: number) {
  const [grille, setGrille] = useState<CleJour[][]>(() => grilleDuMois(annee, mois))
  const [logs, setLogs] = useState<LogTache[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [taches, setTaches] = useState<Tache[]>([])
  const [depenses, setDepenses] = useState<Depense[]>([])
  const [cadeaux, setCadeaux] = useState<Cadeau[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    const lignes = grilleDuMois(annee, mois)
    const premiere = semaineDeLigne(lignes[0])
    const derniere = semaineDeLigne(lignes[lignes.length - 1])
    try {
      const [l, a, t, d, g, c] = await Promise.all([
        logsEntre(premiere.debut, derniere.fin),
        listerAbsences(nuitsDeSemaine(premiere)[0], lignes[lignes.length - 1][6]),
        listerTaches(),
        depensesEntre(premiere.debut, derniere.fin),
        cadeauxEntre(premiere.debut, derniere.fin),
        listerCategories(),
      ])
      setGrille(lignes)
      setLogs(l)
      setAbsences(a)
      setTaches(t)
      setDepenses(d)
      setCadeaux(g)
      setCategories(c)
      setErreur(null)
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }, [annee, mois])

  useEffect(() => {
    void recharger()
  }, [recharger])

  return { grille, logs, depenses, cadeaux, absences, taches, categories, erreur, recharger }
}
