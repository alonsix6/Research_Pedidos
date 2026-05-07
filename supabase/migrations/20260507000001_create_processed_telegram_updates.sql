-- Idempotency table for the Telegram webhook.
-- When Telegram doesn't receive a 200 within 30s, it retries the same update.
-- Without dedup this can create duplicate /nuevopedido inserts. We persist
-- update_id (PK) so the second hit hits a unique-violation and short-circuits.
create table if not exists public.processed_telegram_updates (
  update_id bigint primary key,
  processed_at timestamptz not null default now()
);

create index if not exists idx_processed_telegram_updates_processed_at
  on public.processed_telegram_updates (processed_at);

alter table public.processed_telegram_updates enable row level security;
-- No policies on purpose: only service_role (which bypasses RLS) should touch
-- this table. Anon/authenticated clients have no business reading or writing it.

comment on table public.processed_telegram_updates is
  'Tracks Telegram update_ids already processed by the webhook. Prevents duplicate inserts on Telegram retries.';
