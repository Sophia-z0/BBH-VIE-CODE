import { derniereSemaineRevelee } from '../../domain/scores'
import { ecrireLocal, lireLocal } from '../../lib/stockageLocal'

const CLE = 'bbh.reveal-ouvert'

/** Vrai tant que je n'ai pas ouvert les résultats de la dernière semaine révélée (sur cet appareil). */
export function revealAOuvrir(): boolean {
  return lireLocal(CLE) !== derniereSemaineRevelee().fin.toISOString()
}

export function marquerRevealOuvert() {
  ecrireLocal(CLE, derniereSemaineRevelee().fin.toISOString())
}
