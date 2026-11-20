import { useMemo, type CSSProperties } from 'react'

/** Pluie d'émojis qui tombent du haut de l'écran sur toute la largeur. Changer `cle` relance l'averse. */
export function PluieEmojis({ cle, emojis, nombre = 36 }: { cle: number; emojis: string[]; nombre?: number }) {
  const gouttes = useMemo(
    () =>
      Array.from({ length: nombre }, (_, i) => ({
        emoji: emojis[i % emojis.length],
        style: {
          left: `${Math.random() * 96}%`,
          fontSize: `${1.4 + Math.random() * 1.4}rem`,
          '--delai': `${Math.random() * 1.6}s`,
          '--duree': `${2.4 + Math.random() * 1.6}s`,
          '--rot': `${Math.random() * 360 - 180}deg`,
        } as CSSProperties,
      })),
    // Nouvelle averse à chaque changement de clé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cle, nombre],
  )
  return (
    <div key={cle} className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      {gouttes.map(({ emoji, style }, i) => (
        <span key={i} className="goutte-pluie absolute top-0" style={style}>
          {emoji}
        </span>
      ))}
    </div>
  )
}
