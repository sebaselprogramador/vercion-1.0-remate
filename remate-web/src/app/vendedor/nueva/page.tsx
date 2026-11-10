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
    <main className="contenedor">
      <Navegacion activa="/vendedor/nueva" />
      <FormularioSubasta tiendaId={sesion.tienda.id} categorias={categorias ?? []} />
    </main>
  );
}
