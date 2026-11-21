import { useEffect, useState } from 'react'
import { deductions, moisDeDate, partDuMois } from '../../domain/revenus'
import { parisVersInstant, semaineDe } from '../../domain/semaine'
import type { Pret } from '../../domain/prets'
import type { Depense, Profil, RevenuMensuel } from '../../domain/types'
import { formaterEuros } from '../../lib/argent'
import { depensesEntre } from '../../services/depenses'
import { listerPrets } from '../../services/prets'
import { mesRevenus } from '../../services/revenus'

/**
 * Alerte douce sur l'écran dépenses : ce mois-ci, ma part des dépenses du foyer ne me laisse pas mon minimum perso.
 * Mois en cours = mes dépenses avant cette semaine (chargées une fois) + celles de la semaine (à jour).
 */
export function AlerteMinimum({ moi, depensesSemaine }: { moi: Profil; depensesSemaine: Depense[] }) {
  const minimum = moi.personal_minimum_cents ?? 0
  const [contexte, setContexte] = useState<{ revenus: RevenuMensuel[]; avant: Depense[]; prets: Pret[] } | null>(null)

  useEffect(() => {
    if (minimum <= 0) return
    let annule = false
    const [annee, mois] = moisDeDate(new Date()).split('-').map(Number)
    const debutMois = parisVersInstant(annee, mois, 1, 0)
    const debutSemaine = semaineDe().debut
    Promise.all([mesRevenus(moi.id), debutMois < debutSemaine ? depensesEntre(debutMois, debutSemaine) : Promise.resolve([]), listerPrets()])
      .then(([revenus, avant, prets]) => !annule && setContexte({ revenus, avant: avant.filter((d) => d.user_id === moi.id), prets }))
      .catch(() => {})
    return () => {
      annule = true
    }
  }, [moi.id, minimum])

  if (minimum <= 0 || !contexte) return null
  const r = partDuMois(moi, contexte.revenus, [...contexte.avant, ...depensesSemaine.filter((d) => d.user_id === moi.id)], moisDeDate(new Date()), contexte.prets)
  if (!r.sousMinimum) return null
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-red-50 p-4 text-sm shadow-sm">
      <p className="font-semibold">🫶 Ce mois-ci, ta part des dépenses du foyer ne te laisse pas ton minimum.</p>
      <p className="text-xs text-encre/60">
        Il te reste {formaterEuros(Math.max(0, r.reste ?? 0))} sur ton revenu{r.reel ? '' : ' estimé'}{deductions(r) && ` (${deductions(r)})`}, pour un minimum de {formaterEuros(minimum)}.
        Peut-être l'occasion d'en parler ensemble.
      </p>
    </div>
  )
}
