-- =====================================================================
-- BBH VIE · étape 2 : logs de tâches, masquage jusqu'au reveal du dimanche 18h
-- =====================================================================

-- ---------------------------------------------------------------------
-- Semaine de jeu : du dimanche 18h au dimanche 18h (heure de Paris)
-- ---------------------------------------------------------------------

-- Fin (exclue) de la semaine qui contient l'instant donné = moment du reveal.
create function public.week_end(instant timestamptz)
returns timestamptz
language plpgsql immutable
as $$
declare
  heure_paris timestamp := instant at time zone 'Europe/Paris';
  dimanche_18h timestamp :=
    (heure_paris::date + (7 - extract(isodow from heure_paris)::int)) + time '18:00';
begin
  if dimanche_18h <= heure_paris then
    dimanche_18h := dimanche_18h + interval '7 days';
  end if;
  return dimanche_18h at time zone 'Europe/Paris';
end;
$$;

-- Début (inclus) de la semaine qui contient l'instant donné.
create function public.week_start(instant timestamptz)
returns timestamptz
language sql immutable
as $$
  select ((public.week_end(instant) at time zone 'Europe/Paris') - interval '7 days') at time zone 'Europe/Paris'
$$;

-- ---------------------------------------------------------------------
-- Logs de tâches
-- ---------------------------------------------------------------------

create table public.task_logs (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  task_id      uuid not null references public.tasks (id) on delete restrict,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  done_at      timestamptz not null default now(),
  -- Tâche faite à deux : chaque personne reçoit la moitié des étoiles.
  shared       boolean not null default false,
  -- Étoiles de la tâche au moment du log : changer le barème ne réécrit pas l'historique.
  stars        smallint not null check (stars between 1 and 5),
  -- Moment où l'autre personne pourra voir ce log (fin de sa semaine de jeu).
  reveal_at    timestamptz not null,
  created_at   timestamptz not null default now()
);
create index on public.task_logs (household_id, done_at);

-- Remplit les champs calculés et refuse les logs hors de la semaine en cours.
create function public.prepare_task_log()
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

create trigger task_logs_prepare
before insert or update on public.task_logs
for each row execute function public.prepare_task_log();

grant select, insert, update, delete on public.task_logs to authenticated;
alter table public.task_logs enable row level security;

-- Je vois mes logs tout de suite, et ceux de l'autre une fois leur semaine révélée.
create policy "logs : lecture" on public.task_logs
  for select to authenticated
  using (household_id = public.my_household_id() and (user_id = auth.uid() or reveal_at <= now()));

create policy "logs : ajouter les miens" on public.task_logs
  for insert to authenticated
  with check (user_id = auth.uid());

-- Modifier ou supprimer un de mes logs, tant que sa semaine n'est pas révélée.
create policy "logs : modifier les miens" on public.task_logs
  for update to authenticated
  using (user_id = auth.uid() and reveal_at > now())
  with check (user_id = auth.uid());

create policy "logs : supprimer les miens" on public.task_logs
  for delete to authenticated
  using (user_id = auth.uid() and reveal_at > now());
