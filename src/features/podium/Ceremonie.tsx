import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { PluieEmojis } from '../../components/PluieEmojis'
import { formaterEtoiles } from '../../domain/etoiles'
import type { Profil } from '../../domain/types'
import { formaterEuros } from '../../lib/argent'
import { cliquetisToucher } from '../../lib/cliquetis'
import type { Podium } from './usePodium'

/** Ce dont la cérémonie a besoin (le vrai podium, ou un aperçu inventé). */
export type DonneesCeremonie = Pick<Podium, 'semaine' | 'etoilesSemaine' | 'coeursSemaine' | 'nouveauxBadges' | 'nouveauxObjectifs'>

const jjmm = (date: Date) => date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' })
const delai = (ms: number) => ({ '--delai': `${ms}ms` }) as CSSProperties

/** Écart entre deux temps forts de la cérémonie. */
const PAS = 700

/**
 * Cérémonie du dimanche : plein écran, avant de pouvoir loguer quoi que ce soit.
 * Un tap révèle, puis tout s'enchaîne : étoiles, dépenses, badges, objectifs remis, sous une pluie d'émojis.
 */
export function Ceremonie({ donnees, onFin, apercu = false }: { donnees: DonneesCeremonie; onFin: () => void; apercu?: boolean }) {
  const [revele, setRevele] = useState(false)
  const [averse, setAverse] = useState(0)
  const { etoilesSemaine: etoiles, coeursSemaine: coeurs, nouveauxBadges: badges, nouveauxObjectifs: objectifs } = donnees

  // Temps forts, dans l'ordre d'apparition.
  const tBadges = PAS * 4
  const tObjectifs = tBadges + PAS * Math.max(1, badges.length) * 0.6 + PAS
  const tFin = tObjectifs + (objectifs.length > 0 ? PAS * 2 : 0)

  // Une nouvelle averse quand arrivent les badges, puis les objectifs.
  useEffect(() => {
    if (!revele) return
    const minuteurs = [
      setTimeout(() => setAverse((n) => n + 1), tBadges),
      ...(objectifs.length > 0 ? [setTimeout(() => setAverse((n) => n + 1), tObjectifs)] : []),
    ]
    return () => minuteurs.forEach(clearTimeout)
  }, [revele, tBadges, tObjectifs, objectifs.length])

  function reveler() {
    cliquetisToucher()
    setRevele(true)
    setAverse(1)
  }

  const gagnants = etoiles.gagnants
  const titreGagnant =
    gagnants.length === 0
      ? 'Une semaine tranquille : la prochaine sera la bonne 🌱'
      : gagnants.length > 1
        ? 'Match nul : bravo à vous deux ! 🎉'
        : `${gagnants[0].display_name}, l'étoile de la semaine ! 🌟`

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-orange-100 via-creme to-rose-100">
      {averse > 0 && <PluieEmojis cle={averse} emojis={averse === 1 ? ['⭐', '🌟', '✨', '💖', '🎉'] : ['🎖️', '🏅', '🎉', '🥳', '✨']} />}

      {!revele ? (
        <button type="button" onClick={reveler} className="flex min-h-full w-full flex-col items-center justify-center gap-6 p-8 text-center">
          {apercu && <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-encre/60">aperçu · données inventées</span>}
          <span className="animate-bounce text-8xl">🏆</span>
          <span className="text-3xl font-extrabold">la cérémonie du dimanche</span>
          <span className="text-encre/60">
            semaine du {jjmm(donnees.semaine.debut)} au {jjmm(donnees.semaine.fin)}
          </span>
          <span className="mt-4 animate-pulse rounded-full bg-orange px-6 py-3 text-lg font-bold text-white shadow-lg">
            tape pour révéler ✨
          </span>
        </button>
      ) : (
        <div className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-16 pt-[max(2rem,env(safe-area-inset-top))]">
          {apercu && <span className="self-center rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-encre/60">aperçu · données inventées</span>}
          <h1 className="entree-ceremonie text-center text-2xl font-extrabold" style={delai(0)}>
            {titreGagnant}
          </h1>

          {/* Étoiles : une carte par personne, le compteur qui grimpe. */}
          <div className="grid grid-cols-2 gap-3">
            {etoiles.scores.map((s, i) => {
              const gagne = gagnants.some((g) => g.id === s.personne.id)
              return (
                <Bloc key={s.personne.id} delaiMs={PAS * (1 + i * 0.5)} couleur={s.personne.color}>
                  <span className="h-6 text-2xl">{gagne ? <span className="remise-badge" style={delai(PAS * 2.5)}>👑</span> : ''}</span>
                  <span className="font-bold" style={{ color: s.personne.color }}>
                    {s.personne.display_name}
                  </span>
                  <span className="text-3xl font-extrabold">
                    <Compteur cible={s.etoiles} departMs={PAS * (1 + i * 0.5)} /> ⭐
                  </span>
                  <span className="text-xs text-encre/60">
                    {formaterEtoiles(s.parNuit)} ⭐/nuit · {Math.round(s.part * 100)} % des tâches
                  </span>
                </Bloc>
              )
            })}
          </div>

          {/* Dépenses et cadeaux. */}
          <Bloc delaiMs={PAS * 2.5}>
            <span className="text-sm font-bold">💖 l'amour en euros</span>
            {coeurs.scores.map((s) => {
              const cadeau = coeurs.cadeaux.find((c) => c.personne.id === s.personne.id)
              return (
                <span key={s.personne.id} className="flex w-full items-center justify-between text-sm">
                  <span className="font-semibold" style={{ color: s.personne.color }}>
                    {s.coeur ? '💖' : '🤍'} {s.personne.display_name}
                  </span>
                  <span>
                    {formaterEuros(s.depense)}
                    {cadeau && cadeau.nombre > 0 && ` + ${cadeau.nombre} 🎁`}
                  </span>
                </span>
              )
            })}
          </Bloc>

          {/* Remise des badges. */}
          <Bloc delaiMs={tBadges - PAS / 2}>
            <span className="text-sm font-bold">🎖️ remise des badges</span>
            {badges.length === 0 ? (
              <span className="text-sm text-encre/60">Pas de badge cette semaine… des surprises vous attendent !</span>
            ) : (
              badges.map(({ personne, badge }, i) => (
                <Remise key={`${personne.id}-${badge.cle}`} delaiMs={tBadges + i * PAS * 0.6} emoji={badge.emoji(personne.gender)} personne={personne}>
                  reçoit <span className="font-semibold">{badge.titre(personne.gender)}</span>
                  <span className="block text-xs text-encre/50">{badge.regle}</span>
                </Remise>
              ))
            )}
          </Bloc>

          {/* Objectifs atteints dans la semaine : remise officielle. */}
          {objectifs.length > 0 && (
            <Bloc delaiMs={tObjectifs - PAS / 2}>
              <span className="text-sm font-bold">🎯 objectifs atteints, remise officielle</span>
              {objectifs.map(({ personne, objectif }, i) => (
                <Remise key={`${personne.id}-${objectif.titre}`} delaiMs={tObjectifs + i * PAS * 0.6} emoji={objectif.emoji} personne={personne}>
                  décroche <span className="font-semibold">{objectif.titre}</span>
                </Remise>
              ))}
            </Bloc>
          )}

          <button
            type="button"
            onClick={onFin}
            className="entree-ceremonie mt-2 rounded-full bg-orange px-6 py-4 text-lg font-bold text-white shadow-lg active:scale-95"
            style={delai(tFin)}
          >
            {apercu ? "fermer l'aperçu" : 'à nous la nouvelle semaine ✨'}
          </button>
        </div>
      )}
    </div>
  )
}

