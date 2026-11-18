import { supabase } from '../lib/supabase'
import type { Foyer, Profil } from '../domain/types'

export interface DonneesFoyer {
  foyer: Foyer
  moi: Profil
  /** Les membres du foyer, moi compris (1 ou 2 personnes). */
  membres: Profil[]
}

const COLONNES_PROFIL = 'id, household_id, display_name, color, monthly_income_cents, notif_daily, notif_daily_time, notif_sunday'

/** Foyer de la personne connectée, ou null si elle n'en a pas encore. */
export async function chargerFoyer(idUtilisateur: string): Promise<DonneesFoyer | null> {
  const { data: membres, error } = await supabase.from('profiles').select(COLONNES_PROFIL).order('created_at')
  if (error) throw error
  const moi = membres.find((p) => p.id === idUtilisateur)
  if (!moi) return null

  const { data: foyer, error: erreurFoyer } = await supabase
    .from('households')
    .select('id, name, invite_code')
    .eq('id', moi.household_id)
    .single()
  if (erreurFoyer) throw erreurFoyer

  return { foyer, moi, membres }
}

export async function creerFoyer(nomFoyer: string, monNom: string, maCouleur: string) {
  const { error } = await supabase.rpc('create_household', {
    household_name: nomFoyer,
    my_name: monNom,
    my_color: maCouleur,
  })
  if (error) throw error
}

export async function rejoindreFoyer(code: string, monNom: string, maCouleur: string) {
  const { error } = await supabase.rpc('join_household', { code, my_name: monNom, my_color: maCouleur })
  if (error) throw error
}

export async function modifierMonProfil(
  id: string,
  champs: Partial<Pick<Profil, 'display_name' | 'color' | 'monthly_income_cents' | 'notif_daily' | 'notif_daily_time' | 'notif_sunday'>>,
) {
  const { error } = await supabase.from('profiles').update(champs).eq('id', id)
  if (error) throw error
}
