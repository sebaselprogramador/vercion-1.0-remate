import Link from "next/link";
import { Navegacion } from "@/components/Navegacion";
import { EstadoChip } from "@/components/EstadoChip";
import { bs, reloj } from "@/lib/formato";
import { aEstadoSala } from "@/lib/salas";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

export default async function PanelVendedor() {
  const sesion = await requerirRol(["vendedor"], "/vendedor");
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("subastas")
    .select(`codigo_sala, estado, precio_inicial, incremento_minimo, duracion_seg, cierra_en, oferta_vigente, total_pujas,
      productos!inner(titulo, descripcion, categorias(nombre), tiendas!inner(nombre, ciudad, vendedor_id)),
      postor:perfiles!subastas_postor_vigente_id_fkey(nombre_visible),
      adjudicaciones(monto, ganador:perfiles!adjudicaciones_ganador_id_fkey(nombre_visible))`)
    .eq("productos.tiendas.vendedor_id", sesion.usuarioId)
    .order("creado_en", { ascending: false });
  const subastas = (data ?? []).map((f) => aEstadoSala(f));
  const contar = (...e: string[]) => subastas.filter((s) => e.includes(s.estado)).length;
  const recaudado = subastas.filter((s) => s.estado === "cerrada" && s.monto_ganador)
    .reduce((t, s) => t + Math.round(Number(s.monto_ganador) * 100), 0) / 100;

  return (
    <>
      <Navegacion activa="/vendedor" />
      <main className="contenedor pagina">
        <div className="encabezado">
          <div className="pila">
            <h1 className="titulo-pagina">{sesion.tienda?.nombre ?? "Mis subastas"}</h1>
            <p className="texto-tenue">
              {sesion.tienda?.usuario_tiktok ? `${sesion.tienda.usuario_tiktok} en TikTok, ` : ""}{sesion.tienda?.ciudad ?? "Cochabamba"}
            </p>
          </div>
          {sesion.tienda
            ? <Link href="/vendedor/nueva" className="boton">Nueva subasta</Link>
            : <Link href="/vendedor/registro" className="boton">Registrar mi tienda</Link>}
        </div>

        <section className="metricas" aria-label="Resumen">
          <div className="metrica"><span className="texto-chico">En curso ahora</span><p className="valor">{contar("abierta")}</p></div>
          <div className="metrica"><span className="texto-chico">Listas o en borrador</span><p className="valor">{contar("programada", "borrador")}</p></div>
          <div className="metrica"><span className="texto-chico">Adjudicado en subastas cerradas</span><p className="valor">{bs(recaudado)}</p></div>
        </section>

        <section className="panel pila" style={{ gap: 16 }}>
          <h2 className="titulo-seccion">Subastas</h2>
          {subastas.length === 0 ? (
            <div className="pila" style={{ gap: 10, alignItems: "flex-start", padding: "8px 0" }}>
              <p className="texto-guia">Prepara una subasta antes de tu live: producto, precio inicial e incremento. Al abrirla, la sala empieza a recibir pujas.</p>
              <Link href="/vendedor/nueva" className="boton boton-secundario">Preparar mi primera subasta</Link>
            </div>
          ) : (
            <table className="tabla">
              <thead>
                <tr><th>Producto</th><th>Estado</th><th className="ocultar-movil">Sala</th><th className="derecha">Precio</th><th className="derecha ocultar-movil">Pujas</th><th className="ocultar-movil">Resultado</th><th></th></tr>
              </thead>
              <tbody>
                {subastas.map((s) => (
                  <tr key={s.codigo_sala}>
                    <td><strong>{s.producto}</strong><br /><span className="texto-chico">{s.categoria ?? "Sin categoría"}</span></td>
                    <td><EstadoChip estado={s.estado} /></td>
                    <td className="codigo ocultar-movil">{s.codigo_sala}</td>
                    <td className="derecha cifra" style={{ fontWeight: 600 }}>
                      {s.oferta_vigente != null ? bs(s.oferta_vigente) : <span className="texto-tenue" style={{ fontWeight: 400 }}>desde {bs(s.precio_inicial)}</span>}
                    </td>
                    <td className="derecha cifra ocultar-movil">{s.total_pujas}</td>
                    <td className="ocultar-movil">
                      {s.estado === "cerrada" ? (s.ganador ? `${s.ganador}, ${bs(s.monto_ganador)}` : "Sin ganador")
                        : s.estado === "abierta" ? "En curso" : <span className="texto-tenue">Dura {reloj(s.duracion_seg)}</span>}
                    </td>
                    <td className="derecha">
                      <Link className="boton boton-secundario boton-chico" href={`/vendedor/sala/${s.codigo_sala}`}>
                        {s.estado === "abierta" ? "Ir a la sala" : s.estado === "cerrada" ? "Ver resultado" : "Preparar"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  );
}
