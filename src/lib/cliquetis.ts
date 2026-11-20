/**
 * Retour sensoriel de la pile de cartes : petit cliquetis sonore partout,
 * plus une micro-vibration sur écran tactile qui sait vibrer (Android ; l'iPhone ne vibre pas depuis le web).
 */

/** Durées de vibration (ms), courtes comme un retour tactile : le toucher de la pile, puis chaque carte qui retombe. */
const VIBRATION_TOUCHER = 12
const VIBRATION_CARTE = 8

// Chrome sur ordinateur expose vibrate() sans rien pour vibrer : on ne vibre que sur un écran tactile.
// (Pas de « pointer: coarse » : les Samsung à stylet déclarent un pointeur fin et ne vibraient plus.)
const peutVibrer = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && navigator.maxTouchPoints > 0

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
  clic(true)
}

/** Une carte qui retombe sur la pile. */
export function cliquetisCarte() {
  if (peutVibrer) navigator.vibrate(VIBRATION_CARTE)
  clic(false)
}
