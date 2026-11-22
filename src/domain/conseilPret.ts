import { moisDeDate, moisDecale, type CleMois } from './revenus'
import type { Depense, Profil, RevenuMensuel } from './types'

/** Fenêtre du conseil : les 6 derniers mois terminés. */
const MOIS_CONSEIL = 6

/** Trois rythmes de remboursement, en part de la marge mensuelle. */
const RYTHMES = [
  { cle: 'tranquille', emoji: '🐢', part: 0.1 },
  { cle: 'equilibre', emoji: '🤝', part: 0.2 },
  { cle: 'rapide', emoji: '🚀', part: 0.35 },
] as const

export interface RythmeRemboursement {
  cle: (typeof RYTHMES)[number]['cle']
  emoji: string
  part: number
  /** Virement mensuel proposé, arrondi à la dizaine d'euros. */
  mensualite: number
  /** Nombre de mois pour solder (le dernier virement est plus petit). */
  duree: number
}

export type ConseilPret =
  | { type: 'sans-revenu' }
  | {
      type: 'calcul'
      /** Mois de la fenêtre où le revenu est saisi (moins de 6 : on le dit). */
      nbMois: number
      revenu: number
      credimmo: number
      foyer: number
      minimum: number
      /** revenu − crédimmo − part du foyer − minimum perso, par mois. */
      marge: number
      /** Vide quand la marge est sous 10 € par mois (ou négative). */
      rythmes: RythmeRemboursement[]
    }

const aLaDizaine = (centimes: number) => Math.max(1000, Math.round(centimes / 1000) * 1000)

/**
 * Conseil de remboursement d'un prêt 2bebz pour la personne qui doit `solde` : moyennes de ses
 * 6 derniers mois terminés (revenu saisi, crédimmo, ses dépenses pour le foyer), moins son minimum perso,
 * puis 10 / 20 / 35 % de cette marge chaque mois.
 */
export function conseilRemboursement(
  personne: Profil,
  solde: number,
  revenus: RevenuMensuel[],
  depenses: Depense[],
  maintenant = new Date(),
): ConseilPret {
  const actuel = moisDeDate(maintenant)
  const fenetre: CleMois[] = Array.from({ length: MOIS_CONSEIL }, (_, i) => moisDecale(actuel, -(i + 1)))
  const siens = new Map(revenus.filter((r) => r.user_id === personne.id).map((r) => [r.month.slice(0, 7), r]))
  const mois = fenetre.filter((m) => siens.has(m))
  if (mois.length === 0) return { type: 'sans-revenu' }

  const moyenne = (valeur: (m: CleMois) => number) => mois.reduce((t, m) => t + valeur(m), 0) / mois.length
  const revenu = moyenne((m) => siens.get(m)!.amount_cents)
  const credimmo = moyenne((m) => siens.get(m)!.loan_cents ?? 0)
  const foyer = moyenne((m) =>
    depenses.filter((d) => d.user_id === personne.id && moisDeDate(d.spent_at) === m).reduce((t, d) => t + d.amount_cents, 0),
  )
  const minimum = personne.personal_minimum_cents ?? 0
  const marge = revenu - credimmo - foyer - minimum

  const rythmes =
    marge < 1000
      ? []
      : RYTHMES.map((r) => {
          const mensualite = Math.min(aLaDizaine(marge * r.part), solde)
          return { ...r, mensualite, duree: Math.ceil(solde / mensualite) }
        })
  return { type: 'calcul', nbMois: mois.length, revenu, credimmo, foyer, minimum, marge, rythmes }
}
