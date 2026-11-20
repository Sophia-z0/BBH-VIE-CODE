import type { Ref } from 'react'
import type { Pose } from '../lib/envol'

export interface CartePile {
  id: string
  emoji: string
  nom: string
  /** Fond de la mini-carte (blanche, orangée, rose…). */
  classe: string
}

const VISIBLES = 6

/** Pose stable d'une carte (tirée de son id) : un tas un peu de travers, jamais une colonne droite. */
export function poseDe(id: string): Pose {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  const n = Math.abs(h)
  return { rotation: (n % 19) - 9, x: ((n >> 5) % 9) - 4, y: ((n >> 9) % 7) - 3 }
}

/**
 * Pile des cartes collectées cette semaine, la plus récente au-dessus.
 * `atterrissage` : la place où les cartes en vol viennent se poser.
 */
export function PileDeCartes({
  cartes,
  atterrissage,
  onAnnuler,
}: {
  cartes: CartePile[]
  atterrissage: Ref<HTMLDivElement>
  /** Présent juste après une collecte : propose d'annuler la dernière carte. */
  onAnnuler?: () => void
}) {
  const visibles = cartes.slice(0, VISIBLES).reverse()
  return (
    <div className="flex flex-none flex-col items-center gap-1">
      <div className="relative h-14 w-12" aria-label={`${cartes.length} carte${cartes.length > 1 ? 's' : ''} collectée${cartes.length > 1 ? 's' : ''}`}>
        <div ref={atterrissage} className="absolute inset-x-1 inset-y-0" />
        {cartes.length === 0 && <div className="absolute inset-x-1 inset-y-0 rounded-md border-2 border-dashed border-current opacity-30" />}
        {visibles.map((carte) => {
          const { x, y, rotation } = poseDe(carte.id)
          return (
            <div
              key={carte.id}
              title={carte.nom}
              className={`absolute inset-x-1 inset-y-0 flex items-center justify-center rounded-md border border-encre/10 text-lg shadow-sm ${carte.classe}`}
              style={{ transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)` }}
            >
              {carte.emoji}
            </div>
          )
        })}
      </div>
      {onAnnuler && (
        <button type="button" className="rounded-full bg-white/80 px-2 text-[10px] font-semibold text-encre" onClick={onAnnuler}>
          annuler
        </button>
      )}
    </div>
  )
}
