/** Lignes des tables Supabase, telles que renvoyées par l'API (noms de colonnes en snake_case). */

export interface Foyer {
  id: string
  name: string
  invite_code: string
}

export interface Profil {
  id: string
  household_id: string
  display_name: string
  color: string
  monthly_income_cents: number | null
  notif_daily: boolean
  /** « HH:MM:SS », heure de Paris, par quart d'heure. */
  notif_daily_time: string
  notif_sunday: boolean
  /** Pour accorder les badges ; absent tant que la migration 0012 n'est pas passée ou pas choisi. */
  gender?: Genre | null
  /** Minimum à garder chaque mois après sa part du foyer (migration 0013, facultatif). */
  personal_minimum_cents?: number | null
  /** L'autre voit l'alerte « sous son minimum » (jamais le montant). */
  share_minimum?: boolean
}

/** elle = bibliƶatrice, il = bibliƶateur, iel = forme inclusive. */
export type Genre = 'elle' | 'il' | 'iel'

/** Couleurs vives proposées pour distinguer les deux personnes dans le calendrier et les stats. */
export const COULEURS = ['#8b5cf6', '#22c55e', '#3b82f6', '#ec4899', '#eab308', '#14b8a6', '#ef4444', '#f97316']

/** Couleurs douces : lavande, menthe, pêche, rose poudré, bleu ciel, citron, corail, sauge. */
export const COULEURS_DOUCES = ['#c4b5fd', '#99e2c4', '#fdc08f', '#f6b3cf', '#9fd3f5', '#f7e07c', '#f9a291', '#b2c9a0']

export interface Tache {
  id: string
  name: string
  group_name: string
  emoji: string
  stars: number
  active: boolean
  sort_order: number
  /** Tâche du quotidien : en premier dans son groupe (colonne ajoutée par la migration 0009). */
  everyday: boolean
}

export interface LogTache {
  id: string
  task_id: string
  user_id: string
  done_at: string
  /** Moment de l'ajout dans l'app (ordre de la pile de cartes). */
  created_at?: string
  shared: boolean
  stars: number
}

/** Nuit passée hors de la maison (« night » au format AAAA-MM-JJ). */
export interface Absence {
  user_id: string
  night: string
}

export interface Categorie {
  id: string
  name: string
  emoji: string
  is_recurring: boolean
  active: boolean
  sort_order: number
}

export interface Depense {
  id: string
  user_id: string
  category_id: string
  amount_cents: number
  tag: string | null
  note: string | null
  spent_at: string
  /** Moment de l'ajout dans l'app (ordre de la pile de cartes). */
  created_at?: string
  recurring_id: string | null
  /** Articles retenus quand la dépense vient d'un ticket de caisse (migration 0010). */
  items?: ArticleTicket[] | null
}

/** Ligne d'un ticket de caisse ; montant négatif pour une remise. */
/** Revenu net d'un mois (table monthly_incomes). */
export interface RevenuMensuel {
  user_id: string
  /** Premier jour du mois, AAAA-MM-01. */
  month: string
  amount_cents: number
  /** Part du revenu du mois partie dans un crédit (migration 0014), déduite pour la part du foyer et le minimum. */
  loan_cents?: number | null
}

export interface ArticleTicket {
  libelle: string
  montant_cents: number
}

/** Service non chiffré (panier de légumes offert…), compté à part des dépenses. */
export interface Cadeau {
  id: string
  user_id: string
  description: string
  estimated_cents: number
  given_at: string
  /** Moment de l'ajout dans l'app (ordre de la pile de cartes). */
  created_at?: string
}

export interface DepenseRecurrente {
  id: string
  user_id: string
  category_id: string
  amount_cents: number
  tag: string | null
  frequency: 'mensuel' | 'annuel'
  day_of_month: number
  month_of_year: number | null
  active: boolean
}
