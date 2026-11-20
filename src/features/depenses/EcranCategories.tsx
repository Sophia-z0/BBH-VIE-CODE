import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Bouton } from '../../components/Bouton'
import type { Categorie } from '../../domain/types'
import { messageErreur } from '../../lib/erreurs'
import { creerCategorie, listerCategories, modifierCategorie, reordonnerCategories } from '../../services/depenses'
import { useFoyerPret } from '../foyer/FoyerContext'

/** Ajouter, renommer, changer l'émoji, ordonner ou retirer les catégories de dépenses (l'ordre est celui des tuiles). */
export function EcranCategories() {
  const { moi } = useFoyerPret()
  const [categories, setCategories] = useState<Categorie[]>([])
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    try {
      setCategories(await listerCategories())
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }, [])

  useEffect(() => {
    void recharger()
  }, [recharger])

  async function enregistrer(id: string, champs: Partial<Categorie>) {
    try {
      await modifierCategorie(id, champs)
      await recharger()
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  async function deplacer(de: number, vers: number) {
    const nouvelle = [...categories]
    ;[nouvelle[de], nouvelle[vers]] = [nouvelle[vers], nouvelle[de]]
    setCategories(nouvelle)
    try {
      await reordonnerCategories(nouvelle)
      await recharger()
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">catégories</h1>
        <Link to="/depenses" className="text-sm text-encre/60 underline">
          ← retour
        </Link>
      </div>

      <NouvelleCategorie
        onAjout={async (c) => {
          await creerCategorie(moi.household_id, c)
          await recharger()
        }}
      />

      {erreur && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreur}</p>}

      <ul className="flex flex-col gap-3">
        {categories.map((c, i) => (
          <LigneCategorie
            key={c.id}
            categorie={c}
            onChange={(champs) => enregistrer(c.id, champs)}
            onMonter={i > 0 ? () => deplacer(i, i - 1) : undefined}
            onDescendre={i < categories.length - 1 ? () => deplacer(i, i + 1) : undefined}
          />
        ))}
      </ul>
    </div>
  )
}

function LigneCategorie({
  categorie,
  onChange,
  onMonter,
  onDescendre,
}: {
  categorie: Categorie
  onChange: (champs: Partial<Categorie>) => void
  onMonter?: () => void
  onDescendre?: () => void
}) {
  const [nom, setNom] = useState(categorie.name)
  const [emoji, setEmoji] = useState(categorie.emoji)

  return (
    <li className={`flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ${categorie.active ? '' : 'opacity-50'}`}>
      <input
        aria-label="émoji"
        className="w-12 rounded-lg bg-creme p-2 text-center text-2xl"
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        onBlur={() => emoji.trim() && emoji !== categorie.emoji && onChange({ emoji: emoji.trim() })}
      />
      <input
        aria-label="nom"
        className="min-w-0 flex-1 rounded-lg bg-creme px-3 py-2 font-semibold"
        maxLength={60}
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        onBlur={() => nom.trim() && nom !== categorie.name && onChange({ name: nom.trim() })}
      />
      <span className="flex flex-col">
        <button type="button" aria-label="monter" disabled={!onMonter} onClick={onMonter} className="px-2 text-encre/50 disabled:opacity-20">
          ▲
        </button>
        <button type="button" aria-label="descendre" disabled={!onDescendre} onClick={onDescendre} className="px-2 text-encre/50 disabled:opacity-20">
          ▼
        </button>
      </span>
      <button type="button" className="text-sm text-encre/50 underline" onClick={() => onChange({ active: !categorie.active })}>
        {categorie.active ? 'retirer' : 'remettre'}
      </button>
    </li>
  )
}

function NouvelleCategorie({ onAjout }: { onAjout: (c: Pick<Categorie, 'name' | 'emoji' | 'is_recurring'>) => Promise<void> }) {
  const [nom, setNom] = useState('')
  const [emoji, setEmoji] = useState('🛍️')
  const [erreur, setErreur] = useState<string | null>(null)

  async function ajouter(evenement: FormEvent) {
    evenement.preventDefault()
    try {
      await onAjout({ name: nom.trim(), emoji: emoji.trim() || '🛍️', is_recurring: false })
      setNom('')
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  return (
    <form onSubmit={ajouter} className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-orange/30 p-3">
      <div className="flex items-center gap-2">
        <input aria-label="émoji" className="w-12 rounded-lg bg-white p-2 text-center text-2xl" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        <input
          aria-label="nouvelle catégorie"
          placeholder="nouvelle catégorie"
          required
          maxLength={60}
          className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
      </div>
      {erreur && <p className="text-sm text-red-800">{erreur}</p>}
      <Bouton type="submit" className="py-2 text-base">
        ajouter
      </Bouton>
    </form>
  )
}
