-- F2.1-soft step 1: data + columnas
-- (1) Backfill de los 20 requests con team_id NULL al team original 'the-lab'.
-- Decisión registrada: la mayoría son anteriores a la introducción de multi-team
-- (creados entre 2026-03-23 y 2026-04-09). El usuario optó por consolidar todos
-- al team original.
update public.requests
   set team_id = 'b600dab1-ce1d-4cb2-8d7f-535a4da92351'  -- the-lab
 where team_id is null;

-- (2) NOT NULL en team_id de las 4 tablas que aún lo permitían NULL.
-- comments.team_id ya era NOT NULL.
alter table public.requests           alter column team_id set not null;
alter table public.users              alter column team_id set not null;
alter table public.activity_log       alter column team_id set not null;
alter table public.conversation_state alter column team_id set not null;

-- (3) activity_log.details: text -> jsonb. Las 279 filas existentes contienen
-- JSON válido (verificado con regex previo a la migración). El código TS ya
-- inyectaba objetos JS que Supabase serializaba; ahora la columna respeta el
-- contrato semántico del código.
alter table public.activity_log
  alter column details type jsonb using details::jsonb;
