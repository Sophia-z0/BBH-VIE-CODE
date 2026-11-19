import { useState, type ReactNode } from 'react'

/** Ce qu'affiche le dos d'une tuile retournée. */
export interface Dos {
  gain: string
  message: string
  /** Absent : pas de bouton « annuler » (ex. message d'aide). */
  onAnnuler?: () => void
}

/**
 * Tuile verticale de taille fixe qui se retourne pour montrer un message (validation d'un log).
 * Le parent décide quand elle est retournée (`dos`) ; toucher le dos la referme.
 */
export function TuileRetournable({
  dos,
  onTap,
  onFermer,
  classeFace,
  children,
}: {
  dos: Dos | null
  onTap: () => void
  onFermer: () => void
  /** Fond et effets de la face (blanche, rayonnante…). */
  classeFace: string
  children: ReactNode
}) {
  // Garde le dernier dos pendant que la tuile se referme, pour qu'il ne disparaisse pas en pleine rotation.
  const [dernierDos, setDernierDos] = useState(dos)
  if (dos && (dos.gain !== dernierDos?.gain || dos.message !== dernierDos?.message)) setDernierDos(dos)
  const retournee = dos !== null
  const affiche = dos ?? dernierDos

  return (
    <div className="h-40 w-28 flex-none snap-start [perspective:800px]">
      <div className={`tuile-carte relative h-full w-full ${retournee ? 'tuile-carte-retournee' : ''}`}>
        <button
          type="button"
          onClick={onTap}
          tabIndex={retournee ? -1 : 0}
          aria-hidden={retournee}
          className={`tuile-face absolute inset-0 flex flex-col items-center justify-between rounded-2xl p-3 text-center transition active:scale-95 ${classeFace}`}
        >
          {children}
        </button>
        <div
          role="status"
          aria-hidden={!retournee}
          onClick={onFermer}
          className="tuile-face tuile-dos absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-creme p-3 text-center text-encre ring-2 ring-orange/30 ring-inset"
        >
          {affiche && (
            <>
              <span className="text-lg leading-tight font-extrabold text-orange">{affiche.gain}</span>
              <span className="text-xs leading-snug">{affiche.message}</span>
              {retournee && affiche.onAnnuler && (
                <button
                  type="button"
                  className="mt-1 text-xs text-encre/50 underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    affiche.onAnnuler?.()
                  }}
                >
                  annuler
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
