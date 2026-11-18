-- =====================================================================
-- BBH VIE · réparation d'encodage
-- Les migrations 0002 à 0004 ont pu être collées avec les accents et émojis
-- déformés (« √© » au lieu de « é »). Celle-ci remet les bons textes partout.
-- Peut être exécutée plusieurs fois sans risque.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tâches : noms, groupes et émojis abîmés → valeurs correctes
-- ---------------------------------------------------------------------

-- Noms abîmés → noms corrects (sauf si la bonne version existe déjà dans le foyer).
update public.tasks t
set name = r.nom
from (values
  ('Arroser les plantes int√©rieures', 'Arroser les plantes intérieures'),
  ('Aspirateur : entr√©e', 'Aspirateur : entrée'),
  ('Aspirateur : salle √† manger', 'Aspirateur : salle à manger'),
  ('Faire la poussi√®re', 'Faire la poussière'),
  ('Faire un repas √©labor√©', 'Faire un repas élaboré'),
  ('Faire √† manger', 'Faire à manger'),
  ('Faire √† manger rapidos', 'Faire à manger rapidos'),
  ('Grandes courses (plus de 50 ‚Ç¨)', 'Grandes courses (plus de 50 €)'),
  ('Passer la serpill√®re', 'Passer la serpillère'),
  ('Petites courses (moins de 50 ‚Ç¨)', 'Petites courses (moins de 50 €)')
) as r (abime, nom)
where t.name = r.abime
  and not exists (select 1 from public.tasks d where d.household_id = t.household_id and d.name = r.nom);

-- Version abîmée restante en doublon de la bonne : retirée si elle n'a aucun log.
delete from public.tasks t
using (values
  ('Arroser les plantes int√©rieures', 'Arroser les plantes intérieures'),
  ('Aspirateur : entr√©e', 'Aspirateur : entrée'),
  ('Aspirateur : salle √† manger', 'Aspirateur : salle à manger'),
  ('Faire la poussi√®re', 'Faire la poussière'),
  ('Faire un repas √©labor√©', 'Faire un repas élaboré'),
  ('Faire √† manger', 'Faire à manger'),
  ('Faire √† manger rapidos', 'Faire à manger rapidos'),
  ('Grandes courses (plus de 50 ‚Ç¨)', 'Grandes courses (plus de 50 €)'),
  ('Passer la serpill√®re', 'Passer la serpillère'),
  ('Petites courses (moins de 50 ‚Ç¨)', 'Petites courses (moins de 50 €)')
) as r (abime, nom)
where t.name = r.abime
  and not exists (select 1 from public.task_logs l where l.task_id = t.id);

-- Émojis abîmés.
update public.tasks t
set emoji = r.bon
from (values
  ('‚ôªÔ∏è', '♻️'),
  ('üå±', '🌱'),
  ('üåº', '🌼'),
  ('üç≤', '🍲'),
  ('üç≥', '🍳'),
  ('üçΩÔ∏è', '🍽️'),
  ('üëï', '👕'),
  ('üë©‚Äçüç≥', '👩‍🍳'),
  ('üîß', '🔧'),
  ('üóëÔ∏è', '🗑️'),
  ('üö∞', '🚰'),
  ('üöΩ', '🚽'),
  ('üöø', '🚿'),
  ('üõçÔ∏è', '🛍️'),
  ('üõèÔ∏è', '🛏️'),
  ('üõí', '🛒'),
  ('üßÇ', '🧂'),
  ('üßπ', '🧹'),
  ('üß∫', '🧺'),
  ('üßº', '🧼'),
  ('üßΩ', '🧽'),
  ('ü™£', '🪣'),
  ('ü™¥', '🪴'),
  ('ü™∂', '🪶')
) as r (abime, bon)
where t.emoji = r.abime;

-- Groupes abîmés.
update public.tasks t
set group_name = r.bon
from (values
  ('d√©chets', 'déchets'),
  ('m√©nage', 'ménage')
) as r (abime, bon)
where t.group_name = r.abime;

alter table public.tasks alter column group_name set default 'ménage';

update public.tasks set group_name = 'WC'
where name = 'Aspirateur : toilettes' and group_name = 'ménage';

-- ---------------------------------------------------------------------
-- 2. Catégories de dépenses
-- ---------------------------------------------------------------------

update public.expense_categories c
set name = r.bon
from (values
  ('Hygi√®ne du foyer', 'Hygiène du foyer'),
  ('Hygi√®ne personnelle', 'Hygiène personnelle'),
  ('√âlectricit√©', 'Électricité'),
  ('Taxe fonci√®re', 'Taxe foncière')
) as r (abime, bon)
where c.name = r.abime;

update public.expense_categories c
set emoji = r.bon
from (values
  ('üõí', '🛒'),
  ('üßª', '🧻'),
  ('üß¥', '🧴'),
  ('üöó', '🚗'),
  ('‚ö°', '⚡'),
  ('üì∂', '📶'),
  ('üéµ', '🎵'),
  ('üè†', '🏠')
) as r (abime, bon)
where c.emoji = r.abime;

-- ---------------------------------------------------------------------
-- 3. Barème et nouvelles tâches (contenu de 0004, avec le bon encodage)
-- ---------------------------------------------------------------------

update public.tasks set stars = 2
where name in (
  'Faire la vaisselle',
  'Vider le lave-vaisselle',
  'Arroser les plantes intérieures',
  'Vider le tri',
  'Aspirateur : salon / cuisine'
);

update public.tasks set stars = 1
where name in ('Aspirateur : entrée', 'Aspirateur : toilettes');

