import Link from "next/link";
import { Navegacion } from "@/components/Navegacion";

const textos: Record<string, { titulo: string; detalle: string; accion?: { href: string; texto: string } }> = {
  vendedor: {
    titulo: "Esta sección es para vendedores",
    detalle: "Registra tu tienda para preparar y abrir subastas durante tus lives.",
    accion: { href: "/vendedor/registro", texto: "Registrar mi tienda" },
  },
  administrador: {
    titulo: "Esta sección es para administradores",
    detalle: "Tu cuenta no tiene permisos de administración. Los asigna otro administrador.",
  },
};

export default async function SinPermiso({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  const { rol } = await searchParams;
  const t = textos[rol ?? ""] ?? { titulo: "No tienes permiso para ver esta página", detalle: "" };
  return (
    <main className="contenedor">
      <Navegacion />
      <section className="tarjeta pila" style={{ gap: 12, maxWidth: 560 }}>
        <h1 className="titulo-seccion">{t.titulo}</h1>
        {t.detalle && <p className="texto-tenue">{t.detalle}</p>}
        <div className="fila" style={{ gap: 12 }}>
          {t.accion && <Link className="boton" href={t.accion.href}>{t.accion.texto}</Link>}
          <Link className="boton boton-secundario" href="/">Volver a la vitrina</Link>
        </div>
      </section>
    </main>
  );
}
