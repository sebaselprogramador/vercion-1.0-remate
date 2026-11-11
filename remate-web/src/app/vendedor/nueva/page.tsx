import Link from "next/link";
import { redirect } from "next/navigation";
import { Navegacion } from "@/components/Navegacion";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { FormularioSubasta } from "./FormularioSubasta";

export const dynamic = "force-dynamic";

export default async function NuevaSubasta() {
  const sesion = await requerirRol(["vendedor"], "/vendedor/nueva");
  if (!sesion.tienda) redirect("/vendedor/registro");
  if (!sesion.activo || !sesion.tienda.activa) {
    return (
      <main className="contenedor">
        <Navegacion activa="/vendedor/nueva" />
        <section className="tarjeta pila" style={{ gap: 10, maxWidth: 640 }}>
          <h1 className="titulo-tarjeta">No puedes crear subastas por ahora</h1>
          <p className="texto-tenue">{sesion.tienda.activa ? "Tu cuenta" : "Tu tienda"} está suspendida por administración.</p>
          <Link className="boton" href="/vendedor" style={{ alignSelf: "flex-start", marginTop: 6 }}>Volver a mis subastas</Link>
        </section>
      </main>
    );
  }
  const supabase = await crearClienteServidor();
  const { data: categorias } = await supabase.from("categorias").select("id, nombre").order("id");

  return (
    <main className="contenedor">
      <Navegacion activa="/vendedor/nueva" />
      <FormularioSubasta tiendaId={sesion.tienda.id} categorias={categorias ?? []} />
    </main>
  );
}
