import { supabase } from '../lib/supabase'

export type EtatNotifications =
  | 'non-supporte' // navigateur sans notifications push
  | 'iphone-a-installer' // iPhone : il faut d'abord ajouter l'app à l'écran d'accueil
  | 'non-configure' // clé VAPID absente (voir README)
  | 'refuse' // permission refusée dans les réglages du téléphone
  | 'actif'
  | 'inactif'

const cleVapid = import.meta.env.VITE_VAPID_PUBLIC_KEY

function estIphoneNonInstalle(): boolean {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const installee = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  return ios && !installee
}

async function abonnementActuel(): Promise<PushSubscription | null> {
  const enregistrement = await navigator.serviceWorker.ready
  return enregistrement.pushManager.getSubscription()
}

export async function etatNotifications(): Promise<EtatNotifications> {
  if (estIphoneNonInstalle()) return 'iphone-a-installer'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'non-supporte'
  if (!cleVapid) return 'non-configure'
  if (Notification.permission === 'denied') return 'refuse'
  return (await abonnementActuel()) ? 'actif' : 'inactif'
}

/** Clé VAPID (base64url) → octets attendus par pushManager.subscribe. */
function versOctets(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

/** Demande la permission et enregistre cet appareil pour la personne connectée. */
export async function activerNotifications() {
  if (!cleVapid) throw new Error('Notifications non configurées (clé VAPID manquante).')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications refusées : tu peux les autoriser dans les réglages du téléphone.')

  const enregistrement = await navigator.serviceWorker.ready
  const abonnement =
    (await enregistrement.pushManager.getSubscription()) ??
    (await enregistrement.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(cleVapid) }))

  const { endpoint, keys } = abonnement.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    sub_endpoint: endpoint,
    sub_p256dh: keys?.p256dh,
    sub_auth: keys?.auth,
  })
  if (error) throw error
}

export async function desactiverNotifications() {
  const abonnement = await abonnementActuel()
  if (!abonnement) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', abonnement.endpoint)
  await abonnement.unsubscribe()
}
