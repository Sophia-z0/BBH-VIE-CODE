/** Messages affichés après un log : chaleureux, variés, jamais culpabilisants. */
const MESSAGES = [
  'Bravo, la maison te dit merci !',
  'Et hop, une de plus ✨',
  'Quelle efficacité {moi} !',
  'Le foyer brille grâce à toi.',
  'Tu gères de kheur !',
  'Merci pour ce p’tit bout de quotidien 🫶',
  'Mission accomplie 💪',
  'Ça, c’est fait !',
  'Une étoile de plus dans le ciel du foyer.',
  'Super boulot !',
  'La team foyer avance !',
  'Respect 🙌',
]

const MESSAGES_DEPENSE = [
  'L’argent, c’est de l’amour 💖',
  'Merci pour le foyer !',
  'Le foyer te dit merci 2bebz !',
  'Un peu d’amour en euros 💸',
  'Ça c’est un DEUBEHBZ !',
]

/** Ajouté aux messages de dépense quand la catégorie est alimentaire. */
const MESSAGE_ALIMENTAIRE = 'Merci ! (de la part du frigzzz 🥦)'
const CATEGORIE_ALIMENTAIRE = /aliment|courses|nourriture|frigo|bouffe/i

const MESSAGES_CADEAU = [
  'Quel beau cadeau 🎁',
  'Trop d’chaaaaance ✨',
  'Ohlalaaaa mais viens là toi 🤗',
  'Un cadeau de kheur ? 💝 merci 2khr',
]

export type Occasion = 'tache' | 'depense' | 'cadeau'

const MESSAGES_PAR_OCCASION: Record<Occasion, string[]> = {
  tache: MESSAGES,
  depense: MESSAGES_DEPENSE,
  cadeau: MESSAGES_CADEAU,
}

export const EMOJIS_PAR_OCCASION: Record<Occasion, string[]> = {
  tache: ['⭐', '✨', '🌟', '💫', '🎉', '🙌'],
  depense: ['💖', '💕', '💗', '✨', '💸', '💞'],
  cadeau: ['🎁', '💝', '🎀', '✨', '🥕', '🎉'],
}

const auHasard = <T,>(liste: T[]): T => liste[Math.floor(Math.random() * liste.length)]

export interface ContexteMessage {
  /** Mon prénom, inséré à la place de {moi}. */
  moi: string
  /** Nom de la catégorie de dépense, pour les messages alimentaires. */
  categorie?: string
}

/** Message au hasard pour l'occasion ; une dépense alimentaire a une chance sur deux d'avoir le message du frigo. */
export function encouragementAuHasard(occasion: Occasion, contexte: ContexteMessage): string {
  const alimentaire = occasion === 'depense' && CATEGORIE_ALIMENTAIRE.test(contexte.categorie ?? '')
  const message = alimentaire && Math.random() < 0.5 ? MESSAGE_ALIMENTAIRE : auHasard(MESSAGES_PAR_OCCASION[occasion])
  return message.replaceAll('{moi}', contexte.moi)
}

export function emojisDeFete(nombre: number, occasion: Occasion = 'tache'): string[] {
  return Array.from({ length: nombre }, () => auHasard(EMOJIS_PAR_OCCASION[occasion]))
}
