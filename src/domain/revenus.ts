import { jourParis } from './calendrier'
import { parisVersInstant } from './semaine'
import { remboursementDuMois, type Pret } from './prets'
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

// --- Messages bienveillants ------------------------------------------------

/** Moyenne des mois renseignés parmi `mois`, ou null si aucun. */
export function moyenneSur(idPersonne: string, revenus: RevenuMensuel[], mois: CleMois[]): number | null {
  const siens = revenusDe(idPersonne, revenus)
  const valeurs = mois.map((m) => siens.get(m)).filter((v): v is number => v !== undefined)
  return valeurs.length === 0 ? null : valeurs.reduce((t, v) => t + v, 0) / valeurs.length
}

/** Seuil d'« encore un petit effort » : à moins de 15 % de l'an dernier. */
const PRESQUE = 0.85

/**
 * Message comparatif bienveillant après la saisie du revenu de `mois` (avant → après),
 * ou null s'il n'y a rien d'encourageant à dire. Du plus parlant au plus général.
 */
export function messageRevenu(idPersonne: string, avant: RevenuMensuel[], apres: RevenuMensuel[], mois: CleMois): string | null {
  const [annee, numero] = mois.split('-').map(Number)
  const t = trimestre(annee, Math.floor((numero - 1) / 3) + 1)
  const memeTrimestreAvant = t.mois.map((m) => moisDecale(m, -12))
  const trimestreCette = moyenneSur(idPersonne, apres, t.mois)
  const trimestreAvant = moyenneSur(idPersonne, apres, memeTrimestreAvant)
  if (trimestreCette !== null && trimestreAvant !== null) {
    if (trimestreCette > trimestreAvant) return `🏆 Tu fais mieux que l'an dernier au même trimestre ! Bravo 💪`
    if (trimestreCette >= PRESQUE * trimestreAvant)
      return `🌱 Encore un petit effort et tu auras la même moyenne trimestrielle que l'an dernier à la même époque !`
  }

  const annuelle = (r: RevenuMensuel[], a: number) => moyenneSur(idPersonne, r, Array.from({ length: 12 }, (_, i) => cleMois(a, i + 1)))
  const cetteAnnee = annuelle(apres, annee)
  const anneeDerniere = annuelle(apres, annee - 1)
  if (cetteAnnee !== null && anneeDerniere !== null && cetteAnnee > anneeDerniere && (annuelle(avant, annee) ?? 0) <= anneeDerniere)
    return `🚀 Ta moyenne ${annee} passe au-dessus de celle de ${annee - 1}, chapeau !`

  const sixMois = Array.from({ length: MOIS_LISSAGE }, (_, i) => moisDecale(moisDeDate(new Date()), -i))
  const sixAvant = moyenneSur(idPersonne, avant, sixMois)
  const sixApres = moyenneSur(idPersonne, apres, sixMois)
  if (sixAvant !== null && sixApres !== null && sixApres > sixAvant)
    return `📈 Tu augmentes ta moyenne sur les 6 derniers mois : ${Math.round(sixApres / 100).toLocaleString('fr-FR')} € par mois !`

  if (cetteAnnee !== null && anneeDerniere !== null && cetteAnnee > anneeDerniere)
    return `✨ Ta moyenne augmente par rapport à l'année dernière, continue comme ça !`
  return null
}

// --- Le foyer dans les revenus ----------------------------------------------

/**
 * Revenu moyen sur les 12 derniers mois terminés (null tant qu'ils ne sont pas tous renseignés),
 * et sur l'année civile en cours (mois renseignés).
 */
export function moyennesRevenu(idPersonne: string, revenus: RevenuMensuel[], maintenant = new Date()) {
  const actuel = moisDeDate(maintenant)
  const annee = Number(actuel.slice(0, 4))
  const douze = Array.from({ length: 12 }, (_, i) => moisDecale(actuel, -(i + 1)))
  const siens = revenusDe(idPersonne, revenus)
  const douzeRenseignes = douze.filter((m) => siens.has(m)).length
  return {
    douzeMois: douzeRenseignes === 12 ? moyenneSur(idPersonne, revenus, douze) : null,
    douzeRenseignes,
    /** Revenu de référence : moyenne des 6 derniers mois saisis avant le mois en cours (part juste, conseil de remboursement). */
    reference: moyenneSur(idPersonne, revenus, [...revenusDe(idPersonne, revenus).keys()].filter((m) => m < actuel).sort((a, b) => b.localeCompare(a)).slice(0, MOIS_LISSAGE)),
    annee,
    anneeCivile: moyenneSur(idPersonne, revenus, Array.from({ length: 12 }, (_, i) => cleMois(annee, i + 1)).filter((m) => m <= actuel)),
  }
}

/** « crédimmo et remboursement déduits » : ce qui a été retiré du revenu, ou '' si rien. */
export function deductions(r: Pick<PartDuMois, 'credit' | 'remboursement'>): string {
  const liste = [r.credit > 0 && 'crédimmo', r.remboursement > 0 && 'remboursement'].filter(Boolean)
  if (liste.length === 0) return ''
  return `${liste.join(' et ')} déduit${liste.length > 1 ? 's' : ''}`
}

export interface PartDuMois {
  personne: Profil
  depense: number
  /** Revenu réel du mois (crédimmo et remboursement déduits), ou à défaut le revenu lissé ; null si aucun. */
  revenu: number | null
  /** Crédimmo déduit du revenu ce mois-là (0 si aucun). */
  credit: number
  /** Remboursement d'un prêt 2bebz à l'autre, déduit du revenu ce mois-là (0 si aucun). */
  remboursement: number
  /** Revenu réel (true) ou estimé (false). */
  reel: boolean
  /** depense / revenu, ou null sans revenu. */
  part: number | null
  /** Ce qui reste après sa part du foyer. */
  reste: number | null
  sousMinimum: boolean
}

/**
 * Pour un mois : ce que chacun·e a dépensé pour le foyer, rapporté à son revenu, et le minimum perso.
 * Le crédimmo et le remboursement d'un prêt 2bebz sont déduits du revenu (le prêt lui-même, non).
 */
export function partDuMois(personne: Profil, revenus: RevenuMensuel[], depenses: Depense[], mois: CleMois, prets: Pret[] = []): PartDuMois {
  const depense = depenses.filter((d) => d.user_id === personne.id && moisDeDate(d.spent_at) === mois).reduce((t, d) => t + d.amount_cents, 0)
  const reel = revenuReel(personne, revenus, mois)
  const credit = revenus.find((x) => x.user_id === personne.id && x.month.startsWith(mois))?.loan_cents ?? 0
  const brut = reel ?? revenuLisse(personne, revenus, mois)
  const remboursement = remboursementDuMois(personne.id, prets, mois)
  const revenu = brut === null ? null : Math.max(0, brut - credit - remboursement)
  const reste = revenu === null ? null : revenu - depense
  const minimum = personne.personal_minimum_cents ?? null
  return {
    personne,
    depense,
    revenu,
    credit,
    remboursement,
    reel: reel !== null,
    part: revenu ? depense / revenu : null,
    reste,
    sousMinimum: minimum !== null && minimum > 0 && reste !== null && reste < minimum,
  }
}
