import { supabase } from '../lib/supabase'
import type { CleMois } from '../domain/revenus'
import type { RevenuMensuel } from '../domain/types'

const COLONNES_REVENU = 'user_id, month, amount_cents'

/** Revenus mensuels du foyer (les miens et ceux de l'autre). */
export async function listerRevenus(): Promise<RevenuMensuel[]> {
  const { data, error } = await supabase.from('monthly_incomes').select(COLONNES_REVENU).order('month')
  if (error) throw error
  return data
}

/** Mes revenus mensuels, pour la carte « ton revenu de … ? » et les réglages. */
export async function mesRevenus(idUtilisateur: string): Promise<RevenuMensuel[]> {
  const { data, error } = await supabase.from('monthly_incomes').select(COLONNES_REVENU).eq('user_id', idUtilisateur).order('month')
  if (error) throw error
  return data
}

/** Enregistre (ou corrige) mon revenu net d'un mois. */
export async function enregistrerRevenu(idUtilisateur: string, mois: CleMois, centimes: number): Promise<RevenuMensuel> {
  const { data, error } = await supabase
    .from('monthly_incomes')
    .upsert({ user_id: idUtilisateur, month: `${mois}-01`, amount_cents: centimes }, { onConflict: 'user_id,month' })
    .select(COLONNES_REVENU)
    .single()
  if (error) throw error
  return data
}
