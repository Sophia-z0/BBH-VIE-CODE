import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const cleAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Faux tant que .env.local n'est pas rempli (voir README). */
export const supabaseConfigure = Boolean(url && cleAnon)

export const supabase = createClient(url ?? 'http://localhost', cleAnon ?? 'cle-absente')
