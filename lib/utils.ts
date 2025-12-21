import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { es } from 'date-fns/locale';

// Timezone de Lima, Perú
export const LIMA_TIMEZONE = 'America/Lima';

/**
 * Convierte una fecha UTC a hora de Lima
 */
export function toLimaTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return utcToZonedTime(dateObj, LIMA_TIMEZONE);
}

/**
 * Convierte una fecha de Lima a UTC
 */
export function fromLimaTime(date: Date): Date {
  return zonedTimeToUtc(date, LIMA_TIMEZONE);
}

/**
 * Formatea una fecha para mostrar en Lima timezone
 */
export function formatLimaDate(date: Date | string, formatStr: string = 'dd/MM/yyyy'): string {
  const limaDate = toLimaTime(date);
  return format(limaDate, formatStr, { locale: es });
}

/**
 * Formatea una fecha para mostrar con hora
 */
export function formatLimaDateTime(date: Date | string): string {
  return formatLimaDate(date, 'dd/MM/yyyy HH:mm');
}

/**
 * Parsea fechas naturales en español: "25/12", "en 3 días", "mañana", etc.
 */
export function parseNaturalDate(input: string): Date | null {
  const now = new Date();
  const lowercaseInput = input.toLowerCase().trim();

  // Formato DD/MM o DD/MM/YYYY
  const datePattern = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/;
  const match = lowercaseInput.match(datePattern);

  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1; // JS months are 0-indexed
    const year = match[3] ? parseInt(match[3]) : now.getFullYear();

    return new Date(year, month, day);
  }

  // "hoy"
  if (lowercaseInput === 'hoy') {
    return now;
  }

  // "mañana"
  if (lowercaseInput === 'mañana' || lowercaseInput === 'manana') {
    return addDays(now, 1);
  }

  // "en X días" o "en X dias"
  const daysPattern = /^en\s+(\d+)\s+d[ií]as?$/;
  const daysMatch = lowercaseInput.match(daysPattern);
  if (daysMatch) {
    return addDays(now, parseInt(daysMatch[1]));
  }

  return null;
}

/**
 * Calcula la prioridad según días restantes
 */
export function calculatePriority(deadline: string): 'urgent' | 'high' | 'normal' | 'low' {
  const daysLeft = differenceInDays(parseISO(deadline), new Date());

  if (daysLeft < 0) return 'urgent'; // Ya venció
  if (daysLeft === 0) return 'urgent'; // Vence hoy
  if (daysLeft === 1) return 'high'; // Vence mañana
  if (daysLeft <= 3) return 'high'; // Vence en 2-3 días
  if (daysLeft <= 7) return 'normal'; // Esta semana
  return 'low'; // Más de una semana
}

/**
 * Obtiene emoji según prioridad
 */
export function getPriorityEmoji(priority: string): string {
  switch (priority) {
    case 'urgent': return '🔴';
    case 'high': return '🟡';
    case 'normal': return '🟢';
    case 'low': return '⚪';
    default: return '⚪';
  }
}

/**
 * Obtiene emoji según status
 */
export function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pending': return '⏳';
    case 'in_progress': return '🔄';
    case 'completed': return '✅';
    case 'cancelled': return '❌';
    default: return '❓';
  }
}

/**
 * Formatea días restantes para mostrar
 */
export function formatDaysLeft(deadline: string): string {
  const daysLeft = differenceInDays(parseISO(deadline), new Date());

  if (daysLeft < 0) return `Atrasado ${Math.abs(daysLeft)} día(s)`;
  if (daysLeft === 0) return 'Vence HOY';
  if (daysLeft === 1) return 'Vence mañana';
  return `${daysLeft} días restantes`;
}

/**
 * Clasifica requests por urgencia
 */
export function classifyByUrgency(requests: any[]) {
  const now = new Date();

  return {
    urgent: requests.filter(r => {
      const daysLeft = differenceInDays(parseISO(r.deadline), now);
      return daysLeft <= 0 || r.priority === 'urgent';
    }),
    thisWeek: requests.filter(r => {
      const daysLeft = differenceInDays(parseISO(r.deadline), now);
      return daysLeft > 0 && daysLeft <= 7;
    }),
    later: requests.filter(r => {
      const daysLeft = differenceInDays(parseISO(r.deadline), now);
      return daysLeft > 7;
    })
  };
}
