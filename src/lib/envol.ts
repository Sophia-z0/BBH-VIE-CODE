/** Où et comment une carte est posée sur la pile, par rapport au point d'atterrissage. */
export interface Pose {
  x: number
  y: number
  rotation: number
}

const reduireAnimations = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Fait voler une copie de `source` jusqu'à `cible` (le point d'atterrissage de la pile),
 * en rétrécissant et en tournant, façon solitaire. La tuile d'origine est cachée pendant le vol,
 * puis réapparaît avec un petit « pop » (on peut refaire la même tâche).
 */
export async function envoler(source: HTMLElement, cible: HTMLElement, pose: Pose): Promise<void> {
  if (reduireAnimations()) return
  const depart = source.getBoundingClientRect()
  const arrivee = cible.getBoundingClientRect()
  const echelle = arrivee.width / depart.width
  const dx = arrivee.left + arrivee.width / 2 + pose.x - (depart.left + depart.width / 2)
  const dy = arrivee.top + arrivee.height / 2 + pose.y - (depart.top + depart.height / 2)

  const copie = source.cloneNode(true) as HTMLElement
  copie.removeAttribute('data-carte')
  copie.setAttribute('aria-hidden', 'true')
  Object.assign(copie.style, {
    position: 'fixed',
    left: `${depart.left}px`,
    top: `${depart.top}px`,
    width: `${depart.width}px`,
    height: `${depart.height}px`,
    margin: '0',
    zIndex: '50',
    pointerEvents: 'none',
  })
  document.body.appendChild(copie)
  source.style.visibility = 'hidden'

  try {
    await copie.animate(
      [
        { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
        { transform: 'translate(0, -12px) scale(1.06) rotate(-3deg)', offset: 0.18 },
        { transform: `translate(${dx}px, ${dy}px) scale(${echelle}) rotate(${pose.rotation}deg)` },
      ],
      { duration: 650, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' },
    ).finished
  } catch {
    // animation interrompue : rien à faire
  } finally {
    copie.remove()
    source.style.visibility = ''
    source.animate(
      [
        { opacity: 0, transform: 'scale(0.85)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { duration: 250, easing: 'ease-out' },
    )
  }
}
