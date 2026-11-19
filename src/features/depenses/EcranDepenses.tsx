import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Bouton } from '../../components/Bouton'
import { Celebration } from '../../components/Celebration'
import { ChoixQuand, instantChoisi, quandDuJour } from '../../components/ChoixQuand'
import { classePuce } from '../../components/Puce'
import { Retour } from '../../components/Retour'
import { encouragementAuHasard, type Occasion } from '../../domain/encouragements'
import type { Cadeau, Categorie, Depense } from '../../domain/types'
import { formaterEuros, lireMontant } from '../../lib/argent'
import { formaterJourHeure } from '../../lib/dates'
import { messageErreur } from '../../lib/erreurs'
import { ajouterCadeau, ajouterDepense, supprimerCadeau, supprimerDepense } from '../../services/depenses'
import { useFoyerPret } from '../foyer/FoyerContext'
import { useDepensesSemaine } from './useDepensesSemaine'

const DUREE_ANNULATION_MS = 5000

type Entree = { type: 'depense'; valeur: Depense } | { type: 'cadeau'; valeur: Cadeau }

interface RetourAffiche {
  entree: Entree
  emoji: string
  gain: string
  message: string
}

/**
 * Ajout rapide : montant, puis un tap sur la catégorie, et c'est enregistré.
 * Accepte ?montant=12,50&tag=… dans l'adresse (raccourcis du téléphone), et ?jour=AAAA-MM-JJ (calendrier).
 */
