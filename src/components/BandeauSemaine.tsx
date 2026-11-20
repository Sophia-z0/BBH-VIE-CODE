import type { ReactNode } from 'react'
import { texteSur } from '../lib/couleurs'

/** Petit bandeau à ma couleur : libellé et détail à gauche, total à droite. */
export function BandeauSemaine({ couleur, libelle, valeur, detail }: { couleur: string; libelle: string; valeur: ReactNode; detail?: ReactNode }) {
  return (
    <section
      className="flex items-center justify-between gap-3 rounded-[1.75rem] px-5 py-3 shadow-md"
      style={{ backgroundColor: couleur, color: texteSur(couleur) }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold">{libelle}</p>
        {detail && <p className="truncate text-xs opacity-80">{detail}</p>}
      </div>
      <p className="flex-none text-3xl font-extrabold">{valeur}</p>
    </section>
  )
}
