/**
 * Capa de servicio sobre la tabla `requests`.
 *
 * Centraliza las operaciones que el frontend realiza con la anon key, todas
 * con el filtro `team_id` enforced por la RLS de F2.1-soft. Mover la lógica
 * fuera de los componentes facilita:
 *  - Migrar a endpoints server-side (F2.1-strict) cambiando solo este archivo.
 *  - Tests unitarios en una sola superficie.
 *  - Idioma uniforme: cada componente llama a un verbo claro
 *    (completeRequest, deleteRequest, ...) en vez de armar la query a mano.
 */

import { supabase } from '@/lib/supabase';
import { getRequiredTeamId } from '@/lib/teamId';
import { logActivity } from '@/lib/activityLog';
import type { Request, RequestStatus } from '@/lib/types';

const REQUESTS = 'requests' as const;

function nowIso(): string {
  return new Date().toISOString();
}

export async function completeRequest(id: string, fromStatus: RequestStatus): Promise<void> {
  const now = nowIso();
  const { error } = await supabase
    .from(REQUESTS)
    .update({
      status: 'completed',
      completed_at: now,
      updated_at: now,
      status_changed_at: now,
    })
    .eq('id', id)
    .eq('team_id', getRequiredTeamId());

  if (error) throw error;

  await logActivity(id, null, 'completed', {
    from_status: fromStatus,
    to_status: 'completed',
  });
}

export async function deleteRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from(REQUESTS)
    .delete()
    .eq('id', id)
    .eq('team_id', getRequiredTeamId());

  if (error) throw error;
}

export async function updateRequestStatus(
  id: string,
  newStatus: RequestStatus,
  patch: Partial<Pick<Request, 'completed_at' | 'blocked_at' | 'blocked_reason' | 'deadline'>> = {}
): Promise<void> {
  const now = nowIso();
  const { error } = await supabase
    .from(REQUESTS)
    .update({
      ...patch,
      status: newStatus,
      updated_at: now,
      status_changed_at: now,
    })
    .eq('id', id)
    .eq('team_id', getRequiredTeamId());

  if (error) throw error;
}
