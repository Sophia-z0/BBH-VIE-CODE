import { NavLink } from 'react-router'

const ONGLETS = [
  { vers: '/', emoji: '⭐', libelle: 'tâches' },
  { vers: '/depenses', emoji: '💖', libelle: 'dépenses' },
  { vers: '/calendrier', emoji: '📅', libelle: 'calendrier' },
  { vers: '/stats', emoji: '📊', libelle: 'stats' },
  { vers: '/reglages', emoji: '⚙️', libelle: 'réglages' },
]

export function BarreNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-orange/20 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {ONGLETS.map(({ vers, emoji, libelle }) => (
        <NavLink
          key={vers}
          to={vers}
          end
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center py-2 text-xs ${isActive ? 'font-semibold text-orange' : 'text-encre/60'}`
          }
        >
          <span className="text-2xl" aria-hidden>
            {emoji}
          </span>
          {libelle}
        </NavLink>
      ))}
    </nav>
  )
}
