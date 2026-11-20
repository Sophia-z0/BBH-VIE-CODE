import { jourParis } from './calendrier'
import { parisVersInstant } from './semaine'
import type { Depense, Profil, RevenuMensuel } from './types'

/**
 * Revenus mois par mois et part juste des dépenses.
 * - La part juste d'un mois se calcule sur le revenu lissé : moyenne des 6 derniers mois renseignés
 *   avant ce mois (à défaut, le revenu mensuel des réglages).
 * - À la fin d'un trimestre, on refait le calcul avec les revenus réels de ses 3 mois ; l'écart est
 *   reporté sur la part juste du trimestre suivant, réparti dans le temps (pas de solde à payer).
 * - Un report ne dépasse pas 25 % de la part juste du trimestre ; le reste passe au suivant.
 */

/** « AAAA-MM » */
export type CleMois = string

export const MOIS_LISSAGE = 6
export const PLAFOND_REPORT = 0.25

const deuxChiffres = (n: number) => String(n).padStart(2, '0')

export function cleMois(annee: number, mois: number): CleMois {
  const d = new Date(Date.UTC(annee, mois - 1, 1))
  return `${d.getUTCFullYear()}-${deuxChiffres(d.getUTCMonth() + 1)}`
}

export function moisDecale(cle: CleMois, delta: number): CleMois {
  const [annee, mois] = cle.split('-').map(Number)
  return cleMois(annee, mois + delta)
}

/** Mois (heure de Paris) d'un instant. */
export function moisDeDate(instant: Date | string): CleMois {
  return jourParis(instant).slice(0, 7)
}

