import Link from "next/link";
import { Navegacion } from "@/components/Navegacion";

const textos: Record<string, { titulo: string; detalle: string; accion?: { href: string; texto: string } }> = {
  vendedor: {
    titulo: "Esta sección es para vendedores",
    detalle: "Registra tu tienda para preparar subastas y abrirlas durante tus lives.",
    accion: { href: "/vendedor/registro", texto: "Registrar mi tienda" },
  },
  administrador: {
    titulo: "Esta sección es para administradores",
    detalle: "Tu cuenta no tiene permisos de administración. Solo otro administrador puede asignarlos.",
  },
};

export default async function SinPermiso({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  const { rol } = await searchParams;
  const t = textos[rol ?? ""] ?? { titulo: "No tienes permiso para ver esta página", detalle: "" };
  return (
    <>
      <Navegacion />
      <main className="contenedor centro">
        <div className="caja">
          <h1 className="titulo-pagina">{t.titulo}</h1>
          {t.detalle && <p className="texto-guia">{t.detalle}</p>}
          <div className="fila envolver" style={{ gap: 10 }}>
            {t.accion && <Link className="boton" href={t.accion.href}>{t.accion.texto}</Link>}
            <Link className="boton boton-secundario" href="/">Ver subastas</Link>
          </div>
        </div>
      </main>
    </>
  );
}
