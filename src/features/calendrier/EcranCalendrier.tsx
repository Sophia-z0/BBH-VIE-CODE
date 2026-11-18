import { useMemo, useState } from 'react'
import {
  aujourdhui,
  decomposer,
  etoilesDe,
  jourParis,
  nuitsDeSemaine,
  semaineDeLigne,
  type CleJour,
} from '../../domain/calendrier'
import { formaterEtoiles } from '../../domain/etoiles'
import type { Profil } from '../../domain/types'
import { useFoyerPret } from '../foyer/FoyerContext'
import { DetailJour } from './DetailJour'
import { useCalendrier } from './useCalendrier'

const JOURS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

/** Vue mensuelle : étoiles par jour et par semaine, nuits d'absence grisées. */
export function EcranCalendrier() {
  const { moi, membres } = useFoyerPret()
  const autre = membres.find((p) => p.id !== moi.id)
  const personnes = autre ? [moi, autre] : [moi]

  const auj = decomposer(aujourdhui())
  const [mois, setMois] = useState({ annee: auj.annee, mois: auj.mois })
  const { grille, logs, absences, taches, erreur, recharger } = useCalendrier(mois.annee, mois.mois)
  const [jourChoisi, setJourChoisi] = useState<CleJour | null>(null)

  const logsParJour = useMemo(() => {
    const parJour = new Map<CleJour, typeof logs>()
    for (const log of logs) {
      const jour = jourParis(log.done_at)
      parJour.set(jour, [...(parJour.get(jour) ?? []), log])
    }
    return parJour
  }, [logs])

  const absent = (personne: Profil, nuit: CleJour) => absences.some((a) => a.user_id === personne.id && a.night === nuit)
  const maintenant = new Date()

  function changerMois(delta: number) {
    const d = new Date(Date.UTC(mois.annee, mois.mois - 1 + delta, 1))
    setMois({ annee: d.getUTCFullYear(), mois: d.getUTCMonth() + 1 })
  }

  const titre = new Date(Date.UTC(mois.annee, mois.mois - 1, 1)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="mois précédent" className="px-3 py-1 text-2xl" onClick={() => changerMois(-1)}>
          ‹
        </button>
        <h1 className="text-xl font-bold">{titre}</h1>
        <button type="button" aria-label="mois suivant" className="px-3 py-1 text-2xl" onClick={() => changerMois(1)}>
          ›
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-sm">
        {personnes.map((p) => (
          <span key={p.id} className="flex items-center gap-1">
            <span className="size-3 rounded-full" style={{ backgroundColor: p.color }} /> {p.display_name}
          </span>
        ))}
        <span className="flex items-center gap-1 text-encre/50">🌙 nuit ailleurs</span>
      </div>

      {erreur && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreur}</p>}

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-encre/50">
        {JOURS.map((j) => (
          <span key={j}>{j}</span>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {grille.map((ligne) => {
          const semaine = semaineDeLigne(ligne)
          const revelee = semaine.fin <= maintenant
          const logsSemaine = logs.filter((l) => new Date(l.done_at) >= semaine.debut && new Date(l.done_at) < semaine.fin)
          const nuits = nuitsDeSemaine(semaine)

          return (
            <div key={ligne[0]} className="flex flex-col gap-1">
              <div className="grid grid-cols-7 gap-1">
                {ligne.map((jour) => {
                  const d = decomposer(jour)
                  const horsMois = d.mois !== mois.mois
                  const logsDuJour = logsParJour.get(jour) ?? []
                  return (
                    <button
                      key={jour}
                      type="button"
                      onClick={() => setJourChoisi(jour)}
                      className={`flex min-h-16 flex-col items-center gap-0.5 rounded-xl bg-white p-1 text-xs transition active:scale-95 ${
                        horsMois ? 'opacity-40' : ''
                      } ${jour === aujourdhui() ? 'ring-2 ring-orange' : ''}`}
                    >
                      <span className="font-semibold">{d.jour}</span>
                      {personnes.map((p) => {
                        if (absent(p, jour)) return <span key={p.id} className="rounded-full bg-encre/10 px-1 text-encre/40">🌙</span>
                        const etoiles = etoilesDe(p.id, logsDuJour)
                        if (etoiles === 0) return null
                        return (
                          <span key={p.id} className="rounded-full px-1 font-bold text-white" style={{ backgroundColor: p.color }}>
                            {formaterEtoiles(etoiles)}
                          </span>
                        )
                      })}
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap justify-end gap-3 px-1 text-xs">
                {personnes.map((p) => {
                  const nuitsPresent = nuits.filter((n) => !absent(p, n)).length
                  if (p.id !== moi.id && !revelee) {
                    return (
                      <span key={p.id} className="text-encre/50">
                        <span style={{ color: p.color }}>●</span> 🎁 révélé dimanche 18h
                      </span>
                    )
                  }
                  return (
                    <span key={p.id}>
                      <span style={{ color: p.color }}>●</span> ⭐ {formaterEtoiles(etoilesDe(p.id, logsSemaine))} · {nuitsPresent}{' '}
                      nuit{nuitsPresent > 1 ? 's' : ''}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {jourChoisi && (
        <DetailJour
          jour={jourChoisi}
          personnes={personnes}
          logs={logsParJour.get(jourChoisi) ?? []}
          absences={absences}
          taches={taches}
          onFermer={() => setJourChoisi(null)}
          onChangement={recharger}
        />
      )}
    </div>
  )
}
