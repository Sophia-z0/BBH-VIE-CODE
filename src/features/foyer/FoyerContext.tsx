import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { messageErreur } from '../../lib/erreurs'
import { chargerFoyer, type DonneesFoyer } from '../../services/foyer'

type Etat =
  | { statut: 'chargement' }
  | { statut: 'deconnecte' }
  | { statut: 'erreur'; message: string }
  | { statut: 'sans-foyer'; session: Session }
  | { statut: 'pret'; session: Session; donnees: DonneesFoyer }

interface ValeurFoyer {
  etat: Etat
  /** À appeler après une modification du foyer ou du profil. */
  recharger: () => Promise<void>
}

const Contexte = createContext<ValeurFoyer | null>(null)

/** Suit la session Supabase et charge le foyer de la personne connectée. */
export function FoyerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evenement, nouvelle) => setSession(nouvelle))
    return () => data.subscription.unsubscribe()
  }, [])

  const recharger = useCallback(async () => {
    if (session === undefined) return
    if (session === null) return setEtat({ statut: 'deconnecte' })
    try {
      const donnees = await chargerFoyer(session.user.id)
      setEtat(donnees ? { statut: 'pret', session, donnees } : { statut: 'sans-foyer', session })
    } catch (e) {
      setEtat({ statut: 'erreur', message: messageErreur(e) })
    }
  }, [session])

  useEffect(() => {
    void recharger()
  }, [recharger])

  return <Contexte.Provider value={{ etat, recharger }}>{children}</Contexte.Provider>
}

export function useFoyer() {
  const valeur = useContext(Contexte)
  if (!valeur) throw new Error('useFoyer doit être utilisé dans <FoyerProvider>')
  return valeur
}

/** Raccourci pour les écrans affichés une fois le foyer chargé. */
export function useFoyerPret(): DonneesFoyer {
  const { etat } = useFoyer()
  if (etat.statut !== 'pret') throw new Error('foyer non chargé')
  return etat.donnees
}