export function EcranDepenses() {
  const { moi } = useFoyerPret()
  const { categories, etiquettes, depenses, setDepenses, cadeaux, setCadeaux, chargement, erreur } = useDepensesSemaine(moi.id)
  const [parametres] = useSearchParams()

  const [mode, setMode] = useState<'depense' | 'cadeau'>('depense')
  const [montant, setMontant] = useState(parametres.get('montant') ?? '')
  const [tag, setTag] = useState(parametres.get('tag') ?? '')
  const [description, setDescription] = useState('')
  // Jour choisi dans le calendrier (?jour=AAAA-MM-JJ) : « quand » y revient après chaque ajout.
  const quandInitial = quandDuJour(parametres.get('jour'))
  const [quand, setQuand] = useState<string | null>(quandInitial)

  const [celebration, setCelebration] = useState<{ cle: number; occasion: Occasion }>({ cle: 0, occasion: 'depense' })
  const [retour, setRetour] = useState<RetourAffiche | null>(null)
  const [erreurAjout, setErreurAjout] = useState<string | null>(null)
  const minuteurRetour = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(minuteurRetour.current), [])

  function feter(occasion: Occasion, retourAffiche: RetourAffiche) {
    setCelebration((c) => ({ cle: c.cle + 1, occasion }))
    setRetour(retourAffiche)
    navigator.vibrate?.(30)
    clearTimeout(minuteurRetour.current)
    minuteurRetour.current = setTimeout(() => setRetour(null), DUREE_ANNULATION_MS)
    setMontant('')
    setTag('')
    setDescription('')
    setQuand(quandInitial)
  }

  async function enregistrerDepense(categorie: Categorie) {
    setErreurAjout(null)
    const centimes = lireMontant(montant)
    if (centimes === null) return setErreurAjout('Indique d’abord un montant 💶')
    try {
      const depense = await ajouterDepense({ category_id: categorie.id, amount_cents: centimes, tag, spent_at: instantChoisi(quand) })
      setDepenses((liste) => [depense, ...liste])
      feter('depense', {
        entree: { type: 'depense', valeur: depense },
        emoji: categorie.emoji,
        gain: `+${formaterEuros(centimes)} 💖`,
        message: encouragementAuHasard('depense'),
      })
    } catch (e) {
      setErreurAjout(messageErreur(e))
    }
  }

  async function enregistrerCadeau() {
    setErreurAjout(null)
    const centimes = lireMontant(montant)
    if (!description.trim()) return setErreurAjout('Quel est ce cadeau ? 🎁')
    if (centimes === null) return setErreurAjout('Estime sa valeur, même à peu près 💶')
    try {
      const cadeau = await ajouterCadeau({ description: description.trim(), estimated_cents: centimes, given_at: instantChoisi(quand) })
      setCadeaux((liste) => [cadeau, ...liste])
      feter('cadeau', {
        entree: { type: 'cadeau', valeur: cadeau },
        emoji: '🎁',
        gain: `${cadeau.description} (${formaterEuros(centimes)})`,
        message: encouragementAuHasard('cadeau'),
      })
    } catch (e) {
      setErreurAjout(messageErreur(e))
    }
  }

  async function annuler(entree: Entree) {
    try {
      if (entree.type === 'depense') {
        await supprimerDepense(entree.valeur.id)
        setDepenses((liste) => liste.filter((d) => d.id !== entree.valeur.id))
      } else {
        await supprimerCadeau(entree.valeur.id)
        setCadeaux((liste) => liste.filter((c) => c.id !== entree.valeur.id))
      }
      if (retour?.entree.valeur.id === entree.valeur.id) setRetour(null)
    } catch (e) {
      setErreurAjout(messageErreur(e))
    }
  }

  if (chargement) return <p className="mt-20 animate-pulse text-center text-4xl">💖</p>
  if (erreur) return <p className="mt-10 rounded-xl bg-red-100 p-4 text-red-800">{erreur}</p>

  const totalDepenses = depenses.reduce((t, d) => t + d.amount_cents, 0)
  const totalCadeaux = cadeaux.reduce((t, c) => t + c.estimated_cents, 0)
  const categorie = (id: string) => categories.find((c) => c.id === id)
  const entrees: Entree[] = [
    ...depenses.map((valeur): Entree => ({ type: 'depense', valeur })),
    ...cadeaux.map((valeur): Entree => ({ type: 'cadeau', valeur })),
  ].sort((a, b) => dateEntree(b).localeCompare(dateEntree(a)))

  return (
    <div className="flex flex-col gap-5 pt-4">
      <section className="rounded-3xl p-5 text-white shadow-lg" style={{ backgroundColor: moi.color }}>
        <p className="text-sm opacity-90">mes 💖 cette semaine</p>
        <p className="text-5xl font-extrabold">{formaterEuros(totalDepenses)}</p>
        {cadeaux.length > 0 && (
          <p className="mt-1 text-sm opacity-90">
            + 🎁 {cadeaux.length} cadeau{cadeaux.length > 1 ? 'x' : ''} ({formaterEuros(totalCadeaux)} estimés)
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1">
        {(['depense', 'cadeau'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl py-2 font-semibold ${mode === m ? 'bg-orange text-white' : 'text-encre/60'}`}
          >
            {m === 'depense' ? '💖 dépense' : '🎁 cadeau'}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <input
          aria-label={mode === 'depense' ? 'montant' : 'valeur estimée'}
          inputMode="decimal"
          placeholder={mode === 'depense' ? '0,00' : 'valeur estimée'}
          className="min-w-0 flex-1 bg-transparent text-4xl font-extrabold outline-none"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
        />
        <span className="text-3xl font-bold text-encre/40">€</span>
      </label>

      {mode === 'depense' ? (
        <>
          <div className="flex flex-col gap-2">
            <input
              aria-label="produit ou étiquette (optionnel)"
              placeholder="produit ou étiquette (optionnel) : papier toilette, chantilly…"
              maxLength={40}
              className="rounded-xl bg-white px-4 py-3 text-sm outline-none"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
            {etiquettes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {etiquettes.map((e) => (
                  <button key={e} type="button" className={classePuce(tag === e)} onClick={() => setTag(tag === e ? '' : e)}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <ChoixQuand quand={quand} setQuand={setQuand} />
          {erreurAjout && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreurAjout}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories
              .filter((c) => c.active)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => enregistrerDepense(c)}
                  className="flex min-h-20 items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm transition active:scale-95 active:bg-rose/10"
                >
                  <span className="text-3xl">{c.emoji}</span>
                  <span className="text-sm leading-tight font-semibold">{c.name}</span>
                </button>
              ))}
          </div>
        </>
      ) : (
        <>
          <input
            aria-label="description du cadeau"
            placeholder="panier de légumes, bouteille de vin…"
            maxLength={80}
            className="rounded-xl bg-white px-4 py-3 outline-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <ChoixQuand quand={quand} setQuand={setQuand} />
          {erreurAjout && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreurAjout}</p>}
          <Bouton type="button" onClick={enregistrerCadeau}>
            offrir au foyer 🎁
          </Bouton>
        </>
      )}

      <div className="flex justify-center gap-4 text-sm text-encre/60">
        <Link to="/depenses/recurrentes" className="underline">
          🔁 dépenses récurrentes
        </Link>
        <Link to="/depenses/categories" className="underline">
          ✏️ catégories
        </Link>
      </div>

      {entrees.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-encre/50">mes entrées de la semaine</h2>
          <ul className="flex flex-col divide-y divide-orange/10 rounded-2xl bg-white">
            {entrees.map((entree) => (
              <li key={entree.valeur.id} className="flex items-center gap-3 px-4 py-3">
                {entree.type === 'depense' ? (
                  <>
                    <span className="text-xl">{categorie(entree.valeur.category_id)?.emoji}</span>
                    <span className="flex-1 text-sm">
                      <span className="font-semibold">{categorie(entree.valeur.category_id)?.name}</span>
                      {entree.valeur.tag && <span className="text-encre/60"> · {entree.valeur.tag}</span>}
                      {entree.valeur.recurring_id && ' 🔁'}
                      <br />
                      <span className="text-encre/50">{formaterJourHeure(entree.valeur.spent_at)}</span>
                    </span>
                    <span className="text-sm font-semibold">{formaterEuros(entree.valeur.amount_cents)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🎁</span>
                    <span className="flex-1 text-sm">
                      <span className="font-semibold">{entree.valeur.description}</span>
                      <br />
                      <span className="text-encre/50">{formaterJourHeure(entree.valeur.given_at)}</span>
                    </span>
                    <span className="text-sm font-semibold text-rose">≈ {formaterEuros(entree.valeur.estimated_cents)}</span>
                  </>
                )}
                <button type="button" aria-label="supprimer" className="px-2 text-encre/40" onClick={() => annuler(entree)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {celebration.cle > 0 && <Celebration cle={celebration.cle} occasion={celebration.occasion} />}
      {retour && <Retour emoji={retour.emoji} gain={retour.gain} message={retour.message} onAnnuler={() => annuler(retour.entree)} />}
    </div>
  )
}

function dateEntree(entree: Entree): string {
  return entree.type === 'depense' ? entree.valeur.spent_at : entree.valeur.given_at
}
