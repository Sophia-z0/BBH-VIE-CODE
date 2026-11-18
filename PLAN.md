# BBH VIE : plan validé (18/11/2026)

## Règles du jeu décidées
- **Semaine** : du dimanche 18h au dimanche 18h (Europe/Paris). Tout ce que l'autre logue
  pendant la semaine en cours (tâches, dépenses, cadeaux, présence) reste masqué jusqu'au reveal.
  Masquage appliqué côté serveur (RLS), pas seulement dans l'interface.
- **Log rétroactif** : possible sur toute la semaine en cours ; une semaine révélée est figée.
- **Présence** : à la maison par défaut, on marque seulement ses nuits d'absence.
- **Tâche faite à deux** : étoiles partagées moitié-moitié.
- **Gagnant·e de la semaine** : étoiles par jour de présence, tâches seulement. Égalité : bravo à vous deux.
- **Podium mensuel** : ⭐ (tâches, ajustées à la présence) et 💖 (dépenses).
  - Part proportionnelle = revenu de la personne / revenus du foyer.
  - 💖 pour chaque personne qui atteint au moins 90 % de sa part proportionnelle
    (les deux peuvent l'obtenir) ; en tête, celle dont la part réelle est la plus proche
    de sa part proportionnelle ou au-dessus.
- **Cadeaux 🎁** : comptés à part des dépenses, mais mis en évidence (podium, stats).
- **Revenus** : visibles par les deux, affichés discrètement (réglages, détail des stats).
- **Notifications** : quotidienne (heure réglable), dimanche 12h (« pense à loguer ta semaine »),
  dimanche 18h (reveal).
- **Téléphones** : un iPhone (automatisation Raccourcis « Transaction »), un Android (MacroDroid).

## Étapes
0. Squelette, déploiement, README ✅
1. Schéma Supabase, RLS, données de départ, connexion par code e-mail, foyer + invitation ✅
2. Log d'une tâche + catalogue modifiable
3. Présence + calendrier
4. Dépenses, tags, cadeaux, récurrentes, ajout rapide
5. Masquage + reveal du dimanche (podium)
6. Statistiques
7. Notifications Web Push
8. Capture des paiements (Raccourcis iPhone, MacroDroid Android)
