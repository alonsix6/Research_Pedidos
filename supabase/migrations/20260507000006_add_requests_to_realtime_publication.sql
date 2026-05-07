-- public.requests no estaba en la publicación supabase_realtime, lo cual
-- significaba que el dashboard SE SUSCRIBÍA al canal pero nunca recibía
-- eventos cuando otro usuario tocaba un pedido. F4/F5 (memo, pulse, stale
-- notice, conflict detection) dependen de que estos eventos lleguen.
--
-- Sin esta migración, useRealtimeRequests.on('postgres_changes',
-- { table: 'requests' }, ...) suscribe pero nunca dispara el callback —
-- los pedidos solo se actualizan en pantalla con un refresh manual.
alter publication supabase_realtime add table public.requests;
