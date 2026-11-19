# BBH VIE — journal des modifications

Chaque entrée : ce qui a changé, pourquoi, et où c'est visible. Les règles du jeu et les étapes
sont dans `PLAN.md`, l'installation et le déploiement dans `README.md`.

## 2026-11-19 (onglet tâches : lignes qui défilent, tuiles qui rayonnent)

- **Une ligne par groupe**, qui défile seulement à l'horizontale (sans barre visible, arrêt sur chaque tuile) : toutes les tuiles sont verticales et de même taille, donc toutes les pièces et catégories ont la même hauteur. Les lignes vont jusqu'au bord de l'écran.
- **Quotidien** en tête, en tuiles blanches ; **occasionnel** ensuite, en tuiles « qui rayonnent » (dégradé doré, halo qui pulse doucement, sans animation si le téléphone demande moins de mouvement ; halo adouci en jaune pâle et limité à 12px, ligne de 16px de marge haut et bas pour qu'il ne soit plus coupé) (`EcranLog.tsx`, `.tuile-rayonnante` dans `styles/index.css`).

## 2026-11-19 (onglet tâches : pièces / le reste, quotidien en premier ; loguer depuis le calendrier)

- **Migration `0009_taches_quotidiennes_et_ordre.sql`** (à exécuter **avant** de pousser : l'app lit la nouvelle colonne) : colonne `tasks.everyday` (tâche du quotidien, `false` par défaut), groupe « cuisine » renommé « cuisine/salon », ordre logique et quotidien posés tâche par tâche (motifs ASCII, rejouable).
- **Onglet tâches** : deux plans, « 🏠 les pièces » (cuisine/salon, salle à manger, chambre, salle de bain, WC) puis « 🧺 le reste » (ménage, linge, déchets, plantes, courses, puis les groupes inconnus). Dans chaque groupe, les tâches du quotidien d'abord en grandes tuiles, l'occasionnel ensuite en petites tuiles discrètes (`domain/taches.ts`, `features/log/EcranLog.tsx`).
- **Catalogue** (« modifier la liste des tâches ») : rangé par groupe, ▲ ▼ pour changer l'ordre (entre tâches de même type), interrupteur « ☀️ quotidien » (`EcranCatalogue.tsx`, `reordonnerTaches`).
- **Calendrier** : dans le détail d'un jour de la semaine en cours, « ⭐ loguer une tâche ce jour-là » et « 💖 loguer une dépense ce jour-là » ouvrent l'onglet avec la date pré-remplie (`?jour=AAAA-MM-JJ`, midi ce jour-là ; la date reste choisie pour les logs suivants) (`DetailJour.tsx`, `quandDuJour` dans `ChoixQuand.tsx`).

## 2026-11-19 (CLAUDE.md et CHANGELOG.md)

- **`CLAUDE.md`** : instructions pour Claude Code (documents de référence, règles de travail, jamais de push ni de migration modifiée sans demande, entrée de CHANGELOG avant chaque commit, règles du jeu à ne pas casser). **`CHANGELOG.md`** créé, avec l'historique des étapes 0 à 7.

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
