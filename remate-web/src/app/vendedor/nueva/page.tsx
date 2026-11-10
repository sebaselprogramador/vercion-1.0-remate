import { redirect } from "next/navigation";
import { Navegacion } from "@/components/Navegacion";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { FormularioSubasta } from "./FormularioSubasta";

export const dynamic = "force-dynamic";

export default async function NuevaSubasta() {
  const sesion = await requerirRol(["vendedor"], "/vendedor/nueva");
  if (!sesion.tienda) redirect("/vendedor/registro");
  const supabase = await crearClienteServidor();
  const { data: categorias } = await supabase.from("categorias").select("id, nombre").order("id");

  return (
    <>
      <Navegacion activa="/vendedor/nueva" />
      <main className="contenedor pagina">
        <div className="pila" style={{ gap: 6 }}>
          <h1 className="titulo-pagina">Nueva subasta</h1>
          <p className="texto-guia">Prepárala antes del live. Se abre cuando tú lo decidas, desde la sala.</p>
        </div>
        <FormularioSubasta tiendaId={sesion.tienda.id} tiendaNombre={sesion.tienda.nombre} categorias={categorias ?? []} />
      </main>
    </>
  );
}
