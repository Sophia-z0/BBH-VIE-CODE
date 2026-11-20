-- =====================================================================
-- BBH VIE · minimum perso (facultatif)
-- Chacun·e peut indiquer le minimum qu'il lui faut garder chaque mois (charges perso, loisirs…) :
-- l'app prévient quand sa part des dépenses du foyer ne le laisse plus.
-- Nouvelles colonnes optionnelles seulement : rien ne change dans les règles existantes
-- (« profils : modifier le sien » couvre déjà ces colonnes).
-- =====================================================================

alter table public.profiles
  add column if not exists personal_minimum_cents integer check (personal_minimum_cents >= 0),
  -- L'autre voit seulement l'alerte (pas le montant), et seulement si c'est coché.
  add column if not exists share_minimum boolean not null default false;

-- Vérification : doit renvoyer deux lignes.
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('personal_minimum_cents', 'share_minimum');
