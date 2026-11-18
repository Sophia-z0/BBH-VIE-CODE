import { toutesLesPages } from '../lib/pagination'
import { supabase } from '../lib/supabase'
import type { LogTache, Tache } from '../domain/types'

const COLONNES_TACHE = 'id, name, group_name, emoji, stars, active, sort_order'
const COLONNES_LOG = 'id, task_id, user_id, done_at, shared, stars'

/** Catalogue du foyer, tâches désactivées comprises (elles restent utiles pour l'historique). */
export async function listerTaches(): Promise<Tache[]> {
  const { data, error } = await supabase.from('tasks').select(COLONNES_TACHE).order('sort_order').order('name')
  if (error) throw error
  return data
}

export async function creerTache(householdId: string, tache: Pick<Tache, 'name' | 'group_name' | 'emoji' | 'stars'>) {
  const { error } = await supabase.from('tasks').insert({ ...tache, household_id: householdId, sort_order: 1000 })
  if (error) throw error
}

export async function modifierTache(id: string, champs: Partial<Omit<Tache, 'id'>>) {
  const { error } = await supabase.from('tasks').update(champs).eq('id', id)
  if (error) throw error
}

/** Les étoiles, l'auteur·ice et le foyer sont remplis par la base, pour éviter toute triche. */
export async function loguerTache(taskId: string, faitLe: Date, aDeux: boolean): Promise<LogTache> {
  const { data, error } = await supabase
    .from('task_logs')
    .insert({ task_id: taskId, done_at: faitLe.toISOString(), shared: aDeux })
    .select(COLONNES_LOG)
    .single()
  if (error) throw error
  return data
}

export async function supprimerLog(id: string) {
  const { error } = await supabase.from('task_logs').delete().eq('id', id)
  if (error) throw error
}

/** Mes logs depuis le début de la semaine de jeu (ceux de l'autre restent masqués jusqu'au reveal). */
export async function mesLogsDepuis(idUtilisateur: string, debut: Date): Promise<LogTache[]> {
  const { data, error } = await supabase
    .from('task_logs')
    .select(COLONNES_LOG)
    .eq('user_id', idUtilisateur)
    .gte('done_at', debut.toISOString())
    .order('done_at', { ascending: false })
  if (error) throw error
  return data
}

/** Logs visibles (les miens, et ceux de l'autre déjà révélés) sur une période. */
export function logsEntre(debut: Date, fin: Date): Promise<LogTache[]> {
  return toutesLesPages((de, a) =>
    supabase
      .from('task_logs')
      .select(COLONNES_LOG)
      .gte('done_at', debut.toISOString())
      .lt('done_at', fin.toISOString())
      .order('done_at')
      .order('id')
      .range(de, a),
  )
}
