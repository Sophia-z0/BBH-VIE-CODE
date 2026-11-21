import type { CleMois } from '../domain/revenus'
import type { NaturePret, Pret } from '../domain/prets'
import { supabase } from '../lib/supabase'

const COLONNES_PRET = 'id, from_user, to_user, month, kind, amount_cents'

/** Prêts et remboursements du foyer (visibles par les deux). Sans la migration 0015 : aucun. */
export async function listerPrets(): Promise<Pret[]> {
  const { data, error } = await supabase.from('loans').select(COLONNES_PRET).order('month')
  if (error) return []
  return data
}

/**
 * Inscrit (ou corrige, ou efface avec null) ce que je prête ou rembourse à l'autre un mois donné.
 * La base remplit la personne qui donne (moi), celle qui reçoit et le foyer.
 */
export async function enregistrerPret(idMoi: string, mois: CleMois, nature: NaturePret, centimes: number | null): Promise<Pret | null> {
  const month = `${mois}-01`
  if (centimes === null || centimes === 0) {
    const { error } = await supabase.from('loans').delete().eq('from_user', idMoi).eq('month', month).eq('kind', nature)
    if (error) throw error
    return null
  }
  const { data, error } = await supabase
    .from('loans')
    .upsert({ from_user: idMoi, month, kind: nature, amount_cents: centimes }, { onConflict: 'from_user,month,kind' })
    .select(COLONNES_PRET)
    .single()
  if (error) throw error
  return data
}
