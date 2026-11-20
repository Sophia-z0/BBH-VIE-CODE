import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Celebration } from '../../components/Celebration'
import { ChoixQuand, instantChoisi, quandDuJour } from '../../components/ChoixQuand'
import { BandeauSemaine } from '../../components/BandeauSemaine'
import { PileDeCartes } from '../../components/PileDeCartes'
import { TuileRetournable, type Dos } from '../../components/TuileRetournable'
import { useCollecte } from '../../components/useCollecte'
import { encouragementAuHasard, type Occasion } from '../../domain/encouragements'
import type { Cadeau, Categorie, Depense } from '../../domain/types'
import { formaterEuros, lireMontant } from '../../lib/argent'
import { formaterJourHeure } from '../../lib/dates'
import { messageErreur } from '../../lib/erreurs'
import { CARTES_COLLECTEES } from '../../lib/options'
import { ajouterCadeau, ajouterDepense, supprimerCadeau, supprimerDepense } from '../../services/depenses'
import { useFoyerPret } from '../foyer/FoyerContext'
import { PanneauTicket, type LotTicket } from './PanneauTicket'
import { PucesEtiquettes } from './PucesEtiquettes'
import { useDepensesSemaine } from './useDepensesSemaine'

const DUREE_ANNULATION_MS = 5000

type Entree = { type: 'depense'; valeur: Depense } | { type: 'cadeau'; valeur: Cadeau }

/** Dos de tuile affiché : après un ajout (avec l'entrée, annulable) ou pour une aide (sans entrée). */
interface RetourAffiche {
  /** Tuile retournée : id de la catégorie, ou CLE_CADEAU. */
  cle: string
  entree?: Entree
  gain: string
  message: string
}

const CLE_CADEAU = 'cadeau'
/** Lecture des tickets (fonction « lire-ticket ») : passer à false pour la masquer. */
const TICKETS_ACTIFS = true

/**
 * Ajout rapide : montant, puis un tap sur la catégorie, et c'est enregistré.
 * Accepte ?montant=12,50&tag=… dans l'adresse (raccourcis du téléphone), et ?jour=AAAA-MM-JJ (calendrier).
 */
