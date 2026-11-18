import { useEffect, useState } from 'react'
import type { Profil } from '../../domain/types'
import { messageErreur } from '../../lib/erreurs'
import { modifierMonProfil } from '../../services/foyer'
import {
  activerNotifications,
  desactiverNotifications,
  etatNotifications,
  type EtatNotifications,
} from '../../services/notifications'
import { useFoyer } from '../foyer/FoyerContext'

// Créneaux du rappel quotidien : tous les quarts d'heure de 6h à 23h45.
const CRENEAUX = Array.from({ length: (24 - 6) * 4 }, (_, i) => {
  const minutes = 6 * 60 + i * 15
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`
})

const MESSAGES_ETAT: Partial<Record<EtatNotifications, string>> = {
  'non-supporte': 'Ce navigateur ne gère pas les notifications.',
  'iphone-a-installer': 'Sur iPhone, ajoute d’abord BBH VIE à l’écran d’accueil (Partager › Sur l’écran d’accueil), puis ouvre-la depuis son icône.',
  'non-configure': 'Notifications pas encore configurées (voir README).',
  refuse: 'Notifications bloquées : autorise-les pour BBH VIE dans les réglages du téléphone.',
}

/** Activer les notifications sur cet appareil, et régler leurs horaires. */
export function ReglagesNotifications({ moi }: { moi: Profil }) {
  const { recharger } = useFoyer()
  const [etat, setEtat] = useState<EtatNotifications | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    etatNotifications().then(setEtat)
  }, [])

  async function basculer() {
    setMessage(null)
    try {
      if (etat === 'actif') await desactiverNotifications()
      else await activerNotifications()
      setEtat(await etatNotifications())
    } catch (e) {
      setMessage(messageErreur(e))
    }
  }

  async function enregistrer(champs: Partial<Pick<Profil, 'notif_daily' | 'notif_daily_time' | 'notif_sunday'>>) {
    setMessage(null)
    try {
      await modifierMonProfil(moi.id, champs)
      await recharger()
    } catch (e) {
      setMessage(messageErreur(e))
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">🔔 notifications</h2>

      {etat && MESSAGES_ETAT[etat] ? (
        <p className="rounded-xl bg-orange/10 p-3 text-sm">{MESSAGES_ETAT[etat]}</p>
      ) : (
        <button
          type="button"
          onClick={basculer}
          className={`rounded-2xl p-4 text-left font-semibold transition active:scale-95 ${etat === 'actif' ? 'bg-white' : 'bg-orange text-white'}`}
        >
          {etat === 'actif' ? '✅ activées sur cet appareil · désactiver' : '🔔 activer sur cet appareil'}
        </button>
      )}

      <label className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 text-sm">
        <span>
          <span className="font-semibold">rappel du jour</span>
          <br />
          <span className="text-encre/60">« As-tu réalisé une tâche ? Dépensé pour le foyer ? » (seulement si rien n'est logué)</span>
        </span>
        <input type="checkbox" className="size-6 accent-orange" checked={moi.notif_daily} onChange={(e) => enregistrer({ notif_daily: e.target.checked })} />
      </label>
      {moi.notif_daily && (
        <label className="flex items-center justify-between gap-3 px-4 text-sm">
          à
          <select
            className="rounded-lg bg-white px-3 py-2"
            value={moi.notif_daily_time}
            onChange={(e) => enregistrer({ notif_daily_time: e.target.value })}
          >
            {CRENEAUX.map((c) => (
              <option key={c} value={c}>
                {c.slice(0, 5).replace(':', 'h')}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 text-sm">
        <span>
          <span className="font-semibold">le dimanche</span>
          <br />
          <span className="text-encre/60">12h : pense à loguer ta semaine · 18h : les résultats 🎁</span>
        </span>
        <input type="checkbox" className="size-6 accent-orange" checked={moi.notif_sunday} onChange={(e) => enregistrer({ notif_sunday: e.target.checked })} />
      </label>

      {message && <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{message}</p>}
    </section>
  )
}
