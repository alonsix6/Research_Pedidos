/**
 * Validación de variables de entorno
 * Se ejecuta al cargar el módulo para detectar problemas temprano
 */

// Variables requeridas para el cliente (browser)
const CLIENT_REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_TEAM_ID',
] as const;

// Variables requeridas solo para el servidor
const SERVER_REQUIRED_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'TELEGRAM_WEBHOOK_SECRET',
  'TEAM_ID',
] as const;

interface ValidationResult {
  isValid: boolean;
  missingVars: string[];
  warnings: string[];
}

/**
 * Valida que las variables de entorno requeridas estén configuradas
 * @param isServer - Si está corriendo en el servidor (no en browser)
 * @returns Resultado de la validación
 */
export function validateEnvironment(
  isServer: boolean = typeof window === 'undefined'
): ValidationResult {
  const missingVars: string[] = [];
  const warnings: string[] = [];

  // Validar variables del cliente (siempre)
  for (const varName of CLIENT_REQUIRED_VARS) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  // Validar variables del servidor (solo en server)
  if (isServer) {
    for (const varName of SERVER_REQUIRED_VARS) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }
  }

  // Advertencias específicas
  if (isServer && !process.env.TELEGRAM_WEBHOOK_SECRET) {
    warnings.push('TELEGRAM_WEBHOOK_SECRET no está configurado. Los webhooks serán rechazados.');
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
    warnings,
  };
}

/**
 * Valida las variables de entorno y lanza error si faltan variables críticas
 * @throws Error si faltan variables requeridas
 */
export function assertEnvironment(): void {
  const result = validateEnvironment();

  if (!result.isValid) {
    const errorMessage = `Missing required environment variables: ${result.missingVars.join(', ')}`;
    console.error(`[ENV VALIDATION ERROR] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  // Mostrar warnings
  for (const warning of result.warnings) {
    console.warn(`[ENV VALIDATION WARNING] ${warning}`);
  }
}
