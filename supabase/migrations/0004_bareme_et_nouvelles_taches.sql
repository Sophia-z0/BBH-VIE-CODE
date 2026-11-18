-- =====================================================================
-- BBH VIE · nouveau barème et nouvelles tâches (peut être exécutée plusieurs fois)
-- Les logs déjà faits gardent leurs étoiles d'origine.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Foyers déjà créés
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

-- ---------------------------------------------------------------------
-- Foyers créés à partir de maintenant
-- ---------------------------------------------------------------------

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