export function nomDuMois(cle: CleMois): string {
  const [annee, mois] = cle.split('-').map(Number)
  return new Date(Date.UTC(annee, mois - 1, 1)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function revenusDe(idPersonne: string, revenus: RevenuMensuel[]): Map<CleMois, number> {
  return new Map(revenus.filter((r) => r.user_id === idPersonne).map((r) => [r.month.slice(0, 7), r.amount_cents]))
}

/** Revenu réel d'un mois, s'il est renseigné. */
export function revenuReel(personne: Profil, revenus: RevenuMensuel[], mois: CleMois): number | null {
  return revenusDe(personne.id, revenus).get(mois) ?? null
}

/** Revenu lissé utilisé pour un mois : moyenne des 6 derniers mois renseignés avant lui. */
export function revenuLisse(personne: Profil, revenus: RevenuMensuel[], mois: CleMois): number | null {
  const siens = [...revenusDe(personne.id, revenus).entries()]
    .filter(([m]) => m < mois)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, MOIS_LISSAGE)
  if (siens.length > 0) return Math.round(siens.reduce((t, [, v]) => t + v, 0) / siens.length)
  return personne.monthly_income_cents && personne.monthly_income_cents > 0 ? personne.monthly_income_cents : null
}

/** Parts (somme 1) au prorata des revenus ; null si un revenu manque ou si le total est nul. */
function parts(personnes: Profil[], revenu: (p: Profil) => number | null): Map<string, number> | null {
  const valeurs = personnes.map((p) => revenu(p))
  if (valeurs.some((v) => v === null)) return null
  const total = valeurs.reduce((t: number, v) => t + (v ?? 0), 0)
  if (total <= 0) return null
  return new Map(personnes.map((p, i) => [p.id, (valeurs[i] ?? 0) / total]))
}

// --- Trimestres ------------------------------------------------------------

export interface Trimestre {
  annee: number
  /** 1 à 4 */
  numero: number
  mois: CleMois[]
  debut: Date
  fin: Date
}

export function trimestre(annee: number, numero: number): Trimestre {
  const premierMois = (numero - 1) * 3 + 1
  return {
    annee,
    numero,
    mois: [0, 1, 2].map((i) => cleMois(annee, premierMois + i)),
    debut: parisVersInstant(annee, premierMois, 1, 0),
    fin: parisVersInstant(annee, premierMois + 3, 1, 0),
  }
}

export function trimestreDe(instant: Date): Trimestre {
  const [annee, mois] = moisDeDate(instant).split('-').map(Number)
  return trimestre(annee, Math.floor((mois - 1) / 3) + 1)
}

export function trimestrePrecedent(t: Trimestre): Trimestre {
  return t.numero === 1 ? trimestre(t.annee - 1, 4) : trimestre(t.annee, t.numero - 1)
}

function trimestreSuivant(t: Trimestre): Trimestre {
  return t.numero === 4 ? trimestre(t.annee + 1, 1) : trimestre(t.annee, t.numero + 1)
}

// --- Écart et report -------------------------------------------------------

interface BilanTrimestre {
  /** Ce que chacun·e aurait dû payer en plus (positif) ou en moins (négatif), d'après les revenus réels. */
  ecart: Map<string, number>
  /** Part juste provisoire (sur revenus lissés), en centimes : base du plafond de report. */
  provisoire: Map<string, number>
}

/** Bilan d'un trimestre, ou null si un revenu réel de ses 3 mois manque. */
function bilan(personnes: Profil[], revenus: RevenuMensuel[], depenses: Depense[], t: Trimestre): BilanTrimestre | null {
  const ecart = new Map(personnes.map((p) => [p.id, 0]))
  const provisoire = new Map(personnes.map((p) => [p.id, 0]))
  for (const mois of t.mois) {
    const reelles = parts(personnes, (p) => revenuReel(p, revenus, mois))
    if (!reelles) return null
    const lissees = parts(personnes, (p) => revenuLisse(p, revenus, mois)) ?? new Map(personnes.map((p) => [p.id, 1 / personnes.length]))
    const total = depenses.filter((d) => moisDeDate(d.spent_at) === mois).reduce((s, d) => s + d.amount_cents, 0)
    for (const p of personnes) {
      ecart.set(p.id, ecart.get(p.id)! + ((reelles.get(p.id) ?? 0) - (lissees.get(p.id) ?? 0)) * total)
      provisoire.set(p.id, provisoire.get(p.id)! + (lissees.get(p.id) ?? 0) * total)
    }
  }
  return { ecart, provisoire }
}

export interface Report {
  /** Trimestre où le report s'applique. */
  trimestre: Trimestre
  /** Centimes ajoutés (positif) ou retirés (négatif) à la part juste de chacun·e sur ce trimestre. */
  montants: Map<string, number>
  /** Personnes dont un revenu du trimestre précédent manque (report pas encore calculable). */
  enAttente: Profil[]
}

/** Report qui s'applique au trimestre `t`, en enchaînant les trimestres depuis le premier revenu saisi. */
export function reportPour(personnes: Profil[], revenus: RevenuMensuel[], depenses: Depense[], t: Trimestre): Report {
  const zero = () => new Map(personnes.map((p) => [p.id, 0]))
  const precedent = trimestrePrecedent(t)
  const enAttente = personnes.filter((p) => precedent.mois.some((m) => revenuReel(p, revenus, m) === null))
  const premierMois = revenus.map((r) => r.month.slice(0, 7)).sort()[0]
  if (personnes.length !== 2 || !premierMois) return { trimestre: t, montants: zero(), enAttente }

  let reste = zero()
  let applique = zero()
  for (let q = trimestreDe(parisVersInstant(Number(premierMois.slice(0, 4)), Number(premierMois.slice(5, 7)), 1, 12)); q.debut < t.debut; q = trimestreSuivant(q)) {
    const b = bilan(personnes, revenus, depenses, q)
    const total = new Map(personnes.map((p) => [p.id, (reste.get(p.id) ?? 0) + (b?.ecart.get(p.id) ?? 0)]))
    // La personne qui doit plus paie au plus 25 % de sa part juste en plus ; l'autre reçoit l'opposé.
    const [a, c] = personnes
    const doit = (total.get(a.id) ?? 0) >= 0 ? a : c
    const plafond = PLAFOND_REPORT * (b?.provisoire.get(doit.id) ?? 0)
    const montant = Math.min(total.get(doit.id) ?? 0, plafond)
    applique = new Map(personnes.map((p) => [p.id, p.id === doit.id ? montant : -montant]))
    reste = new Map(personnes.map((p) => [p.id, (total.get(p.id) ?? 0) - (applique.get(p.id) ?? 0)]))
  }
  return { trimestre: t, montants: new Map([...applique].map(([id, v]) => [id, Math.round(v)])), enAttente }
}

/**
 * Revenus de référence et ajustements pour une période (semaine, mois…) :
 * revenu lissé du mois où la période se termine, et part des reports des trimestres qu'elle recouvre,
 * au prorata du temps.
 */
export function contexteRevenus(personnes: Profil[], revenus: RevenuMensuel[], depenses: Depense[], debut: Date, fin: Date) {
  const mois = moisDeDate(new Date(fin.getTime() - 1))
  const reference = new Map(personnes.map((p) => [p.id, revenuLisse(p, revenus, mois)]))
  const ajustements = new Map(personnes.map((p) => [p.id, 0]))
  for (let q = trimestreDe(debut); q.debut < fin; q = trimestreSuivant(q)) {
    const recouvrement = Math.min(fin.getTime(), q.fin.getTime()) - Math.max(debut.getTime(), q.debut.getTime())
    if (recouvrement <= 0) continue
    const { montants } = reportPour(personnes, revenus, depenses, q)
    const part = recouvrement / (q.fin.getTime() - q.debut.getTime())
    for (const p of personnes) ajustements.set(p.id, ajustements.get(p.id)! + (montants.get(p.id) ?? 0) * part)
  }
  return { reference, ajustements }
}
