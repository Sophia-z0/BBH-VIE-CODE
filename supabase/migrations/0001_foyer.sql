-- =====================================================================
-- BBH VIE · étape 1 : foyer, profils, catalogue de tâches, catégories
-- À exécuter une fois dans Supabase › SQL Editor (voir README).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  -- Code à donner à l'autre personne pour rejoindre le foyer.
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  household_id         uuid not null references public.households (id) on delete cascade,
  display_name         text not null check (char_length(display_name) between 1 and 40),
  color                text not null default '#8b5cf6' check (color ~ '^#[0-9a-fA-F]{6}$'),
  -- Revenu mensuel net, en centimes. Optionnel, visible par les deux membres du foyer.
  monthly_income_cents integer check (monthly_income_cents >= 0),
  created_at           timestamptz not null default now()
);
create index on public.profiles (household_id);

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  group_name   text not null default 'ménage',
  emoji        text not null default '✨',
  stars        smallint not null default 2 check (stars between 1 and 5),
  -- Une tâche « supprimée » est désactivée, pour garder l'historique des logs.
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index on public.tasks (household_id);

create table public.expense_categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  emoji        text not null default '🛍️',
  is_recurring boolean not null default false,
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index on public.expense_categories (household_id);

-- ---------------------------------------------------------------------
-- Foyer de la personne connectée (utilisé par toutes les règles RLS)
-- ---------------------------------------------------------------------

create function public.my_household_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- Données de départ d'un nouveau foyer (modifiables ensuite dans l'app)
-- ---------------------------------------------------------------------

create function public.seed_household(hid uuid)
returns void
language sql security definer set search_path = public
as $$
  insert into public.tasks (household_id, name, group_name, emoji, stars, sort_order) values
    (hid, 'Lancer le lave-vaisselle',                     'cuisine',       '🍽️', 1,  1),
    (hid, 'Vider le lave-vaisselle',                      'cuisine',       '🍽️', 3,  2),
    (hid, 'Faire la vaisselle',                           'cuisine',       '🧽', 3,  3),
    (hid, 'Faire à manger',                               'cuisine',       '🍳', 4,  4),
    (hid, 'Faire la poussière',                           'ménage',        '🪶', 3,  5),
    (hid, 'Aspirateur : salon / cuisine',                 'ménage',        '🧹', 3,  6),
    (hid, 'Aspirateur : salle à manger',                  'ménage',        '🧹', 2,  7),
    (hid, 'Aspirateur : chambre',                         'ménage',        '🧹', 2,  8),
    (hid, 'Aspirateur : entrée',                          'ménage',        '🧹', 1,  9),
    (hid, 'Aspirateur : toilettes',                       'ménage',        '🧹', 1, 10),
    (hid, 'Aspirateur : salle de bain',                   'ménage',        '🧹', 1, 11),
    (hid, 'Passer la serpillère',                         'ménage',        '🪣', 3, 12),
    (hid, 'Nettoyer les WC',                              'salle de bain', '🚽', 2, 13),
    (hid, 'Nettoyer le calcaire des WC',                  'salle de bain', '🚽', 3, 14),
    (hid, 'Nettoyer le lavabo (surface)',                 'salle de bain', '🚰', 1, 15),
    (hid, 'Nettoyer le siphon du lavabo',                 'salle de bain', '🔧', 3, 16),
    (hid, 'Nettoyer le drain de la douche',               'salle de bain', '🔧', 3, 17),
    (hid, 'Nettoyer la vasque de la douche',              'salle de bain', '🚿', 2, 18),
    (hid, 'Nettoyer le carrelage de la salle de bain',    'salle de bain', '🧼', 3, 19),
    (hid, 'Changer les draps',                            'linge',         '🛏️', 3, 20),
    (hid, 'Lessive de draps et serviettes communes',      'linge',         '🧺', 2, 21),
    (hid, 'Vider le tri',                                 'déchets',       '♻️', 1, 22),
    (hid, 'Jeter la poubelle alimentaire',                'déchets',       '🗑️', 1, 23),
    (hid, 'Arroser les plantes intérieures',              'plantes',       '🪴', 1, 24),
    (hid, 'Arroser les jasmins',                          'plantes',       '🌼', 1, 25),
    (hid, 'Rempoter les plantes',                         'plantes',       '🌱', 3, 26);

  insert into public.expense_categories (household_id, name, emoji, is_recurring, sort_order) values
    (hid, 'Courses alimentaires',         '🛒', false, 1),
    (hid, 'Hygiène du foyer',             '🧻', false, 2),
    (hid, 'Hygiène personnelle',          '🧴', false, 3),
    (hid, 'Garage',                       '🚗', false, 4),
    (hid, 'Électricité',                  '⚡', true,  5),
    (hid, 'Wifi (fibre)',                 '📶', true,  6),
    (hid, 'Abonnement musique',           '🎵', true,  7),
    (hid, 'Taxe foncière',                '🏠', true,  8);
