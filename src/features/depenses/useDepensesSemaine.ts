import { useCallback, useEffect, useState } from 'react'
import { semaineDe } from '../../domain/semaine'
import type { Cadeau, Categorie, Depense } from '../../domain/types'
import { messageErreur } from '../../lib/erreurs'
import {
  cadeauxEntre,
  depensesEntre,
  genererRecurrentes,
  listerCategories,
  mesEtiquettesFrequentes,
} from '../../services/depenses'

/** Catégories, étiquettes fréquentes, et mes dépenses et cadeaux de la semaine de jeu en cours. */
export function useDepensesSemaine(idUtilisateur: string) {
  const [categories, setCategories] = useState<Categorie[]>([])
  const [etiquettes, setEtiquettes] = useState<string[]>([])
  const [depenses, setDepenses] = useState<Depense[]>([])
  const [cadeaux, setCadeaux] = useState<Cadeau[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    try {
      await genererRecurrentes()
      const { debut, fin } = semaineDe()
      const [c, e, d, g] = await Promise.all([
        listerCategories(),
        mesEtiquettesFrequentes(idUtilisateur),
        depensesEntre(debut, fin),
        cadeauxEntre(debut, fin),
      ])
      setCategories(c)
      setEtiquettes(e)
      // Pendant la semaine en cours, seules mes entrées sont visibles de toute façon.
      setDepenses(d.filter((x) => x.user_id === idUtilisateur))
      setCadeaux(g.filter((x) => x.user_id === idUtilisateur))
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

  return { categories, etiquettes, depenses, setDepenses, cadeaux, setCadeaux, chargement, erreur, recharger }
}
