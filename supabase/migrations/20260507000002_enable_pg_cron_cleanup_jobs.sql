-- Replaces the probabilistic in-webhook cleanup (Math.random() < 0.01) with
-- proper scheduled jobs. The previous approach left conversation_state rows
-- to accumulate when the dice didn't land, especially under low traffic.
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-expired-conversations') then
    perform cron.unschedule('cleanup-expired-conversations');
  end if;
  if exists (select 1 from cron.job where jobname = 'cleanup-processed-telegram-updates') then
    perform cron.unschedule('cleanup-processed-telegram-updates');
  end if;
end $$;

-- Every 5 minutes: drop conversation_state entries older than 30 minutes
select cron.schedule(
  'cleanup-expired-conversations',
  '*/5 * * * *',
  $$ delete from public.conversation_state where updated_at < now() - interval '30 minutes' $$
);

-- Hourly: drop processed_telegram_updates older than 24h
-- (Telegram won't retry an update older than that; longer retention is wasted space.)
select cron.schedule(
  'cleanup-processed-telegram-updates',
  '0 * * * *',
  $$ delete from public.processed_telegram_updates where processed_at < now() - interval '24 hours' $$
);
