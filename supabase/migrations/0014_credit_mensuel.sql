-- =====================================================================
-- BBH VIE · crédit déduit du revenu, mois par mois
-- Chacun·e indique la part de son revenu du mois partie dans un crédit : la part du revenu
-- dépensée pour le foyer (stats) et le minimum perso se calculent sur le revenu moins le crédit.
-- Nouvelle colonne optionnelle seulement : rien ne change dans les règles existantes
-- (« revenus : modifier les miens » couvre déjà cette colonne).
-- =====================================================================

alter table public.monthly_incomes
  add column if not exists loan_cents integer check (loan_cents >= 0);

-- Vérification : doit renvoyer une ligne « loan_cents ».
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'monthly_incomes' and column_name = 'loan_cents';
