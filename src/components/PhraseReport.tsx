import type { Report } from '../domain/revenus'
import type { Profil } from '../domain/types'
import { formaterEuros } from '../lib/argent'

/** Explique le report du trimestre précédent : qui paie un peu plus, qui un peu moins, et pourquoi. */
export function PhraseReport({ report, personnes }: { report: Report; personnes: Profil[] }) {
  const [plus] = personnes.filter((p) => (report.montants.get(p.id) ?? 0) > 0)
  const autre = plus && personnes.find((p) => p.id !== plus.id)
  if (!plus && report.enAttente.length === 0) return null
  return (
    <p className="rounded-2xl bg-creme p-3 text-xs leading-relaxed text-encre/70">
      {plus && autre && (
        <>
          ⚖️ Au trimestre dernier, le revenu réel de {plus.display_name} a dépassé sa moyenne :{' '}
          <span className="font-semibold">{formaterEuros(report.montants.get(plus.id) ?? 0)}</span> s'ajoutent à sa part juste ce
          trimestre, et autant en moins pour {autre.display_name}, répartis sur les semaines. Rien à rembourser : sur la durée,
          chacun·e paie selon ses vrais revenus.
        </>
      )}
      {report.enAttente.length > 0 && (
        <>
          {plus && ' '}⏳ Report du trimestre dernier en attente du revenu de {report.enAttente.map((p) => p.display_name).join(' et ')}.
        </>
      )}
    </p>
  )
}
