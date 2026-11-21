import { BandeauSemaine } from '../../components/BandeauSemaine'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Celebration } from '../../components/Celebration'
import { AnnonceObjectif, useObjectifAtteint } from './AnnonceObjectif'
import { ChoixQuand, instantChoisi, quandDuJour } from '../../components/ChoixQuand'
import { classePuce } from '../../components/Puce'
import { PileDeCartes, parAjout } from '../../components/PileDeCartes'
import { TuileRetournable, type Dos } from '../../components/TuileRetournable'
import { useCollecte } from '../../components/useCollecte'
import { aujourdhui, jourParis } from '../../domain/calendrier'
import { encouragementAuHasard } from '../../domain/encouragements'
import { serieEnCours } from '../../domain/scores'
import { estTacheCourses, plansDeTaches, type Groupe } from '../../domain/taches'
import { etoilesDuLog, formaterEtoiles, totalEtoiles } from '../../domain/etoiles'
import type { Depense, LogTache, Tache } from '../../domain/types'
import { formaterEuros } from '../../lib/argent'
import { formaterJourHeure } from '../../lib/dates'
import { messageErreur } from '../../lib/erreurs'
import { CARTES_COLLECTEES } from '../../lib/options'
import { depensesDuLog, supprimerDepense } from '../../services/depenses'
import { loguerTache, supprimerLog } from '../../services/taches'
import { useFoyerPret } from '../foyer/FoyerContext'
import { useTachesSemaine } from './useTachesSemaine'

const DUREE_ANNULATION_MS = 5000
/** Après un log de courses : message au dos, retournement et envol vers la pile, puis l'écran dépenses. */
const DELAI_VERS_DEPENSE_MS = 3300

interface Retour {
  log: LogTache
  tache: Tache
  message: string
}

