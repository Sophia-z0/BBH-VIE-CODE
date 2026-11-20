-- =====================================================================
-- BBH VIE · revenus mois par mois
-- Chacun·e saisit son revenu net de chaque mois. La part juste des dépenses se calcule sur
-- la moyenne des 6 derniers mois ; l'écart avec les revenus réels d'un trimestre est reporté
-- sur le trimestre suivant (calcul dans l'app).
-- Nouvelle table seulement : rien ne change dans les tables et règles existantes.
-- =====================================================================

create table if not exists public.monthly_incomes (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  -- Premier jour du mois concerné.
  month        date not null check (extract(day from month) = 1),
  amount_cents integer not null check (amount_cents >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, month)
);
create index if not exists monthly_incomes_household_month on public.monthly_incomes (household_id, month);

create or replace function public.prepare_monthly_income()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.user_id      := auth.uid();
  new.household_id := public.my_household_id();
  new.updated_at   := now();
  -- Mois passés ou mois en cours seulement.
  if new.month > date_trunc('month', now() at time zone 'Europe/Paris')::date then
    raise exception 'ce mois n''est pas encore commencé';
  end if;
  return new;
end;
$$;

drop trigger if exists monthly_incomes_prepare on public.monthly_incomes;
create trigger monthly_incomes_prepare
before insert or update on public.monthly_incomes
for each row execute function public.prepare_monthly_income();

grant select, insert, update on public.monthly_incomes to authenticated;
alter table public.monthly_incomes enable row level security;

-- Transparence : les deux voient les revenus du foyer (comme le revenu des réglages aujourd'hui).
drop policy if exists "revenus : lecture du foyer" on public.monthly_incomes;
create policy "revenus : lecture du foyer" on public.monthly_incomes
  for select to authenticated
  using (household_id = public.my_household_id());

drop policy if exists "revenus : ajouter les miens" on public.monthly_incomes;
create policy "revenus : ajouter les miens" on public.monthly_incomes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "revenus : modifier les miens" on public.monthly_incomes;
create policy "revenus : modifier les miens" on public.monthly_incomes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Vérification : doit renvoyer les 4 colonnes principales.
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'monthly_incomes'
order by ordinal_position;
