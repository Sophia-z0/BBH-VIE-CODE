/**
 * Scores du podium : tout est ramené aux nuits passées à la maison, pour comparer
 * équitablement deux personnes qui n'ont pas été présentes le même nombre de jours.
 */
import { cleJour, decomposer, etoilesDe, jourParis, type CleJour } from './calendrier'
import { parisVersInstant, semaineDe, type Semaine } from './semaine'
import type { Absence, Cadeau, Depense, LogTache, Profil } from './types'

/** Écart en dessous duquel deux scores sont considérés à égalité. */
const EGALITE = 0.05
/** Part de sa part juste à atteindre pour gagner un 💖 (90 %). */
export const SEUIL_COEUR = 0.9

export interface ScoreEtoiles {
  personne: Profil
  etoiles: number
  nuits: number
  /** Étoiles par nuit à la maison (0 si aucune nuit). */
  parNuit: number
  /** Part de la charge, ajustée à la présence (entre 0 et 1). */
  part: number
}

export interface ResultatEtoiles {
  scores: ScoreEtoiles[]
  /** Une personne, ou les deux en cas d'égalité ; vide si personne n'a rien logué. */
  gagnants: Profil[]
}

export function resultatEtoiles(personnes: Profil[], logs: LogTache[], absences: Absence[], nuits: CleJour[]): ResultatEtoiles {
  const bruts = personnes.map((personne) => {
    const etoiles = etoilesDe(personne.id, logs)
    const nuitsPresent = nuits.filter((n) => !absences.some((a) => a.user_id === personne.id && a.night === n)).length
    return { personne, etoiles, nuits: nuitsPresent, parNuit: nuitsPresent > 0 ? etoiles / nuitsPresent : 0 }
  })
  const totalParNuit = bruts.reduce((t, s) => t + s.parNuit, 0)
  const scores = bruts.map((s) => ({ ...s, part: totalParNuit > 0 ? s.parNuit / totalParNuit : 0 }))

  const meilleur = Math.max(...scores.map((s) => s.parNuit))
  const gagnants =
    meilleur > 0 ? scores.filter((s) => meilleur - s.parNuit <= EGALITE * meilleur).map((s) => s.personne) : []
  return { scores, gagnants }
}

export interface ScoreCoeurs {
  personne: Profil
  depense: number // centimes
  /** Part réelle des dépenses du foyer. */
  partReelle: number
  /** Part proportionnelle aux revenus (ou 50/50 si un revenu manque). */
  partJuste: number
  /** partReelle / partJuste : 1 = pile sa part juste, au-dessus = plus que sa part. */
  atteinte: number
  coeur: boolean
}

export interface ResultatCoeurs {
  scores: ScoreCoeurs[]
  /** Vrai si la part juste est calculée sur les revenus des deux. */
  surRevenus: boolean
  /** En tête : la personne la plus proche de sa part juste ou au-dessus ; les deux si chacun·e a son 💖. */
  gagnants: Profil[]
  cadeaux: { personne: Profil; nombre: number; montant: number }[]
}

export function resultatCoeurs(personnes: Profil[], depenses: Depense[], cadeaux: Cadeau[]): ResultatCoeurs {
  const surRevenus = personnes.length === 2 && personnes.every((p) => (p.monthly_income_cents ?? 0) > 0)
  const totalRevenus = personnes.reduce((t, p) => t + (p.monthly_income_cents ?? 0), 0)
  const total = depenses.reduce((t, d) => t + d.amount_cents, 0)

  const scores = personnes.map((personne) => {
    const depense = depenses.filter((d) => d.user_id === personne.id).reduce((t, d) => t + d.amount_cents, 0)
    const partReelle = total > 0 ? depense / total : 0
    const partJuste = surRevenus ? (personne.monthly_income_cents ?? 0) / totalRevenus : 1 / personnes.length
    const atteinte = partJuste > 0 ? partReelle / partJuste : 0
    return { personne, depense, partReelle, partJuste, atteinte, coeur: total > 0 && atteinte >= SEUIL_COEUR }
  })

  let gagnants: Profil[] = []
  if (total > 0) {
    gagnants = scores.every((s) => s.coeur)
      ? scores.map((s) => s.personne)
      : [scores.reduce((a, b) => (b.atteinte > a.atteinte ? b : a)).personne]
  }

  return {
    scores,
    surRevenus,
    gagnants,
    cadeaux: personnes.map((personne) => {
      const siens = cadeaux.filter((c) => c.user_id === personne.id)
      return { personne, nombre: siens.length, montant: siens.reduce((t, c) => t + c.estimated_cents, 0) }
    }),
  }
}

// --- Périodes ---------------------------------------------------------------

