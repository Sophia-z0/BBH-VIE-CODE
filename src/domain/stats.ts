/**
 * Statistiques : uniquement sur des données révélées, pour que les deux personnes
 * voient la même chose. Toutes les fonctions sont pures.
 */
import { cleJour, decomposer, etoilesDe, jourParis, nuitModifiable, type CleJour } from './calendrier'
import { parisVersInstant } from './semaine'
import type { Categorie, Depense, LogTache, Profil, Tache } from './types'

export interface Periode {
  debut: Date
  /** Exclue ; jamais après le dernier reveal. */
  fin: Date
  /** Nuits de la période dont la semaine est révélée. */
  nuits: CleJour[]
}

/** Période [debut, fin) ramenée au dernier reveal, avec ses nuits révélées. */
export function periode(debut: Date, fin: Date, dernierReveal: Date): Periode {
  const finReelle = fin < dernierReveal ? fin : dernierReveal
  const nuits: CleJour[] = []
  if (debut < finReelle) {
    const { annee, mois, jour } = decomposer(jourParis(debut))
    for (let i = 0; ; i++) {
      const nuit = cleJour(annee, mois, jour + i)
      const { annee: a, mois: m, jour: j } = decomposer(nuit)
      if (parisVersInstant(a, m, j, 0) >= finReelle) break
      if (!nuitModifiable(nuit, dernierReveal)) nuits.push(nuit)
    }
  }
  return { debut, fin: finReelle, nuits }
}

export const dansPeriode = (iso: string, p: Periode) => new Date(iso) >= p.debut && new Date(iso) < p.fin

/** Valeur par personne, dans l'ordre des personnes. */
export type ParPersonne = { personne: Profil; valeur: number }[]

export interface Ligne {
  cle: string
  libelle: string
  emoji: string
  parPersonne: ParPersonne
  total: number
}

function ligne(cle: string, libelle: string, emoji: string, personnes: Profil[], valeur: (p: Profil) => number): Ligne {
  const parPersonne = personnes.map((personne) => ({ personne, valeur: valeur(personne) }))
  return { cle, libelle, emoji, parPersonne, total: parPersonne.reduce((t, x) => t + x.valeur, 0) }
}

const parTotalDecroissant = (a: Ligne, b: Ligne) => b.total - a.total

/** Étoiles de chaque personne, tâche par tâche (tâche à deux : moitié chacun·e). */
export function etoilesParTache(personnes: Profil[], logs: LogTache[], taches: Tache[]): Ligne[] {
  return taches
    .map((t) => ligne(t.id, t.name, t.emoji, personnes, (p) => etoilesDe(p.id, logs.filter((l) => l.task_id === t.id))))
    .filter((l) => l.total > 0)
    .sort(parTotalDecroissant)
}

/** Étoiles de chaque personne, par groupe de tâches (cuisine, ménage…). */
export function etoilesParGroupe(personnes: Profil[], logs: LogTache[], taches: Tache[]): Ligne[] {
  const groupes = [...new Set(taches.map((t) => t.group_name))]
  return groupes
    .map((g) => {
      const ids = new Set(taches.filter((t) => t.group_name === g).map((t) => t.id))
      return ligne(g, g, '', personnes, (p) => etoilesDe(p.id, logs.filter((l) => ids.has(l.task_id))))
    })
    .filter((l) => l.total > 0)
    .sort(parTotalDecroissant)
}

const montantDe = (p: Profil, depenses: Depense[]) =>
  depenses.filter((d) => d.user_id === p.id).reduce((t, d) => t + d.amount_cents, 0)

export function depensesParCategorie(personnes: Profil[], depenses: Depense[], categories: Categorie[]): Ligne[] {
  return categories
    .map((c) => ligne(c.id, c.name, c.emoji, personnes, (p) => montantDe(p, depenses.filter((d) => d.category_id === c.id))))
    .filter((l) => l.total > 0)
    .sort(parTotalDecroissant)
}

/** Habitudes d'achat : combien de fois chacun·e a acheté chaque produit étiqueté. */
export function achatsParEtiquette(personnes: Profil[], depenses: Depense[]): Ligne[] {
  const etiquettes = [...new Set(depenses.map((d) => d.tag).filter((t): t is string => Boolean(t)))]
  return etiquettes
    .map((tag) => ligne(tag, tag, '🏷️', personnes, (p) => depenses.filter((d) => d.tag === tag && d.user_id === p.id).length))
    .sort(parTotalDecroissant)
}

/** Dépenses de chacun·e, mois par mois (AAAA-MM), du plus récent au plus ancien. */
export function depensesParMois(personnes: Profil[], depenses: Depense[]): Ligne[] {
  const moisDe = (d: Depense) => jourParis(d.spent_at).slice(0, 7)
  const mois = [...new Set(depenses.map(moisDe))].sort().reverse()
  return mois.map((m) => {
    const [annee, numero] = m.split('-').map(Number)
    const libelle = new Date(Date.UTC(annee, numero - 1, 1)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    return ligne(m, libelle, '', personnes, (p) => montantDe(p, depenses.filter((d) => moisDe(d) === m)))
  })
}

/** Part des dépenses du foyer dans le revenu de chacun·e, sur la durée de la période. */
export function partDuRevenu(personnes: Profil[], depenses: Depense[], nbNuits: number, reference?: Map<string, number | null>): ParPersonne {
  const nbMois = Math.max(nbNuits / 30.44, 1 / 30.44)
  return personnes.map((personne) => {
    const revenu = (reference ? reference.get(personne.id) : personne.monthly_income_cents) ?? 0
    return { personne, valeur: revenu > 0 ? montantDe(personne, depenses) / nbMois / revenu : NaN }
  })
}

/** Nombre de logs de chacun·e (fois où il ou elle a fait une tâche). */
export function nombreDeLogs(personnes: Profil[], logs: LogTache[]): ParPersonne {
  return personnes.map((personne) => ({ personne, valeur: logs.filter((l) => l.user_id === personne.id).length }))
}
