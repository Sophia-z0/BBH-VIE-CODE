import type { ButtonHTMLAttributes } from 'react'

/** Gros bouton arrondi, pensé pour le pouce. */
export function Bouton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-full rounded-2xl bg-orange px-5 py-4 text-lg font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50 ${className}`}
      {...props}
    />
  )
}
