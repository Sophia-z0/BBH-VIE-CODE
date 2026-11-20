import { useEffect, useRef, useState } from 'react'
import { envoler } from '../lib/envol'
import { poseDe } from './PileDeCartes'

/** Temps de lecture du message au dos, puis temps du retournement, avant l'envol. */
const DUREE_MESSAGE_MS = 1800
const DUREE_RETOURNEMENT_MS = 500
/** Fenêtre pendant laquelle « annuler » reste proposé (au dos, puis sur la pile). */
const DUREE_ANNULATION_MS = 6000

/**
 * Collecte d'une carte : message au dos, la tuile se remet à l'endroit, puis une copie vole
 * jusqu'à la pile. `enVol` : id de l'entrée pas encore posée (à cacher de la pile pendant le vol).
 */
export function useCollecte(fermerMessage: () => void) {
  const [enVol, setEnVol] = useState<string | null>(null)
  const [annulable, setAnnulable] = useState<string | null>(null)
  const atterrissage = useRef<HTMLDivElement>(null)
  const minuteurs = useRef<ReturnType<typeof setTimeout>[]>([])
  const courante = useRef<{ cleTuile: string; id: string } | null>(null)
  const fermer = useRef(fermerMessage)
  useEffect(() => {
    fermer.current = fermerMessage
  })

  const vider = () => {
    minuteurs.current.forEach(clearTimeout)
    minuteurs.current = []
  }
  useEffect(() => vider, [])

  async function envolerCarte(cleTuile: string, id: string) {
    const source = document.querySelector<HTMLElement>(`[data-carte="${CSS.escape(cleTuile)}"]`)
    if (source && atterrissage.current) await envoler(source, atterrissage.current, poseDe(id))
    setEnVol((v) => (v === id ? null : v))
  }

  function retourner() {
    const c = courante.current
    if (!c) return
    courante.current = null
    minuteurs.current.forEach(clearTimeout)
    fermer.current()
    minuteurs.current = [
      setTimeout(() => envolerCarte(c.cleTuile, c.id), DUREE_RETOURNEMENT_MS),
      setTimeout(() => setAnnulable((a) => (a === c.id ? null : a)), DUREE_ANNULATION_MS - DUREE_MESSAGE_MS),
    ]
  }

  /** Une entrée vient d'être créée depuis la tuile `cleTuile`. */
  function collecter(cleTuile: string, id: string) {
    vider()
    courante.current = { cleTuile, id }
    setEnVol(id)
    setAnnulable(id)
    minuteurs.current = [setTimeout(retourner, DUREE_MESSAGE_MS)]
  }

  /** L'entrée a été annulée : plus rien à faire voler. */
  function oublier(id: string) {
    if (courante.current?.id === id) {
      courante.current = null
      vider()
    }
    setEnVol((v) => (v === id ? null : v))
    setAnnulable((a) => (a === id ? null : a))
  }

  return { enVol, annulable, atterrissage, collecter, accelerer: retourner, oublier }
}
