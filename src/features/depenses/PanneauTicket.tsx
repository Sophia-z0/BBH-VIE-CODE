import { useEffect, useMemo, useState } from 'react'
import { TuileRetournable } from '../../components/TuileRetournable'
import { jourLoggable } from '../../domain/calendrier'
import type { ArticleTicket, Categorie } from '../../domain/types'
import { formaterEuros } from '../../lib/argent'
import { messageErreur } from '../../lib/erreurs'
import { lireTicket, type LectureTicket } from '../../services/ticket'

const CATEGORIE_ALIMENTAIRE = /aliment|courses/i
/** Destination « offrir au foyer » (les autres destinations sont des id de catégorie). */
const CADEAU = 'cadeau'

/** Où va un lot d'articles : une catégorie de dépense, ou le cadeau au foyer. */
export type Destination = { type: 'categorie'; categorie: Categorie } | { type: 'cadeau' }

/** Un lot du ticket : les articles cochés d'une même destination, enregistrés ensemble. */
export interface LotTicket {
  destination: Destination
  montant: number
  magasin: string
  /** Jour d'achat lu sur le ticket, s'il est dans la semaine en cours (AAAA-MM-JJ). */
  jour: string | null
  articles: ArticleTicket[]
}

/**
 * Panneau du bas : lit la photo d'un ticket ; chaque article arrive rangé dans la catégorie
 * proposée par la lecture. On décoche le perso, on touche l'emoji d'un article pour le changer
 * de catégorie (ou l'offrir au foyer), puis un bouton crée une dépense par catégorie.
 */
