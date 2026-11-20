import { useEffect, useState } from 'react'
import type { Profil } from '../../domain/types'
import { useFoyerPret } from '../foyer/FoyerContext'
import { Ceremonie } from './Ceremonie'
import { marquerRevealOuvert, revealAOuvrir } from './reveal'
import { usePodium } from './usePodium'

/**
 * Après le reveal du dimanche 18h, la cérémonie s'impose en plein écran avant tout nouveau log
 * (une fois par appareil). Vérifié à l'ouverture, puis chaque minute si l'app reste ouverte.
 */
export function PorteCeremonie() {
  const { membres } = useFoyerPret()
  const [aOuvrir, setAOuvrir] = useState(revealAOuvrir)
  useEffect(() => {
    const minuteur = setInterval(() => setAOuvrir(revealAOuvrir()), 60_000)
    return () => clearInterval(minuteur)
  }, [])
  if (!aOuvrir || membres.length < 2) return null
  return (
    <CeremonieChargee
      membres={membres}
      onFin={() => {
        marquerRevealOuvert()
        setAOuvrir(false)
      }}
    />
  )
}

function CeremonieChargee({ membres, onFin }: { membres: Profil[]; onFin: () => void }) {
  const { podium, erreur } = usePodium(membres)
  if (podium) return <Ceremonie donnees={podium} onFin={onFin} />
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-creme p-8 text-center">
      {erreur ? (
        <>
          <span className="text-5xl">🙈</span>
          <p>La cérémonie n'a pas pu se charger ({erreur}).</p>
          <button type="button" className="font-semibold text-orange underline" onClick={onFin}>
            continuer quand même
          </button>
        </>
      ) : (
        <span className="animate-pulse text-7xl">🏆</span>
      )}
    </div>
  )
}
