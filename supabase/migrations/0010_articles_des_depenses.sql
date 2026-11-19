-- =====================================================================
-- BBH VIE · articles d'une dépense (ticket de caisse lu en photo)
-- (peut être exécutée plusieurs fois sans risque)
-- =====================================================================

-- Articles retenus pour le foyer quand la dépense vient d'un ticket :
-- [{ "libelle": "Beurre doux 250 g", "montant_cents": 289 }, …]. Vide pour une dépense saisie à la main.
alter table public.expenses add column if not exists items jsonb;
