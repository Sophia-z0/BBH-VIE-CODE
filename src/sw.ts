/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

// Mise en cache de l'app pour qu'elle s'ouvre instantanément, même hors ligne.
precacheAndRoute(self.__WB_MANIFEST)

/** Contenu envoyé par la fonction serveur « notifier ». */
interface Message {
  title: string
  body: string
  url: string
  actions?: { action: string; title: string }[]
}

// Écran ouvert par chaque bouton d'action d'une notification.
const ECRAN_PAR_ACTION: Record<string, string> = { tache: '#/', depense: '#/depenses' }

self.addEventListener('push', (evenement) => {
  if (!evenement.data) return
  const message = evenement.data.json() as Message
  evenement.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { url: message.url },
      // Les boutons d'action ne s'affichent que sur Android ; ailleurs le tap ouvre `url`.
      ...(message.actions ? { actions: message.actions } : {}),
    } as NotificationOptions),
  )
})

// Un tap ouvre directement l'écran de log (ou le podium), dans l'app déjà ouverte si possible.
self.addEventListener('notificationclick', (evenement) => {
  evenement.notification.close()
  const ecran = ECRAN_PAR_ACTION[evenement.action] ?? (evenement.notification.data as { url: string }).url
  const cible = new URL(ecran, self.registration.scope).href

  evenement.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const fenetre = fenetres[0]
      try {
        if (fenetre) {
          await fenetre.navigate(cible)
          await fenetre.focus()
          return
        }
      } catch {
        // fenêtre pas encore contrôlée par le service worker : on en ouvre une nouvelle
      }
      await self.clients.openWindow(cible)
    })(),
  )
})
