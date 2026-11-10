import Link from "next/link";
import { cargarSala } from "@/lib/salas";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { SalaComprador } from "./SalaComprador";

export const dynamic = "force-dynamic";

export default async function PaginaSala({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const supabase = await crearClienteServidor();
  const [sala, sesion] = await Promise.all([cargarSala(supabase, decodeURIComponent(codigo)), obtenerSesion()]);

  if (!sala || sala.estado === "borrador") {
    return (
      <main className="marco-movil pila" style={{ gap: 16 }}>
        <Link href="/" className="marca" style={{ fontSize: 28 }}>remate.</Link>
        <div className="tarjeta pila" style={{ gap: 8 }}>
          <h1 className="titulo-tarjeta">No encontramos esa sala</h1>
          <p className="texto-tenue">Revisa el código que compartió el vendedor, por ejemplo RM-4821.</p>
          <Link href="/" className="boton" style={{ marginTop: 8 }}>Volver a la vitrina</Link>
        </div>
      </main>
    );
  }

  const esSuVendedor = !!sesion && sesion.usuarioId === sala.vendedor_id;
  return (
    <SalaComprador
      inicial={sala}
      conSesion={!!sesion}
      esVendedorDeLaSala={esSuVendedor}
    />
  );
}
