import { COULEURS, COULEURS_DOUCES } from '../domain/types'

/**
 * Choix de la couleur : pastilles douces et vives.
 * `compact` (réglages) : un menu dépliable discret qui montre la couleur actuelle, palette au toucher.
 */
export function ChoixCouleur({
  valeur,
  onChange,
  libelle = 'ta couleur',
  compact = false,
}: {
  valeur: string
  onChange: (couleur: string) => void
  libelle?: string
  compact?: boolean
}) {
  const pastille = (couleur: string) => (
    <button
      key={couleur}
      type="button"
      aria-label={couleur}
      aria-pressed={valeur === couleur}
      onClick={() => onChange(couleur)}
      className={`${compact ? 'size-8' : 'size-10'} rounded-full transition active:scale-90 ${valeur === couleur ? 'ring-4 ring-encre/30 ring-offset-2' : ''}`}
      style={{ backgroundColor: couleur }}
    />
  )
  const palette = (
    <>
      <p className="text-xs text-encre/50">douces</p>
      <div className="flex flex-wrap gap-3">{COULEURS_DOUCES.map(pastille)}</div>
      <p className="text-xs text-encre/50">vives</p>
      <div className="flex flex-wrap gap-3">{COULEURS.map(pastille)}</div>
    </>
  )
  if (compact)
    return (
      <details className="group rounded-2xl bg-white px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
          {libelle}
          <span className="flex items-center gap-2">
            <span className="size-6 rounded-full" style={{ backgroundColor: valeur }} />
            <span className="text-encre/40 transition group-open:rotate-180">▾</span>
          </span>
        </summary>
        <div className="mt-3 flex flex-col gap-2">{palette}</div>
      </details>
    )
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{libelle}</legend>
      {palette}
    </fieldset>
  )
}
