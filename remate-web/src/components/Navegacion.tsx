"use client";

import Link from "next/link";
import { Logotipo } from "@/components/Logo";
import { BotonSalir } from "@/components/BotonSalir";
import { useSesion, type Rol } from "@/lib/sesion";

const etiquetaRol: Record<Rol, string> = { comprador: "Comprador", vendedor: "Vendedor", administrador: "Administrador" };

/** Barra de navegación. Los enlaces cambian según el rol de la cuenta. */
export function Navegacion({ activa }: { activa?: string }) {
  const { sesion } = useSesion();
  const enlaces: { href: string; texto: string }[] = [{ href: "/", texto: "Explorar subastas" }];
  if (sesion?.rol === "vendedor") {
    // Quien vende también puede comprar en las salas de otras tiendas.
    enlaces.push({ href: "/mis-pujas", texto: "Mis pujas" }, { href: "/vendedor", texto: "Mis subastas" }, { href: "/vendedor/nueva", texto: "Nueva subasta" });
  } else if (sesion?.rol === "administrador") {
    enlaces.push({ href: "/admin", texto: "Administración" });
  } else {
    if (sesion) enlaces.push({ href: "/mis-pujas", texto: "Mis pujas" });
    enlaces.push({ href: "/vendedor/registro", texto: "Vender en Remate" });
  }

  return (
    <>
    <nav className="nav" aria-label="Principal">
      <Link href="/" className="marca" aria-label="Remate, inicio"><Logotipo ancho={108} /></Link>
      <div className="nav-enlaces">
        {enlaces.map((e) => (
          <Link key={e.href} href={e.href} aria-current={activa === e.href ? "page" : undefined}>{e.texto}</Link>
        ))}
        <span>Cochabamba, Bolivia</span>
      </div>
      {sesion ? (
        <div className="fila" style={{ gap: 10 }}>
          <span className="texto-chico" title={sesion.correo ?? undefined}>
            <strong style={{ color: "var(--tinta)" }}>{sesion.nombre || "Mi cuenta"}</strong> · {etiquetaRol[sesion.rol]}
          </span>
          <BotonSalir />
        </div>
      ) : (
        <Link href="/ingresar" className="boton">Iniciar sesión</Link>
      )}
    </nav>
    {sesion && !sesion.activo && (
      <p className="aviso aviso-alerta" role="status" style={{ marginBottom: 20 }}>
        Tu cuenta está suspendida por administración. Puedes ver las salas, pero no pujar, registrar una tienda ni abrir subastas.
      </p>
    )}
    </>
  );
}
