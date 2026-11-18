import { createClient } from '@supabase/supabase-js'

// On ne garde que https://<projet>.supabase.co : la page « Data API » de Supabase affiche
// l'adresse avec /rest/v1/ à la fin, ce qui casse la connexion si on la colle telle quelle.
const urlSaisie = import.meta.env.VITE_SUPABASE_URL
const url = urlSaisie ? new URL(urlSaisie).origin : undefined
const cleAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Faux tant que .env.local n'est pas rempli (voir README). */
export const supabaseConfigure = Boolean(url && cleAnon)

export const supabase = createClient(url ?? 'http://localhost', cleAnon ?? 'cle-absente')
