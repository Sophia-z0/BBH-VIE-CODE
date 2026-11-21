import type { ArticleTicket } from '../domain/types'
import { formaterEuros } from '../lib/argent'

/** Menu dépliable « 🧾 n articles » : les articles d'une dépense lue sur un ticket, avec leur montant. */
export function DetailTicket({ articles }: { articles: ArticleTicket[] | null | undefined }) {
  if (!articles || articles.length === 0) return null
  return (
    <details className="text-xs font-normal text-encre/60">
      <summary className="cursor-pointer">
        🧾 {articles.length} article{articles.length > 1 ? 's' : ''}
      </summary>
      <ul>
        {articles.map((article, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span>{article.libelle}</span>
            <span>{formaterEuros(article.montant_cents)}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
