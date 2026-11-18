-- =====================================================================
-- BBH VIE · groupe « WC » : les tâches des WC quittent « salle de bain » et « ménage »
-- (peut être exécutée plusieurs fois sans risque)
-- =====================================================================

-- Foyers déjà créés
update public.tasks
set group_name = 'WC'
where name in ('Nettoyer les WC', 'Nettoyer le calcaire des WC', 'Aspirateur : toilettes')
  and group_name in ('salle de bain', 'ménage');

-- Foyers créés à partir de maintenant
create or replace function public.seed_household(hid uuid)
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
    (hid, 'Aspirateur : toilettes',                       'WC',            '🧹', 1, 10),
    (hid, 'Aspirateur : salle de bain',                   'ménage',        '🧹', 1, 11),
    (hid, 'Passer la serpillère',                         'ménage',        '🪣', 3, 12),
    (hid, 'Nettoyer les WC',                              'WC',            '🚽', 2, 13),
    (hid, 'Nettoyer le calcaire des WC',                  'WC',            '🚽', 3, 14),
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
