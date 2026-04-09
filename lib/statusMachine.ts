import { RequestStatus } from './types';

// ============================================================
// Status Machine - Defines the order lifecycle workflow
// ============================================================

export interface StatusConfig {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: string; // Lucide icon name
  description: string;
  animate?: boolean;
}

/**
 * Valid status transitions map.
 * Each status maps to an array of statuses it can transition to.
 */
export const validTransitions: Record<RequestStatus, RequestStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['in_review', 'blocked', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  in_review: ['completed', 'needs_revision'],
  needs_revision: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: ['pending'],
};

/**
 * Configuration for each status - colors, labels, emojis.
 */
export const statusConfig: Record<RequestStatus, StatusConfig> = {
  pending: {
    label: 'Pendiente',
    emoji: '⏳',
    color: '#9E9E9E',
    bgColor: 'rgba(158, 158, 158, 0.15)',
    textColor: '#9E9E9E',
    icon: 'Clock',
    description: 'Pedido registrado, pendiente de inicio',
    animate: true,
  },
  in_progress: {
    label: 'En Progreso',
    emoji: '🔵',
    color: '#2196F3',
    bgColor: 'rgba(33, 150, 243, 0.15)',
    textColor: '#2196F3',
    icon: 'Play',
    description: 'Se está trabajando en este pedido',
  },
  in_review: {
    label: 'En Revisión',
    emoji: '🟣',
    color: '#9C27B0',
    bgColor: 'rgba(156, 39, 176, 0.15)',
    textColor: '#9C27B0',
    icon: 'Eye',
    description: 'Trabajo terminado, pendiente de aprobación',
  },
  blocked: {
    label: 'Bloqueado',
    emoji: '🔴',
    color: '#E53935',
    bgColor: 'rgba(229, 57, 53, 0.15)',
    textColor: '#E53935',
    icon: 'Pause',
    description: 'Bloqueado por factor externo',
    animate: true,
  },
  needs_revision: {
    label: 'Necesita Revisión',
    emoji: '🟠',
    color: '#FF9800',
    bgColor: 'rgba(255, 152, 0, 0.15)',
    textColor: '#FF9800',
    icon: 'RotateCcw',
    description: 'Requiere correcciones o cambios',
  },
  completed: {
    label: 'Completado',
    emoji: '✅',
    color: '#00C853',
    bgColor: 'rgba(0, 200, 83, 0.15)',
    textColor: '#00C853',
    icon: 'Check',
    description: 'Pedido entregado y finalizado',
  },
  cancelled: {
    label: 'Cancelado',
    emoji: '❌',
    color: '#616161',
    bgColor: 'rgba(97, 97, 97, 0.15)',
    textColor: '#616161',
    icon: 'X',
    description: 'Pedido cancelado',
  },
};

/**
 * Check if a status transition is valid.
 */
export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Get the valid next statuses for a given current status.
 */
export function getNextStatuses(current: RequestStatus): RequestStatus[] {
  return validTransitions[current] || [];
}

/**
 * Get the status config for a given status.
 */
export function getStatusConfig(status: RequestStatus): StatusConfig {
  return statusConfig[status] || statusConfig.pending;
}

/**
 * All statuses in workflow order (for Kanban columns).
 */
export const statusOrder: RequestStatus[] = [
  'pending',
  'in_progress',
  'in_review',
  'blocked',
  'needs_revision',
  'completed',
  'cancelled',
];

/**
 * Active statuses (not terminal) for Kanban display.
 */
export const kanbanStatuses: RequestStatus[] = [
  'pending',
  'in_progress',
  'in_review',
  'blocked',
  'needs_revision',
];

/**
 * Check if a status is terminal (no further transitions).
 */
export function isTerminalStatus(status: RequestStatus): boolean {
  return validTransitions[status]?.length === 0;
}

/**
 * Check if a status requires a blocked reason.
 */
export function requiresBlockedReason(status: RequestStatus): boolean {
  return status === 'blocked';
}
