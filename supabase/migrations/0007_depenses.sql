-- =====================================================================
-- BBH VIE · étape 4 : dépenses 💖, cadeaux 🎁 et dépenses récurrentes
-- Montants en centimes. Même masquage que les tâches : l'autre voit au reveal.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Dépenses récurrentes (modèles : abonnements, charges…)
-- ---------------------------------------------------------------------

create table public.recurring_expenses (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households (id) on delete cascade,
  -- Personne qui paie.
  user_id           uuid not null references public.profiles (id) on delete cascade,
  category_id       uuid not null references public.expense_categories (id) on delete restrict,
  amount_cents      integer not null check (amount_cents > 0),
  tag               text,
  frequency         text not null default 'mensuel' check (frequency in ('mensuel', 'annuel')),
  day_of_month      smallint not null check (day_of_month between 1 and 28),
  -- Pour une dépense annuelle seulement.
  month_of_year     smallint check (month_of_year between 1 and 12),
  active            boolean not null default true,
  -- Dernier jour (heure de Paris) jusqu'auquel les dépenses ont été créées.
  last_generated_on date not null default (now() at time zone 'Europe/Paris')::date,
  created_at        timestamptz not null default now(),
  check (frequency = 'mensuel' or month_of_year is not null)
);
create index on public.recurring_expenses (household_id);

-- ---------------------------------------------------------------------
-- Dépenses
-- ---------------------------------------------------------------------

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  category_id  uuid not null references public.expense_categories (id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  -- Produit ou étiquette libre (« papier toilette », « chantilly ») pour les stats d'habitudes.
  tag          text,
  note         text,
  spent_at     timestamptz not null default now(),
  recurring_id uuid references public.recurring_expenses (id) on delete set null,
  reveal_at    timestamptz not null,
  created_at   timestamptz not null default now()
);
create index on public.expenses (household_id, spent_at);
-- Une seule dépense par échéance d'un modèle récurrent.
create unique index on public.expenses (recurring_id, spent_at) where recurring_id is not null;

-- ---------------------------------------------------------------------
-- Cadeaux : services non chiffrés (panier de légumes offert…), comptés à part
-- ---------------------------------------------------------------------

create table public.gifts (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  description     text not null check (char_length(description) between 1 and 80),
  estimated_cents integer not null check (estimated_cents > 0),
  given_at        timestamptz not null default now(),
  reveal_at       timestamptz not null,
  created_at      timestamptz not null default now()
);
create index on public.gifts (household_id, given_at);

-- ---------------------------------------------------------------------
-- Remplissage automatique et garde-fous
-- ---------------------------------------------------------------------

create function public.normalize_tag(t text)
returns text
language sql immutable
as $$
  select nullif(lower(trim(t)), '')
$$;

create function public.prepare_expense()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Les dépenses créées par generate_recurring_expenses() gardent la personne qui paie.
  if coalesce(current_setting('bbh.generation', true), '') <> 'on' then
    new.user_id      := auth.uid();
    new.household_id := public.my_household_id();
    new.recurring_id := null;
    if new.spent_at < public.week_start(now()) or new.spent_at > now() + interval '5 minutes' then
      raise exception 'on ne peut loguer que dans la semaine en cours';
    end if;
  end if;

  if not exists (select 1 from public.expense_categories where id = new.category_id and household_id = new.household_id) then
    raise exception 'catégorie inconnue';
  end if;

  new.tag       := public.normalize_tag(new.tag);
  new.reveal_at := public.week_end(new.spent_at);
  return new;
end;
$$;

create trigger expenses_prepare
before insert or update on public.expenses
for each row execute function public.prepare_expense();

create function public.prepare_gift()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.user_id      := auth.uid();
  new.household_id := public.my_household_id();
  if new.given_at < public.week_start(now()) or new.given_at > now() + interval '5 minutes' then
    raise exception 'on ne peut loguer que dans la semaine en cours';
  end if;
  new.reveal_at := public.week_end(new.given_at);
  return new;
end;
$$;

create trigger gifts_prepare
before insert or update on public.gifts
for each row execute function public.prepare_gift();

