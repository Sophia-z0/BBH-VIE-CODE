import { useMemo, type CSSProperties } from 'react'
import { emojisDeFete, type Occasion } from '../domain/encouragements'

/**
 * Gerbe d'émojis qui partent du centre de l'écran. Changer `cle` relance l'animation.
 */
export function Celebration({ cle, occasion = 'tache' }: { cle: number; occasion?: Occasion }) {
  const particules = useMemo(
    () =>
      emojisDeFete(14, occasion).map((emoji, i) => {
        const angle = (i / 14) * 2 * Math.PI + Math.random() * 0.4
        const distance = 120 + Math.random() * 100
        return {
          emoji,
          style: {
            '--dx': `${Math.cos(angle) * distance}px`,
            '--dy': `${Math.sin(angle) * distance - 60}px`,
            '--rot': `${Math.random() * 120 - 60}deg`,
            animation: `jaillir 900ms ease-out ${Math.random() * 120}ms forwards`,
          } as CSSProperties,
        }
      }),
    // Nouvelle gerbe à chaque log.
    [cle, occasion],
  )

  return (
    <div key={cle} className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-hidden>
      {particules.map(({ emoji, style }, i) => (
        <span key={i} className="absolute text-3xl" style={style}>
          {emoji}
        </span>
      ))}
    </div>
  )
}