/** Dernière semaine dont les résultats sont révélés. */
export function derniereSemaineRevelee(maintenant = new Date()): Semaine {
  return semaineDe(new Date(semaineDe(maintenant).debut.getTime() - 1))
}


export interface Mois {
  annee: number
  mois: number
  debut: Date
  fin: Date
  nuits: CleJour[]
}

export function moisDe(annee: number, mois: number): Mois {
  const nbJours = new Date(Date.UTC(annee, mois, 0)).getUTCDate()
  return {
    annee,
    mois,
    debut: parisVersInstant(annee, mois, 1, 0),
    fin: parisVersInstant(annee, mois + 1, 1, 0),
    nuits: Array.from({ length: nbJours }, (_, i) => cleJour(annee, mois, i + 1)),
  }
}

/** Dernier mois entièrement révélé (la semaine de son dernier jour est terminée). */
export function dernierMoisRevele(maintenant = new Date()): Mois {
  const { annee, mois } = decomposer(jourParis(maintenant))
  for (let recul = 1; ; recul++) {
    const d = new Date(Date.UTC(annee, mois - 1 - recul, 1))
    const candidat = moisDe(d.getUTCFullYear(), d.getUTCMonth() + 1)
    if (semaineDe(new Date(candidat.fin.getTime() - 1)).fin <= maintenant) return candidat
  }
}

// --- Séries et badges ---------------------------------------------------------

/** Nombre de jours d'affilée (jusqu'à aujourd'hui, ou hier si rien encore aujourd'hui) avec au moins un log. */
export function serieEnCours(jours: CleJour[], aujourdhui: CleJour): number {
  const actifs = new Set(jours)
  const { annee, mois, jour } = decomposer(aujourdhui)
  let decalage = actifs.has(aujourdhui) ? 0 : 1
  let serie = 0
  while (actifs.has(cleJour(annee, mois, jour - decalage))) {
    serie++
    decalage++
  }
  return serie
}

export interface Badge {
  emoji: string
  titre: string
  obtenu: boolean
  /** Où on en est, pour les badges à palier (« 142 / 200 »). */
  progres?: { actuel: number; cible: number }
}

/**
 * Paliers bienveillants d'une personne, calculés sur l'historique qu'on lui passe
 * (ses logs, dépenses et cadeaux uniquement).
 */
export function badgesDe(logs: LogTache[], depenses: Depense[], cadeaux: Cadeau[], groupesParTache: Map<string, string>): Badge[] {
  const etoiles = logs.reduce((t, l) => t + (l.shared ? l.stars / 2 : l.stars), 0)
  const jours = [...new Set(logs.map((l) => jourParis(l.done_at)))].sort()
  const meilleureSerie = jours.reduce(
    (acc, jour) => {
      const { annee, mois, jour: j } = decomposer(jour)
      const courant = acc.precedent === cleJour(annee, mois, j - 1) ? acc.courant + 1 : 1
      return { precedent: jour, courant, meilleur: Math.max(acc.meilleur, courant) }
    },
    { precedent: '', courant: 0, meilleur: 0 },
  ).meilleur
  const groupes = new Set(logs.map((l) => groupesParTache.get(l.task_id)).filter(Boolean)).size

  const palier = (emoji: string, titre: string, actuel: number, cible: number): Badge => ({
    emoji,
    titre,
    obtenu: actuel >= cible,
    progres: { actuel: Math.min(actuel, cible), cible },
  })
  return [
    { emoji: '🌱', titre: 'première tâche', obtenu: logs.length >= 1 },
    palier('⭐', '50 étoiles', etoiles, 50),
    palier('🌟', '200 étoiles', etoiles, 200),
    palier('💫', '500 étoiles', etoiles, 500),
    palier('🔥', '7 jours d’affilée', meilleureSerie, 7),
    palier('💎', '30 jours d’affilée', meilleureSerie, 30),
    palier('🎨', 'touche-à-tout (5 groupes)', groupes, 5),
    { emoji: '👫', titre: 'travail d’équipe', obtenu: logs.some((l) => l.shared) },
    { emoji: '💖', titre: 'première dépense', obtenu: depenses.length >= 1 },
    { emoji: '🎁', titre: 'premier cadeau', obtenu: cadeaux.length >= 1 },
  ]
}

/** Badges d'une personne sur l'historique du foyer (filtre ses entrées). */
export function badgesDePersonne(
  idPersonne: string,
  logs: LogTache[],
  depenses: Depense[],
  cadeaux: Cadeau[],
  groupesParTache: Map<string, string>,
): Badge[] {
  return badgesDe(
    logs.filter((l) => l.user_id === idPersonne),
    depenses.filter((d) => d.user_id === idPersonne),
    cadeaux.filter((c) => c.user_id === idPersonne),
    groupesParTache,
  )
}