/** Écran principal : un tap sur une tâche = un log. */
export function EcranLog() {
  const { moi } = useFoyerPret()
  const { taches, mesLogs, setMesLogs, joursActifs, chargement, erreur } = useTachesSemaine(moi.id)

  // Options du prochain log, remises à zéro après chaque log (« quand » revient au jour
  // choisi dans le calendrier, s'il y en a un).
  const [parametres] = useSearchParams()
  const quandInitial = quandDuJour(parametres.get('jour'))
  const [aDeux, setADeux] = useState(false)
  const [quand, setQuand] = useState<string | null>(quandInitial) // null = maintenant

  const [celebration, setCelebration] = useState(0)
  const [retour, setRetour] = useState<Retour | null>(null)
  const [erreurLog, setErreurLog] = useState<string | null>(null)
  const minuteurRetour = useRef<ReturnType<typeof setTimeout>>(undefined)
  const navigate = useNavigate()
  /** Passage vers l'écran dépenses après un log de courses (annulé si le log l'est). */
  const versDepense = useRef<{ idLog: string; minuteur: ReturnType<typeof setTimeout> } | null>(null)
  /** Log de courses à annuler qui a une dépense reliée : on demande quoi faire de la dépense. */
  const [aConfirmer, setAConfirmer] = useState<{ log: LogTache; depenses: Depense[] } | null>(null)

  useEffect(
    () => () => {
      clearTimeout(minuteurRetour.current)
      clearTimeout(versDepense.current?.minuteur)
    },
    [],
  )
  const collecte = useCollecte(() => setRetour(null))

  const plans = useMemo(() => plansDeTaches(taches.filter((t) => t.active)), [taches])
  const objectif = useObjectifAtteint(moi.id, mesLogs, taches, !chargement)

  async function loguer(tache: Tache) {
    setErreurLog(null)
    try {
      const log = await loguerTache(tache.id, instantChoisi(quand), aDeux)
      setMesLogs((logs) => [log, ...logs])
      setCelebration((n) => n + 1)
      setRetour({ log, tache, message: encouragementAuHasard('tache', { moi: moi.display_name }) })
      navigator.vibrate?.(30)
      clearTimeout(minuteurRetour.current)
      if (CARTES_COLLECTEES) collecte.collecter(tache.id, log.id)
      else minuteurRetour.current = setTimeout(() => setRetour(null), DUREE_ANNULATION_MS)
      setADeux(false)
      setQuand(quandInitial)
      if (estTacheCourses(tache)) {
        clearTimeout(versDepense.current?.minuteur)
        const adresse = `/depenses?courses=${log.id}${quand ? `&jour=${jourParis(log.done_at)}` : ''}`
        versDepense.current = { idLog: log.id, minuteur: setTimeout(() => navigate(adresse), DELAI_VERS_DEPENSE_MS) }
      }
    } catch (e) {
      setErreurLog(messageErreur(e))
    }
  }

  function fermerRetour() {
    clearTimeout(minuteurRetour.current)
    if (CARTES_COLLECTEES) collecte.accelerer()
    else setRetour(null)
  }

  /** Annuler un log ; s'il a une dépense de courses reliée, on demande d'abord quoi en faire. */
  async function annuler(log: LogTache) {
    if (versDepense.current?.idLog === log.id) {
      clearTimeout(versDepense.current.minuteur)
      versDepense.current = null
    }
    const liees = await depensesDuLog(log.id)
    if (liees.length > 0) return setAConfirmer({ log, depenses: liees })
    await supprimer(log)
  }

  async function supprimer(log: LogTache, depenses: Depense[] = []) {
    setAConfirmer(null)
    try {
      for (const d of depenses) await supprimerDepense(d.id)
      await supprimerLog(log.id)
      collecte.oublier(log.id)
      setMesLogs((logs) => logs.filter((l) => l.id !== log.id))
      if (retour?.log.id === log.id) setRetour(null)
    } catch (e) {
      setErreurLog(messageErreur(e))
    }
  }

  if (chargement) return <p className="mt-20 animate-pulse text-center text-4xl">⭐</p>
  if (erreur) return <p className="mt-10 rounded-xl bg-red-100 p-4 text-red-800">{erreur}</p>

  const nomTache = (id: string) => taches.find((t) => t.id === id)
  const dosDe = (tache: Tache): Dos | null =>
    retour?.tache.id === tache.id
      ? { gain: `+${formaterEtoiles(etoilesDuLog(retour.log))} ⭐`, message: retour.message, onAnnuler: () => annuler(retour.log) }
      : null
  const dernierAnnulable = !retour ? mesLogs.find((l) => l.id === collecte.annulable) : undefined
  const pile = CARTES_COLLECTEES ? (
    <PileDeCartes
      atterrissage={collecte.atterrissage}
      cartes={parAjout(mesLogs, (l) => l.created_at)
        .filter((l) => l.id !== collecte.enVol)
        .map((l) => {
          const t = nomTache(l.task_id)
          return { id: l.id, emoji: t?.emoji ?? '⭐', nom: t?.name ?? '', classe: t?.everyday ? 'bg-white' : 'bg-orange-100' }
        })}
      onAnnuler={dernierAnnulable && (() => annuler(dernierAnnulable))}
    />
  ) : undefined
  const serie = serieEnCours([...joursActifs, ...mesLogs.map((l) => jourParis(l.done_at))], aujourdhui())

  return (
    <div className="flex flex-col gap-5 pt-4">
      <BandeauSemaine
        couleur={moi.color}
        libelle="mes étoiles cette semaine"
        valeur={`⭐ ${formaterEtoiles(totalEtoiles(mesLogs))}`}
        pile={pile}
        detail={
          <>
            {mesLogs.length === 0 ? 'Première tâche de la semaine ?' : `${mesLogs.length} tâche${mesLogs.length > 1 ? 's' : ''} loguée${mesLogs.length > 1 ? 's' : ''}`}
            {serie >= 2 && ` · 🔥 ${serie} jours d’affilée`}
          </>
        }
      />

      <OptionsLog aDeux={aDeux} setADeux={setADeux} quand={quand} setQuand={setQuand} />

      {erreurLog && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreurLog}</p>}

      <Plan titre="🏠 les pièces" groupes={plans.pieces} onLog={loguer} dosDe={dosDe} onFermer={fermerRetour} />
      <Plan titre="🧺 le reste" groupes={plans.reste} onLog={loguer} dosDe={dosDe} onFermer={fermerRetour} />

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
      {objectif.annonce && <AnnonceObjectif objectif={objectif.annonce} onFermer={objectif.fermer} />}
      {aConfirmer && (
        <ConfirmationDepenseLiee
          depenses={aConfirmer.depenses}
          onSupprimerTout={() => supprimer(aConfirmer.log, aConfirmer.depenses)}
          onGarderDepense={() => supprimer(aConfirmer.log)}
          onFermer={() => setAConfirmer(null)}
        />
      )}

    </div>
  )
}

