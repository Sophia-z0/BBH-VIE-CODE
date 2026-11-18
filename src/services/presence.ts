import { supabase } from '../lib/supabase'
import type { CleJour } from '../domain/calendrier'
import type { Absence } from '../domain/types'

/** Absences visibles (les miennes, et celles de l'autre déjà révélées) entre deux nuits incluses. */
export async function listerAbsences(premiereNuit: CleJour, derniereNuit: CleJour): Promise<Absence[]> {
  const { data, error } = await supabase
    .from('absences')
    .select('user_id, night')
    .gte('night', premiereNuit)
    .lte('night', derniereNuit)
  if (error) throw error
  return data
}

export async function marquerAbsence(nuit: CleJour) {
  const { error } = await supabase.from('absences').insert({ night: nuit })
  if (error) throw error
}

export async function retirerAbsence(idUtilisateur: string, nuit: CleJour) {
  const { error } = await supabase.from('absences').delete().eq('user_id', idUtilisateur).eq('night', nuit)
  if (error) throw error
}