create function public.prepare_recurring_expense()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id      := auth.uid();
    new.household_id := public.my_household_id();
  else
    -- La personne qui paie ne change pas (y compris lors de la génération automatique).
    new.user_id      := old.user_id;
    new.household_id := old.household_id;
  end if;
  new.tag := public.normalize_tag(new.tag);
  if not exists (select 1 from public.expense_categories where id = new.category_id and household_id = new.household_id) then
    raise exception 'catégorie inconnue';
  end if;
  return new;
end;
$$;

create trigger recurring_expenses_prepare
before insert or update on public.recurring_expenses
for each row execute function public.prepare_recurring_expense();

-- ---------------------------------------------------------------------
-- Création des dépenses récurrentes échues (appelée par l'app à l'ouverture)
-- ---------------------------------------------------------------------

create function public.generate_recurring_expenses()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  aujourdhui date := (now() at time zone 'Europe/Paris')::date;
  modele     public.recurring_expenses;
  creees     integer := 0;
  n          integer;
begin
  perform set_config('bbh.generation', 'on', true);

  for modele in
    select * from public.recurring_expenses
    where household_id = public.my_household_id() and active and last_generated_on < aujourdhui
    for update
  loop
    insert into public.expenses (household_id, user_id, category_id, amount_cents, tag, spent_at, recurring_id)
    select modele.household_id, modele.user_id, modele.category_id, modele.amount_cents, modele.tag,
           (jour + time '12:00') at time zone 'Europe/Paris', modele.id
    from generate_series(modele.last_generated_on + 1, aujourdhui, interval '1 day') as g (jour)
    where extract(day from jour) = modele.day_of_month
      and (modele.frequency = 'mensuel' or extract(month from jour) = modele.month_of_year)
    on conflict do nothing;
    get diagnostics n = row_count;
    creees := creees + n;

    update public.recurring_expenses set last_generated_on = aujourdhui where id = modele.id;
  end loop;

  perform set_config('bbh.generation', '', true);
  return creees;
end;
$$;

revoke execute on function public.generate_recurring_expenses() from public, anon;
grant execute on function public.generate_recurring_expenses() to authenticated;

-- ---------------------------------------------------------------------
-- Sécurité
-- ---------------------------------------------------------------------

grant select, insert, update, delete on public.expenses           to authenticated;
grant select, insert, update, delete on public.gifts              to authenticated;
grant select, insert, update, delete on public.recurring_expenses to authenticated;

alter table public.expenses           enable row level security;
alter table public.gifts              enable row level security;
alter table public.recurring_expenses enable row level security;

create policy "dépenses : lecture" on public.expenses
  for select to authenticated
  using (household_id = public.my_household_id() and (user_id = auth.uid() or reveal_at <= now()));
create policy "dépenses : ajouter les miennes" on public.expenses
  for insert to authenticated with check (user_id = auth.uid());
create policy "dépenses : modifier les miennes" on public.expenses
  for update to authenticated using (user_id = auth.uid() and reveal_at > now()) with check (user_id = auth.uid());
create policy "dépenses : supprimer les miennes" on public.expenses
  for delete to authenticated using (user_id = auth.uid() and reveal_at > now());

create policy "cadeaux : lecture" on public.gifts
  for select to authenticated
  using (household_id = public.my_household_id() and (user_id = auth.uid() or reveal_at <= now()));
create policy "cadeaux : ajouter les miens" on public.gifts
  for insert to authenticated with check (user_id = auth.uid());
create policy "cadeaux : modifier les miens" on public.gifts
  for update to authenticated using (user_id = auth.uid() and reveal_at > now()) with check (user_id = auth.uid());
create policy "cadeaux : supprimer les miens" on public.gifts
  for delete to authenticated using (user_id = auth.uid() and reveal_at > now());

-- Les modèles récurrents sont visibles par les deux ; chacun·e gère les siens.
create policy "récurrentes : lecture" on public.recurring_expenses
  for select to authenticated using (household_id = public.my_household_id());
create policy "récurrentes : ajouter les miennes" on public.recurring_expenses
  for insert to authenticated with check (user_id = auth.uid());
create policy "récurrentes : modifier les miennes" on public.recurring_expenses
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "récurrentes : supprimer les miennes" on public.recurring_expenses
  for delete to authenticated using (user_id = auth.uid());
