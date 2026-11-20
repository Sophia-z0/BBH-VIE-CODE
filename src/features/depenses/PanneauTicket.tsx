import { useEffect, useMemo, useState } from 'react'
import { TuileRetournable } from '../../components/TuileRetournable'
import { jourLoggable } from '../../domain/calendrier'
import type { ArticleTicket, Categorie } from '../../domain/types'
import { formaterEuros } from '../../lib/argent'
import { messageErreur } from '../../lib/erreurs'
import { lireTicket, type LectureTicket } from '../../services/ticket'

/** Tuile touchée après la lecture : une catégorie de dépense, ou le cadeau au foyer. */
export type Destination = { type: 'categorie'; categorie: Categorie } | { type: 'cadeau' }

export interface TicketValide {
  destination: Destination
  montant: number
  magasin: string
  /** Jour d'achat lu sur le ticket, s'il est dans la semaine en cours (AAAA-MM-JJ). */
  jour: string | null
  articles: ArticleTicket[]
}

/**
 * Panneau du bas : lit la photo d'un ticket, puis on coche ce qui est pour le foyer.
 * Tout est coché au départ : on décoche le perso, puis on touche la tuile où ça va.
 */
export function PanneauTicket({
  photo,
  categories,
  onValider,
  onFermer,
}: {
  photo: File
  categories: Categorie[]
  onValider: (ticket: TicketValide) => Promise<void>
  onFermer: () => void
}) {
  const [lecture, setLecture] = useState<LectureTicket | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [coches, setCoches] = useState<boolean[]>([])
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    let annule = false
    lireTicket(photo)
      .then((resultat) => {
        if (annule) return
        setLecture(resultat)
        setCoches(resultat.articles.map(() => true))
      })
      .catch((e) => !annule && setErreur(messageErreur(e)))
    return () => {
      annule = true
    }
  }, [photo])

  const retenus = useMemo(() => lecture?.articles.filter((_, i) => coches[i]) ?? [], [lecture, coches])
  const total = retenus.reduce((t, a) => t + a.montant_cents, 0)
  const toutCoche = coches.length > 0 && coches.every(Boolean)

  async function valider(destination: Destination) {
    if (!lecture || total <= 0 || envoi) return
    setEnvoi(true)
    setErreur(null)
    try {
      await onValider({
        destination,
        montant: total,
        magasin: lecture.magasin.trim().slice(0, 40),
        jour: /^\d{4}-\d{2}-\d{2}$/.test(lecture.date) && jourLoggable(lecture.date) ? lecture.date : null,
        articles: retenus,
      })
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

        {lecture && lecture.articles.length > 0 && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-encre/60">Décoche ce qui est perso.</span>
              <button type="button" className="font-semibold text-orange" onClick={() => setCoches(coches.map(() => !toutCoche))}>
                {toutCoche ? 'tout décocher' : 'tout cocher'}
              </button>
            </div>
            <ul className="flex flex-col divide-y divide-orange/10 rounded-2xl bg-white">
              {lecture.articles.map((article, i) => (
                <li key={i}>
                  <label className="flex items-center gap-3 px-4 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-5 accent-orange"
                      checked={coches[i] ?? false}
                      onChange={() => setCoches(coches.map((c, j) => (j === i ? !c : c)))}
                    />
                    <span className={`flex-1 ${coches[i] ? '' : 'text-encre/40 line-through'}`}>{article.libelle}</span>
                    <span className={`font-semibold ${article.montant_cents < 0 ? 'text-green-700' : ''}`}>{formaterEuros(article.montant_cents)}</span>
                  </label>
                </li>
              ))}
            </ul>
            {lecture.total_cents > 0 && (
              <p className="text-right text-xs text-encre/50">total du ticket : {formaterEuros(lecture.total_cents)}</p>
            )}

            <p className="text-sm font-semibold">
              {total > 0 ? `Où vont ces ${formaterEuros(total)} ?` : 'Coche au moins un article.'}
            </p>
            <div className={`sans-barre -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overflow-y-hidden px-5 py-4 ${total > 0 && !envoi ? '' : 'pointer-events-none opacity-40'}`}>
              <TuileRetournable dos={null} onTap={() => valider({ type: 'cadeau' })} onFermer={() => {}} classeFace="tuile-rose">
                <span className="text-4xl">🎁</span>
                <span className="line-clamp-3 text-xs leading-tight font-semibold">offrir au foyer</span>
                <span className="text-[10px] leading-tight text-encre/60">hors dépenses</span>
              </TuileRetournable>
              {categories.map((c) => (
                <TuileRetournable
                  key={c.id}
                  dos={null}
                  onTap={() => valider({ type: 'categorie', categorie: c })}
                  onFermer={() => {}}
                  classeFace="bg-white shadow-sm active:bg-rose/10"
                >
                  <span className="text-4xl">{c.emoji}</span>
                  <span className="line-clamp-3 text-xs leading-tight font-semibold">{c.name}</span>
                  <span className="text-xs">💖</span>
                </TuileRetournable>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
