/**
 * Helpers de fecha en zona horaria de Lima para los cron scripts.
 *
 * Antes los scripts usaban `new Date()` (UTC) y `differenceInDays` directamente, lo
 * cual generaba off-by-one entre las 19:00 y 23:59 hora Lima (porque UTC ya pasó al
 * día siguiente). Estas helpers fuerzan a que los cálculos calendáricos se hagan
 * en tiempo Lima.
 */
const { differenceInDays, parseISO } = require('date-fns');
const { formatInTimeZone } = require('date-fns-tz');

const LIMA_TIMEZONE = 'America/Lima';

/**
 * Devuelve la fecha "hoy" en Lima como Date a medianoche UTC del día Lima.
 * Útil como pivote para differenceInDays con otras fechas calendáricas.
 */
function todayLima() {
  const todayStr = formatInTimeZone(new Date(), LIMA_TIMEZONE, 'yyyy-MM-dd');
  return parseISO(todayStr);
}

/**
 * Días entre `dateInput` (deadline) y "hoy" en Lima.
 * Acepta 'YYYY-MM-DD' (date column de Postgres) o ISO timestamp.
 * Retorna positivo si la fecha es futura, negativo si pasada, 0 si hoy.
 */
function daysUntilLimaDate(dateInput) {
  if (!dateInput) return 0;
  // Si es solo fecha YYYY-MM-DD, parseISO la interpreta como UTC midnight, lo
  // cual es justo lo que queremos (calendar date sin TZ).
  // Si es timestamp completo, lo proyectamos al calendario Lima primero.
  const isDateOnly = typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput);
  const target = isDateOnly
    ? parseISO(dateInput)
    : parseISO(formatInTimeZone(parseISO(dateInput), LIMA_TIMEZONE, 'yyyy-MM-dd'));
  return differenceInDays(target, todayLima());
}

/**
 * Días desde `timestampStr` hasta "hoy" en Lima (sentido inverso a daysUntilLimaDate).
 * Útil para "días desde el último cambio" / "días bloqueado".
 */
function daysSinceLimaTimestamp(timestampStr) {
  if (!timestampStr) return 0;
  const tsLimaDate = parseISO(
    formatInTimeZone(parseISO(timestampStr), LIMA_TIMEZONE, 'yyyy-MM-dd')
  );
  return differenceInDays(todayLima(), tsLimaDate);
}

module.exports = {
  LIMA_TIMEZONE,
  todayLima,
  daysUntilLimaDate,
  daysSinceLimaTimestamp,
};
