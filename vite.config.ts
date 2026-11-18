import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Sur GitHub Pages l'app est servie sous /<nom-du-dépôt>/ : le workflow
// de déploiement fournit ce chemin via BASE_PATH. En local, c'est la racine.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Service worker écrit à la main (src/sw.ts) : il recevra les notifications push.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      // Service worker actif aussi avec `npm run dev`, pour tester les notifications en local.
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: 'BBH VIE',
        short_name: 'BBH VIE',
        description: 'La vie du foyer, à deux, en étoiles et en cœurs.',
        lang: 'fr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#fff7ed',
        theme_color: '#f97316',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Appui long sur l'icône de l'app (Android) : accès direct aux deux écrans de log.
        shortcuts: [
          { name: 'loguer une tâche', short_name: 'tâche ⭐', url: './#/' },
          { name: 'ajouter une dépense', short_name: 'dépense 💖', url: './#/depenses' },
        ],
      },
    }),
  ],
})
