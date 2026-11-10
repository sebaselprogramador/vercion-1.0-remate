import { redirect } from "next/navigation";
import { Navegacion } from "@/components/Navegacion";
import { obtenerSesion } from "@/lib/sesion";
import { FormularioTienda } from "./FormularioTienda";

export const dynamic = "force-dynamic";

export default async function RegistroVendedor() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar?volver=/vendedor/registro");
  if (sesion.tienda) redirect("/vendedor");

  return (
    <main className="contenedor">
      <Navegacion activa="/vendedor/registro" />
      <div className="grilla-2" style={{ alignItems: "start", gap: 24 }}>
        <section className="bloque-destacado pila" style={{ gap: 12 }}>
          <h1 className="titular" style={{ fontSize: 40 }}>Vende en tus lives con Remate.</h1>
          <p className="texto-tenue">Sigue presentando tus productos en TikTok LIVE. En Remate preparas cada subasta, compartes el código de la sala y las pujas quedan registradas con sus reglas.</p>
        </section>
        <FormularioTienda />
      </div>
    </main>
  );
}
