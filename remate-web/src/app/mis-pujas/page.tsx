"use client";

import Link from "next/link";
import { Navegacion } from "@/components/Navegacion";
import { bs } from "@/lib/formato";
import { Cargando, useRequerirRol, useSesion } from "@/lib/sesion";
import { useDatos } from "@/lib/useDatos";

type Uno<T> = T | T[] | null;
const uno = <T,>(v: Uno<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v);

interface Participacion {
  codigo: string;
  producto: string;
  tienda: string;
  estado: string;
  mejor: number;
  vigente: string | null;
  precioInicial: string;
  voyGanando: boolean;
  gane: boolean;
  montoGanador: string | null;
}

/** Salas donde la cuenta pujó: compradores y también vendedores que compran en otras tiendas. */
export default function MisPujas() {
  const sesion = useRequerirRol(["comprador", "vendedor"]);
  const { supabase } = useSesion();
  const { datos } = useDatos(async () => {
    if (!sesion) return null;
    const { data } = await supabase
      .from("pujas")
      .select(`monto, orden,
        subastas!inner(codigo_sala, estado, precio_inicial, oferta_vigente, postor_vigente_id,
          productos!inner(titulo, tiendas!inner(nombre)),
          adjudicaciones(ganador_id, monto))`)
      .eq("postor_id", sesion.usuarioId)
      .order("orden", { ascending: false });
    return { data };
  }, [supabase, sesion?.usuarioId]);
  if (!sesion || !datos) return <Cargando />;
  const { data } = datos;

  // Una fila por sala, con la mejor puja propia.
  const porSala = new Map<string, Participacion>();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  for (const fila of (data ?? []) as any[]) {
    const s = uno<any>(fila.subastas);
    if (!s) continue;
    const previa = porSala.get(s.codigo_sala);
    if (previa) { previa.mejor = Math.max(previa.mejor, Number(fila.monto)); continue; }
    const p = uno<any>(s.productos);
    const adj = uno<any>(s.adjudicaciones);
    porSala.set(s.codigo_sala, {
      codigo: s.codigo_sala,
      producto: p?.titulo ?? "",
      tienda: uno<any>(p?.tiendas)?.nombre ?? "",
      estado: s.estado,
      mejor: Number(fila.monto),
      vigente: s.oferta_vigente != null ? String(s.oferta_vigente) : null,
      precioInicial: String(s.precio_inicial),
      voyGanando: s.estado === "abierta" && s.postor_vigente_id === sesion.usuarioId,
      gane: adj?.ganador_id === sesion.usuarioId,
      montoGanador: adj?.monto != null ? String(adj.monto) : null,
    });
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const lista = [...porSala.values()].sort((a, b) => Number(b.estado === "abierta") - Number(a.estado === "abierta"));
  const ganadas = lista.filter((x) => x.gane);
  const totalGanado = ganadas.reduce((suma, x) => suma + Number(x.montoGanador ?? 0), 0);

  return (
    <main className="contenedor">
      <Navegacion activa="/mis-pujas" />

      <section className="bloque-destacado pila" style={{ gap: 8 }}>
        <span className="texto-tenue">{sesion.nombre}</span>
        <h1 className="titular" style={{ fontSize: 40 }}>Mis pujas</h1>
        <p className="texto-tenue">Las salas donde participaste. Ganar una subasta no confirma un pago: el pago y la entrega se coordinan con la tienda.</p>
      </section>

      <section className="grilla-3" style={{ margin: "22px 0" }} aria-label="Resumen">
        <div className="tarjeta"><p className="texto-tenue">Salas en las que pujaste</p><p className="monto-grande cifra">{lista.length}</p></div>
        <div className="tarjeta"><p className="texto-tenue">Subastas ganadas</p><p className="monto-grande cifra">{ganadas.length}</p></div>
        <div className="tarjeta"><p className="texto-tenue">Total adjudicado</p><p className="monto-grande cifra">{bs(totalGanado)}</p></div>
      </section>

      <section className="tarjeta" style={{ marginBottom: 24 }}>
        <h2 className="titulo-seccion" style={{ fontSize: 22, marginBottom: 16 }}>Salas</h2>
        {lista.length === 0 ? (
          <div className="pila" style={{ gap: 12 }}>
            <p className="texto-tenue">Todavía no pujaste en ninguna sala.</p>
            <Link className="boton" href="/" style={{ alignSelf: "flex-start" }}>Explorar subastas</Link>
          </div>
        ) : (
          <table className="tabla">
            <thead>
              <tr><th>Producto</th><th>Sala</th><th>Tu mejor puja</th><th>Oferta más alta</th><th>Situación</th><th></th></tr>
            </thead>
            <tbody>
              {lista.map((x) => (
                <tr key={x.codigo}>
                  <td><strong>{x.producto}</strong><br /><span className="texto-chico">{x.tienda}</span></td>
                  <td className="codigo">{x.codigo}</td>
                  <td className="cifra">{bs(x.mejor)}</td>
                  <td className="cifra">{bs(x.estado === "cerrada" ? x.montoGanador ?? x.vigente : x.vigente ?? x.precioInicial)}</td>
                  <td><Situacion p={x} /></td>
                  <td className="derecha">
                    {x.gane
                      ? <Link className="boton boton-secundario" href={`/acta?codigo=${x.codigo}`}>Ver acta</Link>
                      : <Link className="boton boton-secundario" href={`/sala?codigo=${x.codigo}`}>Ver sala</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function Situacion({ p }: { p: Participacion }) {
  if (p.estado === "abierta")
    return p.voyGanando
      ? <span className="estado estado-abierta">Vas ganando</span>
      : <span className="estado estado-cancelada">Te superaron</span>;
  if (p.gane) return <span className="estado estado-cerrada">Ganaste</span>;
  return <span className="estado estado-borrador">{p.estado === "cerrada" ? "No ganaste" : "Sin resultado"}</span>;
}
