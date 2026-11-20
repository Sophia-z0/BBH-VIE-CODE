import { useEffect, useState } from 'react'
import { Bouton } from '../../components/Bouton'
import { Celebration } from '../../components/Celebration'
import { formaterEtoiles } from '../../domain/etoiles'
import { SEUIL_COEUR, type ResultatCoeurs, type ResultatEtoiles } from '../../domain/scores'
import type { Profil } from '../../domain/types'
import { formaterEuros } from '../../lib/argent'
import { useFoyerPret } from '../foyer/FoyerContext'
import { marquerRevealOuvert, revealAOuvrir } from './reveal'
import { usePodium, type Podium } from './usePodium'
import { PhraseReport } from '../../components/PhraseReport'

const pourcent = (x: number) => `${Math.round(x * 100)} %`
const jjmm = (date: Date) => date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' })

/** Reveal du dimanche 18h, badges débloqués dans la semaine, et podium du mois. */
export function EcranPodium() {
  const { membres } = useFoyerPret()
  const { podium, erreur } = usePodium(membres)
  const [ouvert, setOuvert] = useState(() => !revealAOuvrir())
  const [fete, setFete] = useState(0)

  if (erreur) return <p className="mt-10 rounded-xl bg-red-100 p-4 text-red-800">{erreur}</p>
  if (!podium) return <p className="mt-20 animate-pulse text-center text-4xl">🏅</p>

  function ouvrir() {
    marquerRevealOuvert()
    setOuvert(true)
    setFete((n) => n + 1)
  }

  // Fin de semaine = dimanche 18h ; on affiche du dimanche au dimanche.
  const periodeSemaine = `du ${jjmm(podium.semaine.debut)} au ${jjmm(podium.semaine.fin)}`
  const nomMois = new Date(Date.UTC(podium.mois.annee, podium.mois.mois - 1, 1)).toLocaleDateString('fr-FR', {
    month: 'long',
    timeZone: 'UTC',
  })

  return (
    <div className="flex flex-col gap-8 pt-4">
      {fete > 0 && <Celebration cle={fete} />}

      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">🏆 la semaine {periodeSemaine}</h1>
        {membres.length < 2 ? (
          <p className="text-encre/60">Le podium s'anime dès que ton ou ta partenaire a rejoint le foyer (code dans réglages).</p>
        ) : !ouvert ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center shadow-sm">
            <span className="animate-bounce text-7xl">🏅</span>
            <p className="text-lg font-semibold">Les résultats de la semaine sont arrivés !</p>
            <Bouton type="button" onClick={ouvrir}>
              ouvrir les résultats
            </Bouton>
          </div>
        ) : (
          <>
            <PodiumEtoiles resultat={podium.etoilesSemaine} periode="cette semaine" />
            <ResumeCoeurs resultat={podium.coeursSemaine} />
          </>
        )}
      </section>

      {membres.length === 2 && ouvert && (
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">🗓️ le podium de {nomMois}</h2>
          <PodiumEtoiles resultat={podium.etoilesMois} periode={`en ${nomMois}`} />
          <PodiumCoeurs resultat={podium.coeursMois} periode={`en ${nomMois}`} />
          {podium.reportMois && <PhraseReport report={podium.reportMois} personnes={membres} />}
        </section>
      )}

      <NouveauxBadges nouveaux={podium.nouveauxBadges} />
    </div>
  )
}

const MESSAGES_GAGNANT = [
  (nom: string) => `Bravo ${nom}, l'étoile de la semaine ! 🌟`,
  (nom: string) => `${nom} a fait briller la maison ✨`,
  (nom: string) => `Chapeau ${nom} ! 👑`,
]

function messageGagnant(gagnants: Profil[], graine: number): string {
  if (gagnants.length === 0) return 'Pas d’étoile cette fois : la semaine prochaine sera la bonne 🌱'
  if (gagnants.length > 1) return 'Match nul : bravo à vous deux ! 🎉'
  return MESSAGES_GAGNANT[graine % MESSAGES_GAGNANT.length](gagnants[0].display_name)
}

