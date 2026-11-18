import { HashRouter, Route, Routes } from 'react-router'
import { BarreNavigation } from './components/BarreNavigation'
import { CompteARebours } from './components/CompteARebours'
import { EcranLog } from './features/log/EcranLog'
import { EcranDepenses } from './features/depenses/EcranDepenses'
import { EcranCalendrier } from './features/calendrier/EcranCalendrier'
import { EcranStats } from './features/stats/EcranStats'
import { EcranReglages } from './features/reglages/EcranReglages'
import { supabaseConfigure } from './lib/supabase'

// HashRouter : les URL de type /#/stats fonctionnent sur GitHub Pages sans configuration serveur.
export function App() {
  return (
    <HashRouter>
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="text-lg font-extrabold text-orange">BBH VIE</span>
        <CompteARebours />
      </header>
      {!supabaseConfigure && (
        <p className="mx-4 mt-3 rounded-xl bg-orange/10 p-3 text-sm">
          Supabase n'est pas encore configuré : voir le README, étape « variables d'environnement ».
        </p>
      )}
      <main className="px-4 pb-24">
        <Routes>
          <Route path="/" element={<EcranLog />} />
          <Route path="/depenses" element={<EcranDepenses />} />
          <Route path="/calendrier" element={<EcranCalendrier />} />
          <Route path="/stats" element={<EcranStats />} />
          <Route path="/reglages" element={<EcranReglages />} />
        </Routes>
      </main>
      <BarreNavigation />
    </HashRouter>
  )
}
