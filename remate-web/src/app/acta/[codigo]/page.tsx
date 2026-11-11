import Link from "next/link";
import { Navegacion } from "@/components/Navegacion";
import { bs } from "@/lib/formato";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface Acta {
  codigo_sala: string;
  producto: string;
  tienda: string;
  usuario_tiktok: string | null;
  vendedor_id: string;
  precio_inicial: string;
  incremento_minimo: string;
  duracion_seg: number;
  abierta_en: string | null;
  cierre_previsto: string | null;
  plazo_final: string | null;
  cerrada_en: string | null;
  ganador_id: string | null;
  ganador: string | null;
  monto: string | null;
  puja_orden: string | null;
  adjudicada_en: string | null;
  pujas_aceptadas: number;
  solicitudes_rechazadas: number;
}

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "medium", timeZone: "America/La_Paz" }) : "—";

/** Acta de una subasta cerrada. La base de datos solo la entrega a su vendedor, al ganador y a los administradores. */
export default async function PaginaActa({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const limpio = decodeURIComponent(codigo).toUpperCase();
  const sesion = await obtenerSesion();
  if (!sesion) redirect(`/ingresar?volver=${encodeURIComponent(`/acta/${limpio}`)}`);

  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc("acta_adjudicacion", { p_codigo_sala: limpio });
  const acta = ((data ?? []) as Acta[])[0];

  const volver = sesion.rol === "administrador" ? { href: "/admin", texto: "Volver a administración" }
    : acta && acta.vendedor_id === sesion.usuarioId ? { href: "/vendedor", texto: "Volver a mis subastas" }
    : { href: "/mis-pujas", texto: "Volver a mis pujas" };

  if (!acta) {
    return (
      <main className="contenedor">
        <Navegacion />
        <section className="tarjeta pila" style={{ gap: 10, maxWidth: 640 }}>
          <h1 className="titulo-tarjeta">No hay un acta disponible para {limpio}</h1>
          <p className="texto-tenue">El acta existe cuando la subasta cierra, y solo la ven la tienda, quien ganó y el equipo de administración.</p>
          <Link className="boton" href={volver.href} style={{ alignSelf: "flex-start", marginTop: 6 }}>{volver.texto}</Link>
        </section>
      </main>
    );
  }

  const { data: pujas } = await supabase
    .from("pujas")
    .select("orden, monto, aceptada_en, postor:perfiles(nombre_visible), subastas!inner(codigo_sala)")
    .eq("subastas.codigo_sala", limpio)
    .order("orden", { ascending: false });
  const ampliado = acta.cierre_previsto && acta.plazo_final && new Date(acta.plazo_final) > new Date(acta.cierre_previsto);

  return (
    <main className="contenedor">
      <Navegacion />

      <section className="bloque-destacado pila" style={{ gap: 8 }}>
        <span className="texto-tenue">Acta de adjudicación · sala <span className="codigo">{acta.codigo_sala}</span></span>
        <h1 className="titular" style={{ fontSize: 40 }}>{acta.producto}</h1>
        <p className="texto-tenue">{acta.tienda}{acta.usuario_tiktok ? ` · ${acta.usuario_tiktok}` : ""}</p>
      </section>

      <section className="grilla-3" style={{ margin: "22px 0" }} aria-label="Resultado">
        <div className="tarjeta"><p className="texto-tenue">Ganador</p><p className="titulo-tarjeta" style={{ marginTop: 6 }}>{acta.ganador ?? "Sin ganador"}</p></div>
        <div className="tarjeta"><p className="texto-tenue">Monto adjudicado</p><p className="monto-grande cifra">{acta.monto != null ? bs(acta.monto) : "—"}</p></div>
        <div className="tarjeta"><p className="texto-tenue">Pujas aceptadas / solicitudes rechazadas</p><p className="monto-grande cifra">{acta.pujas_aceptadas} / {acta.solicitudes_rechazadas}</p></div>
      </section>

      <div className="grilla-2" style={{ marginBottom: 24, alignItems: "start" }}>
        <section className="tarjeta pila" style={{ gap: 12 }}>
          <h2 className="titulo-seccion" style={{ fontSize: 22 }}>Registro</h2>
          <table className="tabla">
            <tbody>
              <tr><td className="texto-tenue">Precio inicial</td><td className="cifra derecha">{bs(acta.precio_inicial)}</td></tr>
              <tr><td className="texto-tenue">Incremento mínimo</td><td className="cifra derecha">{bs(acta.incremento_minimo)}</td></tr>
              <tr><td className="texto-tenue">Apertura</td><td className="derecha">{fecha(acta.abierta_en)}</td></tr>
              <tr><td className="texto-tenue">Cierre previsto</td><td className="derecha">{fecha(acta.cierre_previsto)}</td></tr>
              <tr><td className="texto-tenue">Plazo final{ampliado ? " (ampliado)" : ""}</td><td className="derecha">{fecha(acta.plazo_final)}</td></tr>
              <tr><td className="texto-tenue">Cierre registrado</td><td className="derecha">{fecha(acta.cerrada_en)}</td></tr>
              <tr><td className="texto-tenue">Puja ganadora</td><td className="cifra derecha">{acta.puja_orden ? `n.º ${acta.puja_orden}` : "—"}</td></tr>
            </tbody>
          </table>
          <p className="aviso aviso-neutro">Adjudicar no confirma un pago ni una entrega. Eso se coordina entre quien ganó y la tienda, fuera de Remate.</p>
        </section>

        <section className="tarjeta pila" style={{ gap: 12 }}>
          <h2 className="titulo-seccion" style={{ fontSize: 22 }}>Pujas aceptadas</h2>
          {!pujas?.length ? <p className="texto-tenue">La subasta terminó sin ofertas válidas.</p> : (
            <table className="tabla">
              <thead><tr><th>Orden</th><th>Postor</th><th>Monto</th><th>Hora del servidor</th></tr></thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {pujas.map((p: any) => (
                  <tr key={p.orden}>
                    <td className="cifra">{p.orden}</td>
                    <td>{(Array.isArray(p.postor) ? p.postor[0] : p.postor)?.nombre_visible ?? "—"}</td>
                    <td className="cifra">{bs(p.monto)}</td>
                    <td>{new Date(p.aceptada_en).toLocaleTimeString("es-BO", { timeZone: "America/La_Paz" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <Link className="boton boton-secundario" href={volver.href} style={{ marginBottom: 48 }}>{volver.texto}</Link>
    </main>
  );
}
