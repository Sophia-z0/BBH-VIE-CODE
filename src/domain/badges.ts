import { cleJour, decomposer, etoilesDe, jourParis } from './calendrier'
import { heureMuraleParis, semaineDe, type Semaine } from './semaine'
import type { Cadeau, Genre, LogTache, Profil, Tache } from './types'

/**
 * Badges de la semaine (gagnés au reveal, une fois par semaine au plus chacun) et objectifs
 * (paliers toujours visibles, avec leur décompte).
 */

// --- Badges de la semaine ----------------------------------------------------

export interface DefBadge {
  cle: string
  emoji: (genre: Genre | null | undefined) => string
  titre: (genre: Genre | null | undefined) => string
  /** Ce qu'il faut faire, montré une fois le badge gagné. */
  regle: string
}

/** Ce que la semaine d'une personne contient, pour tester les badges. */
interface Semainier {
  personne: Profil
  /** Ses logs de la semaine (les siens et ceux faits à deux). */
  logs: LogTache[]
  etoiles: number
  /** Étoiles de l'autre, pour les badges à deux. */
  etoilesAutre: number | null
  cadeaux: number
  taches: Map<string, Tache>
}

const accord = (genre: Genre | null | undefined, elle: string, il: string, iel: string) =>
  genre === 'elle' ? elle : genre === 'il' ? il : iel
const fixe = (texte: string) => () => texte

const sansAccents = (texte: string) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const nomContient = (s: Semainier, motif: string) => (l: LogTache) => sansAccents(s.taches.get(l.task_id)?.name ?? '').includes(motif)
const heure = (l: LogTache) => heureMuraleParis(new Date(l.done_at)).heure

interface Regle extends DefBadge {
  gagne: (s: Semainier) => boolean
}

const REGLES: Regle[] = [
  {
    cle: 'maniaco',
    emoji: fixe('🌟'),
    titre: fixe('maniacobehbz'),
    regle: 'plus de 50 ⭐ en une semaine',
    gagne: (s) => s.etoiles > 50,
  },
  {
    cle: 'cuisto',
    emoji: (g) => accord(g, '👩‍🍳', '👨‍🍳', '🧑‍🍳'),
    titre: (g) => accord(g, 'grande cheffe cuisto', 'grand chef cuisto', 'grand·e chef·fe cuisto'),
    regle: '3 repas élaborés en une semaine',
    gagne: (s) => s.logs.filter(nomContient(s, 'repas elabore')).length >= 3,
  },
  {
    cle: 'nourrit',
    emoji: fixe('🍝'),
    titre: (g) => accord(g, 'la p’tite qui nourrit', 'le p’tit qui nourrit', 'læ p’tit·e qui nourrit'),
    regle: '5 repas rapidos en une semaine',
    gagne: (s) => s.logs.filter(nomContient(s, 'rapidos')).length >= 5,
  },
  {
    cle: 'kadum',
    emoji: fixe('🎁'),
    titre: fixe('bbh kadum'),
    regle: 'un cadeau au foyer dans la semaine',
    gagne: (s) => s.cadeaux >= 1,
  },
  {
    cle: 'generosite',
    emoji: fixe('💝'),
    titre: fixe('la générosité incarnée'),
    regle: '3 cadeaux au foyer en une semaine',
    gagne: (s) => s.cadeaux >= 3,
  },
  {
    cle: 'aspiratorix',
    emoji: fixe('🌀'),
    titre: fixe('Aspiratorix de behbz !'),
    regle: "5 coups d'aspirateur en une semaine",
    gagne: (s) => s.logs.filter(nomContient(s, 'aspirateur')).length >= 5,
  },
  {
    cle: 'courage',
    emoji: (g) => accord(g, '🦸‍♀️', '🦸‍♂️', '🦸'),
    titre: (g) => accord(g, 'mère courage', 'père courage', 'parent courage'),
    regle: '4 tâches hors du quotidien en une semaine',
    gagne: (s) =>
      s.logs.filter((l) => {
        const t = s.taches.get(l.task_id)
        return !!t && !t.everyday
      }).length >= 4,
  },
  {
    cle: 'noctambule',
    emoji: fixe('🦉'),
    titre: fixe('noctambehbz'),
    regle: '3 tâches après 23 h en une semaine',
    gagne: (s) => s.logs.filter((l) => heure(l) >= 23 || heure(l) < 4).length >= 3,
  },
  {
    cle: 'levetot',
    emoji: fixe('🐓'),
    titre: fixe('de p’tit lève-tôt'),
    regle: '3 tâches avant 9 h en une semaine',
    gagne: (s) => s.logs.filter((l) => heure(l) >= 4 && heure(l) < 9).length >= 3,
  },
  {
    cle: 'adeux',
    emoji: fixe('👩‍❤️‍👨'),
    titre: fixe('à 2 c’est mieux !'),
    regle: '3 tâches faites à deux en une semaine (badge pour les deux)',
    gagne: (s) => s.logs.filter((l) => l.shared).length >= 3,
  },
  {
    cle: 'duo',
    emoji: fixe('🤝'),
    titre: fixe('duo de choc'),
    regle: 'chacun·e plus de 30 ⭐ la même semaine (badge pour les deux)',
    gagne: (s) => s.etoiles > 30 && (s.etoilesAutre ?? 0) > 30,
  },
]

