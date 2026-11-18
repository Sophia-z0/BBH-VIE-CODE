import { useEffect, useState } from 'react'
import { semaineDe } from '../domain/semaine'

/** Temps restant avant le reveal du dimanche 18h, rafraîchi chaque minute. */
export function CompteARebours() {
  const [maintenant, setMaintenant] = useState(() => new Date())

  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(new Date()), 60_000)
    return () => clearInterval(minuteur)
  }, [])

  const reste = semaineDe(maintenant).fin.getTime() - maintenant.getTime()
  const jours = Math.floor(reste / 86_400_000)
  const heures = Math.floor((reste % 86_400_000) / 3_600_000)
  const minutes = Math.floor((reste % 3_600_000) / 60_000)

  return (
    <p className="text-sm text-encre/70">
      🎁 reveal dans {jours > 0 && `${jours} j `}
      {heures} h {minutes} min
    </p>
  )
}
