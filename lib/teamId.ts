/**
 * Lee el TEAM_ID del entorno y falla rápido si no está configurado.
 *
 * Antes existía el patrón `if (TEAM_ID) query.eq('team_id', TEAM_ID)` repartido por todo
 * el código: si la env var faltaba, el filtro se omitía silenciosamente y la query
 * devolvía datos de todos los teams. Esta función centraliza la lectura y obliga a
 * configurar la variable.
 *
 * En navegador lee NEXT_PUBLIC_TEAM_ID (única opción disponible).
 * En server lee TEAM_ID y usa NEXT_PUBLIC_TEAM_ID como fallback (módulos compartidos).
 */
export function getRequiredTeamId(): string {
  const isServer = typeof window === 'undefined';
  const teamId = isServer
    ? process.env.TEAM_ID || process.env.NEXT_PUBLIC_TEAM_ID
    : process.env.NEXT_PUBLIC_TEAM_ID;

  if (!teamId) {
    throw new Error(
      isServer
        ? 'TEAM_ID env var is not configured. Set TEAM_ID (or NEXT_PUBLIC_TEAM_ID) on the server.'
        : 'NEXT_PUBLIC_TEAM_ID env var is not configured. Build will not filter by team.'
    );
  }
  return teamId;
}
