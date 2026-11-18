/** Écran provisoire pour les onglets construits dans les étapes suivantes. */
export function EcranAVenir({ emoji, titre, etape }: { emoji: string; titre: string; etape: number }) {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-center">
      <span className="text-6xl">{emoji}</span>
      <h1 className="text-2xl font-bold">{titre}</h1>
      <p className="text-encre/60">Arrive à l'étape {etape}.</p>
    </section>
  )
}