$$;

-- ---------------------------------------------------------------------
-- Créer ou rejoindre un foyer (appelées depuis l'app après connexion)
-- ---------------------------------------------------------------------

create function public.create_household(household_name text, my_name text, my_color text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then raise exception 'non connecté·e'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'déjà membre d''un foyer';
  end if;

  insert into public.households (name) values (household_name) returning id into hid;
  insert into public.profiles (id, household_id, display_name, color) values (auth.uid(), hid, my_name, my_color);
  perform public.seed_household(hid);
  return hid;
end;
$$;

create function public.join_household(code text, my_name text, my_color text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then raise exception 'non connecté·e'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'déjà membre d''un foyer';
  end if;

  select id into hid from public.households where invite_code = upper(trim(code));
  if hid is null then raise exception 'code inconnu'; end if;
  if (select count(*) from public.profiles where household_id = hid) >= 2 then
    raise exception 'ce foyer est déjà complet';
  end if;

  insert into public.profiles (id, household_id, display_name, color) values (auth.uid(), hid, my_name, my_color);
  return hid;
end;
$$;

-- Seules les fonctions utiles à l'app sont appelables par les personnes connectées.
revoke execute on function public.seed_household(uuid) from public, anon, authenticated;
revoke execute on function public.create_household(text, text, text) from public, anon;
revoke execute on function public.join_household(text, text, text) from public, anon;
grant execute on function public.create_household(text, text, text) to authenticated;
grant execute on function public.join_household(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Sécurité : chaque foyer ne voit et ne modifie que ses propres données
-- ---------------------------------------------------------------------

-- Accès via l'API pour les personnes connectées (le projet n'accorde rien automatiquement) ;
-- les règles RLS ci-dessous filtrent ensuite ligne par ligne.
grant select, update                 on public.households         to authenticated;
grant select, update                 on public.profiles           to authenticated;
grant select, insert, update, delete on public.tasks              to authenticated;
grant select, insert, update, delete on public.expense_categories to authenticated;

alter table public.households         enable row level security;
alter table public.profiles           enable row level security;
alter table public.tasks              enable row level security;
alter table public.expense_categories enable row level security;

create policy "foyer : lecture" on public.households
  for select to authenticated using (id = public.my_household_id());
create policy "foyer : renommer" on public.households
  for update to authenticated using (id = public.my_household_id()) with check (id = public.my_household_id());

create policy "profils : lecture dans le foyer" on public.profiles
  for select to authenticated using (household_id = public.my_household_id());
create policy "profils : modifier le sien" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and household_id = public.my_household_id());

create policy "tâches : tout dans le foyer" on public.tasks
  for all to authenticated
  using (household_id = public.my_household_id()) with check (household_id = public.my_household_id());

create policy "catégories : tout dans le foyer" on public.expense_categories
  for all to authenticated
  using (household_id = public.my_household_id()) with check (household_id = public.my_household_id());
