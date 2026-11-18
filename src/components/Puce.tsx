/** Petite pastille arrondie, active (orange) ou non. */
export function classePuce(actif: boolean): string {
  return `rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${actif ? 'bg-orange text-white' : 'bg-white text-encre/70'}`
}
