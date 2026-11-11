import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";

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

/** Devuelve la sesión del visitante con su perfil y su tienda, o null si no inició sesión. */
export async function obtenerSesion(): Promise<Sesion | null> {
  const supabase = await crearClienteServidor();
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

/** Exige sesión y uno de los roles indicados; si no, redirige. */
export async function requerirRol(roles: Rol[], destino: string): Promise<Sesion> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect(`/ingresar?volver=${encodeURIComponent(destino)}`);
  if (!roles.includes(sesion.rol)) redirect(`/sin-permiso?rol=${roles[0]}`);
  return sesion;
}
