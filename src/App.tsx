import { HashRouter, Route, Routes } from 'react-router'
import { BarreNavigation } from './components/BarreNavigation'
import { CompteARebours } from './components/CompteARebours'
import { EcranConnexion } from './features/auth/EcranConnexion'
import { EcranBienvenue } from './features/foyer/EcranBienvenue'
import { FoyerProvider, useFoyer } from './features/foyer/FoyerContext'
import { EcranLog } from './features/log/EcranLog'
import { EcranCatalogue } from './features/log/EcranCatalogue'
import { EcranDepenses } from './features/depenses/EcranDepenses'
import { EcranRecurrentes } from './features/depenses/EcranRecurrentes'
import { EcranCategories } from './features/depenses/EcranCategories'
import { EcranCalendrier } from './features/calendrier/EcranCalendrier'
import { EcranStats } from './features/stats/EcranStats'
import { EcranReglages } from './features/reglages/EcranReglages'
import { supabaseConfigure } from './lib/supabase'

export function App() {
  if (!supabaseConfigure) {
    return (
      <p className="m-6 rounded-xl bg-orange/10 p-4">
        Supabase n'est pas encore configuré : voir le README, étape « variables d'environnement ».
      </p>
    )
  }
  return (
    <FoyerProvider>
      <Aiguillage />
    </FoyerProvider>
  )
}

/** Connexion, puis création du foyer, puis l'app elle-même. */
function Aiguillage() {
  const { etat, recharger } = useFoyer()
  switch (etat.statut) {
    case 'chargement':
      return <p className="mt-[40vh] animate-pulse text-center text-5xl">⭐</p>
    case 'erreur':
      return (
        <div className="mx-auto mt-[30vh] flex max-w-sm flex-col items-center gap-4 px-6 text-center">
          <p className="text-5xl">🙈</p>
          <p>Impossible de charger le foyer ({etat.message}).</p>
          <button type="button" className="font-semibold text-orange underline" onClick={recharger}>
            réessayer
          </button>
        </div>
      )
    case 'deconnecte':
      return <EcranConnexion />
    case 'sans-foyer':
      return <EcranBienvenue />
    case 'pret':
      return <AppFoyer />
  }
}

// HashRouter : les URL de type /#/stats fonctionnent sur GitHub Pages sans configuration serveur.
function AppFoyer() {
  return (
    <HashRouter>
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="text-lg font-extrabold text-orange">BBH VIE</span>
        <CompteARebours />
      </header>
      <main className="px-4 pb-24">
        <Routes>
          <Route path="/" element={<EcranLog />} />
          <Route path="/taches" element={<EcranCatalogue />} />
          <Route path="/depenses" element={<EcranDepenses />} />
          <Route path="/depenses/recurrentes" element={<EcranRecurrentes />} />
          <Route path="/depenses/categories" element={<EcranCategories />} />
          <Route path="/calendrier" element={<EcranCalendrier />} />
          <Route path="/stats" element={<EcranStats />} />
          <Route path="/reglages" element={<EcranReglages />} />
        </Routes>
      </main>
      <BarreNavigation />
    </HashRouter>
  )
}
