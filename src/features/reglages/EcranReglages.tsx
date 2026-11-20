import { useState, type FormEvent } from 'react'
import { Bouton } from '../../components/Bouton'
import { classePuce } from '../../components/Puce'
import type { Genre } from '../../domain/types'
import { ChampTexte } from '../../components/ChampTexte'
import { ChoixCouleur } from '../../components/ChoixCouleur'
import { HistoriqueRevenus } from './Revenus'
import { messageErreur } from '../../lib/erreurs'
import { seDeconnecter } from '../../services/auth'
import { modifierMonProfil } from '../../services/foyer'
import { useFoyer, useFoyerPret } from '../foyer/FoyerContext'
import { ReglagesNotifications } from './ReglagesNotifications'

const euros = (centimes: number) =>
  (centimes / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export function EcranReglages() {
  const { recharger } = useFoyer()
  const { foyer, moi, membres } = useFoyerPret()
  const autre = membres.find((p) => p.id !== moi.id)

  const [prenom, setPrenom] = useState(moi.display_name)
  const [couleur, setCouleur] = useState(moi.color)
  const [revenu, setRevenu] = useState(moi.monthly_income_cents === null ? '' : String(moi.monthly_income_cents / 100))
  const [genre, setGenre] = useState<Genre | null>(moi.gender ?? null)
  const [message, setMessage] = useState<string | null>(null)

  async function enregistrer(evenement: FormEvent) {
    evenement.preventDefault()
    try {
      await modifierMonProfil(moi.id, {
        display_name: prenom.trim(),
        color: couleur,
        monthly_income_cents: revenu.trim() === '' ? null : Math.round(Number(revenu.replace(',', '.')) * 100),
        // Envoyé seulement s'il change : sans la migration 0012, la colonne n'existe pas.
        ...(genre !== (moi.gender ?? null) ? { gender: genre } : {}),
      })
      await recharger()
      setMessage('Enregistré ✅')
    } catch (e) {
      setMessage(messageErreur(e))
    }
  }

  return (
    <div className="flex flex-col gap-8 pt-4">
      <form onSubmit={enregistrer} className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold">mon profil</h1>
        <ChampTexte libelle="prénom" required maxLength={40} value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        <ChoixCouleur valeur={couleur} onChange={setCouleur} />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">pour accorder mes badges</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['elle', 'elle · cheffe'],
                ['il', 'il · chef'],
                ['iel', 'iel · chef·fe'],
              ] as const
            ).map(([valeur, libelle]) => (
              <button key={valeur} type="button" className={classePuce(genre === valeur)} onClick={() => setGenre(valeur)}>
                {libelle}
              </button>
            ))}
          </div>
        </div>
        <ChampTexte
          libelle="revenu mensuel habituel (€, optionnel)"
          inputMode="decimal"
          pattern="[0-9]+([.,][0-9]{1,2})?"
          placeholder="sert tant qu'aucun mois n'est saisi plus bas"
          value={revenu}
          onChange={(e) => setRevenu(e.target.value)}
        />
        {message && <p className="text-sm">{message}</p>}
        <Bouton type="submit">enregistrer</Bouton>
      </form>

      <HistoriqueRevenus idMoi={moi.id} />

      <ReglagesNotifications moi={moi} />

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">{foyer.name}</h2>
        {autre ? (
          <p className="text-sm text-encre/70">
            Avec <span style={{ color: autre.color }}>●</span> {autre.display_name}
            {autre.monthly_income_cents !== null && ` · revenu ${euros(autre.monthly_income_cents)}`}
          </p>
        ) : (
          <div className="rounded-2xl bg-white p-4 text-center">
            <p className="text-sm text-encre/70">Code à donner à ton ou ta partenaire :</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-orange">{foyer.invite_code}</p>
          </div>
        )}
      </section>

      <button type="button" onClick={seDeconnecter} className="text-sm text-encre/60 underline">
        me déconnecter
      </button>
    </div>
  )
}
