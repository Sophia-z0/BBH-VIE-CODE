import { jourParis } from '../domain/calendrier'
import { semaineDe } from '../domain/semaine'
import { toutesLesPages } from '../lib/pagination'
import { supabase } from '../lib/supabase'
import type { ArticleTicket, Cadeau, Categorie, Depense, DepenseRecurrente } from '../domain/types'

const COLONNES_CATEGORIE = 'id, name, emoji, is_recurring, active, sort_order'
const COLONNES_DEPENSE = 'id, user_id, category_id, amount_cents, tag, note, spent_at, recurring_id, items, created_at'
const COLONNES_CADEAU = 'id, user_id, description, estimated_cents, given_at, created_at'
const COLONNES_RECURRENTE = 'id, user_id, category_id, amount_cents, tag, frequency, day_of_month, month_of_year, active'

// --- Catégories -------------------------------------------------------

export async function listerCategories(): Promise<Categorie[]> {
  const { data, error } = await supabase.from('expense_categories').select(COLONNES_CATEGORIE).order('sort_order').order('name')
  if (error) throw error
  return data
}

export async function creerCategorie(householdId: string, categorie: Pick<Categorie, 'name' | 'emoji' | 'is_recurring'>) {
  const { error } = await supabase.from('expense_categories').insert({ ...categorie, household_id: householdId, sort_order: 1000 })
  if (error) throw error
}

export async function modifierCategorie(id: string, champs: Partial<Omit<Categorie, 'id'>>) {
  const { error } = await supabase.from('expense_categories').update(champs).eq('id', id)
  if (error) throw error
}

/** Enregistre un nouvel ordre des catégories (position ×10), comme pour les tâches. */
export async function reordonnerCategories(categories: Categorie[]) {
  await Promise.all(
    categories.map((c, i) => ((i + 1) * 10 === c.sort_order ? null : modifierCategorie(c.id, { sort_order: (i + 1) * 10 }))),
  )
}

// --- Dépenses ---------------------------------------------------------

export async function ajouterDepense(depense: {
  category_id: string
  amount_cents: number
  tag: string
  spent_at: Date
  items?: ArticleTicket[]
}): Promise<Depense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...depense, spent_at: depense.spent_at.toISOString() })
    .select(COLONNES_DEPENSE)
    .single()
  if (error) throw error
  return data
}

export async function supprimerDepense(id: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

/** Dépenses visibles (les miennes, et celles de l'autre déjà révélées) sur une période. */
export function depensesEntre(debut: Date, fin: Date): Promise<Depense[]> {
  return toutesLesPages((de, a) =>
    supabase
      .from('expenses')
      .select(COLONNES_DEPENSE)
      .gte('spent_at', debut.toISOString())
      .lt('spent_at', fin.toISOString())
      .order('spent_at', { ascending: false })
      .order('id')
      .range(de, a),
  )
}

/** Mes étiquettes les plus utilisées, pour les proposer en un tap. */
export async function mesEtiquettesFrequentes(idUtilisateur: string, nombre = 8): Promise<string[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('tag')
    .eq('user_id', idUtilisateur)
    .not('tag', 'is', null)
    .order('spent_at', { ascending: false })
    .limit(200)
  if (error) throw error
  const compte = new Map<string, number>()
  for (const { tag } of data) compte.set(tag, (compte.get(tag) ?? 0) + 1)
  return [...compte.entries()].sort((a, b) => b[1] - a[1]).slice(0, nombre).map(([tag]) => tag)
}

// --- Cadeaux ----------------------------------------------------------

export async function ajouterCadeau(cadeau: { description: string; estimated_cents: number; given_at: Date }): Promise<Cadeau> {
  const { data, error } = await supabase
    .from('gifts')
    .insert({ ...cadeau, given_at: cadeau.given_at.toISOString() })
    .select(COLONNES_CADEAU)
    .single()
  if (error) throw error
  return data
}

export async function supprimerCadeau(id: string) {
  const { error } = await supabase.from('gifts').delete().eq('id', id)
  if (error) throw error
}

export function cadeauxEntre(debut: Date, fin: Date): Promise<Cadeau[]> {
  return toutesLesPages((de, a) =>
    supabase
      .from('gifts')
      .select(COLONNES_CADEAU)
      .gte('given_at', debut.toISOString())
      .lt('given_at', fin.toISOString())
      .order('given_at', { ascending: false })
      .order('id')
      .range(de, a),
  )
}

// --- Dépenses récurrentes ---------------------------------------------

export async function listerRecurrentes(): Promise<DepenseRecurrente[]> {
  const { data, error } = await supabase.from('recurring_expenses').select(COLONNES_RECURRENTE).order('day_of_month')
  if (error) throw error
  return data
}

export async function creerRecurrente(
  recurrente: Pick<DepenseRecurrente, 'category_id' | 'amount_cents' | 'tag' | 'frequency' | 'day_of_month' | 'month_of_year'>,
) {
  // Génération à partir du début de la semaine de jeu en cours : une échéance déjà passée cette
  // semaine (ou aujourd'hui) est créée tout de suite, au lieu d'attendre le mois suivant.
  const { error } = await supabase.from('recurring_expenses').insert({ ...recurrente, last_generated_on: jourParis(semaineDe().debut) })
  if (error) throw error
}

export async function modifierRecurrente(id: string, champs: Partial<Omit<DepenseRecurrente, 'id' | 'user_id'>>) {
  const { error } = await supabase.from('recurring_expenses').update(champs).eq('id', id)
  if (error) throw error
}

export async function supprimerRecurrente(id: string) {
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
  if (error) throw error
}

/** Crée les dépenses récurrentes arrivées à échéance depuis la dernière ouverture. */
export async function genererRecurrentes() {
  const { error } = await supabase.rpc('generate_recurring_expenses')
  if (error) throw error
}
