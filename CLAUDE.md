# BBH VIE : instructions pour Claude Code

PWA de la vie du foyer à deux : tâches ⭐, dépenses 💖, cadeaux 🎁, présence, reveal le dimanche à 18h.

## Documents de référence, et lequel l'emporte en cas de contradiction
1. **La demande du jour** : prime sur tout le reste.
2. `CHANGELOG.md` : l'état réel de l'app, le plus à jour.
3. `PLAN.md` : règles du jeu validées et étapes.
4. `README.md` : installation, Supabase, notifications, déploiement.
5. `BRIEF-BBH-VIE.txt` : brief d'origine, local et ignoré par git (prénoms). Ne le lis que si la tâche l'exige.

## Stack
Vite + React 19 + TypeScript strict + Tailwind v4 · React Router · Supabase (Auth, Postgres + RLS, Edge Function `notifier`, `pg_cron`) · PWA (service worker `src/sw.ts`, Web Push) · GitHub Pages. Scripts : voir `package.json` (`npm run build` = typecheck + build).

## Structure
- `src/domain/` : règles du jeu en TypeScript pur (semaine, étoiles, scores, calendrier, stats), sans React ni Supabase
- `src/services/` : accès à Supabase, sans UI
- `src/features/<écran>/` : auth, calendrier, depenses, foyer, log, podium, reglages, stats
- `src/components/` : briques visuelles réutilisables, sans logique métier
- `src/lib/` : client Supabase, dates, argent, utilitaires
- `supabase/migrations/` : schéma, RLS, données de départ, exécutés à la main dans le SQL Editor, dans l'ordre

## Règles de travail
- Ne modifie que les fichiers nécessaires à la tâche. Pas de refactor hors périmètre, pas de nouvelle dépendance sans me demander.
- Tâche non triviale : d'abord un plan de 10 lignes max, j'attends mon accord avant de coder.
- Fin de tâche : `npm run build` doit passer, puis un commit avec un message clair en français.
- **Jamais de `git push` sans ma demande explicite** : un push sur `main` publie l'app (workflow `deploy.yml`), et elle est utilisée au quotidien.
- **Base de données** : ne modifie jamais une migration existante (elles sont déjà exécutées). Tout changement = un nouveau fichier `supabase/migrations/00NN_….sql`, que j'exécute moi-même ; dis-le-moi clairement. Changements additifs seulement (nouvelles colonnes optionnelles), jamais de renommage ni de suppression de colonne.
- Ne touche pas aux règles RLS (masquage jusqu'au reveal) sans ma demande explicite : elles protègent le jeu.
- Ne lis jamais `.env.local` ni `supabase/local/` (secrets). Ne lis pas `dist/`, `dev-dist/`, `node_modules/`.
- Réponses courtes : dis ce qui a changé et comment le vérifier, sans récapituler tout le travail.
- Ne prends pas de captures d'écran et n'utilise pas le navigateur pour tester, sauf si je le demande : je teste moi-même en local.
- Avant chaque commit : ajoute une entrée courte en haut de `CHANGELOG.md` (date, ce qui change, où le voir), même format que les entrées existantes. Ne lis que le début du fichier.

## Écriture de l'interface
- Écriture inclusive au point médian. Ton bienveillant : rendre visible la répartition, jamais culpabiliser.
- Libellés (boutons, en-têtes) en minuscules ; majuscule en début de phrase dans les messages et notifications.
- Dates en jj/mm/aaaa, heure de Paris (`Europe/Paris`) pour tout ce qui touche à la semaine de jeu.
- Émojis réservés : ⭐ tâches, 💖 dépenses, 🎁 cadeaux, 🏅 résultats de la semaine, 👫 tâche à deux.

## Règles du jeu à ne pas casser
- Semaine de jeu : dimanche 18h → dimanche 18h (Paris), calculée côté base (`week_start`, `week_end`) et dans `domain/semaine.ts`.
- Les logs de l'autre sont masqués jusqu'au reveal (RLS) ; une semaine révélée est figée.
- Les étoiles d'un log sont fixées par la base au moment du log (barème modifiable sans réécrire l'historique).
- Tâche « à deux » : moitié des étoiles chacun·e ; si les deux la loguent le même jour, elle ne compte qu'une fois (`logsEnDouble`, `domain/calendrier.ts`).
- Podium ⭐ : étoiles par nuit passée à la maison ; 💖 : part des dépenses rapportée à la part des revenus (`domain/scores.ts`).
