"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { crearClienteSupabase } from "@/lib/supabase/cliente";

export type Rol = "comprador" | "vendedor" | "administrador";

export interface Sesion {
  usuarioId: string;
  correo: string | null;
  nombre: string;
  rol: Rol;
  /** false si un administrador suspendió la cuenta. */
  activo: boolean;
  tienda: { id: string; nombre: string; usuario_tiktok: string | null; ciudad: string; activa: boolean } | null;
}

/** Páginas que se pueden abrir sin sesión. Todo lo demás lleva primero al login. */
const RUTAS_PUBLICAS = ["/ingresar", "/confirmado"];

/** Lee la cuenta, su perfil y su tienda. Las políticas por fila (RLS) deciden qué devuelve la base. */
async function leerSesion(supabase: SupabaseClient): Promise<Sesion | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const [{ data: perfil }, { data: tienda }] = await Promise.all([
    supabase.from("perfiles").select("nombre_visible, rol, activo").eq("id", data.user.id).maybeSingle(),
    supabase.from("tiendas").select("id, nombre, usuario_tiktok, ciudad, activa").eq("vendedor_id", data.user.id).maybeSingle(),
  ]);
  return {
    usuarioId: data.user.id,
    correo: data.user.email ?? null,
    nombre: perfil?.nombre_visible ?? "",
    rol: (perfil?.rol as Rol) ?? "comprador",
    activo: perfil?.activo ?? true,
    tienda: tienda ?? null,
  };
}

interface Contexto {
  supabase: SupabaseClient;
  sesion: Sesion | null;
  cargando: boolean;
  /** Vuelve a leer la sesión (después de ingresar, salir o registrar una tienda). */
  recargar: () => Promise<void>;
}

const ContextoSesion = createContext<Contexto | null>(null);

export function Cargando() {
  return (
    <main className="contenedor">
      <p className="texto-tenue" role="status" style={{ padding: "64px 0" }}>Cargando…</p>
    </main>
  );
}

/**
 * Mantiene la sesión de Supabase en el navegador y envía al login a quien no la inició,
 * conservando la página a la que quería ir. La app no tiene servidor propio: se publica como sitio estático.
 */
export function ProveedorSesion({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(crearClienteSupabase);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();
  const ruta = (usePathname() || "/").replace(/(.)\/$/, "$1");
  const publica = RUTAS_PUBLICAS.some((r) => ruta === r || ruta.startsWith(`${r}/`));

  const recargar = useCallback(async () => {
    try {
      setSesion(await leerSesion(supabase));
    } finally {
      setCargando(false);
    }
  }, [supabase]);

  useEffect(() => {
    void recargar();
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT" || evento === "USER_UPDATED") void recargar();
    });
    return () => data.subscription.unsubscribe();
  }, [supabase, recargar]);

  useEffect(() => {
    if (cargando || sesion || publica) return;
    const volver = ruta === "/" ? "" : `?volver=${encodeURIComponent(ruta + window.location.search)}`;
    router.replace(`/ingresar${volver}`);
  }, [cargando, sesion, publica, ruta, router]);

  const valor = useMemo(() => ({ supabase, sesion, cargando, recargar }), [supabase, sesion, cargando, recargar]);
  return (
    <ContextoSesion.Provider value={valor}>
      {!publica && (cargando || !sesion) ? <Cargando /> : children}
    </ContextoSesion.Provider>
  );
}

export function useSesion(): Contexto {
  const c = useContext(ContextoSesion);
  if (!c) throw new Error("useSesion debe usarse dentro de ProveedorSesion");
  return c;
}

/** Devuelve la sesión si su rol está permitido; si no, envía a la página "sin permiso". */
export function useRequerirRol(roles: Rol[]): Sesion | null {
  const { sesion } = useSesion();
  const router = useRouter();
  const permitido = !!sesion && roles.includes(sesion.rol);
  useEffect(() => {
    if (sesion && !permitido) router.replace(`/sin-permiso?rol=${roles[0]}`);
  }, [sesion, permitido, router, roles]);
  return permitido ? sesion : null;
}
