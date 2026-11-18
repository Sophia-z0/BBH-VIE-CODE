-- =====================================================================
-- BBH VIE · étape 3 : présence à la maison
-- Par défaut, chacun·e dort à la maison : on n'enregistre que les nuits d'absence.
-- La nuit du jour J va de J au soir à J+1 au matin.
-- =====================================================================

create table public.absences (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  night        date not null,
  -- Comme pour les logs : l'autre personne la voit au reveal de la semaine de cette nuit.
  reveal_at    timestamptz not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, night)
);
create index on public.absences (household_id, night);

-- Semaine de jeu d'une nuit : on prend 22h ce soir-là (le dimanche soir appartient à la semaine suivante).
create function public.night_week_end(n date)
returns timestamptz
language sql immutable
as $$
  select public.week_end((n + time '22:00') at time zone 'Europe/Paris')
$$;

create function public.prepare_absence()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.user_id      := auth.uid();
  new.household_id := public.my_household_id();
  new.reveal_at    := public.night_week_end(new.night);

  -- Semaine en cours ou à venir (on peut prévoir un déplacement), jamais une semaine révélée.
  if new.reveal_at <= now() then
    raise exception 'cette semaine est déjà révélée';
  end if;
  if new.night > current_date + 366 then
    raise exception 'trop loin dans le futur';
  end if;
  return new;
end;
$$;

create trigger absences_prepare
before insert on public.absences
for each row execute function public.prepare_absence();

grant select, insert, delete on public.absences to authenticated;
alter table public.absences enable row level security;

create policy "absences : lecture" on public.absences
  for select to authenticated
  using (household_id = public.my_household_id() and (user_id = auth.uid() or reveal_at <= now()));

create policy "absences : ajouter les miennes" on public.absences
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "absences : retirer les miennes" on public.absences
  for delete to authenticated
  using (user_id = auth.uid() and reveal_at > now());
