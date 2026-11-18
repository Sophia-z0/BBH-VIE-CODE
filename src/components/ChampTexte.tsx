import type { InputHTMLAttributes } from 'react'

export function ChampTexte({ libelle, ...props }: { libelle: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {libelle}
      <input
        className="rounded-xl border-2 border-orange/20 bg-white px-4 py-3 text-base font-normal outline-none focus:border-orange"
        {...props}
      />
    </label>
  )
}
