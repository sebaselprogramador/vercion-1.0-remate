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

  return (
    <main className="contenedor">
      <Navegacion activa="/vendedor" />

      <section className="bloque-destacado fila entre envolver" style={{ gap: 20 }}>
        <div className="pila" style={{ gap: 8 }}>
          <span className="texto-tenue">{sesion.tienda?.usuario_tiktok ?? "Sin usuario de TikTok"} · {sesion.tienda?.ciudad ?? "Cochabamba"}</span>
          <h1 className="titular" style={{ fontSize: 40 }}>Hola, {sesion.tienda?.nombre ?? sesion.nombre}.</h1>
          <p className="texto-tenue">Prepara tus subastas antes del live y abre la sala cuando presentes el producto.</p>
        </div>
        {sesion.tienda
          ? <Link href="/vendedor/nueva" className="boton">Nueva subasta</Link>
          : <Link href="/vendedor/registro" className="boton">Registrar mi tienda</Link>}
      </section>

      <section className="grilla-3" style={{ margin: "22px 0" }} aria-label="Resumen">
        <div className="tarjeta"><p className="texto-tenue">En curso</p><p className="monto-grande cifra">{contar("abierta")}</p></div>
        <div className="tarjeta"><p className="texto-tenue">Por abrir o en borrador</p><p className="monto-grande cifra">{contar("programada", "borrador")}</p></div>
        <div className="tarjeta"><p className="texto-tenue">Cerradas</p><p className="monto-grande cifra">{contar("cerrada")}</p></div>
      </section>

      <section className="tarjeta" style={{ marginBottom: 24 }}>
        <h2 className="titulo-seccion" style={{ fontSize: 22, marginBottom: 16 }}>Mis subastas</h2>
        {subastas.length === 0 ? (
          <p className="texto-tenue">Todavía no creaste subastas. Empieza con «Nueva subasta».</p>
        ) : (
          <table className="tabla">
            <thead>
              <tr><th>Producto</th><th>Estado</th><th>Sala</th><th>Oferta vigente</th><th>Pujas</th><th>Resultado</th><th></th></tr>
            </thead>
            <tbody>
              {subastas.map((s) => (
                <tr key={s.codigo_sala}>
                  <td><strong>{s.producto}</strong><br /><span className="texto-chico">{s.categoria ?? "Sin categoría"}</span></td>
                  <td><EstadoChip estado={s.estado} /></td>
                  <td className="codigo">{s.codigo_sala}</td>
                  <td className="cifra">{s.oferta_vigente != null ? bs(s.oferta_vigente) : <span className="texto-tenue">Desde {bs(s.precio_inicial)}</span>}</td>
                  <td className="cifra">{s.total_pujas}</td>
                  <td>{s.estado === "cerrada" ? (s.ganador ? `${s.ganador} · ${bs(s.monto_ganador)}` : "Sin ganador")
                      : s.estado === "abierta" ? "En curso" : `Dura ${reloj(s.duracion_seg)}`}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="boton boton-secundario" href={`/vendedor/sala/${s.codigo_sala}`}>
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
  );
}
