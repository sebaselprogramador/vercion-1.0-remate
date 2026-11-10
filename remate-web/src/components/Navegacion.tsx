import Link from "next/link";
import { obtenerSesion, type Rol } from "@/lib/sesion";
import { Logotipo } from "./Logo";

const etiquetaRol: Record<Rol, string> = { comprador: "Comprador", vendedor: "Vendedor", administrador: "Administrador" };

/** Barra superior. Los enlaces cambian según el rol de la cuenta. */
export async function Navegacion({ activa }: { activa?: string }) {
  const sesion = await obtenerSesion();
  const enlaces: { href: string; texto: string }[] = [{ href: "/", texto: "Subastas" }];
  if (sesion?.rol === "vendedor") {
    enlaces.push({ href: "/vendedor", texto: "Mis subastas" }, { href: "/vendedor/nueva", texto: "Nueva subasta" });
  } else if (sesion?.rol === "administrador") {
    enlaces.push({ href: "/admin", texto: "Administración" });
  } else {
    enlaces.push({ href: "/vendedor/registro", texto: "Vender en Remate" });
  }
  const nombre = sesion?.tienda?.nombre || sesion?.nombre || "";

  return (
    <header className="barra">
      <div className="contenedor barra-interior">
        <Link href="/" className="barra-logo" aria-label="Remate, inicio"><Logotipo ancho={108} /></Link>
        <nav className="nav-enlaces" aria-label="Principal">
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} aria-current={activa === e.href ? "page" : undefined}>{e.texto}</Link>
          ))}
        </nav>
        {sesion ? (
          <Link href="/ingresar" className="cuenta" title={sesion.correo ?? undefined}>
            <span className="cuenta-texto pila" style={{ alignItems: "flex-end", lineHeight: 1.25 }}>
              <span style={{ fontWeight: 600 }}>{nombre || "Mi cuenta"}</span>
              <span className="cuenta-rol">{etiquetaRol[sesion.rol]}</span>
            </span>
            <span className="cuenta-avatar" aria-hidden="true">{(nombre || "?").slice(0, 1).toUpperCase()}</span>
          </Link>
        ) : (
          <Link href="/ingresar" className="boton boton-chico">Ingresar</Link>
        )}
      </div>
    </header>
  );
}