/**
 * Un plan (pièces ou reste) : une ligne par groupe, qui défile seulement à l'horizontale.
 * Toutes les tuiles ont la même taille, donc toutes les lignes la même hauteur.
 * Quotidien en tête, en tuiles blanches ; occasionnel ensuite, en tuiles qui rayonnent.
 */
function Plan({
  titre,
  groupes,
  onLog,
  dosDe,
  onFermer,
}: {
  titre: string
  groupes: Groupe[]
  onLog: (tache: Tache) => void
  dosDe: (tache: Tache) => Dos | null
  onFermer: () => void
}) {
  if (groupes.length === 0) return null
  return (
    <section className="-mx-4 flex flex-col gap-1">
      <h2 className="px-4 text-lg font-bold">{titre}</h2>
      {groupes.map(([groupe, liste]) => (
        <div key={groupe}>
          <h3 className="px-4 text-sm font-bold uppercase tracking-wide text-encre/50">{groupe}</h3>
          <div className="sans-barre flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overflow-y-hidden px-4 py-4">
            {liste.map((tache) => (
              <TuileRetournable
                key={tache.id}
                cle={tache.id}
                dos={dosDe(tache)}
                onTap={() => onLog(tache)}
                onFermer={onFermer}
                classeFace={tache.everyday ? 'bg-white shadow-sm active:bg-orange/10' : 'tuile-rayonnante'}
              >
                <span className="text-4xl">{tache.emoji}</span>
                <span className="line-clamp-3 text-xs leading-tight font-semibold">{tache.name}</span>
                <span className="text-xs">{'⭐'.repeat(tache.stars)}</span>
              </TuileRetournable>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

/** Annuler une course qui a sa dépense : supprimer aussi la dépense, ou la garder (elle n'est plus reliée). */
function ConfirmationDepenseLiee({
  depenses,
  onSupprimerTout,
  onGarderDepense,
  onFermer,
}: {
  depenses: Depense[]
  onSupprimerTout: () => void
  onGarderDepense: () => void
  onFermer: () => void
}) {
  const total = depenses.reduce((t, d) => t + d.amount_cents, 0)
  const plusieurs = depenses.length > 1
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-encre/30 p-6" onClick={onFermer}>
      <div role="dialog" aria-modal="true" className="flex w-full max-w-sm flex-col gap-3 rounded-3xl bg-creme p-5" onClick={(e) => e.stopPropagation()}>
        <p className="font-semibold">
          Supprimer aussi {plusieurs ? `les ${depenses.length} dépenses liées` : 'la dépense liée'} ({formaterEuros(total)}) ?
        </p>
        <button type="button" className="rounded-2xl bg-rose px-4 py-3 text-sm font-semibold text-white active:scale-95" onClick={onSupprimerTout}>
          oui, supprimer la tâche et {plusieurs ? 'les dépenses' : 'la dépense'}
        </button>
        <button type="button" className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold active:scale-95" onClick={onGarderDepense}>
          non, garder {plusieurs ? 'les dépenses' : 'la dépense'}
        </button>
        <button type="button" className="text-sm text-encre/60 underline" onClick={onFermer}>
          ne rien supprimer
        </button>
      </div>
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
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={classePuce(aDeux)} aria-pressed={aDeux} onClick={() => setADeux(!aDeux)}>
        👫 à deux
      </button>
      <ChoixQuand quand={quand} setQuand={setQuand} />
    </div>
  )
}
