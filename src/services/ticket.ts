import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { ArticleTicket } from '../domain/types'

/** Ce que la fonction « lire-ticket » renvoie (chaîne vide / 0 quand c'est illisible). */
export interface LectureTicket {
  magasin: string
  /** AAAA-MM-JJ, ou chaîne vide. */
  date: string
  /** `categorie` : nom de la catégorie du foyer proposée pour l'article. */
  articles: (ArticleTicket & { categorie?: string })[]
  total_cents: number
}

/** Plus grand côté de la photo envoyée : assez pour lire un ticket, assez léger pour le réseau. */
const COTE_MAX = 1800

/** Réduit la photo en JPEG et renvoie son contenu en base64 (sans l'en-tête « data: »). */
async function photoEnBase64(fichier: File): Promise<string> {
  const image = await createImageBitmap(fichier)
  const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * echelle)
  canvas.height = Math.round(image.height * echelle)
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
  image.close()
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
}

/** Envoie la photo à la fonction Supabase, qui la lit avec Claude ; la photo n'est gardée nulle part. */
export async function lireTicket(fichier: File, categories: string[]): Promise<LectureTicket> {
  const image = await photoEnBase64(fichier)
  const { data, error } = await supabase.functions.invoke<LectureTicket>('lire-ticket', { body: { image, categories } })
  if (error) {
    const detail = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null
    throw new Error(detail?.erreur ?? 'Le ticket n’a pas pu être lu, réessaie avec une photo plus nette.')
  }
  if (!data) throw new Error('Le ticket n’a pas pu être lu.')
  return data
}
