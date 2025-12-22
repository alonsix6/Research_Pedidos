import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateEnvironment } from './validateEnv';

// Variables lazy-initialized
let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

// Helper para verificar si estamos en el servidor
export const isServer = typeof window === 'undefined';

// Validar variables de entorno al cargar el módulo (solo warnings)
const envValidation = validateEnvironment(isServer);
if (!envValidation.isValid && isServer) {
  console.error(`[Supabase] Missing env vars: ${envValidation.missingVars.join(', ')}`);
}
envValidation.warnings.forEach(w => console.warn(`[Supabase] ${w}`));

/**
 * Cliente para el frontend (usa la anon key)
 * Se inicializa solo cuando se usa (lazy initialization)
 */
export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
};

/**
 * Cliente para el backend/serverless functions (usa la service role key)
 * Se inicializa solo cuando se usa (lazy initialization)
 */
export const getSupabaseAdmin = (): SupabaseClient => {
  if (!supabaseAdminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase Admin environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    supabaseAdminInstance = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdminInstance;
};

// Helper para obtener el cliente apropiado según el contexto
export const getSupabaseClient = () => {
  return isServer && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? getSupabaseAdmin()
    : getSupabase();
};

// Export con getter para compatibilidad (lazy initialization)
// Esto permite que el código existente que usa `supabase` siga funcionando
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    const client = getSupabase();
    return client[prop as keyof SupabaseClient];
  }
});
