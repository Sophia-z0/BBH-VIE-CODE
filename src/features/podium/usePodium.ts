import { useEffect, useState } from 'react'
import { nuitsDeSemaine } from '../../domain/calendrier'
import {
  derniereSemaineRevelee,
  dernierMoisRevele,
  resultatCoeurs,
  resultatEtoiles,
  type Mois,
  type ResultatCoeurs,
  type ResultatEtoiles,
} from '../../domain/scores'
import { badgesDeLaSemaine, objectifsDe, type DefBadge, type Objectif } from '../../domain/badges'
import { contexteRevenus, reportPour, trimestreDe, type Report } from '../../domain/revenus'
import type { Semaine } from '../../domain/semaine'
import type { Profil } from '../../domain/types'
import { messageErreur } from '../../lib/erreurs'
import { cadeauxEntre, depensesEntre } from '../../services/depenses'
import { listerAbsences } from '../../services/presence'
import { listerRevenus } from '../../services/revenus'
import { listerTaches, logsEntre } from '../../services/taches'

export interface Podium {
  semaine: Semaine
  etoilesSemaine: ResultatEtoiles
  coeursSemaine: ResultatCoeurs
  mois: Mois
  etoilesMois: ResultatEtoiles
  coeursMois: ResultatCoeurs
  /** Report de trimestre qui s'applique au mois du podium (null sans aucun revenu mensuel saisi). */
  reportMois: Report | null
  /** Badges gagnés pendant la semaine révélée, par l'une ou l'autre. */
  nouveauxBadges: { personne: Profil; badge: DefBadge }[]
  /** Objectifs atteints pendant la semaine révélée : leur remise officielle a lieu à la cérémonie. */
  nouveauxObjectifs: { personne: Profil; objectif: Objectif }[]
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

      const [logs, depenses, cadeaux, absences, taches, revenus] = await Promise.all([
        logsEntre(debut, fin),
        depensesEntre(debut, fin),
        cadeauxEntre(debut, fin),
        listerAbsences(premiereNuit, nuitsSemaine[6] > mois.nuits[mois.nuits.length - 1] ? nuitsSemaine[6] : mois.nuits[mois.nuits.length - 1]),
        listerTaches(),
        // Table créée par la migration 0011 : sans elle, on fait comme s'il n'y avait aucun revenu mensuel.
        listerRevenus().catch(() => []),
      ])

      const entre = (iso: string, a: Date, b: Date) => new Date(iso) >= a && new Date(iso) < b
      const dansSemaine = (iso: string) => entre(iso, semaine.debut, semaine.fin)
      const dansMois = (iso: string) => entre(iso, mois.debut, mois.fin)

      const resultat: Podium = {
        semaine,
        etoilesSemaine: resultatEtoiles(personnes, logs.filter((l) => dansSemaine(l.done_at)), absences, nuitsSemaine),
        coeursSemaine: resultatCoeurs(
          personnes,
          depenses.filter((d) => dansSemaine(d.spent_at)),
          cadeaux.filter((c) => dansSemaine(c.given_at)),
          contexteRevenus(personnes, revenus, depenses, semaine.debut, semaine.fin),
        ),
        mois,
        etoilesMois: resultatEtoiles(personnes, logs.filter((l) => dansMois(l.done_at)), absences, mois.nuits),
        coeursMois: resultatCoeurs(
          personnes,
          depenses.filter((d) => dansMois(d.spent_at)),
          cadeaux.filter((c) => dansMois(c.given_at)),
          contexteRevenus(personnes, revenus, depenses, mois.debut, mois.fin),
        ),
        reportMois: revenus.length > 0 ? reportPour(personnes, revenus, depenses, trimestreDe(mois.debut)) : null,
        nouveauxBadges: [...badgesDeLaSemaine(personnes, semaine, logs, cadeaux, taches)].flatMap(([id, badges]) => {
          const personne = personnes.find((p) => p.id === id)!
          return badges.map((badge) => ({ personne, badge }))
        }),
        nouveauxObjectifs: personnes.flatMap((personne) => {
          const groupes = new Map(taches.map((t) => [t.id, t.group_name]))
          const jusqua = (date: Date) => objectifsDe(personne.id, logs.filter((l) => new Date(l.done_at) < date), groupes)
          const avant = jusqua(semaine.debut)
          return jusqua(semaine.fin)
            .filter((o, i) => o.actuel >= o.cible && avant[i].actuel < avant[i].cible)
            .map((objectif) => ({ personne, objectif }))
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
