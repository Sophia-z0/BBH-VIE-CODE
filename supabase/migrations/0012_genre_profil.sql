-- =====================================================================
-- BBH VIE · genre de chacun·e (pour accorder les badges : cheffe / chef, mère / père courage…)
-- Nouvelle colonne optionnelle seulement : rien ne change dans les règles existantes
-- (« profils : modifier le sien » couvre déjà cette colonne).
-- =====================================================================

alter table public.profiles
  add column if not exists gender text check (gender in ('elle', 'il', 'iel'));

-- Vérification : doit renvoyer une ligne « gender ».
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'gender';
