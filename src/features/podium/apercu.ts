import { BADGES } from '../../domain/badges'
import { nuitsDeSemaine } from '../../domain/calendrier'
import { derniereSemaineRevelee, resultatCoeurs, resultatEtoiles } from '../../domain/scores'
import type { Cadeau, Depense, LogTache, Profil } from '../../domain/types'
import type { DonneesCeremonie } from './Ceremonie'

/**
 * Données inventées pour voir la cérémonie sans toucher aux vrais résultats :
 * rien n'est lu ni écrit en base. Avec une seule personne au foyer, un·e partenaire fictif·ve.
 */
export function donneesApercu(membres: Profil[]): DonneesCeremonie {
  const [a, b] = [
    membres[0],
    membres[1] ?? { ...membres[0], id: 'apercu-partenaire', display_name: 'Partenaire', color: '#99e2c4', gender: 'iel' as const },
  ]
  const personnes = [a, b]
  const semaine = derniereSemaineRevelee()
  const nuits = nuitsDeSemaine(semaine)
  const instant = (i: number) => new Date(semaine.debut.getTime() + (i + 1) * 3_600_000 * 7).toISOString()

  const logs: LogTache[] = [
    ...Array.from({ length: 14 }, (_, i) => ({ id: `a${i}`, task_id: `t${i}`, user_id: a.id, done_at: instant(i), shared: false, stars: 4 })),
    ...Array.from({ length: 11 }, (_, i) => ({ id: `b${i}`, task_id: `u${i}`, user_id: b.id, done_at: instant(i), shared: false, stars: 4 })),
  ]
  const depense = (id: string, user_id: string, centimes: number): Depense => ({
    id,
    user_id,
    category_id: 'apercu',
    amount_cents: centimes,
    tag: null,
    note: null,
    spent_at: instant(3),
    recurring_id: null,
  })
  const depenses = [depense('d1', a.id, 8740), depense('d2', b.id, 12350)]
  const cadeaux: Cadeau[] = [{ id: 'c1', user_id: a.id, description: 'apercu', estimated_cents: 2900, given_at: instant(5) }]

  const badge = (cle: string) => BADGES.find((x) => x.cle === cle)!
  return {
    semaine,
    etoilesSemaine: resultatEtoiles(personnes, logs, [], nuits),
    coeursSemaine: resultatCoeurs(personnes, depenses, cadeaux),
    nouveauxBadges: [
      { personne: a, badge: badge('maniaco') },
      { personne: a, badge: badge('kadum') },
      { personne: b, badge: badge('cuisto') },
      { personne: a, badge: badge('adeux') },
      { personne: b, badge: badge('adeux') },
    ],
    nouveauxObjectifs: [{ personne: b, objectif: { emoji: '🔥', titre: '7 jours d’affilée', actuel: 7, cible: 7 } }],
  }
}
