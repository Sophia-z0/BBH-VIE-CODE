import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/Bouton'
import { ChampTexte } from '../../components/ChampTexte'
import { messageErreur } from '../../lib/erreurs'
import { creerCompte, seConnecter } from '../../services/auth'

export function EcranConnexion() {
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function soumettre(evenement: FormEvent) {
    evenement.preventDefault()
    setEnCours(true)
    setErreur(null)
    try {
      if (mode === 'connexion') await seConnecter(email.trim(), motDePasse)
      else await creerCompte(email.trim(), motDePasse)
    } catch (e) {
      setErreur(messageErreur(e))
      setEnCours(false)
    }
  }

  return (
    <form onSubmit={soumettre} className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-6">
      <div className="text-center">
        <p className="text-6xl">⭐💖</p>
        <h1 className="mt-3 text-3xl font-extrabold text-orange">BBH VIE</h1>
        <p className="mt-1 text-encre/70">La vie du foyer, à deux.</p>
      </div>

      <ChampTexte
        libelle="ton e-mail"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <ChampTexte
        libelle="mot de passe"
        type="password"
        autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
        minLength={6}
        required
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
      />

      {erreur && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreur}</p>}

      <Bouton type="submit" disabled={enCours}>
        {mode === 'connexion' ? 'entrer' : 'créer mon compte'}
      </Bouton>

      <button
        type="button"
        className="text-sm text-encre/60 underline"
        onClick={() => setMode(mode === 'connexion' ? 'inscription' : 'connexion')}
      >
        {mode === 'connexion' ? 'première fois ? créer mon compte' : "j'ai déjà un compte"}
      </button>
    </form>
  )
}
