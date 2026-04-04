begin;
-- 051_schedule_media_retention_cleanup
-- Schedule nightly cleanup of expired media via pg_cron and pg_net.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace the existing schedule if it already exists.
do $block$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'cleanup-expired-media-nightly'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'cleanup-expired-media-nightly',
    '0 2 * * *',
    $schedule$
    select net.http_post(
      url := 'https://kydhktnavicrwsdeemzl.supabase.co/functions/v1/cleanup-expired-media',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
    $schedule$
  );
end $block$;

commit;
