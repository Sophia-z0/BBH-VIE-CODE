import { useRef, useState } from 'react'
import { classePuce } from '../../components/Puce'

const DUREE_APPUI_LONG_MS = 500

/**
 * Étiquettes fréquentes en un tap. Un appui long passe en mode « ranger » :
 * chaque puce montre un ✕ pour ne plus la proposer.
 */
export function PucesEtiquettes({
  etiquettes,
  choisie,
  onChoisir,
  onMasquer,
}: {
  etiquettes: string[]
  choisie: string
  onChoisir: (etiquette: string) => void
  onMasquer: (etiquette: string) => void
}) {
  const [rangement, setRangement] = useState(false)
  const minuteur = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Le relâchement d'un appui long déclenche aussi un clic : on l'ignore.
  const appuiLong = useRef(false)

  if (etiquettes.length === 0) return null

  function debutAppui() {
    appuiLong.current = false
    clearTimeout(minuteur.current)
    minuteur.current = setTimeout(() => {
      appuiLong.current = true
      setRangement(true)
      navigator.vibrate?.(20)
    }, DUREE_APPUI_LONG_MS)
  }
  const finAppui = () => clearTimeout(minuteur.current)

  function toucher(etiquette: string) {
    if (appuiLong.current) {
      appuiLong.current = false
      return
    }
    if (rangement) onMasquer(etiquette)
    else onChoisir(choisie === etiquette ? '' : etiquette)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {etiquettes.map((e) => (
          <button
            key={e}
            type="button"
            className={`${classePuce(!rangement && choisie === e)} select-none [-webkit-touch-callout:none]`}
            onPointerDown={debutAppui}
            onPointerUp={finAppui}
            onPointerLeave={finAppui}
            onContextMenu={(ev) => ev.preventDefault()}
            onClick={() => toucher(e)}
          >
            {e}
            {rangement && <span className="ml-2 text-encre/40">✕</span>}
          </button>
        ))}
        {rangement && (
          <button type="button" className={classePuce(true)} onClick={() => setRangement(false)}>
            ok
          </button>
        )}
      </div>
      <p className="text-xs text-encre/40">
        {rangement ? 'Touche une étiquette pour ne plus la proposer.' : 'Appui long sur une étiquette pour la ranger.'}
      </p>
    </div>
  )
}
