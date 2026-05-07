import { supabase } from './supabase';
import { getRequiredTeamId } from './teamId';

export type ActivityAction =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'deadline_changed'
  | 'edited'
  | 'commented'
  | 'completed'
  | 'cancelled'
  | 'reopened'
  | 'blocked'
  | 'unblocked';

export interface ActivityDetails {
  from_status?: string;
  to_status?: string;
  blocked_reason?: string;
  old_deadline?: string;
  new_deadline?: string;
  old_assigned?: string;
  new_assigned?: string;
  comment?: string;
  field_changes?: Record<string, { old: string; new: string }>;
  [key: string]: unknown;
}

/**
 * Log an activity for a request.
 * This writes to the existing `activity_log` table.
 */
export async function logActivity(
  requestId: string,
  userId: string | null,
  action: ActivityAction,
  details: ActivityDetails = {}
): Promise<void> {
  try {
    const { error } = await supabase.from('activity_log').insert({
      request_id: requestId,
      user_id: userId,
      action,
      details,
      team_id: getRequiredTeamId(),
    });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

/**
 * Get activity history for a specific request.
 */
export async function getActivityLog(requestId: string) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('request_id', requestId)
    .eq('team_id', getRequiredTeamId())
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching activity log:', error);
    return [];
  }

  return data || [];
}

/**
 * Get human-readable description for an activity action.
 */
export function getActivityDescription(action: ActivityAction, details: ActivityDetails): string {
  switch (action) {
    case 'created':
      return 'Pedido creado';
    case 'status_changed':
      return `Estado cambiado de ${getStatusLabel(details.from_status)} a ${getStatusLabel(details.to_status)}`;
    case 'assigned':
      return details.new_assigned ? `Asignado a ${details.new_assigned}` : 'Asignación removida';
    case 'deadline_changed':
      return `Fecha de entrega cambiada`;
    case 'edited':
      return 'Pedido editado';
    case 'commented':
      return 'Comentario agregado';
    case 'completed':
      return 'Pedido completado';
    case 'cancelled':
      return 'Pedido cancelado';
    case 'reopened':
      return 'Pedido reabierto';
    case 'blocked':
      return details.blocked_reason ? `Bloqueado: ${details.blocked_reason}` : 'Pedido bloqueado';
    case 'unblocked':
      return 'Pedido desbloqueado';
    default:
      return action;
  }
}

function getStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    in_review: 'En Revisión',
    blocked: 'Bloqueado',
    needs_revision: 'Necesita Revisión',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  return status ? labels[status] || status : 'desconocido';
}
