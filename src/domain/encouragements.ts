/** Messages affichés après un log : chaleureux, variés, jamais culpabilisants. */
const MESSAGES = [
  'Bravo, la maison te dit merci !',
  'Et hop, une de plus ✨',
  'Quelle efficacité !',
  'Le foyer brille grâce à toi.',
  'Tu gères !',
  'Merci pour ce petit bout de quotidien.',
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
  'Noté, le foyer te dit merci.',
  'Un peu d’amour en euros 💸',
  'C’est enregistré, merci !',
  'Le frigo (ou le foyer) te remercie.',
]

const MESSAGES_CADEAU = [
  'Quel beau cadeau 🎁',
  'Les bonnes choses arrivent à la maison !',
  'Merci pour cette surprise.',
  'Un cadeau, ça compte aussi 💝',
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

export function encouragementAuHasard(occasion: Occasion = 'tache'): string {
  return auHasard(MESSAGES_PAR_OCCASION[occasion])
}

export function emojisDeFete(nombre: number, occasion: Occasion = 'tache'): string[] {
  return Array.from({ length: nombre }, () => auHasard(EMOJIS_PAR_OCCASION[occasion]))
}
