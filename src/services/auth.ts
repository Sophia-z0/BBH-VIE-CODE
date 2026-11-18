import { supabase } from '../lib/supabase'

/**
 * Envoie un e-mail contenant un code à usage unique (et un lien magique).
 * On privilégie le code : sur iPhone, un lien s'ouvre dans Safari et non dans l'app installée.
 */
export async function envoyerCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  })
  if (error) throw error
}

export async function verifierCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
  if (error) throw error
}

export async function seDeconnecter() {
  await supabase.auth.signOut()
}
