import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/Bouton'
import { ChampTexte } from '../../components/ChampTexte'
import { ChoixCouleur } from '../../components/ChoixCouleur'
import { COULEURS } from '../../domain/types'
import { messageErreur } from '../../lib/erreurs'
import { creerFoyer, rejoindreFoyer } from '../../services/foyer'
import { useFoyer } from './FoyerContext'

/** Premier passage : créer le foyer (1re personne) ou le rejoindre avec un code (2e personne). */
export function EcranBienvenue() {
  const { recharger } = useFoyer()
  const [mode, setMode] = useState<'creer' | 'rejoindre'>('creer')
  const [prenom, setPrenom] = useState('')
  const [couleur, setCouleur] = useState(COULEURS[0])
  const [nomFoyer, setNomFoyer] = useState('Chez nous')
  const [code, setCode] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function soumettre(evenement: FormEvent) {
    evenement.preventDefault()
    setEnCours(true)
    setErreur(null)
    try {
      if (mode === 'creer') await creerFoyer(nomFoyer.trim(), prenom.trim(), couleur)
      else await rejoindreFoyer(code, prenom.trim(), couleur)
      await recharger()
    } catch (e) {
      setErreur(messageErreur(e))
      setEnCours(false)
    }
  }

  return (
    <form onSubmit={soumettre} className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-6 py-10">
      <h1 className="text-center text-3xl font-extrabold">Bienvenue 🏡</h1>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1">
        {(['creer', 'rejoindre'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl py-2 font-semibold ${mode === m ? 'bg-orange text-white' : 'text-encre/60'}`}
          >
            {m === 'creer' ? 'créer notre foyer' : "j'ai un code"}
          </button>
        ))}
      </div>

      <ChampTexte libelle="ton prénom" required maxLength={40} value={prenom} onChange={(e) => setPrenom(e.target.value)} />
      <ChoixCouleur valeur={couleur} onChange={setCouleur} />

      {mode === 'creer' ? (
        <ChampTexte libelle="nom du foyer" required maxLength={60} value={nomFoyer} onChange={(e) => setNomFoyer(e.target.value)} />
      ) : (
        <ChampTexte
          libelle="code d'invitation"
          required
          autoCapitalize="characters"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      )}

      {erreur && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreur}</p>}

      <Bouton type="submit" disabled={enCours}>
        c'est parti ✨
      </Bouton>
    </form>
  )
}
