import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { semaineDe } from '../domain/semaine'

/** Temps restant avant le reveal du dimanche 18h, rafraîchi chaque minute ; mène au podium. */
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

  // Les deux plus grandes unités suffisent : « 4j et 2h », puis « 2h et 15min », puis « 15min ».
  let delai = `${minutes}min`
  if (jours > 0) delai = `${jours}j et ${heures}h`
  else if (heures > 0) delai = `${heures}h et ${minutes}min`

  return (
    <Link to="/podium" className="text-sm text-encre/70">
      🎉 reveal dans {delai}
    </Link>
  )
}