export const BADGES: DefBadge[] = REGLES

/** Badges gagnés par chacun·e sur une semaine (logs et cadeaux déjà limités ou non à la semaine). */
export function badgesDeLaSemaine(
  personnes: Profil[],
  semaine: Semaine,
  logs: LogTache[],
  cadeaux: Cadeau[],
  taches: Tache[],
): Map<string, DefBadge[]> {
  const dans = (iso: string) => new Date(iso) >= semaine.debut && new Date(iso) < semaine.fin
  const logsSemaine = logs.filter((l) => dans(l.done_at))
  const parTache = new Map(taches.map((t) => [t.id, t]))
  const etoiles = new Map(personnes.map((p) => [p.id, etoilesDe(p.id, logsSemaine)]))
  return new Map(
    personnes.map((personne) => {
      const autre = personnes.find((p) => p.id !== personne.id)
      const s: Semainier = {
        personne,
        logs: logsSemaine.filter((l) => l.user_id === personne.id || l.shared),
        etoiles: etoiles.get(personne.id) ?? 0,
        etoilesAutre: autre ? (etoiles.get(autre.id) ?? 0) : null,
        cadeaux: cadeaux.filter((c) => c.user_id === personne.id && dans(c.given_at)).length,
        taches: parTache,
      }
      return [personne.id, REGLES.filter((r) => r.gagne(s))]
    }),
  )
}

/** Semaines de jeu complètes entre deux instants (la dernière finit au plus tard à `fin`). */
export function semainesEntre(debut: Date, fin: Date): Semaine[] {
  const semaines: Semaine[] = []
  for (let s = semaineDe(debut); s.fin <= fin; s = semaineDe(s.fin)) semaines.push(s)
  return semaines
}

/** Palmarès : combien de fois chacun·e a gagné chaque badge (clé du badge → id → nombre). */
export function palmares(
  personnes: Profil[],
  semaines: Semaine[],
  logs: LogTache[],
  cadeaux: Cadeau[],
  taches: Tache[],
): Map<string, Map<string, number>> {
  const total = new Map<string, Map<string, number>>()
  for (const semaine of semaines) {
    for (const [id, badges] of badgesDeLaSemaine(personnes, semaine, logs, cadeaux, taches)) {
      for (const b of badges) {
        const parPersonne = total.get(b.cle) ?? new Map<string, number>()
        parPersonne.set(id, (parPersonne.get(id) ?? 0) + 1)
        total.set(b.cle, parPersonne)
      }
    }
  }
  return total
}

// --- Objectifs -------------------------------------------------------------

export interface Objectif {
  emoji: string
  titre: string
  actuel: number
  cible: number
}

/** Objectifs d'une personne sur les logs qu'on lui passe (révélés, plus sa semaine en cours pour soi). */
export function objectifsDe(idPersonne: string, logs: LogTache[], groupesParTache: Map<string, string>): Objectif[] {
  const siens = logs.filter((l) => l.user_id === idPersonne || l.shared)
  const etoiles = etoilesDe(idPersonne, logs)
  const jours = [...new Set(siens.map((l) => jourParis(l.done_at)))].sort()
  const meilleureSerie = jours.reduce(
    (acc, jour) => {
      const { annee, mois, jour: j } = decomposer(jour)
      const courant = acc.precedent === cleJour(annee, mois, j - 1) ? acc.courant + 1 : 1
      return { precedent: jour, courant, meilleur: Math.max(acc.meilleur, courant) }
    },
    { precedent: '', courant: 0, meilleur: 0 },
  ).meilleur
  const groupes = new Set(siens.map((l) => groupesParTache.get(l.task_id)).filter(Boolean)).size
  const objectif = (emoji: string, titre: string, actuel: number, cible: number): Objectif => ({
    emoji,
    titre,
    actuel: Math.min(actuel, cible),
    cible,
  })
  return [
    objectif('🎨', 'touche-à-tout (5 groupes)', groupes, 5),
    objectif('🔥', '7 jours d’affilée', meilleureSerie, 7),
    objectif('💎', '30 jours d’affilée', meilleureSerie, 30),
    objectif('🌟', '200 étoiles', etoiles, 200),
  ]
}
