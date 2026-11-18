/** Bandeau de félicitations affiché quelques secondes après un log, avec « annuler ». */
export function Retour({ emoji, gain, message, onAnnuler }: { emoji: string; gain: string; message: string; onAnnuler: () => void }) {
  return (
    <div
      className="fixed inset-x-4 bottom-24 z-40 flex items-center gap-3 rounded-2xl bg-encre p-4 text-white shadow-xl"
      style={{ animation: 'apparaitre 250ms ease-out' }}
      role="status"
    >
      <span className="text-3xl">{emoji}</span>
      <span className="flex-1">
        <span className="font-bold">{gain}</span> {message}
      </span>
      <button type="button" className="text-sm underline opacity-80" onClick={onAnnuler}>
        annuler
      </button>
    </div>
  )
}
