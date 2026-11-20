import { useEffect, useState } from 'react'
import { nuitsDeSemaine } from '../../domain/calendrier'
import {
  derniereSemaineRevelee,
  dernierMoisRevele,
  badgesDePersonne,
  resultatCoeurs,
  resultatEtoiles,
  type Badge,
  type Mois,
  type ResultatCoeurs,
  type ResultatEtoiles,
} from '../../domain/scores'
import type { Semaine } from '../../domain/semaine'
import type { Profil } from '../../domain/types'
import { messageErreur } from '../../lib/erreurs'
import { cadeauxEntre, depensesEntre } from '../../services/depenses'
import { listerAbsences } from '../../services/presence'
import { listerTaches, logsEntre } from '../../services/taches'

export interface Podium {
  semaine: Semaine
  etoilesSemaine: ResultatEtoiles
  coeursSemaine: ResultatCoeurs
  mois: Mois
  etoilesMois: ResultatEtoiles
  coeursMois: ResultatCoeurs
  /** Badges débloqués pendant la semaine révélée, par l'une ou l'autre. */
  nouveauxBadges: { personne: Profil; badge: Badge }[]
}

/** Résultats de la dernière semaine et du dernier mois révélés, plus les badges débloqués cette semaine-là. */
export function usePodium(personnes: Profil[]) {
  const [podium, setPodium] = useState<Podium | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    async function charger() {
      const semaine = derniereSemaineRevelee()
      const nuitsSemaine = nuitsDeSemaine(semaine)
      const mois = dernierMoisRevele()
      // Une seule plage couvre le mois, la semaine et tout l'historique (pour les badges).
      const debut = new Date(0)
      const fin = new Date(Math.max(semaine.fin.getTime(), mois.fin.getTime()))
      const premiereNuit = mois.nuits[0] < nuitsSemaine[0] ? mois.nuits[0] : nuitsSemaine[0]

      const [logs, depenses, cadeaux, absences, taches] = await Promise.all([
        logsEntre(debut, fin),
        depensesEntre(debut, fin),
        cadeauxEntre(debut, fin),
        listerAbsences(premiereNuit, nuitsSemaine[6] > mois.nuits[mois.nuits.length - 1] ? nuitsSemaine[6] : mois.nuits[mois.nuits.length - 1]),
        listerTaches(),
      ])

      const entre = (iso: string, a: Date, b: Date) => new Date(iso) >= a && new Date(iso) < b
      const dansSemaine = (iso: string) => entre(iso, semaine.debut, semaine.fin)
      const dansMois = (iso: string) => entre(iso, mois.debut, mois.fin)

      const groupesParTache = new Map(taches.map((t) => [t.id, t.group_name]))
      const resultat: Podium = {
        semaine,
        etoilesSemaine: resultatEtoiles(personnes, logs.filter((l) => dansSemaine(l.done_at)), absences, nuitsSemaine),
        coeursSemaine: resultatCoeurs(
          personnes,
          depenses.filter((d) => dansSemaine(d.spent_at)),
          cadeaux.filter((c) => dansSemaine(c.given_at)),
        ),
        mois,
        etoilesMois: resultatEtoiles(personnes, logs.filter((l) => dansMois(l.done_at)), absences, mois.nuits),
        coeursMois: resultatCoeurs(
          personnes,
          depenses.filter((d) => dansMois(d.spent_at)),
          cadeaux.filter((c) => dansMois(c.given_at)),
        ),
        nouveauxBadges: personnes.flatMap((personne) => {
          // Avant la semaine révélée, puis à sa fin : ce qui a changé vient d'être débloqué.
          const jusqua = (date: Date) => {
            const avant = (iso: string) => new Date(iso) < date
            return badgesDePersonne(
              personne.id,
              logs.filter((l) => avant(l.done_at)),
              depenses.filter((d) => avant(d.spent_at)),
              cadeaux.filter((c) => avant(c.given_at)),
              groupesParTache,
            )
          }
          const avant = jusqua(semaine.debut)
          return jusqua(semaine.fin)
            .filter((b, i) => b.obtenu && !avant[i].obtenu)
            .map((badge) => ({ personne, badge }))
        }),
      }
      if (!annule) setPodium(resultat)
    }
    charger().catch((e) => !annule && setErreur(messageErreur(e)))
    return () => {
      annule = true
    }
  }, [personnes])

  return { podium, erreur }
}