function PodiumEtoiles({ resultat, periode }: { resultat: ResultatEtoiles; periode: string }) {
  const max = Math.max(...resultat.scores.map((s) => s.parNuit), 0.0001)
  // Les colonnes montent depuis zéro à l'affichage.
  const [monte, setMonte] = useState(false)
  useEffect(() => {
    const image = requestAnimationFrame(() => setMonte(true))
    return () => cancelAnimationFrame(image)
  }, [])
  const graine = Math.round(resultat.scores.reduce((t, s) => t + s.etoiles, 0))

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-center text-lg font-bold">{messageGagnant(resultat.gagnants, graine)}</p>

      <div className="flex h-44 items-end justify-center gap-6">
        {resultat.scores.map((s) => {
          const gagne = resultat.gagnants.some((g) => g.id === s.personne.id)
          return (
            <div key={s.personne.id} className="flex w-24 flex-col items-center gap-1">
              <span className="text-2xl">{gagne ? '👑' : ''}</span>
              <span className="text-sm font-bold">{formaterEtoiles(s.parNuit)} ⭐/nuit</span>
              <div
                className="w-full rounded-t-2xl transition-[height] duration-1000 ease-out"
                style={{ height: monte ? `${Math.max(8, (s.parNuit / max) * 100)}px` : '0px', backgroundColor: s.personne.color }}
              />
              <span className="text-sm font-semibold">{s.personne.display_name}</span>
            </div>
          )
        })}
      </div>

      <ul className="flex flex-col gap-1 text-sm text-encre/80">
        {resultat.scores.map((s) => (
          <li key={s.personne.id}>
            <span style={{ color: s.personne.color }}>●</span>{' '}
            {s.nuits === 0
              ? `${s.personne.display_name} n'a pas dormi à la maison ${periode}.`
              : `${s.personne.display_name} a pris en charge ${pourcent(s.part)} des tâches ${periode}, sur ${s.nuits} nuit${s.nuits > 1 ? 's' : ''} à la maison (${formaterEtoiles(s.etoiles)} ⭐).`}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Résumé des dépenses et cadeaux de la semaine, sans classement. */
function ResumeCoeurs({ resultat }: { resultat: ResultatCoeurs }) {
  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-white p-5 text-sm shadow-sm">
      {resultat.scores.map((s) => {
        const cadeau = resultat.cadeaux.find((c) => c.personne.id === s.personne.id)
        return (
          <p key={s.personne.id}>
            <span style={{ color: s.personne.color }}>●</span> {s.personne.display_name} : 💖 {formaterEuros(s.depense)}
            {cadeau && cadeau.nombre > 0 && ` · 🎁 ${cadeau.nombre} cadeau${cadeau.nombre > 1 ? 'x' : ''} (${formaterEuros(cadeau.montant)})`}
          </p>
        )
      })}
    </div>
  )
}

function PodiumCoeurs({ resultat, periode }: { resultat: ResultatCoeurs; periode: string }) {
  const aucuneDepense = resultat.scores.every((s) => s.depense === 0)
  let message = 'Aucune dépense loguée ce mois-ci.'
  if (!aucuneDepense) {
    message =
      resultat.gagnants.length > 1
        ? 'Chacun·e a assuré sa part : bravo à vous deux ! 💖💖'
        : `${resultat.gagnants[0].display_name} a porté le plus d'amour en euros 💖`
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-center text-lg font-bold">{message}</p>
      {!aucuneDepense &&
        resultat.scores.map((s) => (
          <div key={s.personne.id} className="flex flex-col gap-1 text-sm">
            <p className="font-semibold">
              {s.coeur ? '💖' : '🤍'} {s.personne.display_name} : {formaterEuros(s.depense)}, soit {pourcent(s.partReelle)} des dépenses{' '}
              {periode}
            </p>
            {/* Barre : part réelle, avec un repère sur la part juste. */}
            <div className="relative h-3 rounded-full bg-creme">
              <div className="h-3 rounded-full" style={{ width: pourcent(s.partReelle), backgroundColor: s.personne.color }} />
              <div className="absolute -top-1 h-5 w-0.5 bg-encre" style={{ left: pourcent(Math.min(s.partJusteAjustee, 1)) }} title="part juste" />
            </div>
            <p className="text-xs text-encre/60">
              Part juste : {pourcent(s.partJusteAjustee)}
              {resultat.surRevenus ? ' (revenus moyens des 6 derniers mois' : ' (50/50 tant que les deux revenus ne sont pas renseignés'}
              {s.ajustement !== 0 && `, ${s.ajustement > 0 ? '+' : '−'}${formaterEuros(Math.abs(s.ajustement))} de report`})
              {s.coeur ? ' · part atteinte 💖' : ` · 💖 à partir de ${pourcent(s.partJusteAjustee * SEUIL_COEUR)}`}
            </p>
          </div>
        ))}
      {resultat.cadeaux.some((c) => c.nombre > 0) && (
        <div className="rounded-2xl bg-rose/10 p-3 text-sm">
          {resultat.cadeaux
            .filter((c) => c.nombre > 0)
            .map((c) => (
              <p key={c.personne.id}>
                🎁 {c.personne.display_name} a offert {c.nombre} cadeau{c.nombre > 1 ? 'x' : ''} au foyer ({formaterEuros(c.montant)} estimés)
              </p>
            ))}
        </div>
      )}
    </div>
  )
}

function NouveauxBadges({ nouveaux }: { nouveaux: Podium['nouveauxBadges'] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-bold">🎖️ badges de la semaine</h2>
      {nouveaux.length === 0 ? (
        <p className="text-sm text-encre/60">Pas de nouveau badge cette semaine. Tous les badges sont dans les stats.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {nouveaux.map(({ personne, badge }) => (
            <li key={`${personne.id}-${badge.titre}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-sm">
              <span className="text-3xl">{badge.emoji}</span>
              <span>
                <span className="font-semibold" style={{ color: personne.color }}>
                  {personne.display_name}
                </span>{' '}
                débloque <span className="font-semibold">{badge.titre}</span> !
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
