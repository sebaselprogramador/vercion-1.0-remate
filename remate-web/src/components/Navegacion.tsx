import Link from "next/link";
import { obtenerSesion, type Rol } from "@/lib/sesion";

const etiquetaRol: Record<Rol, string> = { comprador: "Comprador", vendedor: "Vendedor", administrador: "Administrador" };

/** Barra de navegación. Los enlaces cambian según el rol de la cuenta. */
export async function Navegacion({ activa }: { activa?: string }) {
  const sesion = await obtenerSesion();
  const enlaces: { href: string; texto: string }[] = [{ href: "/", texto: "Explorar subastas" }];
  if (sesion?.rol === "vendedor") {
    enlaces.push({ href: "/vendedor", texto: "Mis subastas" }, { href: "/vendedor/nueva", texto: "Nueva subasta" });
  } else if (sesion?.rol === "administrador") {
    enlaces.push({ href: "/admin", texto: "Administración" });
  } else {
    enlaces.push({ href: "/vendedor/registro", texto: "Vender en Remate" });
  }

  return (
    <nav className="nav" aria-label="Principal">
      <Link href="/" className="marca">remate.</Link>
      <div className="nav-enlaces">
        {enlaces.map((e) => (
          <Link key={e.href} href={e.href} aria-current={activa === e.href ? "page" : undefined}>{e.texto}</Link>
        ))}
        <span>Cochabamba, Bolivia</span>
      </div>
      {sesion ? (
        <Link href="/ingresar" className="boton boton-secundario" title={sesion.correo ?? undefined}>
          {sesion.nombre || "Mi cuenta"} · {etiquetaRol[sesion.rol]}
        </Link>
      ) : (
        <Link href="/ingresar" className="boton">Iniciar sesión</Link>
      )}
    </nav>
  );
}
