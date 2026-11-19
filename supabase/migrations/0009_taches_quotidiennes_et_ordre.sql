-- =====================================================================
-- BBH VIE · tâches du quotidien, cuisine/salon, ordre logique
-- (peut être exécutée plusieurs fois sans risque)
--
-- Les noms sont reconnus par motifs ASCII (% à la place des accents et apostrophes),
-- pour résister aux problèmes d'encodage au copier-coller.
-- =====================================================================

-- Tâche du quotidien : affichée en premier dans son groupe, en tuile facile à attraper.
alter table public.tasks add column if not exists everyday boolean not null default false;

-- « cuisine » devient « cuisine/salon ».
update public.tasks set group_name = 'cuisine/salon' where group_name = 'cuisine';

-- Ordre logique et quotidien, groupe par groupe.
with ordre (groupe, motif, rang, quotidien) as (values
  -- cuisine/salon
  ('cuisine/salon',  'Faire % manger rapidos',           1, true),
  ('cuisine/salon',  'Lancer le lave-vaisselle',         2, true),
  ('cuisine/salon',  'Vider le lave-vaisselle',          3, true),
  ('cuisine/salon',  'Faire la vaisselle',               4, true),
  ('cuisine/salon',  'Nettoyer l%vier',                  5, true),
  ('cuisine/salon',  'Faire un repas %',                 6, false),
  ('cuisine/salon',  'Aspirateur : salon / cuisine',     7, false),
  ('cuisine/salon',  'Passer la serpill%re cuisine%',    8, false),
  ('cuisine/salon',  'Nettoyer la hotte%',               9, false),
  ('cuisine/salon',  'Entretien du lave-vaisselle%',    10, false),
  ('cuisine/salon',  'Changer la cartouche%',           11, false),
  ('cuisine/salon',  'D%tartrer la machine%',           12, false),
  -- salle à manger
  ('salle % manger', 'Mettre la table%',                 1, true),
  ('salle % manger', 'D%ba%petit dej%',                  2, true),
  ('salle % manger', 'Aspirateur : salle % manger',      3, false),
  -- chambre
  ('chambre',        'A%rer la chambre',                 1, true),
  ('chambre',        'Faire le lit%',                    2, true),
  ('chambre',        'Aspirateur : chambre',             3, false),
  ('chambre',        'Changer les draps',                4, false),
  -- salle de bain
  ('salle de bain',  'Nettoyer le lavabo%',              1, false),
  ('salle de bain',  'Nettoyer miroir%',                 2, false),
  ('salle de bain',  'Aspirateur : salle de bain',       3, false),
  ('salle de bain',  'Passer la serpill%re',             4, false),
  ('salle de bain',  'Nettoyer la vasque%',              5, false),
  ('salle de bain',  'Nettoyer le carrelage%',           6, false),
  ('salle de bain',  'Nettoyer le siphon%',              7, false),
  ('salle de bain',  'Nettoyer le drain%',               8, false),
  -- WC
  ('WC',             'Nettoyer WC%',                     1, false),
  ('WC',             'Aspirateur : toilettes',           2, false),
  ('WC',             'Passer la serpill%re WC',          3, false),
  ('WC',             'D%tartrer le BoQ',                 4, false),
  -- ménage
  ('m%nage',         'Aspirateur : entr%e',              1, false),
  ('m%nage',         'Vider l%aspirateur',               2, false),
  ('m%nage',         'Nettoyer l%aspirateur',            3, false),
  ('m%nage',         'Faire la poussi%re%',              4, false),
  ('m%nage',         'Nettoyer les vitres',              5, false),
  -- linge
  ('linge',          'Lessive%',                         1, false),
  ('linge',          '%tendre le linge%',                2, false),
  ('linge',          'Plier le linge%',                  3, false),
  -- déchets
  ('d%chets',        'Jeter la poubelle%',               1, true),
  ('d%chets',        'Vider le tri',                     2, true),
  -- plantes
  ('plantes',        'Arroser les plantes%',             1, false),
  ('plantes',        'Arroser les jasmins',              2, false),
  ('plantes',        'Rempoter%',                        3, false),
  -- courses
  ('courses',        'Petites courses%',                 1, true),
  ('courses',        'Grandes courses%',                 2, false)
)
update public.tasks t
set sort_order = o.rang * 10, everyday = o.quotidien
from ordre o
where t.group_name ilike o.groupe and t.name ilike o.motif;

-- Vérification : les tâches restées à leur ancien ordre (non reconnues) ont un sort_order
-- qui n'est pas un multiple de 10 compris entre 10 et 120 ; les ranger ensuite avec ↑ ↓.
select group_name, sort_order, everyday, name
from public.tasks
where active
order by group_name, sort_order, name;
