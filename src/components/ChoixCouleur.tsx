import { COULEURS } from '../domain/types'

export function ChoixCouleur({ valeur, onChange }: { valeur: string; onChange: (couleur: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">ta couleur</legend>
      <div className="flex flex-wrap gap-3">
        {COULEURS.map((couleur) => (
          <button
            key={couleur}
            type="button"
            aria-label={couleur}
            aria-pressed={valeur === couleur}
            onClick={() => onChange(couleur)}
            className={`size-10 rounded-full transition active:scale-90 ${valeur === couleur ? 'ring-4 ring-encre/30 ring-offset-2' : ''}`}
            style={{ backgroundColor: couleur }}
          />
        ))}
      </div>
    </fieldset>
  )
}
