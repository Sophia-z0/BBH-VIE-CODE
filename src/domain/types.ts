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
}

/** Couleurs proposées pour distinguer les deux personnes dans le calendrier et les stats. */
export const COULEURS = ['#8b5cf6', '#22c55e', '#3b82f6', '#ec4899', '#eab308', '#14b8a6', '#ef4444', '#f97316']

export interface Tache {
  id: string
  name: string
  group_name: string
  emoji: string
  stars: number
  active: boolean
  sort_order: number
}

export interface LogTache {
  id: string
  task_id: string
  user_id: string
  done_at: string
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
  recurring_id: string | null
}

/** Service non chiffré (panier de légumes offert…), compté à part des dépenses. */
export interface Cadeau {
  id: string
  user_id: string
  description: string
  estimated_cents: number
  given_at: string
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
