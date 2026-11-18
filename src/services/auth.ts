import { supabase } from '../lib/supabase'

/**
 * Connexion par e-mail + mot de passe : aucune configuration d'e-mail côté Supabase,
 * et ça fonctionne dans l'app installée sur iPhone (pas de lien qui s'ouvre dans Safari).
 */
export async function seConnecter(email: string, motDePasse: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
  if (error) throw error
}

export async function creerCompte(email: string, motDePasse: string) {
  const { data, error } = await supabase.auth.signUp({ email, password: motDePasse })
  if (error) throw error
  // Sans session, Supabase attend une confirmation par e-mail (option « Confirm email » active).
  if (!data.session) throw new Error('Compte créé, mais Supabase demande une confirmation par e-mail : voir le README.')
}

export async function seDeconnecter() {
  await supabase.auth.signOut()
}
