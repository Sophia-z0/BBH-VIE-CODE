import type { CleMois } from './revenus'
import type { Profil } from './types'

/**
 * Prêt 2bebz : argent prêté ou remboursé entre les deux membres du foyer (table loans, migration 0015).
 * Règle : on inscrit l'argent qui sort de sa poche, donc `from_user` est toujours la personne qui donne.
 */
export interface Pret {
  id: string
  from_user: string
  to_user: string
  /** Premier jour du mois, AAAA-MM-01. */
  month: string
  kind: 'pret' | 'remboursement'
  amount_cents: number
}

export type NaturePret = Pret['kind']

/** Montant inscrit par une personne pour un mois et une nature, s'il existe. */
export function montantPret(idPersonne: string, prets: Pret[], mois: CleMois, nature: NaturePret): number | undefined {
  return prets.find((p) => p.from_user === idPersonne && p.kind === nature && p.month.startsWith(mois))?.amount_cents
}

/** Ce qu'une personne a remboursé à l'autre ce mois-là (déduit de son revenu pour sa part du foyer). */
export function remboursementDuMois(idPersonne: string, prets: Pret[], mois: CleMois): number {
  return montantPret(idPersonne, prets, mois, 'remboursement') ?? 0
}

/**
 * Qui doit combien à qui. Tout ce qui sort de la poche de X (prêt ou remboursement) compte pour X :
 * solde = sorties de X − sorties de Y ; s'il est positif, Y doit ce solde à X.
 */
export function soldePrets(membres: Profil[], prets: Pret[]): { doit: Profil; a: Profil; montant: number } | null {
  const [x, y] = membres
  if (!x || !y) return null
  const sorties = (id: string) => prets.filter((p) => p.from_user === id).reduce((t, p) => t + p.amount_cents, 0)
  const solde = sorties(x.id) - sorties(y.id)
  if (solde === 0) return null
  return solde > 0 ? { doit: y, a: x, montant: solde } : { doit: x, a: y, montant: -solde }
}
