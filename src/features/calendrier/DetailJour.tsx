import { useState } from 'react'
import { decomposer, nuitModifiable, type CleJour } from '../../domain/calendrier'
import { etoilesDuLog, formaterEtoiles } from '../../domain/etoiles'
import { semaineDe, parisVersInstant } from '../../domain/semaine'
import type { Absence, Cadeau, Categorie, Depense, LogTache, Profil, Tache } from '../../domain/types'
import { formaterEuros } from '../../lib/argent'
import { messageErreur } from '../../lib/erreurs'
import { marquerAbsence, retirerAbsence } from '../../services/presence'

interface Props {
  jour: CleJour
  personnes: Profil[]
  logs: LogTache[]
  depenses: Depense[]
  cadeaux: Cadeau[]
  categories: Categorie[]
  absences: Absence[]
  taches: Tache[]
  onFermer: () => void
  onChangement: () => Promise<void>
}

/** Panneau du bas : ma présence cette nuit-là, et les tâches, dépenses et cadeaux du jour. */
export function DetailJour({ jour, personnes, logs, depenses, cadeaux, categories, absences, taches, onFermer, onChangement }: Props) {
  const [moi, autre] = personnes
  const [erreur, setErreur] = useState<string | null>(null)
  const { annee, mois, jour: j } = decomposer(jour)

  const titre = new Date(Date.UTC(annee, mois - 1, j)).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const absentCetteNuit = absences.some((a) => a.user_id === moi.id && a.night === jour)
  const modifiable = nuitModifiable(jour)
  const autreMasque = autre && semaineDe(parisVersInstant(annee, mois, j, 12)).fin > new Date()

  async function basculerPresence() {
    setErreur(null)
    try {
      if (absentCetteNuit) await retirerAbsence(moi.id, jour)
      else await marquerAbsence(jour)
      await onChangement()
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  const tache = (id: string) => taches.find((t) => t.id === id)

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-encre/30" onClick={onFermer}>
      <section
        className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-creme p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        style={{ animation: 'apparaitre 200ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{titre}</h2>
          <button type="button" aria-label="fermer" className="px-2 text-xl text-encre/50" onClick={onFermer}>
            ✕
          </button>
        </div>

        <button
          type="button"
          disabled={!modifiable}
          onClick={basculerPresence}
          className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-4 text-left font-semibold transition active:scale-95 disabled:opacity-60 ${
            absentCetteNuit ? 'bg-encre/10 text-encre/70' : 'bg-white'
          }`}
        >
          <span className="text-3xl">{absentCetteNuit ? '🌙' : '🏠'}</span>
          <span className="flex-1">
            {absentCetteNuit ? 'je dors ailleurs cette nuit' : 'je dors à la maison cette nuit'}
            <br />
            <span className="text-xs font-normal text-encre/50">
              {modifiable ? 'touche pour changer' : 'semaine révélée, plus modifiable'}
            </span>
          </span>
        </button>
        {erreur && <p className="mt-2 rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreur}</p>}

        <ul className="mt-4 flex flex-col gap-2">
          {logs.map((log) => {
            const personne = personnes.find((p) => p.id === log.user_id)
            return (
              <li key={log.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
                <span className="text-xl">{tache(log.task_id)?.emoji}</span>
                <span className="flex-1 font-semibold">
                  {tache(log.task_id)?.name}
                  {log.shared && ' 👫'}
                </span>
                <span className="rounded-full px-2 font-bold text-white" style={{ backgroundColor: personne?.color }}>
                  ⭐ {formaterEtoiles(etoilesDuLog(log))}
                </span>
              </li>
            )
          })}
          {depenses.map((d) => {
            const personne = personnes.find((p) => p.id === d.user_id)
            const categorie = categories.find((c) => c.id === d.category_id)
            return (
              <li key={d.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
                <span className="text-xl">{categorie?.emoji}</span>
                <span className="flex-1 font-semibold">
                  {categorie?.name}
                  {d.tag && <span className="font-normal text-encre/60"> · {d.tag}</span>}
                </span>
                <span className="rounded-full px-2 font-bold text-white" style={{ backgroundColor: personne?.color }}>
                  💖 {formaterEuros(d.amount_cents)}
                </span>
              </li>
            )
          })}
          {cadeaux.map((c) => {
            const personne = personnes.find((p) => p.id === c.user_id)
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-rose/10 px-4 py-3 text-sm">
                <span className="text-xl">🎁</span>
                <span className="flex-1">
                  {c.description} de {formaterEuros(c.estimated_cents)} de <span className="font-semibold">{personne?.display_name}</span>
                </span>
              </li>
            )
          })}
          {logs.length + depenses.length + cadeaux.length === 0 && (
            <li className="text-center text-sm text-encre/50">Rien de logué ce jour-là.</li>
          )}
          {autreMasque && (
            <li className="text-center text-sm text-encre/50">
              🏅 Ce qu'a fait {autre.display_name} sera révélé dimanche à 18h.
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}
