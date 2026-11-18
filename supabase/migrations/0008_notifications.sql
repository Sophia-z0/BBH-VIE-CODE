-- =====================================================================
-- BBH VIE · étape 7 : notifications push
-- =====================================================================

-- ---------------------------------------------------------------------
-- Préférences de chacun·e (champs ajoutés au profil)
-- ---------------------------------------------------------------------

alter table public.profiles
  add column notif_daily      boolean not null default true,
  -- Heure du rappel quotidien (heure de Paris), par quart d'heure.
  add column notif_daily_time time    not null default '20:00'
    check (extract(minute from notif_daily_time)::int % 15 = 0),
  -- Dimanche 12h (« pense à loguer ») et 18h (résultats).
  add column notif_sunday     boolean not null default true;

-- ---------------------------------------------------------------------
-- Abonnements push (un par appareil)
-- ---------------------------------------------------------------------

create table public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

grant select, delete on public.push_subscriptions to authenticated;
alter table public.push_subscriptions enable row level security;

create policy "abonnements : les miens" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "abonnements : retirer les miens" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- Enregistre l'appareil pour la personne connectée (un appareil passé d'un compte à l'autre change de main).
create function public.save_push_subscription(sub_endpoint text, sub_p256dh text, sub_auth text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.my_household_id() is null then raise exception 'non connecté·e'; end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (sub_endpoint, auth.uid(), sub_p256dh, sub_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Gagnant·es d'une semaine, pour la notification du dimanche 18h
-- Même règle que l'app : étoiles par nuit à la maison, égalité à 5 % près.
-- ---------------------------------------------------------------------

create function public.weekly_winners(hid uuid, fin timestamptz)
returns text[]
language sql stable security definer set search_path = public
as $$
  with semaine as (
    select fin - interval '7 days' as debut, fin
  ),
  nuits as (
    select (debut at time zone 'Europe/Paris')::date + i as nuit from semaine, generate_series(0, 6) as i
  ),
  scores as (
    select
      p.display_name,
      coalesce((
        select sum(case when l.user_id = p.id then (case when l.shared then l.stars / 2.0 else l.stars end)
                        when l.shared then l.stars / 2.0 else 0 end)
        from public.task_logs l, semaine s
        where l.household_id = hid and l.done_at >= s.debut and l.done_at < s.fin
      ), 0) as etoiles,
      (select count(*) from nuits n
       where not exists (select 1 from public.absences a where a.user_id = p.id and a.night = n.nuit)) as nuits
    from public.profiles p
    where p.household_id = hid
  ),
  par_nuit as (
    select display_name, case when nuits > 0 then etoiles / nuits else 0 end as score from scores
  )
  select coalesce(array_agg(display_name order by display_name), '{}')
  from par_nuit
  where score > 0 and score >= 0.95 * (select max(score) from par_nuit)
$$;

revoke execute on function public.weekly_winners(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.weekly_winners(uuid, timestamptz) to service_role;

-- ---------------------------------------------------------------------
-- Lecture pour la fonction serveur « notifier » (clé service_role, jamais dans l'app)
-- ---------------------------------------------------------------------

grant select         on public.profiles           to service_role;
grant select         on public.task_logs          to service_role;
grant select         on public.expenses           to service_role;
grant select, delete on public.push_subscriptions to service_role;
