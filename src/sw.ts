/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

// Mise en cache de l'app pour qu'elle s'ouvre instantanément, même hors ligne.
// Les notifications push (étape 7) seront gérées ici.
precacheAndRoute(self.__WB_MANIFEST)
