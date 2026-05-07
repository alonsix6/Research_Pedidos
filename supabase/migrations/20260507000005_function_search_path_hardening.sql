-- F2.1-soft step 3: cierra el advisor 0011 (function_search_path_mutable).
-- Una función sin search_path explícito puede ser secuestrada si un atacante
-- crea objetos en un schema con prioridad superior en search_path. Setearlo
-- en el momento de definición elimina la ambigüedad.
--
-- update_updated_at_column: solo usa NEW y NOW() (pg_catalog), no necesita
-- ningún schema en search_path.
alter function public.update_updated_at_column() set search_path = '';

-- get_active_requests_for_reminder: hace SELECT FROM requests / users sin
-- prefijo de schema. Necesita 'public' en search_path. (pg_catalog está
-- siempre implícito.)
alter function public.get_active_requests_for_reminder() set search_path = 'public';