export function EcranDepenses() {
  const { moi } = useFoyerPret()
  const { categories, etiquettes, masquerEtiquette, depenses, setDepenses, cadeaux, setCadeaux, chargement, erreur } = useDepensesSemaine(moi.id)
  const [parametres] = useSearchParams()

  const [montant, setMontant] = useState(parametres.get('montant') ?? '')
  const [tag, setTag] = useState(parametres.get('tag') ?? '')
  // Jour choisi dans le calendrier (?jour=AAAA-MM-JJ) : « quand » y revient après chaque ajout.
  const quandInitial = quandDuJour(parametres.get('jour'))
  const [quand, setQuand] = useState<string | null>(quandInitial)

  const [celebration, setCelebration] = useState<{ cle: number; occasion: Occasion }>({ cle: 0, occasion: 'depense' })
  const [retour, setRetour] = useState<RetourAffiche | null>(null)
  const [erreurAjout, setErreurAjout] = useState<string | null>(null)
  const minuteurRetour = useRef<ReturnType<typeof setTimeout>>(undefined)
  const champPhoto = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  /** Entrées créées depuis le ticket en cours : la plus grosse retourne sa tuile à la fin. */
  const lotsDuTicket = useRef<{ retour: RetourAffiche; occasion: Occasion; montant: number }[]>([])

  useEffect(() => () => clearTimeout(minuteurRetour.current), [])
  const collecte = useCollecte(() => setRetour(null))

  function feter(occasion: Occasion, retourAffiche: RetourAffiche) {
    setCelebration((c) => ({ cle: c.cle + 1, occasion }))
    setRetour(retourAffiche)
    navigator.vibrate?.(30)
    clearTimeout(minuteurRetour.current)
    if (CARTES_COLLECTEES && retourAffiche.entree) collecte.collecter(retourAffiche.cle, retourAffiche.entree.valeur.id)
    else minuteurRetour.current = setTimeout(() => setRetour(null), DUREE_ANNULATION_MS)
    setMontant('')
    setTag('')
    setQuand(quandInitial)
  }

  /** Retourne la tuile sur un message d'aide (rien n'est enregistré). */
  function aider(cle: string, gain: string, message: string) {
    setRetour({ cle, gain, message })
    clearTimeout(minuteurRetour.current)
    minuteurRetour.current = setTimeout(() => setRetour(null), DUREE_ANNULATION_MS)
  }

  function fermerRetour() {
    clearTimeout(minuteurRetour.current)
    if (CARTES_COLLECTEES && retour?.entree) collecte.accelerer()
    else setRetour(null)
  }

  async function enregistrerDepense(categorie: Categorie) {
    setErreurAjout(null)
    const centimes = lireMontant(montant)
    if (centimes === null) return aider(categorie.id, '💶', 'Indique d’abord un montant au-dessus')
    try {
      const depense = await ajouterDepense({ category_id: categorie.id, amount_cents: centimes, tag, spent_at: instantChoisi(quand) })
      setDepenses((liste) => [depense, ...liste])
      feter('depense', {
        cle: categorie.id,
        entree: { type: 'depense', valeur: depense },
        gain: `+${formaterEuros(centimes)} 💖`,
        message: encouragementAuHasard('depense', { moi: moi.display_name, categorie: categorie.name }),
      })
    } catch (e) {
      setErreurAjout(messageErreur(e))
    }
  }

  /**
   * Un lot du ticket (articles cochés d'une même destination) : une dépense avec ses articles,
   * ou un cadeau au foyer (le magasin pour description, le total pour valeur estimée).
   */
  async function enregistrerLot(lot: LotTicket) {
    // Date du ticket si elle est dans la semaine en cours, sinon la date choisie à l'écran.
    const instant = lot.instant ?? instantChoisi(quand)
    if (lot.destination.type === 'cadeau') {
      const cadeau = await ajouterCadeau({ description: lot.magasin || 'courses du ticket', estimated_cents: lot.montant, given_at: instant })
      setCadeaux((liste) => [cadeau, ...liste])
      lotsDuTicket.current.push({
        occasion: 'cadeau',
        montant: lot.montant,
        retour: {
          cle: CLE_CADEAU,
          entree: { type: 'cadeau', valeur: cadeau },
          gain: `🎁 ${formaterEuros(lot.montant)}`,
          message: encouragementAuHasard('cadeau', { moi: moi.display_name }),
        },
      })
      return
    }
    const { categorie } = lot.destination
    const depense = await ajouterDepense({
      category_id: categorie.id,
      amount_cents: lot.montant,
      tag: lot.magasin,
      spent_at: instant,
      items: lot.articles,
    })
    setDepenses((liste) => [depense, ...liste])
    lotsDuTicket.current.push({
      occasion: 'depense',
      montant: lot.montant,
      retour: {
        cle: categorie.id,
        entree: { type: 'depense', valeur: depense },
        gain: `+${formaterEuros(lot.montant)} 💖`,
        message: encouragementAuHasard('depense', { moi: moi.display_name, categorie: categorie.name }),
      },
    })
  }

  /** Ticket fini : le panneau se ferme et la tuile du plus gros lot se retourne (puis va sur la pile). */
  function terminerTicket() {
    setPhoto(null)
    const [plusGros] = [...lotsDuTicket.current].sort((a, b) => b.montant - a.montant)
    lotsDuTicket.current = []
    if (plusGros) feter(plusGros.occasion, plusGros.retour)
  }

  async function enregistrerCadeau() {
    setErreurAjout(null)
    const centimes = lireMontant(montant)
    if (centimes === null) return aider(CLE_CADEAU, '💶', 'Estime sa valeur au-dessus, même à peu près')
    if (!tag.trim()) return aider(CLE_CADEAU, '🎁', 'Quel est ce cadeau ? Écris-le au-dessus')
    try {
      const cadeau = await ajouterCadeau({ description: tag.trim(), estimated_cents: centimes, given_at: instantChoisi(quand) })
      setCadeaux((liste) => [cadeau, ...liste])
      feter('cadeau', {
        cle: CLE_CADEAU,
        entree: { type: 'cadeau', valeur: cadeau },
        gain: `🎁 ${formaterEuros(centimes)}`,
        message: encouragementAuHasard('cadeau', { moi: moi.display_name }),
      })
    } catch (e) {
      setErreurAjout(messageErreur(e))
    }
  }

  async function annuler(entree: Entree) {
    try {
      collecte.oublier(entree.valeur.id)
      if (entree.type === 'depense') {
        await supprimerDepense(entree.valeur.id)
        setDepenses((liste) => liste.filter((d) => d.id !== entree.valeur.id))
      } else {
        await supprimerCadeau(entree.valeur.id)
        setCadeaux((liste) => liste.filter((c) => c.id !== entree.valeur.id))
      }
      if (retour?.entree?.valeur.id === entree.valeur.id) setRetour(null)
    } catch (e) {
      setErreurAjout(messageErreur(e))
    }
  }

  if (chargement) return <p className="mt-20 animate-pulse text-center text-4xl">💖</p>
  if (erreur) return <p className="mt-10 rounded-xl bg-red-100 p-4 text-red-800">{erreur}</p>

  const totalDepenses = depenses.reduce((t, d) => t + d.amount_cents, 0)
  const totalCadeaux = cadeaux.reduce((t, c) => t + c.estimated_cents, 0)
  const categorie = (id: string) => categories.find((c) => c.id === id)
  const dosDe = (cle: string): Dos | null => {
    if (retour?.cle !== cle) return null
    const { entree } = retour
    return { gain: retour.gain, message: retour.message, onAnnuler: entree ? () => annuler(entree) : undefined }
  }
  const entrees: Entree[] = [
    ...depenses.map((valeur): Entree => ({ type: 'depense', valeur })),
    ...cadeaux.map((valeur): Entree => ({ type: 'cadeau', valeur })),
  ].sort((a, b) => dateEntree(b).localeCompare(dateEntree(a)))

  const dernierAnnulable = !retour ? entrees.find((e) => e.valeur.id === collecte.annulable) : undefined
  const pile = CARTES_COLLECTEES ? (
    <PileDeCartes
      atterrissage={collecte.atterrissage}
      cartes={entrees
        .filter((e) => e.valeur.id !== collecte.enVol)
        .map((e) =>
          e.type === 'depense'
            ? { id: e.valeur.id, emoji: categorie(e.valeur.category_id)?.emoji ?? '💖', nom: categorie(e.valeur.category_id)?.name ?? '', classe: 'bg-white' }
            : { id: e.valeur.id, emoji: '🎁', nom: e.valeur.description, classe: 'bg-pink-100' },
        )}
      onAnnuler={dernierAnnulable && (() => annuler(dernierAnnulable))}
    />
  ) : undefined

  return (
    <div className="flex flex-col gap-5 pt-4">
      <BandeauSemaine
        couleur={moi.color}
        libelle="mes 💖 cette semaine"
        valeur={formaterEuros(totalDepenses)}
        pile={pile}
        detail={
          cadeaux.length > 0 && `+ 🎁 ${cadeaux.length} cadeau${cadeaux.length > 1 ? 'x' : ''} (${formaterEuros(totalCadeaux)} estimés)`
        }
      />

      {/* Deux façons de saisir : taper le montant, ou scanner le ticket (on choisit la tuile après la lecture). */}
      <div className={`grid gap-3 ${TICKETS_ACTIFS ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <label className="flex h-24 flex-col justify-between rounded-2xl bg-white p-3 shadow-sm">
          <span className="text-xs font-semibold text-encre/60">💶 montant</span>
          <span className="flex items-baseline gap-1">
            <input
              aria-label="montant ou valeur estimée du cadeau"
              inputMode="decimal"
              placeholder="0,00"
              className="w-full min-w-0 bg-transparent text-3xl font-extrabold outline-none"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
            <span className="text-2xl font-bold text-encre/40">€</span>
          </span>
        </label>
        {TICKETS_ACTIFS && (
          <button
            type="button"
            onClick={() => champPhoto.current?.click()}
            className="flex h-24 flex-col items-start justify-between rounded-2xl bg-white p-3 text-left shadow-sm transition active:scale-95 active:bg-rose/10"
          >
            <span className="text-xs font-semibold text-encre/60">🧾 ticket de caisse</span>
            <span className="text-lg leading-tight font-bold">📷 scanner</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          aria-label="produit, étiquette ou cadeau (optionnel)"
          placeholder="produit, étiquette ou cadeau : papier toilette, bouquet…"
          maxLength={40}
          className="rounded-xl bg-white px-4 py-3 text-sm outline-none"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <PucesEtiquettes
          etiquettes={etiquettes}
          choisie={tag}
          onChoisir={setTag}
          onMasquer={(e) => {
            masquerEtiquette(e)
            if (tag === e) setTag('')
          }}
        />
      </div>
      <ChoixQuand quand={quand} setQuand={setQuand} />
      {erreurAjout && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreurAjout}</p>}

      {/* Photo du ticket : appareil photo ou galerie, au choix du téléphone. */}
      <input
        ref={champPhoto}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const fichier = e.target.files?.[0]
          e.target.value = ''
          if (fichier) {
            lotsDuTicket.current = []
            setPhoto(fichier)
          }
        }}
      />

      {/* Où va la dépense : le cadeau rose en tête (hors total 💖), puis les catégories. */}
      <div className="sans-barre -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overflow-y-hidden px-4 py-4">
        <TuileRetournable cle={CLE_CADEAU} dos={dosDe(CLE_CADEAU)} onTap={enregistrerCadeau} onFermer={fermerRetour} classeFace="tuile-rose">
          <span className="text-4xl">🎁</span>
          <span className="line-clamp-3 text-xs leading-tight font-semibold">offrir au foyer</span>
          <span className="text-[10px] leading-tight text-encre/60">hors dépenses</span>
        </TuileRetournable>
        {categories
          .filter((c) => c.active)
          .map((c) => (
            <TuileRetournable
              key={c.id}
              cle={c.id}
              dos={dosDe(c.id)}
              onTap={() => enregistrerDepense(c)}
              onFermer={fermerRetour}
              classeFace="bg-white shadow-sm active:bg-rose/10"
            >
              <span className="text-4xl">{c.emoji}</span>
              <span className="line-clamp-3 text-xs leading-tight font-semibold">{c.name}</span>
              <span className="text-xs">💖</span>
            </TuileRetournable>
          ))}
      </div>

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
                      {entree.valeur.items && entree.valeur.items.length > 0 && (
                        <details className="text-xs text-encre/60">
                          <summary className="cursor-pointer">🧾 {entree.valeur.items.length} article{entree.valeur.items.length > 1 ? 's' : ''}</summary>
                          <ul>
                            {entree.valeur.items.map((article, i) => (
                              <li key={i} className="flex justify-between gap-2">
                                <span>{article.libelle}</span>
                                <span>{formaterEuros(article.montant_cents)}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
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

      {photo && (
        <PanneauTicket
          photo={photo}
          categories={categories.filter((c) => c.active)}
          onEnregistrer={enregistrerLot}
          onTermine={terminerTicket}
          onFermer={() => (lotsDuTicket.current.length > 0 ? terminerTicket() : setPhoto(null))}
        />
      )}

      {celebration.cle > 0 && <Celebration cle={celebration.cle} occasion={celebration.occasion} />}
    </div>
  )
}

function dateEntree(entree: Entree): string {
  return entree.type === 'depense' ? entree.valeur.spent_at : entree.valeur.given_at
}
