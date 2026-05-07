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

/**
 * Error específico para conflictos optimistas (otra escritura modificó la
 * fila entre el momento que leímos `updated_at` y el momento que intentamos
 * actualizarla). El llamador puede mostrar UI dedicada en lugar de tratarlo
 * como error genérico.
 */
export class ConflictError extends Error {
  readonly kind = 'conflict' as const;
  constructor(public readonly requestId: string) {
    super(`Conflict: request ${requestId} was modified by another user.`);
  }
}

/**
 * Update con detección de conflicto. Solo aplica el patch si el `updated_at`
 * actual de la fila coincide con `expectedUpdatedAt`. Si no coincide, lanza
 * `ConflictError` y no escribe nada.
 *
 * Implementación: agrega `.eq('updated_at', expectedUpdatedAt)` y pide al
 * servidor el row de vuelta. Si Postgres no devuelve fila, fue conflicto
 * (la fila existe pero su updated_at no matchea).
 */
export async function updateRequestWithConflictCheck(
  id: string,
  expectedUpdatedAt: string,
  patch: Partial<Request>
): Promise<Request> {
  const now = nowIso();
  const { data, error } = await supabase
    .from(REQUESTS)
    .update({ ...patch, updated_at: now })
    .eq('id', id)
    .eq('team_id', getRequiredTeamId())
    .eq('updated_at', expectedUpdatedAt)
    .select()
    .single();

  if (error) {
    // PGRST116 = "no rows" cuando .single() no encuentra fila. Es la señal
    // de conflicto (fila existe pero el updated_at no match).
    if ((error as { code?: string }).code === 'PGRST116') {
      throw new ConflictError(id);
    }
    throw error;
  }
  if (!data) throw new ConflictError(id);
  return data as Request;
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
