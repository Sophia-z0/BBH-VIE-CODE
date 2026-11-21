-- =====================================================================
-- BBH VIE · courses reliées à leur dépense, et prêts 2bebz
-- 1. expenses.task_log_id : la dépense saisie juste après une tâche de courses garde le lien
--    vers ce log (colonne optionnelle ; si le log est supprimé, la dépense reste, sans lien).
-- 2. Nouvelle table loans : l'argent prêté ou remboursé entre les deux membres du foyer.
--    Règle : on inscrit l'argent qui sort de sa poche (from_user = la personne qui donne).
--    Une ligne par personne, par mois et par nature (prêt ou remboursement).
-- Rien ne change dans les tables et règles existantes (masquage jusqu'au reveal compris) :
-- la table loans a ses propres règles, ci-dessous (lecture par le foyer, écriture des siennes).
-- =====================================================================

-- 1. Lien dépense → log de courses ------------------------------------
alter table public.expenses
  add column if not exists task_log_id uuid references public.task_logs (id) on delete set null;
create index if not exists expenses_task_log_id on public.expenses (task_log_id) where task_log_id is not null;

-- 2. Prêts 2bebz -------------------------------------------------------
create table if not exists public.loans (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- La personne dont l'argent sort : prête, ou rembourse.
  from_user    uuid not null references public.profiles (id) on delete cascade,
  -- L'autre membre du foyer (rempli par la base).
  to_user      uuid not null references public.profiles (id) on delete cascade,
  -- Premier jour du mois concerné.
  month        date not null check (extract(day from month) = 1),
  kind         text not null check (kind in ('pret', 'remboursement')),
  amount_cents integer not null check (amount_cents > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (from_user, month, kind),
  check (from_user <> to_user)
);
create index if not exists loans_household_month on public.loans (household_id, month);

create or replace function public.prepare_loan()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Depuis l'app : toujours la personne connectée. Depuis le SQL Editor (reprise) : ce qui est indiqué.
  new.from_user    := coalesce(auth.uid(), new.from_user);
  new.household_id := (select household_id from public.profiles where id = new.from_user);
  new.to_user      := (select id from public.profiles where household_id = new.household_id and id <> new.from_user limit 1);
  new.updated_at   := now();
  if new.to_user is null then
    raise exception 'il faut deux personnes dans le foyer';
  end if;
  if new.month > date_trunc('month', now() at time zone 'Europe/Paris')::date then
    raise exception 'ce mois n''est pas encore commencé';
  end if;
  return new;
end;
$$;

drop trigger if exists loans_prepare on public.loans;
create trigger loans_prepare
before insert or update on public.loans
for each row execute function public.prepare_loan();

grant select, insert, update, delete on public.loans to authenticated;
alter table public.loans enable row level security;

-- Transparence : les deux voient tous les prêts et remboursements du foyer, tout de suite.
drop policy if exists "prêts : lecture du foyer" on public.loans;
create policy "prêts : lecture du foyer" on public.loans
  for select to authenticated
  using (household_id = public.my_household_id());

drop policy if exists "prêts : ajouter les miens" on public.loans;
create policy "prêts : ajouter les miens" on public.loans
  for insert to authenticated
  with check (from_user = auth.uid());

drop policy if exists "prêts : modifier les miens" on public.loans;
create policy "prêts : modifier les miens" on public.loans
  for update to authenticated
  using (from_user = auth.uid())
  with check (from_user = auth.uid());

drop policy if exists "prêts : supprimer les miens" on public.loans;
create policy "prêts : supprimer les miens" on public.loans
  for delete to authenticated
  using (from_user = auth.uid());

-- Vérification : doit renvoyer « task_log_id » puis les colonnes de loans.
select table_name, column_name from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'expenses' and column_name = 'task_log_id') or table_name = 'loans')
order by table_name, ordinal_position;
