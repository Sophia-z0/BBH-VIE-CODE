import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { ArticleTicket } from '../domain/types'

/** Ce que la fonction « lire-ticket » renvoie (chaîne vide / 0 quand c'est illisible). */
export interface LectureTicket {
  magasin: string
  /** AAAA-MM-JJ, ou chaîne vide. */
  date: string
  /** HH:MM, ou chaîne vide. */
  heure: string
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
  return { ...data, date: normaliserDate(data.date), heure: normaliserHeure(data.heure) }
}

/** AAAA-MM-JJ, même si la lecture a renvoyé « 19/11/26 » ou « 19.11.2026 » ; chaîne vide sinon. */
function normaliserDate(brut: string | undefined): string {
  const date = (brut ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(date)
  if (!m) return ''
  const annee = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${annee}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

/** HH:MM, même si la lecture a renvoyé « 18h42 » ou « 18:42:05 » ; chaîne vide sinon. */
function normaliserHeure(brut: string | undefined): string {
  const m = /^(\d{1,2})[:hH](\d{2})/.exec((brut ?? '').trim())
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return ''
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

/**
 * Instant d'achat lu sur le ticket (heure du téléphone ; midi si l'heure est illisible),
 * ou null si la date est illisible.
 */
export function instantDAchat(lecture: Pick<LectureTicket, 'date' | 'heure'>): Date | null {
  if (!lecture.date) return null
  const instant = new Date(`${lecture.date}T${lecture.heure || '12:00'}`)
  return Number.isNaN(instant.getTime()) ? null : instant
}
