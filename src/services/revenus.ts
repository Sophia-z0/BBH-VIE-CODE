import { supabase } from '../lib/supabase'
import type { CleMois } from '../domain/revenus'
import type { RevenuMensuel } from '../domain/types'

// « * » : loan_cents (migration 0014) est lu s'il existe, sans casser l'app avant.
const COLONNES_REVENU = '*'

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

/** Enregistre (ou efface, avec null) le crédit d'un mois dont le revenu est déjà saisi. */
export async function enregistrerCredit(idUtilisateur: string, mois: CleMois, centimes: number | null): Promise<RevenuMensuel> {
  const { data, error } = await supabase
    .from('monthly_incomes')
    .update({ loan_cents: centimes })
    .eq('user_id', idUtilisateur)
    .eq('month', `${mois}-01`)
    .select(COLONNES_REVENU)
    .single()
  if (error) throw error
  return data
}
