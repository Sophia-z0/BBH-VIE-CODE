import type { Tache } from './types'

/** Groupes qui sont des pièces de la maison, dans l'ordre d'affichage. */
const PIECES = ['cuisine/salon', 'cuisine', 'salle à manger', 'chambre', 'salle de bain', 'wc']
/** Autres groupes connus, dans l'ordre d'affichage ; les groupes inconnus viennent après. */
const AUTRES = ['ménage', 'linge', 'déchets', 'plantes', 'courses']

export type Groupe = [nom: string, taches: Tache[]]

export interface PlansDeTaches {
  pieces: Groupe[]
  reste: Groupe[]
}

/** Dans un groupe : le quotidien d'abord, puis l'ordre choisi, puis le nom. */
export function comparerTaches(a: Tache, b: Tache): number {
  return Number(!!b.everyday) - Number(!!a.everyday) || a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'fr')
}

function rang(liste: string[], groupe: string): number {
  const i = liste.indexOf(groupe.toLowerCase())
  return i === -1 ? liste.length : i
}

/** Répartit les tâches en deux plans : les pièces de la maison, puis le reste. */
export function plansDeTaches(taches: Tache[]): PlansDeTaches {
  const parGroupe = new Map<string, Tache[]>()
  for (const tache of taches) parGroupe.set(tache.group_name, [...(parGroupe.get(tache.group_name) ?? []), tache])

  const groupes: Groupe[] = [...parGroupe.entries()].map(([nom, liste]) => [nom, liste.sort(comparerTaches)])
  const estPiece = (nom: string) => PIECES.includes(nom.toLowerCase())
  const trier = (ordre: string[]) => (a: Groupe, b: Groupe) => rang(ordre, a[0]) - rang(ordre, b[0]) || a[0].localeCompare(b[0], 'fr')

  return {
    pieces: groupes.filter(([nom]) => estPiece(nom)).sort(trier(PIECES)),
    reste: groupes.filter(([nom]) => !estPiece(nom)).sort(trier(AUTRES)),
  }
}
