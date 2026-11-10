import Link from "next/link";
import { Navegacion } from "@/components/Navegacion";
import { EstadoChip } from "@/components/EstadoChip";
import { bs } from "@/lib/formato";
import { aEstadoSala } from "@/lib/salas";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { SelectorRol } from "./SelectorRol";

export const dynamic = "force-dynamic";

export default async function PanelAdministrador() {
  const sesion = await requerirRol(["administrador"], "/admin");
  const supabase = await crearClienteServidor();
  const [{ data: perfiles }, { data: tiendas }, { data: filas }, { count: rechazadas }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre_visible, rol, creado_en").order("creado_en", { ascending: false }),
    supabase.from("tiendas").select("vendedor_id, nombre"),
    supabase.from("subastas").select(`codigo_sala, estado, precio_inicial, incremento_minimo, duracion_seg, cierra_en, oferta_vigente, total_pujas,
      productos!inner(titulo, descripcion, categorias(nombre), tiendas!inner(nombre, ciudad, vendedor_id)),
      postor:perfiles!subastas_postor_vigente_id_fkey(nombre_visible),
      adjudicaciones(monto, ganador:perfiles!adjudicaciones_ganador_id_fkey(nombre_visible))`).order("creado_en", { ascending: false }).limit(50),
    supabase.from("solicitudes_puja").select("id_solicitud", { count: "exact", head: true }).eq("resultado", "rechazada"),
  ]);
  const subastas = (filas ?? []).map((f) => aEstadoSala(f));
  const tiendaDe = new Map((tiendas ?? []).map((t) => [t.vendedor_id, t.nombre]));
  const cuenta = (rol: string) => (perfiles ?? []).filter((p) => p.rol === rol).length;

  return (
    <>
      <Navegacion activa="/admin" />
      <main className="contenedor pagina">

      <div className="pila" style={{ gap: 6 }}>
          <h1 className="titulo-pagina">Administración</h1>
          <p className="texto-guia">Cuentas, roles y subastas de Remate. Solo un administrador puede cambiar roles; la base de datos lo impide a cualquier otra cuenta.</p>
        </div>

      <section className="metricas" aria-label="Resumen">
          <div className="metrica"><span className="texto-chico">Compradores</span><p className="valor">{cuenta("comprador")}</p></div>
          <div className="metrica"><span className="texto-chico">Vendedores</span><p className="valor">{cuenta("vendedor")}</p></div>
          <div className="metrica"><span className="texto-chico">Pujas rechazadas</span><p className="valor">{rechazadas ?? 0}</p></div>
        </section>

      <section className="panel pila" style={{ gap: 16 }}>
        <h2 className="titulo-seccion" >Cuentas y roles</h2>
        <table className="tabla">
          <thead><tr><th>Nombre visible</th><th>Tienda</th><th>Registro</th><th>Rol</th></tr></thead>
          <tbody>
            {(perfiles ?? []).map((p) => (
              <tr key={p.id}>
                <td><strong>{p.nombre_visible}</strong>{p.id === sesion.usuarioId && <span className="texto-chico"> (tú)</span>}</td>
                <td>{tiendaDe.get(p.id) ?? <span className="texto-tenue">—</span>}</td>
                <td className="texto-tenue">{new Date(p.creado_en).toLocaleDateString("es-BO")}</td>
                <td><SelectorRol perfilId={p.id} rol={p.rol} deshabilitado={p.id === sesion.usuarioId} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel pila" style={{ gap: 16 }}>
        <h2 className="titulo-seccion" >Subastas</h2>
        {subastas.length === 0 ? <p className="texto-tenue">Todavía no hay subastas.</p> : (
          <table className="tabla">
            <thead><tr><th>Producto</th><th>Tienda</th><th>Estado</th><th>Sala</th><th>Oferta vigente</th><th>Pujas</th><th>Ganador</th></tr></thead>
            <tbody>
              {subastas.map((s) => (
                <tr key={s.codigo_sala}>
                  <td><strong>{s.producto}</strong></td>
                  <td>{s.tienda}</td>
                  <td><EstadoChip estado={s.estado} /></td>
                  <td className="codigo">{s.estado === "borrador" ? s.codigo_sala : <Link href={`/sala/${s.codigo_sala}`}>{s.codigo_sala}</Link>}</td>
                  <td className="cifra">{s.oferta_vigente != null ? bs(s.oferta_vigente) : "—"}</td>
                  <td className="cifra">{s.total_pujas}</td>
                  <td>{s.ganador ? `${s.ganador} · ${bs(s.monto_ganador)}` : "—"}</td>
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
