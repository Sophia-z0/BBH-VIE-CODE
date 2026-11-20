import { useCallback, useEffect, useState } from 'react'
import { semaineDe } from '../../domain/semaine'
import type { Cadeau, Categorie, Depense } from '../../domain/types'
import { messageErreur } from '../../lib/erreurs'
import { ecrireLocal, lireLocal } from '../../lib/stockageLocal'
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
  const [toutesEtiquettes, setEtiquettes] = useState<string[]>([])
  // Étiquettes masquées par appui long : gardées sur ce téléphone seulement.
  const cleMasquees = `bbh-etiquettes-masquees:${idUtilisateur}`
  const [masquees, setMasquees] = useState<string[]>(() => {
    try {
      return JSON.parse(lireLocal(cleMasquees) ?? '[]') as string[]
    } catch {
      return []
    }
  })
  const etiquettes = toutesEtiquettes.filter((e) => !masquees.includes(e)).slice(0, 8)

  function masquerEtiquette(etiquette: string) {
    const liste = [...masquees, etiquette]
    setMasquees(liste)
    ecrireLocal(cleMasquees, JSON.stringify(liste))
  }
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
        mesEtiquettesFrequentes(idUtilisateur, 30),
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

  return { categories, etiquettes, masquerEtiquette, depenses, setDepenses, cadeaux, setCadeaux, chargement, erreur, recharger }
}
