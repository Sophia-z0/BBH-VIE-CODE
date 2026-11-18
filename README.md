# BBH VIE

La vie du foyer à deux : tâches ménagères ⭐, dépenses 💖, cadeaux 🎁, présence à la maison,
et un reveal des résultats chaque dimanche à 18h. Pour rendre visible la répartition réelle
de la charge, sans jamais culpabiliser personne.

Web app installable sur téléphone (PWA). Front : Vite + React + TypeScript + Tailwind.
Données : Supabase. Hébergement : GitHub Pages.

## Structure

```
src/
  domain/      règles du jeu en TypeScript pur (semaine dim 18h → dim 18h, scores)
  services/    accès à Supabase
  features/    un dossier par écran (log, depenses, calendrier, stats, reglages)
  components/  briques visuelles réutilisables
  lib/         client Supabase
  sw.ts        service worker (cache hors ligne, notifications)
public/        icônes de l'app
supabase/
  migrations/  schéma de la base, règles de sécurité (RLS), données de départ
```

## Configurer Supabase (une seule fois)

1. Créer un projet sur [supabase.com](https://supabase.com) (région Europe).
2. **Base de données** : dans **SQL Editor**, coller et exécuter les fichiers de
   `supabase/migrations/` **dans l'ordre** (`0001_…`, puis `0002_…`, etc.).
   Chaque nouvelle étape de l'app ajoute un fichier : il suffit d'exécuter le nouveau.
3. **Connexion** : dans **Authentication › Sign In / Providers › Email**, désactiver
   **Confirm email** puis enregistrer. Ainsi, pas besoin de configurer d'e-mails :
   on crée son compte avec e-mail + mot de passe et on entre directement.
   Mot de passe oublié : le réinitialiser depuis **Authentication › Users**.
4. Récupérer la **Project URL** et la clé **`anon`** (ou **publishable**) dans
   **Project Settings › API Keys** (voir ci-dessous). Jamais la clé `service_role` / `secret`.

**Premier lancement** : la première personne crée son compte et le foyer (les tâches et
catégories de départ sont ajoutées automatiquement). Le code d'invitation s'affiche dans
**réglages** ; la deuxième personne crée son compte avec son propre e-mail et saisit ce code.

## Lancer en local

Prérequis : Node 24 ou plus récent.

1. Installer les dépendances :
   ```bash
   npm install
   ```
2. Variables d'environnement : copier `.env.example` en `.env.local`, puis y coller l'URL
   et la clé `anon` du projet Supabase (Supabase › Project Settings › API).
   `.env.local` est ignoré par git.
3. Démarrer :
   ```bash
   npm run dev
   ```
   puis ouvrir l'adresse affichée (http://localhost:5173).
4. Vérifier que tout compile avant de pousser :
   ```bash
   npm run build
   ```

Pour tester sur téléphone en local, `npm run dev -- --host` affiche une adresse réseau
accessible depuis le même Wi-Fi.

## Publier sur GitHub Pages

Le workflow `.github/workflows/deploy.yml` construit et publie l'app à chaque push sur `main`.

À faire une seule fois sur GitHub :

1. **Settings › Pages › Build and deployment › Source** : choisir **GitHub Actions**.
2. **Settings › Secrets and variables › Actions › onglet Variables** : créer
   `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (mêmes valeurs que `.env.local`).
   La clé `anon` est publique par conception : ce sont les règles RLS de Supabase qui
   protègent les données. Aucune clé secrète (`service_role`) ne doit aller dans ce dépôt.
3. Pousser sur `main`. L'app est en ligne à `https://<compte>.github.io/<nom-du-dépôt>/`.

> ⚠️ Avec un compte GitHub gratuit, Pages ne publie que les dépôts **publics**.
> Si le dépôt reste privé, il faut soit passer à GitHub Pro, soit héberger le front
> ailleurs (Cloudflare Pages ou Netlify acceptent les dépôts privés gratuitement).

## Installer l'app sur le téléphone

- **iPhone** (Safari) : bouton Partager › « Sur l'écran d'accueil ». Indispensable pour
  recevoir les notifications (iOS 16.4 ou plus récent).
- **Android** (Chrome) : menu ⋮ › « Installer l'application ».
