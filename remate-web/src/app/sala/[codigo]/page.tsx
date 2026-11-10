import Link from "next/link";
import { Navegacion } from "@/components/Navegacion";
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
      <>
        <Navegacion />
        <main className="contenedor centro">
          <div className="caja">
            <h1 className="titulo-pagina">No encontramos la sala {decodeURIComponent(codigo).toUpperCase()}</h1>
            <p className="texto-guia">Revisa el código que anunció el vendedor en su live. Tiene la forma RM-4821.</p>
            <form action="/sala" className="acceso-formulario">
              <input className="entrada entrada-codigo" name="codigo" placeholder="RM-4821" aria-label="Código de sala" required />
              <button className="boton boton-grande" type="submit">Entrar</button>
            </form>
            <Link href="/" className="texto-chico" style={{ textDecoration: "underline" }}>Ver todas las subastas</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navegacion />
      <SalaComprador inicial={sala} conSesion={!!sesion} esVendedorDeLaSala={!!sesion && sesion.usuarioId === sala.vendedor_id} />
    </>
  );
}
