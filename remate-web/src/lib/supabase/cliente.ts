import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para el navegador.
 * Usa la clave publicable: los permisos reales los imponen las políticas por fila (RLS).
 * Las pujas, el cierre y la adjudicación NO se escriben desde aquí: los registra el servidor.
 */
export function crearClienteSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
