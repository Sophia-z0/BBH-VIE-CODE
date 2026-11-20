import { COULEURS, COULEURS_DOUCES } from '../domain/types'

export function ChoixCouleur({ valeur, onChange }: { valeur: string; onChange: (couleur: string) => void }) {
  const pastille = (couleur: string) => (
    <button
      key={couleur}
      type="button"
      aria-label={couleur}
      aria-pressed={valeur === couleur}
      onClick={() => onChange(couleur)}
      className={`size-10 rounded-full transition active:scale-90 ${valeur === couleur ? 'ring-4 ring-encre/30 ring-offset-2' : ''}`}
      style={{ backgroundColor: couleur }}
    />
  )
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">ta couleur</legend>
      <p className="text-xs text-encre/50">douces</p>
      <div className="flex flex-wrap gap-3">{COULEURS_DOUCES.map(pastille)}</div>
      <p className="text-xs text-encre/50">vives</p>
      <div className="flex flex-wrap gap-3">{COULEURS.map(pastille)}</div>
    </fieldset>
  )
}