function Bloc({ delaiMs, couleur, children }: { delaiMs: number; couleur?: string; children: ReactNode }) {
  return (
    <div
      className="entree-ceremonie flex flex-col items-center gap-2 rounded-3xl bg-white/90 p-4 text-center shadow-md"
      style={{ ...delai(delaiMs), ...(couleur ? { borderTop: `6px solid ${couleur}` } : {}) }}
    >
      {children}
    </div>
  )
}

function Remise({ delaiMs, emoji, personne, children }: { delaiMs: number; emoji: string; personne: Profil; children: ReactNode }) {
  return (
    <div className="entree-ceremonie flex w-full items-center gap-3 rounded-2xl bg-creme p-2 text-left text-sm" style={delai(delaiMs)}>
      <span className="remise-badge text-4xl" style={delai(delaiMs + 150)}>
        {emoji}
      </span>
      <span>
        <span className="font-semibold" style={{ color: personne.color }}>
          {personne.display_name}
        </span>{' '}
        {children}
      </span>
    </div>
  )
}

/** Nombre qui grimpe de 0 à `cible` en ~1 s, à partir de `departMs`. */
function Compteur({ cible, departMs }: { cible: number; departMs: number }) {
  const [valeur, setValeur] = useState(0)
  useEffect(() => {
    let image = 0
    const debut = performance.now() + departMs
    const tick = (t: number) => {
      const avance = Math.min(1, Math.max(0, (t - debut) / 1000))
      setValeur(cible * (1 - (1 - avance) ** 3))
      if (avance < 1) image = requestAnimationFrame(tick)
    }
    image = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(image)
  }, [cible, departMs])
  return <>{formaterEtoiles(Math.round(valeur * 2) / 2)}</>
}
