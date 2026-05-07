-- Defense-in-depth ante el hallazgo del security agent:
-- la policy `requests_update_anon` (F2.1-soft) sólo valida `team_id IS NOT NULL`,
-- no que `team_id` no cambie. Esto permitía que `anon` ejecutara
--   UPDATE requests SET team_id = '<otro-team>' WHERE id = X
-- y "robara" filas entre tenants. El frontend nunca hace eso, pero un atacante
-- con la anon key (pública por diseño) sí podía.
--
-- Solución: trigger BEFORE UPDATE OF team_id que rechaza cambios desde
-- roles que no sean service_role (postgres / supabase_admin / service_role).

create or replace function public.prevent_team_id_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.team_id is distinct from old.team_id then
    -- service_role bypass: necesario para migrations / ops.
    if (auth.role() in ('anon', 'authenticated')) then
      raise exception 'Cannot change team_id from role %', auth.role()
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Sólo `requests` tiene policy de UPDATE para anon (F2.1-soft cerró users,
-- teams, comments, activity_log). Si en el futuro se abren más, agregar
-- triggers análogos.
create trigger prevent_team_id_change_requests
  before update of team_id on public.requests
  for each row
  when (new.team_id is distinct from old.team_id)
  execute function public.prevent_team_id_change();
