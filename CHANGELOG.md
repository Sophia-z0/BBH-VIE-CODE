# BBH VIE — journal des modifications

Chaque entrée : ce qui a changé, pourquoi, et où c'est visible. Les règles du jeu et les étapes
sont dans `PLAN.md`, l'installation et le déploiement dans `README.md`.

## 2026-11-19 (tâche à deux loguée par les deux : comptée une seule fois)

- **Doublons « à deux »** : si les deux personnes loguent la même tâche « à deux », le même jour (heure de Paris), les étoiles étaient comptées deux fois. Elles ne comptent maintenant qu'une fois : `logsEnDouble` repère ces paires (appariement un pour un, au plus proche dans le temps) et `etoilesDe` ignore le log le plus tardif de chaque paire (`domain/calendrier.ts`). Effet sur le podium, le calendrier et les stats, y compris pour les semaines passées. Les badges ne changent pas (ils ne comptent que mes propres logs). Aucune migration, aucune règle Supabase modifiée.
- **Détail d'un jour** (calendrier) : le log en double reste affiché, avec son badge ⭐ barré et grisé et la mention « logué par vous deux, compté une fois » (`features/calendrier/DetailJour.tsx`).
- **Limite connue** : un log daté du lendemain (« maintenant » laissé par défaut au lieu de choisir la veille) n'est pas reconnu comme doublon.

## 2026-11-18 (première version, étapes 0 à 7)

- **Étape 0** : squelette Vite + React + Tailwind + PWA, déploiement GitHub Pages (publication bloquée si une variable d'environnement manque).
- **Étape 1** : base Supabase, connexion par e-mail et mot de passe, foyer à deux et réglages du profil.
- **Étape 2** : loguer une tâche en un tap (option « à deux » : moitié des étoiles chacun·e), catalogue des tâches modifiable ; barème revu, 7 nouvelles tâches, groupe « WC ».
- **Étape 3** : présence à la maison (nuits d'absence) et calendrier mensuel.
- **Étape 4** : dépenses 💖, cadeaux 🎁, dépenses récurrentes et ajout rapide.
- **Étape 5** : reveal du dimanche 18h (compte à rebours « reveal dans 4j et 2h »), podium mensuel ⭐ / 💖, séries et badges ; 🏅 pour les résultats de la semaine.
- **Étape 6** : écran de statistiques.
- **Étape 7** : notifications push (rappel du jour, dimanche 12h, résultats à 18h).
