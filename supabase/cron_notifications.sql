-- =====================================================================
-- BBH VIE · planification des notifications (à exécuter APRÈS avoir créé
-- la fonction « notifier »). Remplacer <REF_PROJET> et <CRON_SECRET>.
-- Appelle la fonction tous les quarts d'heure ; elle décide quoi envoyer.
-- Peut être exécuté plusieurs fois (remplace la planification existante).
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('bbh-notifier') where exists (select 1 from cron.job where jobname = 'bbh-notifier');

select cron.schedule(
  'bbh-notifier',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://<REF_PROJET>.supabase.co/functions/v1/notifier',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body    := '{}'::jsonb
  );
  $$
);
