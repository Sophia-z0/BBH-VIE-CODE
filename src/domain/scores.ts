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
  /** Report du trimestre précédent ajouté (ou retiré) à sa part juste sur la période, en centimes. */
  ajustement: number
  /** Montant juste : part juste du total, plus l'ajustement. */
  montantJuste: number
  /** Part juste une fois l'ajustement compris (montantJuste / total). */
  partJusteAjustee: number
  /** dépense / montantJuste : 1 = pile sa part juste, au-dessus = plus que sa part. */
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

/**
 * Revenus de référence (revenu lissé) et ajustements (reports de trimestre) d'une période ;
 * sans eux, on retombe sur le revenu mensuel des réglages.
 */
export interface OptionsCoeurs {
  reference?: Map<string, number | null>
  ajustements?: Map<string, number>
}

export function resultatCoeurs(personnes: Profil[], depenses: Depense[], cadeaux: Cadeau[], options: OptionsCoeurs = {}): ResultatCoeurs {
  const revenuDe = (p: Profil) => (options.reference ? (options.reference.get(p.id) ?? 0) : (p.monthly_income_cents ?? 0))
  const surRevenus = personnes.length === 2 && personnes.every((p) => revenuDe(p) > 0)
  const totalRevenus = personnes.reduce((t, p) => t + revenuDe(p), 0)
  const total = depenses.reduce((t, d) => t + d.amount_cents, 0)

  const scores = personnes.map((personne) => {
    const depense = depenses.filter((d) => d.user_id === personne.id).reduce((t, d) => t + d.amount_cents, 0)
    const partReelle = total > 0 ? depense / total : 0
    const partJuste = surRevenus ? revenuDe(personne) / totalRevenus : 1 / personnes.length
    const ajustement = total > 0 ? Math.round(options.ajustements?.get(personne.id) ?? 0) : 0
    const montantJuste = Math.max(partJuste * total + ajustement, 0)
    const atteinte = montantJuste > 0 ? depense / montantJuste : total > 0 ? Infinity : 0
    const partJusteAjustee = total > 0 ? montantJuste / total : partJuste
    return { personne, depense, partReelle, partJuste, ajustement, montantJuste, partJusteAjustee, atteinte, coeur: total > 0 && atteinte >= SEUIL_COEUR }
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

