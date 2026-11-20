# BBH VIE — journal des modifications

Chaque entrée : ce qui a changé, pourquoi, et où c'est visible. Les règles du jeu et les étapes
sont dans `PLAN.md`, l'installation et le déploiement dans `README.md`.

## 2026-11-20 (pile : vibration plus marquée, cliquetis sur iPhone)

- **Pile de cartes** : vibration un peu plus forte sur Android (10 ms au toucher, 5 ms par carte, au lieu de 6 et 3). Sur iPhone, qui ne vibre pas depuis le web, un petit cliquetis sonore de carton à la place, coupé en mode silencieux (`lib/cliquetis.ts`).

## 2026-11-20 (calendrier et stats depuis novembre 2026)

- **Calendrier et stats** ne remontent plus avant novembre 2026, premier mois de l'app : la flèche ‹ est grisée sur novembre 2026, et les stats (dont « depuis le début » et « par mois ») ignorent tout ce qui est daté d'avant (`PREMIER_MOIS` dans `domain/calendrier.ts`).

## 2026-11-20 (carte revenu : dépenses seulement)

- **Carte « 💶 ton revenu net de … ? »** retirée de l'onglet tâches : elle n'apparaît plus que dans les dépenses (`EcranLog.tsx`).

## 2026-11-20 (dépenses récurrentes visibles le jour de l'échéance)