update public.tasks set name = 'Faire à manger rapidos', stars = 2
where name = 'Faire à manger';

insert into public.tasks (household_id, name, group_name, emoji, stars, sort_order)
select h.id, n.name, n.group_name, n.emoji, n.stars, n.sort_order
from public.households h
cross join (values
  ('Faire un repas élaboré',                         'cuisine', '🍲',  4,  4),
  ('Entretien du lave-vaisselle (tamis, sel)',       'cuisine', '🧂',  3,  2),
  ('Vider l''aspirateur',                            'ménage',  '🗑️', 1, 11),
  ('Nettoyer l''aspirateur',                         'ménage',  '🧽',  2, 11),
  ('Plier le linge de l''autre',                     'linge',   '👕',  2, 21),
  ('Petites courses (moins de 50 €)',                'courses', '🛍️', 2, 27),
  ('Grandes courses (plus de 50 €)',                 'courses', '🛒',  3, 28)
) as n (name, group_name, emoji, stars, sort_order)
where not exists (
  select 1 from public.tasks t where t.household_id = h.id and t.name = n.name
);

update public.tasks set emoji = '🍲' where name = 'Faire un repas élaboré' and emoji = '👩‍🍳';

-- ---------------------------------------------------------------------
-- 4. Fonctions réécrites avec les bons textes (messages d'erreur, données de départ)
-- ---------------------------------------------------------------------

create or replace function public.create_household(household_name text, my_name text, my_color text)
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

create or replace function public.join_household(code text, my_name text, my_color text)
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

create or replace function public.prepare_task_log()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.user_id      := auth.uid();
  new.household_id := public.my_household_id();

  if new.done_at < public.week_start(now()) or new.done_at > now() + interval '5 minutes' then
    raise exception 'on ne peut loguer que dans la semaine en cours';
  end if;

  if tg_op = 'INSERT' or new.task_id <> old.task_id then
    select stars into new.stars from public.tasks
    where id = new.task_id and household_id = new.household_id;
    if new.stars is null then raise exception 'tâche inconnue'; end if;
  end if;

  new.reveal_at := public.week_end(new.done_at);
  return new;
end;
$$;

create or replace function public.seed_household(hid uuid)
returns void
language sql security definer set search_path = public
as $$
  insert into public.tasks (household_id, name, group_name, emoji, stars, sort_order) values
    (hid, 'Lancer le lave-vaisselle',                     'cuisine',       '🍽️', 1,  1),
    (hid, 'Vider le lave-vaisselle',                      'cuisine',       '🍽️', 2,  2),
    (hid, 'Entretien du lave-vaisselle (tamis, sel)',     'cuisine',       '🧂',  3,  3),
    (hid, 'Faire la vaisselle',                           'cuisine',       '🧽',  2,  4),
    (hid, 'Faire à manger rapidos',                       'cuisine',       '🍳',  2,  5),
    (hid, 'Faire un repas élaboré',                       'cuisine',       '🍲',  4,  6),
    (hid, 'Faire la poussière',                           'ménage',        '🪶',  3,  7),
    (hid, 'Aspirateur : salon / cuisine',                 'ménage',        '🧹',  2,  8),
    (hid, 'Aspirateur : salle à manger',                  'ménage',        '🧹',  2,  9),
    (hid, 'Aspirateur : chambre',                         'ménage',        '🧹',  2, 10),
    (hid, 'Aspirateur : entrée',                          'ménage',        '🧹',  1, 11),
    (hid, 'Aspirateur : salle de bain',                   'ménage',        '🧹',  1, 12),
    (hid, 'Vider l''aspirateur',                          'ménage',        '🗑️', 1, 13),
    (hid, 'Nettoyer l''aspirateur',                       'ménage',        '🧽',  2, 14),
    (hid, 'Passer la serpillère',                         'ménage',        '🪣',  3, 15),
    (hid, 'Aspirateur : toilettes',                       'WC',            '🧹',  1, 16),
    (hid, 'Nettoyer les WC',                              'WC',            '🚽',  2, 17),
    (hid, 'Nettoyer le calcaire des WC',                  'WC',            '🚽',  3, 18),
    (hid, 'Nettoyer le lavabo (surface)',                 'salle de bain', '🚰',  1, 19),
    (hid, 'Nettoyer le siphon du lavabo',                 'salle de bain', '🔧',  3, 20),
    (hid, 'Nettoyer le drain de la douche',               'salle de bain', '🔧',  3, 21),
    (hid, 'Nettoyer la vasque de la douche',              'salle de bain', '🚿',  2, 22),
    (hid, 'Nettoyer le carrelage de la salle de bain',    'salle de bain', '🧼',  3, 23),
    (hid, 'Changer les draps',                            'linge',         '🛏️', 3, 24),
    (hid, 'Lessive de draps et serviettes communes',      'linge',         '🧺',  2, 25),
    (hid, 'Plier le linge de l''autre',                   'linge',         '👕',  2, 26),
    (hid, 'Petites courses (moins de 50 €)',              'courses',       '🛍️', 2, 27),
    (hid, 'Grandes courses (plus de 50 €)',               'courses',       '🛒',  3, 28),
    (hid, 'Vider le tri',                                 'déchets',       '♻️', 2, 29),
    (hid, 'Jeter la poubelle alimentaire',                'déchets',       '🗑️', 1, 30),
    (hid, 'Arroser les plantes intérieures',              'plantes',       '🪴',  2, 31),
    (hid, 'Arroser les jasmins',                          'plantes',       '🌼',  1, 32),
    (hid, 'Rempoter les plantes',                         'plantes',       '🌱',  3, 33);

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
