import { useEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import { PILE_FIDGET } from '../lib/options'
import { cliquetisCarte, cliquetisToucher } from '../lib/cliquetis'
import type { Pose } from '../lib/envol'

export interface CartePile {
  id: string
  emoji: string
  nom: string
  /** Fond de la mini-carte (blanche, orangée, rose…). */
  classe: string
}

const VISIBLES = 6
/** Cartes qui retombent quand on remue la pile (les plus récentes). */
const EN_CASCADE = 24
/** Durée totale de la cascade, quel que soit le nombre de cartes. */
const DUREE_CASCADE_MS = 1600
/** Écart maximal entre deux cartes qui retombent. */
const PAS_MAX_MS = 110
/** Durée de chute d'une carte (garder en accord avec .carte-tombe dans index.css). */
const CHUTE_MS = 380

/**
 * Ordre de la pile : la dernière carte ajoutée au-dessus, quelle que soit la date du log
 * (un log d'hier ajouté maintenant se pose sur la pile). `ajout` vide = tout en dessous.
 */
export function parAjout<T>(entrees: T[], ajout: (e: T) => string | undefined): T[] {
  return [...entrees].sort((a, b) => (ajout(b) ?? '').localeCompare(ajout(a) ?? ''))
}

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
  // Chaque toucher relance la cascade (nouvelle clé = animations rejouées).
  const [cascade, setCascade] = useState(0)
  const visibles = cartes.slice(0, cascade > 0 ? EN_CASCADE : VISIBLES).reverse()
  const pas = Math.min(PAS_MAX_MS, DUREE_CASCADE_MS / Math.max(visibles.length, 1))

  // Cascade finie : retour à la pile au repos (sinon une carte collectée ensuite retomberait aussi).
  const minuteurs = useRef<ReturnType<typeof setTimeout>[]>([])
  const vider = () => {
    minuteurs.current.forEach(clearTimeout)
    minuteurs.current = []
  }
  useEffect(() => vider, [])

  function remuer() {
    vider()
    setCascade((n) => n + 1)
    // Micro-vibration à chaque carte qui touche la pile (Android) ; cliquetis sonore sur iPhone.
    const n = Math.min(cartes.length, EN_CASCADE)
    const pasCascade = Math.min(PAS_MAX_MS, DUREE_CASCADE_MS / Math.max(n, 1))
    cliquetisToucher()
    for (let i = 0; i < n; i++) {
      minuteurs.current.push(setTimeout(cliquetisCarte, 120 + i * pasCascade + CHUTE_MS * 0.7))
    }
    minuteurs.current.push(setTimeout(() => setCascade(0), 120 + n * pasCascade + CHUTE_MS + 300))
  }

  const pile = (
    <div
      key={cascade}
      className={`relative h-14 w-12 ${cascade > 0 ? 'pile-souleve z-10' : ''}`}
      aria-label={`${cartes.length} carte${cartes.length > 1 ? 's' : ''} collectée${cartes.length > 1 ? 's' : ''}`}
    >
      <div ref={atterrissage} className="absolute inset-x-1 inset-y-0" />
      {cartes.length === 0 && <div className="absolute inset-x-1 inset-y-0 rounded-md border-2 border-dashed border-current opacity-30" />}
      {visibles.map((carte, i) => {
        const { x, y, rotation } = poseDe(carte.id)
        const style = {
          transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
          '--x': `${x}px`,
          '--y': `${y}px`,
          '--r': `${rotation}deg`,
          animationDelay: `${120 + i * pas}ms`,
        } as CSSProperties
        return (
          <div
            key={carte.id}
            title={carte.nom}
            className={`absolute inset-x-1 inset-y-0 flex items-center justify-center rounded-md border border-encre/10 text-lg shadow-sm ${carte.classe} ${cascade > 0 ? 'carte-tombe' : ''}`}
            style={style}
          >
            {carte.emoji}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-none flex-col items-center gap-1">
      {PILE_FIDGET && cartes.length > 0 ? (
        <button type="button" aria-label="remuer la pile" className="rounded-md" onClick={remuer}>
          {pile}
        </button>
      ) : (
        pile
      )}
      {onAnnuler && (
        <button type="button" className="rounded-full bg-white/80 px-2 text-[10px] font-semibold text-encre" onClick={onAnnuler}>
          annuler
        </button>
      )}
    </div>
  )
}
