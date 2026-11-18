import type { ParPersonne } from '../domain/stats'

/** Barre empilée aux couleurs de chaque personne, avec les valeurs en dessous. */
export function BarreRepartition({
  libelle,
  emoji,
  parPersonne,
  formater,
}: {
  libelle: string
  emoji?: string
  parPersonne: ParPersonne
  formater: (valeur: number) => string
}) {
  const total = parPersonne.reduce((t, x) => t + x.valeur, 0)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">
          {emoji && `${emoji} `}
          {libelle}
        </span>
        <span className="text-encre/50">{formater(total)}</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-creme">
        {parPersonne.map(({ personne, valeur }) => (
          <div key={personne.id} style={{ width: `${total > 0 ? (valeur / total) * 100 : 0}%`, backgroundColor: personne.color }} />
        ))}
      </div>
      <div className="flex justify-between text-xs text-encre/60">
        {parPersonne.map(({ personne, valeur }) => (
          <span key={personne.id}>
            {personne.display_name} {formater(valeur)}
            {total > 0 && ` (${Math.round((valeur / total) * 100)} %)`}
          </span>
        ))}
      </div>
    </div>
  )
}
