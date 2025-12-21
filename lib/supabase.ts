import { createClient } from '@supabase/supabase-js';

// Cliente para el frontend (usa la anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Cliente para el backend/serverless functions (usa la service role key)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper para verificar si estamos en el servidor
export const isServer = typeof window === 'undefined';

// Cliente apropiado según el contexto
export const getSupabaseClient = () => {
  return isServer && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? supabaseAdmin
    : supabase;
};
