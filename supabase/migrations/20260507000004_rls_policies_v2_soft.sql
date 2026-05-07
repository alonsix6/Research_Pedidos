-- F2.1-soft step 2: rewrite de RLS.
-- Reemplaza 19 policies "USING (true)" / "WITH CHECK (true)" por policies
-- acotadas que al menos validan que team_id esté seteado. Sin auth real no
-- podemos enforcement entre teams (la anon key viaja al cliente y `team_id`
-- también vía NEXT_PUBLIC_TEAM_ID), pero sí podemos:
--   - Cerrar writes anon en tablas que el frontend no escribe (users, teams,
--     conversation_state). Solo service_role las toca de aquí en adelante.
--   - Mantener writes anon en requests/comments/activity_log con check
--     team_id NOT NULL.

-- ===== Drop policies anteriores =====
drop policy if exists "Enable insert for authenticated users on activity_log" on public.activity_log;
drop policy if exists "Enable read access for all users on activity_log"        on public.activity_log;
drop policy if exists "Team insert activity_log"                                on public.activity_log;
drop policy if exists "Team read activity_log"                                  on public.activity_log;

drop policy if exists "Allow all on comments" on public.comments;

drop policy if exists "Enable all operations on conversation_state" on public.conversation_state;
drop policy if exists "Team delete conversation_state"              on public.conversation_state;
drop policy if exists "Team insert conversation_state"              on public.conversation_state;
drop policy if exists "Team read conversation_state"                on public.conversation_state;
drop policy if exists "Team update conversation_state"              on public.conversation_state;

drop policy if exists "Enable all operations for authenticated users on requests" on public.requests;
drop policy if exists "Team delete requests"                                       on public.requests;
drop policy if exists "Team insert requests"                                       on public.requests;
drop policy if exists "Team read requests"                                         on public.requests;
drop policy if exists "Team update requests"                                       on public.requests;

drop policy if exists "Anyone can read teams" on public.teams;

drop policy if exists "Team insert users" on public.users;
drop policy if exists "Team read users"   on public.users;
drop policy if exists "Team update users" on public.users;

-- ===== Policies nuevas (F2.1-soft) =====

-- requests: full CRUD anon. Frontend hace insert/update/delete/select.
create policy requests_select_anon on public.requests
  for select to anon, authenticated using (team_id is not null);
create policy requests_insert_anon on public.requests
  for insert to anon, authenticated with check (team_id is not null);
create policy requests_update_anon on public.requests
  for update to anon, authenticated
  using (team_id is not null) with check (team_id is not null);
create policy requests_delete_anon on public.requests
  for delete to anon, authenticated using (team_id is not null);

-- comments: SELECT + INSERT (frontend no hace UPDATE/DELETE de comments).
create policy comments_select_anon on public.comments
  for select to anon, authenticated using (team_id is not null);
create policy comments_insert_anon on public.comments
  for insert to anon, authenticated with check (team_id is not null);

-- activity_log: SELECT + INSERT (no se actualiza/borra desde anon).
create policy activity_log_select_anon on public.activity_log
  for select to anon, authenticated using (team_id is not null);
create policy activity_log_insert_anon on public.activity_log
  for insert to anon, authenticated with check (team_id is not null);

-- users: solo SELECT para anon. Writes ahora requieren service_role
-- (creación de usuarios pasa por el bot de Telegram con service_role).
create policy users_select_anon on public.users
  for select to anon, authenticated using (team_id is not null);

-- teams: solo SELECT para anon. Writes ahora requieren service_role.
create policy teams_select_anon on public.teams
  for select to anon, authenticated using (true);

-- conversation_state: ninguna policy intencionalmente.
-- RLS está enabled => anon implícitamente denegado. Solo el webhook
-- (service_role) accede a esta tabla.
