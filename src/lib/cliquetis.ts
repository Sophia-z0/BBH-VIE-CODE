/**
 * Retour sensoriel de la pile de cartes : micro-vibration sur Android,
 * petit cliquetis sonore là où le web ne peut pas vibrer (iPhone).
 */

/** Durées de vibration (ms) : le toucher de la pile, puis chaque carte qui retombe. */
const VIBRATION_TOUCHER = 10
const VIBRATION_CARTE = 5

const peutVibrer = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

let audio: AudioContext | null = null

/** Contexte audio, créé au premier toucher (iOS n'autorise le son qu'après un geste). */
function contexte(): AudioContext | null {
  if (!audio) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    // iOS 17+ : son « d'ambiance », coupé quand l'iPhone est en mode silencieux.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'ambient'
    audio = new AC()
  }
  if (audio.state === 'suspended') void audio.resume()
  return audio
}

/** Clic de carton : un souffle de bruit très court, filtré. */
function clic(fort: boolean) {
  const ctx = contexte()
  if (!ctx) return
  const duree = fort ? 0.03 : 0.02
  const tampon = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duree), ctx.sampleRate)
  const donnees = tampon.getChannelData(0)
  for (let i = 0; i < donnees.length; i++) donnees[i] = (Math.random() * 2 - 1) * (1 - i / donnees.length) ** 4
  const source = ctx.createBufferSource()
  source.buffer = tampon
  const filtre = ctx.createBiquadFilter()
  filtre.type = 'bandpass'
  filtre.frequency.value = fort ? 1800 : 2600 + Math.random() * 1200
  filtre.Q.value = 1.4
  const volume = ctx.createGain()
  volume.gain.value = fort ? 0.35 : 0.18
  source.connect(filtre).connect(volume).connect(ctx.destination)
  source.start()
}

/** Toucher de la pile (à appeler dans le geste, pour débloquer le son sur iPhone). */
export function cliquetisToucher() {
  if (peutVibrer) navigator.vibrate(VIBRATION_TOUCHER)
  else clic(true)
}

/** Une carte qui retombe sur la pile. */
export function cliquetisCarte() {
  if (peutVibrer) navigator.vibrate(VIBRATION_CARTE)
  else clic(false)
}
