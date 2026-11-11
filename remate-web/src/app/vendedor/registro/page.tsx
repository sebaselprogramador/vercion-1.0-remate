import { redirect } from "next/navigation";
import { Navegacion } from "@/components/Navegacion";
import { obtenerSesion } from "@/lib/sesion";
import { FormularioTienda } from "./FormularioTienda";

export const dynamic = "force-dynamic";

const pasos = [
  { titulo: "Prepara la subasta", texto: "Producto, precio inicial, incremento mínimo y duración." },
  { titulo: "Anuncia el código en tu live", texto: "Tus compradores entran a la sala desde su teléfono." },
  { titulo: "Abre y deja que pujen", texto: "Remate valida cada oferta y registra al ganador al cerrar." },
];

export default async function RegistroVendedor() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar?volver=/vendedor/registro");
  if (sesion.tienda) redirect("/vendedor");

  return (
    <>
      <Navegacion activa="/vendedor/registro" />
      <main className="contenedor pagina">
        <div className="sala">
          <section className="pila" style={{ gap: 24 }}>
            <h1 className="titulo-hero" style={{ fontSize: 44 }}>Subasta en tus lives sin perder ninguna oferta.</h1>
            <p className="texto-guia">Sigue presentando tus productos en TikTok LIVE. En Remate las pujas llegan ordenadas, con reglas claras y un ganador registrado.</p>
            <ol className="pila" style={{ gap: 16, margin: 0, padding: 0, listStyle: "none" }}>
              {pasos.map((p, i) => (
                <li key={p.titulo} className="fila" style={{ gap: 14, alignItems: "flex-start" }}>
                  <span className="cuenta-avatar" style={{ flexShrink: 0 }}>{i + 1}</span>
                  <span className="pila"><strong>{p.titulo}</strong><span className="texto-tenue">{p.texto}</span></span>
                </li>
              ))}
            </ol>
          </section>
          {sesion.activo ? <FormularioTienda /> : (
            <section className="tarjeta pila" style={{ gap: 8, alignSelf: "start" }}>
              <h2 className="titulo-tarjeta">No puedes registrar una tienda</h2>
              <p className="texto-tenue">Tu cuenta está suspendida por administración.</p>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
