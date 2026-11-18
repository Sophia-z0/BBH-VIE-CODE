import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Celebration } from '../../components/Celebration'
import { encouragementAuHasard } from '../../domain/encouragements'
import { etoilesDuLog, formaterEtoiles, totalEtoiles } from '../../domain/etoiles'
import { semaineDe } from '../../domain/semaine'
import type { LogTache, Tache } from '../../domain/types'
import { formaterJourHeure, versChampDateHeure } from '../../lib/dates'
import { messageErreur } from '../../lib/erreurs'
import { loguerTache, supprimerLog } from '../../services/taches'
import { useFoyerPret } from '../foyer/FoyerContext'
import { useTachesSemaine } from './useTachesSemaine'

const DUREE_ANNULATION_MS = 5000

interface Retour {
  log: LogTache
  tache: Tache
  message: string
}

/** Écran principal : un tap sur une tâche = un log. */
export function EcranLog() {
  const { moi } = useFoyerPret()
  const { taches, mesLogs, setMesLogs, chargement, erreur } = useTachesSemaine(moi.id)

  // Options du prochain log, remises à zéro après chaque log.
  const [aDeux, setADeux] = useState(false)
  const [quand, setQuand] = useState<string | null>(null) // null = maintenant

  const [celebration, setCelebration] = useState(0)
  const [retour, setRetour] = useState<Retour | null>(null)
  const [erreurLog, setErreurLog] = useState<string | null>(null)
  const minuteurRetour = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(minuteurRetour.current), [])

  const groupes = useMemo(() => {
    const parGroupe = new Map<string, Tache[]>()
    for (const tache of taches.filter((t) => t.active)) {
      parGroupe.set(tache.group_name, [...(parGroupe.get(tache.group_name) ?? []), tache])
    }
    return [...parGroupe.entries()]
  }, [taches])

  async function loguer(tache: Tache) {
    setErreurLog(null)
    try {
      const log = await loguerTache(tache.id, quand ? new Date(quand) : new Date(), aDeux)
      setMesLogs((logs) => [log, ...logs])
      setCelebration((n) => n + 1)
      setRetour({ log, tache, message: encouragementAuHasard() })
      navigator.vibrate?.(30)
      clearTimeout(minuteurRetour.current)
      minuteurRetour.current = setTimeout(() => setRetour(null), DUREE_ANNULATION_MS)
      setADeux(false)
      setQuand(null)
    } catch (e) {
      setErreurLog(messageErreur(e))
    }
  }

  async function annuler(log: LogTache) {
    try {
      await supprimerLog(log.id)
      setMesLogs((logs) => logs.filter((l) => l.id !== log.id))
      if (retour?.log.id === log.id) setRetour(null)
    } catch (e) {
      setErreurLog(messageErreur(e))
    }
  }

  if (chargement) return <p className="mt-20 animate-pulse text-center text-4xl">⭐</p>
  if (erreur) return <p className="mt-10 rounded-xl bg-red-100 p-4 text-red-800">{erreur}</p>

  const nomTache = (id: string) => taches.find((t) => t.id === id)

  return (
    <div className="flex flex-col gap-5 pt-4">
      <section className="rounded-3xl p-5 text-white shadow-lg" style={{ backgroundColor: moi.color }}>
        <p className="text-sm opacity-90">mes étoiles cette semaine</p>
        <p className="text-5xl font-extrabold">⭐ {formaterEtoiles(totalEtoiles(mesLogs))}</p>
        <p className="mt-1 text-sm opacity-90">
          {mesLogs.length === 0 ? 'Première tâche de la semaine ?' : `${mesLogs.length} tâche${mesLogs.length > 1 ? 's' : ''} loguée${mesLogs.length > 1 ? 's' : ''}`}
        </p>
      </section>

      <OptionsLog aDeux={aDeux} setADeux={setADeux} quand={quand} setQuand={setQuand} />

      {erreurLog && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreurLog}</p>}

      {groupes.map(([groupe, liste]) => (
        <section key={groupe}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-encre/50">{groupe}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {liste.map((tache) => (
              <button
                key={tache.id}
                type="button"
                onClick={() => loguer(tache)}
                className="flex min-h-28 flex-col items-start justify-between rounded-2xl bg-white p-3 text-left shadow-sm transition active:scale-95 active:bg-orange/10"
              >
                <span className="text-3xl">{tache.emoji}</span>
                <span className="text-sm leading-tight font-semibold">{tache.name}</span>
                <span className="text-xs">{'⭐'.repeat(tache.stars)}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <Link to="/taches" className="text-center text-sm text-encre/60 underline">
        ✏️ modifier la liste des tâches
      </Link>

      {mesLogs.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-encre/50">mes logs de la semaine</h2>
          <ul className="flex flex-col divide-y divide-orange/10 rounded-2xl bg-white">
            {mesLogs.map((log) => (
              <li key={log.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{nomTache(log.task_id)?.emoji}</span>
                <span className="flex-1 text-sm">
                  <span className="font-semibold">{nomTache(log.task_id)?.name}</span>
                  {log.shared && ' 👫'}
                  <br />
                  <span className="text-encre/50">{formaterJourHeure(log.done_at)}</span>
                </span>
                <span className="text-sm font-semibold">⭐ {formaterEtoiles(etoilesDuLog(log))}</span>
                <button type="button" aria-label="supprimer ce log" className="px-2 text-encre/40" onClick={() => annuler(log)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {celebration > 0 && <Celebration cle={celebration} />}

      {retour && (
        <div
          className="fixed inset-x-4 bottom-24 z-40 flex items-center gap-3 rounded-2xl bg-encre p-4 text-white shadow-xl"
          style={{ animation: 'apparaitre 250ms ease-out' }}
          role="status"
        >
          <span className="text-3xl">{retour.tache.emoji}</span>
          <span className="flex-1">
            <span className="font-bold">+{formaterEtoiles(etoilesDuLog(retour.log))} ⭐</span> {retour.message}
          </span>
          <button type="button" className="text-sm underline opacity-80" onClick={() => annuler(retour.log)}>
            annuler
          </button>
        </div>
      )}
    </div>
  )
}

/** « à deux » et « quand » s'appliquent au prochain tap uniquement. */
function OptionsLog({
  aDeux,
  setADeux,
  quand,
  setQuand,
}: {
  aDeux: boolean
  setADeux: (v: boolean) => void
  quand: string | null
  setQuand: (v: string | null) => void
}) {
  const puce = (actif: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${actif ? 'bg-orange text-white' : 'bg-white text-encre/70'}`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={puce(aDeux)} aria-pressed={aDeux} onClick={() => setADeux(!aDeux)}>
        👫 à deux
      </button>
      {quand === null ? (
        <button type="button" className={puce(false)} onClick={() => setQuand(versChampDateHeure(new Date()))}>
          🕐 maintenant
        </button>
      ) : (
        <span className="flex items-center gap-1">
          <input
            type="datetime-local"
            className={`${puce(true)} [color-scheme:dark]`}
            min={versChampDateHeure(semaineDe().debut)}
            max={versChampDateHeure(new Date())}
            value={quand}
            onChange={(e) => setQuand(e.target.value)}
          />
          <button type="button" aria-label="revenir à maintenant" className="px-1 text-encre/50" onClick={() => setQuand(null)}>
            ✕
          </button>
        </span>
      )}
    </div>
  )
}
