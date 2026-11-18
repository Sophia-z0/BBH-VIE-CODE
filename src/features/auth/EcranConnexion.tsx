import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/Bouton'
import { ChampTexte } from '../../components/ChampTexte'
import { messageErreur } from '../../lib/erreurs'
import { envoyerCode, verifierCode } from '../../services/auth'

/** Connexion sans mot de passe : e-mail, puis code reçu par e-mail. */
export function EcranConnexion() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeEnvoye, setCodeEnvoye] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function soumettre(evenement: FormEvent) {
    evenement.preventDefault()
    setEnCours(true)
    setErreur(null)
    try {
      if (codeEnvoye) await verifierCode(email.trim(), code.trim())
      else {
        await envoyerCode(email.trim())
        setCodeEnvoye(true)
      }
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
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
        disabled={codeEnvoye}
        onChange={(e) => setEmail(e.target.value)}
      />

      {codeEnvoye && (
        <>
          <p className="text-sm text-encre/70">📬 Code envoyé ! Regarde tes e-mails et recopie-le ici.</p>
          <ChampTexte
            libelle="code reçu"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,10}"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </>
      )}

      {erreur && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{erreur}</p>}

      <Bouton type="submit" disabled={enCours}>
        {codeEnvoye ? 'entrer' : 'recevoir mon code'}
      </Bouton>

      {codeEnvoye && (
        <button type="button" className="text-sm text-encre/60 underline" onClick={() => setCodeEnvoye(false)}>
          changer d'e-mail
        </button>
      )}
    </form>
  )
}
