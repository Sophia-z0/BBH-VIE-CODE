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

const EMOJIS = ['⭐', '✨', '🌟', '💫', '🎉', '💖', '🙌']

export function encouragementAuHasard(): string {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
}

export function emojisDeFete(nombre: number): string[] {
  return Array.from({ length: nombre }, () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)])
}