export function PanneauTicket({
  photo,
  categories,
  onEnregistrer,
  onTermine,
  onFermer,
}: {
  photo: File
  categories: Categorie[]
  /** Enregistre un lot ; en cas d'erreur, les lots déjà enregistrés quittent la liste. */
  onEnregistrer: (lot: LotTicket) => Promise<void>
  onTermine: () => void
  onFermer: () => void
}) {
  const [lecture, setLecture] = useState<LectureTicket | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [coches, setCoches] = useState<boolean[]>([])
  const [destinations, setDestinations] = useState<string[]>([])
  const [faits, setFaits] = useState<boolean[]>([])
  /** Article dont on choisit la catégorie (ligne de tuiles affichée). */
  const [aRanger, setARanger] = useState<number | null>(null)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    let annule = false
    const parDefaut = (categories.find((c) => CATEGORIE_ALIMENTAIRE.test(c.name)) ?? categories[0])?.id ?? CADEAU
    lireTicket(
      photo,
      categories.map((c) => c.name),
    )
      .then((resultat) => {
        if (annule) return
        setLecture(resultat)
        setCoches(resultat.articles.map(() => true))
        setFaits(resultat.articles.map(() => false))
        setDestinations(
          resultat.articles.map(
            (a) => categories.find((c) => c.name.toLowerCase() === a.categorie?.toLowerCase())?.id ?? parDefaut,
          ),
        )
      })
      .catch((e) => !annule && setErreur(messageErreur(e)))
    return () => {
      annule = true
    }
    // La lecture ne se relance que pour une nouvelle photo.
  }, [photo])

  /** Groupes affichés, dans l'ordre d'apparition sur le ticket. */
  const groupes = useMemo(() => {
    const parDestination = new Map<string, number[]>()
    lecture?.articles.forEach((_, i) => {
      if (faits[i]) return
      const d = destinations[i]
      parDestination.set(d, [...(parDestination.get(d) ?? []), i])
    })
    return [...parDestination.entries()]
  }, [lecture, faits, destinations])

  const totalDe = (indices: number[]) => indices.reduce((t, i) => t + (coches[i] ? lecture!.articles[i].montant_cents : 0), 0)
  const lotsValides = groupes.filter(([, indices]) => totalDe(indices) > 0)
  const nbDepenses = lotsValides.filter(([d]) => d !== CADEAU).length
  const aUnCadeau = lotsValides.some(([d]) => d === CADEAU)
  const restants = lecture?.articles.filter((_, i) => !faits[i]) ?? []
  const toutCoche = coches.length > 0 && coches.every((c, i) => c || faits[i])

  const nomDe = (d: string) => (d === CADEAU ? 'offrir au foyer' : categories.find((c) => c.id === d)?.name ?? '?')
  const emojiDe = (d: string) => (d === CADEAU ? '🎁' : categories.find((c) => c.id === d)?.emoji ?? '❔')

  async function valider() {
    if (!lecture || envoi || lotsValides.length === 0) return
    setEnvoi(true)
    setErreur(null)
    const magasin = lecture.magasin.trim().slice(0, 40)
    const jour = /^\d{4}-\d{2}-\d{2}$/.test(lecture.date) && jourLoggable(lecture.date) ? lecture.date : null
    try {
      for (const [d, indices] of lotsValides) {
        const retenus = indices.filter((i) => coches[i])
        const categorie = categories.find((c) => c.id === d)
        await onEnregistrer({
          destination: d === CADEAU || !categorie ? { type: 'cadeau' } : { type: 'categorie', categorie },
          montant: totalDe(indices),
          magasin,
          jour,
          articles: retenus.map((i) => ({ libelle: lecture.articles[i].libelle, montant_cents: lecture.articles[i].montant_cents })),
        })
        // Enregistré : ces articles quittent la liste (pas de doublon si on réessaie après une erreur).
        setFaits((f) => f.map((fait, i) => fait || indices.includes(i)))
      }
      onTermine()
    } catch (e) {
      setErreur(messageErreur(e))
      setEnvoi(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-encre/30" onClick={onFermer}>
      <section
        className="flex max-h-[85vh] w-full flex-col gap-3 overflow-y-auto rounded-t-3xl bg-creme p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        style={{ animation: 'apparaitre 200ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🧾 {lecture?.magasin || 'ticket de caisse'}</h2>
          <button type="button" aria-label="fermer" className="px-2 text-xl text-encre/50" onClick={onFermer}>
            ✕
          </button>
        </div>

        {!lecture && !erreur && <p className="animate-pulse py-10 text-center text-encre/60">Lecture du ticket…</p>}
        {erreur && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreur}</p>}

        {lecture && lecture.articles.length === 0 && (
          <p className="py-6 text-center text-sm text-encre/60">Aucun article trouvé sur cette photo. Essaie avec une photo plus nette, bien à plat.</p>
        )}

        {lecture && restants.length > 0 && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-encre/60">Décoche le perso, touche un emoji pour changer de catégorie.</span>
              <button
                type="button"
                className="flex-none font-semibold text-orange"
                onClick={() => setCoches(coches.map(() => !toutCoche))}
              >
                {toutCoche ? 'tout décocher' : 'tout cocher'}
              </button>
            </div>

            {groupes.map(([d, indices]) => (
              <section key={d}>
                <h3 className="mb-1 flex justify-between px-1 text-sm font-bold">
                  <span>
                    {emojiDe(d)} {nomDe(d)}
                  </span>
                  <span>{formaterEuros(totalDe(indices))}</span>
                </h3>
                <ul className={`flex flex-col divide-y divide-orange/10 rounded-2xl ${d === CADEAU ? 'bg-pink-50' : 'bg-white'}`}>
                  {indices.map((i) => {
                    const article = lecture.articles[i]
                    return (
                      <li key={i} className={`flex items-center gap-3 px-4 py-2 text-sm ${aRanger === i ? 'bg-orange/10' : ''}`}>
                        <input
                          type="checkbox"
                          aria-label={article.libelle}
                          className="size-5 flex-none accent-orange"
                          checked={coches[i] ?? false}
                          onChange={() => setCoches(coches.map((c, j) => (j === i ? !c : c)))}
                        />
                        <span className={`flex-1 ${coches[i] ? '' : 'text-encre/40 line-through'}`}>{article.libelle}</span>
                        <span className={`font-semibold ${article.montant_cents < 0 ? 'text-green-700' : ''}`}>
                          {formaterEuros(article.montant_cents)}
                        </span>
                        <button
                          type="button"
                          aria-label={`changer la catégorie de ${article.libelle}`}
                          className="flex-none rounded-full bg-creme px-2 py-1 text-lg active:scale-90"
                          onClick={() => setARanger(aRanger === i ? null : i)}
                        >
                          {emojiDe(destinations[i])}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
            {lecture.total_cents > 0 && <p className="text-right text-xs text-encre/50">total du ticket : {formaterEuros(lecture.total_cents)}</p>}

            {aRanger !== null && (
              <div className="sticky bottom-0 -mx-5 flex flex-col gap-1 bg-creme pt-2">
                <p className="px-5 text-sm font-semibold">
                  Où va <i>{lecture.articles[aRanger].libelle}</i> ?
                </p>
                <div className="sans-barre flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overflow-y-hidden px-5 py-4">
                  {[CADEAU, ...categories.map((c) => c.id)].map((d) => (
                    <TuileRetournable
                      key={d}
                      dos={null}
                      onTap={() => {
                        setDestinations(destinations.map((x, j) => (j === aRanger ? d : x)))
                        setARanger(null)
                      }}
                      onFermer={() => {}}
                      classeFace={d === CADEAU ? 'tuile-rose' : 'bg-white shadow-sm active:bg-rose/10'}
                    >
                      <span className="text-4xl">{emojiDe(d)}</span>
                      <span className="line-clamp-3 text-xs leading-tight font-semibold">{nomDe(d)}</span>
                      <span className="text-[10px] leading-tight text-encre/60">{d === CADEAU ? 'hors dépenses' : '💖'}</span>
                    </TuileRetournable>
                  ))}
                </div>
              </div>
            )}

            {aRanger === null && (
              <button
                type="button"
                disabled={envoi || lotsValides.length === 0}
                onClick={valider}
                className="rounded-2xl bg-rose py-3 text-lg font-bold text-white transition active:scale-95 disabled:opacity-40"
              >
                {lotsValides.length === 0
                  ? 'coche au moins un article'
                  : `ajouter ${[
                      nbDepenses > 0 && `${nbDepenses} dépense${nbDepenses > 1 ? 's' : ''}`,
                      aUnCadeau && '1 cadeau',
                    ]
                      .filter(Boolean)
                      .join(' et ')} 💖`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