- **Dépenses récurrentes** : une récurrente créée dont l'échéance tombe aujourd'hui, ou plus tôt dans la semaine en cours, est générée tout de suite (avant, la première échéance n'arrivait que le mois suivant). Sa carte se pose sur la pile comme les autres, et n'est plus rangée dessous (`services/depenses.ts`, `EcranDepenses.tsx`).

## 2026-11-20 (revenus mois par mois, part juste lissée, report trimestriel)

- **Revenus mensuels** : chacun·e saisit son revenu net de chaque mois. Une carte « 💶 ton revenu net de … ? » reste en haut des tâches et des dépenses tant que le mois dernier n'est pas renseigné. Les 12 derniers mois sont modifiables dans les réglages, section « mes revenus » (`features/reglages/Revenus.tsx`, `services/revenus.ts`).
- **Part juste** : elle se calcule sur la moyenne des 6 derniers mois renseignés, ou à défaut sur le revenu mensuel habituel des réglages (`domain/revenus.ts`, `domain/scores.ts`).
- **Report trimestriel** : à la fin d'un trimestre, l'écart entre la part juste calculée sur les revenus réels et celle sur les revenus lissés est ajouté (ou retiré) à la part juste du trimestre suivant, réparti dans le temps. Pas de solde à rembourser. Le report est plafonné à 25 % de la part juste ; le surplus passe au trimestre d'après. Une phrase l'explique sous le podium du mois et dans les stats (`components/PhraseReport.tsx`).
- **À faire côté Supabase** : exécuter `supabase/migrations/0011_revenus_mensuels.sql` (nouvelle table `monthly_incomes`, rien de changé ailleurs). Sans elle, l'app continue comme avant.

## 2026-11-20 (pile fidget plus douce)

- **Pile fidget** : empilage un peu plus lent (jusqu'à 110 ms entre deux cartes, chute de 380 ms) et micro-vibration très légère à chaque carte qui retombe, sur Android (Safari sur iPhone ne permet pas la vibration web) (`PileDeCartes.tsx`, `styles/index.css`).

## 2026-11-20 (pile fidget)

- **Pile de cartes à remuer** : toucher la pile la soulève vers soi, puis les cartes de la semaine (jusqu'à 24) retombent une à une, en petit, de la plus ancienne à la plus récente, chacune de travers. Chaque nouveau toucher relance la cascade. Dans tâches et dans dépenses. Retour arrière : `PILE_FIDGET = false` dans `src/lib/options.ts` (`PileDeCartes.tsx`, `styles/index.css`).

## 2026-11-20 (badges dans les stats)

- **Badges** : nouvelle carte « 🎖️ badges » dans les stats, sous « tâches » : les badges des deux côte à côte, calculés sur tout l'historique révélé ; un badge pas encore obtenu montre où on en est (« 142 / 200 »). Dans le podium, la liste « mes badges » est remplacée par « badges de la semaine » : ceux débloqués par l'un·e ou l'autre pendant la semaine révélée (`domain/scores.ts`, `EcranStats.tsx`, `EcranPodium.tsx`, `usePodium.ts`).

## 2026-11-20 (calendrier : lisibilité)

- **Calendrier** : sous chaque semaine, mon total est aligné à gauche et celui de l'autre à droite. En vue 💖, une journée avec dépenses et cadeau affiche « 29€+🎁 » (et plus « 29€🎁 », qu'on pouvait lire comme 29 € de cadeau) (`EcranCalendrier.tsx`).

## 2026-11-20 (pile de cartes : ordre d'ajout)

- **Pile de cartes** : elle suit l'ordre d'ajout dans l'app (colonne `created_at`, déjà en base), plus la date du log. Une tâche ou une dépense logée pour hier se pose donc sur le dessus de la pile. Les listes « mes logs » et « mes entrées » restent chronologiques. Les dépenses récurrentes, générées automatiquement, restent sous la pile (`PileDeCartes.tsx`, `services/taches.ts`, `services/depenses.ts`).

## 2026-11-20 (ticket : date et heure d'achat)

- **Ticket de caisse** : la lecture cherche aussi l'heure d'achat, et la date est remise au bon format même si elle revient en « 19/11/26 » ou « 19.11.2026 ». Le panneau affiche ce qui a été lu (« 🗓️ jeu. 19/11 à 18h42 »), ou explique pourquoi la date choisie à l'écran est utilisée à la place (date illisible, ou hors de la semaine en cours). Les dépenses sont enregistrées à cette date et heure (`lire-ticket/index.ts`, `services/ticket.ts`, `PanneauTicket.tsx`, `EcranDepenses.tsx`).
- **À faire côté Supabase** : redéployer la fonction `lire-ticket`.

## 2026-11-20 (tickets mélangés : une dépense par catégorie)

- **Ticket de caisse** : la lecture propose une catégorie du foyer pour chaque article. Le panneau les regroupe par catégorie avec un sous-total ; toucher l'emoji d'un article ouvre la ligne de tuiles pour le changer de catégorie ou l'offrir au foyer (🎁). Le bouton crée une dépense par catégorie (même magasin et même date, chacune avec ses articles) et un cadeau pour le groupe 🎁. Si un enregistrement échoue, les lots déjà enregistrés quittent la liste : réessayer ne crée pas de doublon (`PanneauTicket.tsx`, `EcranDepenses.tsx`, `services/ticket.ts`).
- **À faire côté Supabase** : redéployer la fonction `lire-ticket` (`supabase/functions/lire-ticket/index.ts`), qui reçoit maintenant les noms des catégories. Pas de migration.

## 2026-11-20 (cartes collectées)

- **Les tuiles deviennent des cartes qu'on collectionne** : après le message au dos, la carte se remet à l'endroit et vole jusqu'à la pile du bandeau, façon solitaire, où elle se pose de travers par-dessus les autres. La pile montre les 6 dernières cartes de la semaine (tâches et dépenses ; occasionnelles orangées, cadeaux roses). « annuler » reste proposé sous la pile quelques secondes. Le total passe sous le libellé du bandeau (`components/PileDeCartes.tsx`, `components/useCollecte.ts`, `lib/envol.ts`, `EcranLog.tsx`, `EcranDepenses.tsx`).
- **Retour arrière** : `CARTES_COLLECTEES = false` dans `src/lib/options.ts` remet l'ancienne version, ou `git revert` de ce commit.

## 2026-11-20 (dépenses comme les tâches, étiquettes, bandeaux, couleurs douces)

- **Dépenses** : en haut, deux tuiles pour saisir, 💶 montant ou 🧾 ticket de caisse (📷 scanner). Dessous, une seule ligne de tuiles pour dire où va la dépense : 🎁 offrir au foyer, puis les catégories (`EcranDepenses.tsx`).
- **Ticket de caisse** : après la lecture, on coche les articles puis on touche une tuile, catégorie ou 🎁. Un ticket offert au foyer devient un cadeau (le magasin pour description, le total coché pour valeur) (`PanneauTicket.tsx`).
- **Étiquettes** : un appui long passe en mode « ranger », et toucher une étiquette ne la propose plus (mémorisé sur le téléphone ; les anciennes dépenses gardent leur étiquette) (`PucesEtiquettes.tsx`, `useDepensesSemaine.ts`).
- **Bandeaux « mes étoiles » et « mes 💖 cette semaine »** plus petits et arrondis, le total à droite (`components/BandeauSemaine.tsx`).
- **Couleurs douces** dans les réglages et à l'arrivée : lavande, menthe, pêche, rose poudré, bleu ciel, citron, corail, sauge. Le texte posé sur la couleur passe en brun foncé quand elle est claire (bandeaux, pastilles du calendrier) (`lib/couleurs.ts`, `ChoixCouleur.tsx`).

## 2026-11-20 (ticket de caisse rallumé)

- **Tuile « ticket de caisse » de retour** dans les dépenses (`TICKETS_ACTIFS = true`), et colonne `items` relue : migration 0010, clé Anthropic et fonction `lire-ticket` sont en place. Les articles retenus s'affichent sous « 🧾 n articles » dans la liste.

## 2026-11-19 (ticket de caisse en pause)

- **Tuile « ticket de caisse » masquée** (`TICKETS_ACTIFS = false` dans `EcranDepenses.tsx`) et colonne `items` plus lue (`services/depenses.ts`) : l'app peut être publiée sans la migration 0010 ni la fonction `lire-ticket`. Pour rallumer : migration 0010, clé Anthropic, fonction déployée, puis remettre `items` dans `COLONNES_DEPENSE` et passer `TICKETS_ACTIFS` à `true`.

## 2026-11-19 (ticket de caisse : petit modèle)

- **`lire-ticket`** passe à Claude Haiku 5.5 (effort bas) au lieu de Claude Opus 5.5 : environ 0,1 centime par ticket au lieu de quelques centimes. Plus de relance automatique sur un autre modèle en cas de refus (pas proposée pour Haiku) ; un refus renvoie « lecture refusée » (`supabase/functions/lire-ticket/index.ts`, `README.md`).

## 2026-11-19 (ticket de caisse en photo ; dos des tuiles de la couleur de la face)

- **Ticket de caisse** : tuile « 🧾 ticket de caisse » dans la ligne des dépenses (après le cadeau). Photo (appareil ou galerie) réduite à 1800 px, envoyée à la nouvelle fonction Supabase `lire-ticket`, qui la lit avec Claude (`claude-opus-5-5`, sortie JSON imposée) et renvoie magasin, date et articles (remises en négatif). Panneau : tout est coché, on décoche le perso, on choisit la catégorie (alimentaire par défaut), puis **une seule dépense** du total coché, magasin en étiquette, date du ticket si elle est dans la semaine. La photo n'est jamais stockée (`supabase/functions/lire-ticket/index.ts`, `services/ticket.ts`, `features/depenses/PanneauTicket.tsx`).
- **Migration `0010_articles_des_depenses.sql`** (à exécuter **avant** de pousser) : colonne optionnelle `expenses.items` (articles retenus). Dans « mes entrées de la semaine », « 🧾 n articles » déplie la liste.
- **Mise en place** : secret `ANTHROPIC_API_KEY` et déploiement de la fonction, décrits dans le `README.md`.
- **Dos des tuiles retournées** : même fond que la face (blanc, orange rayonnant ou rose), au lieu du crème uniforme (`TuileRetournable.tsx`).
- `jourLoggable` (`domain/calendrier.ts`) partagé entre le détail d'un jour et le ticket.

## 2026-11-19 (dos de tuile plus doux)

- **Dos des tuiles retournées** : fond crème avec un liseré orange pâle et le gain en orange, au lieu du fond brun foncé, trop contrasté (`TuileRetournable.tsx`).

## 2026-11-19 (tuiles qui se retournent, dépenses en tuiles, cadeau rose, messages personnalisés)

- **Tuile qui se retourne** (`components/TuileRetournable.tsx`, styles `.tuile-carte` dans `index.css`) : au tap, la tuile pivote et montre au dos le gain, le message et « annuler » ; elle se referme seule après 5 s, ou en touchant le dos. Sans rotation (fondu) si le téléphone demande moins de mouvement. Le bandeau noir du bas disparaît (`components/Retour.tsx` supprimé).
- **Dépenses** : plus de choix « dépense / cadeau ». Les catégories deviennent une ligne de tuiles blanches qui défile, avec en tête une **tuile cadeau 🎁 rose qui rayonne** : le montant sert de valeur estimée et le champ texte de description. Les cadeaux restent hors du total 💖. Montant ou description manquants : la tuile se retourne sur un message d'aide (`EcranDepenses.tsx`).
- **Messages** (`domain/encouragements.ts`) : nouveaux messages (« Tu gères de kheur ! », « Ça c'est un DEUBEHBZ ! », « Trop d'chaaaaance ✨ »…), `{moi}` remplacé par mon prénom, message du frigo (« Merci ! (de la part du frigzzz 🥦) ») une fois sur deux pour une dépense alimentaire (catégorie contenant « aliment », « courses »…).

## 2026-11-19 (onglet tâches : lignes qui défilent, tuiles qui rayonnent)

- **Une ligne par groupe**, qui défile seulement à l'horizontale (sans barre visible, arrêt sur chaque tuile) : toutes les tuiles sont verticales et de même taille, donc toutes les pièces et catégories ont la même hauteur. Les lignes vont jusqu'au bord de l'écran.
- **Quotidien** en tête, en tuiles blanches ; **occasionnel** ensuite, en tuiles « qui rayonnent » (dégradé orange pâle, halo qui pulse doucement, sans animation si le téléphone demande moins de mouvement ; halo adouci en orange très doux et limité à 12px, ligne de 16px de marge haut et bas pour qu'il ne soit plus coupé) (`EcranLog.tsx`, `.tuile-rayonnante` dans `styles/index.css`).

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
