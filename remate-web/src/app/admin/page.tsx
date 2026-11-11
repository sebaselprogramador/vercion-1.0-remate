import Link from "next/link";
import { Navegacion } from "@/components/Navegacion";
import { EstadoChip } from "@/components/EstadoChip";
import { bs } from "@/lib/formato";
import { aEstadoSala } from "@/lib/salas";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { SelectorRol } from "./SelectorRol";
import { BotonSuspension } from "./BotonSuspension";

export const dynamic = "force-dynamic";

export default async function PanelAdministrador() {
  const sesion = await requerirRol(["administrador"], "/admin");
  const supabase = await crearClienteServidor();
  const [{ data: perfiles }, { data: tiendas }, { data: filas }, { count: rechazadas }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre_visible, rol, activo, creado_en").order("creado_en", { ascending: false }),
    supabase.from("tiendas").select("id, vendedor_id, nombre, usuario_tiktok, ciudad, activa, creado_en").order("creado_en", { ascending: false }),
    supabase.from("subastas").select(`codigo_sala, estado, precio_inicial, incremento_minimo, duracion_seg, cierra_en, oferta_vigente, total_pujas,
      productos!inner(titulo, descripcion, categorias(nombre), tiendas!inner(nombre, ciudad, vendedor_id)),
      postor:perfiles!subastas_postor_vigente_id_fkey(nombre_visible),
      adjudicaciones(monto, ganador:perfiles!adjudicaciones_ganador_id_fkey(nombre_visible))`).order("creado_en", { ascending: false }).limit(50),
    supabase.from("solicitudes_puja").select("id_solicitud", { count: "exact", head: true }).eq("resultado", "rechazada"),
  ]);
  const subastas = (filas ?? []).map((f) => aEstadoSala(f));
  const tiendaDe = new Map((tiendas ?? []).map((t) => [t.vendedor_id, t.nombre]));
  const nombreDe = new Map((perfiles ?? []).map((p) => [p.id, p.nombre_visible]));
  const cuenta = (rol: string) => (perfiles ?? []).filter((p) => p.rol === rol).length;

  return (
    <main className="contenedor">
      <Navegacion activa="/admin" />

      <section className="bloque-destacado pila" style={{ gap: 8 }}>
        <span className="texto-tenue">Administración</span>
        <h1 className="titular" style={{ fontSize: 40 }}>Supervisión de Remate</h1>
        <p className="texto-tenue">Revisa cuentas, tiendas, roles y subastas. Los cambios de rol y las suspensiones quedan protegidos por la base de datos: solo un administrador puede hacerlos.</p>
      </section>

      <section className="grilla-3" style={{ margin: "22px 0" }} aria-label="Resumen">
        <div className="tarjeta"><p className="texto-tenue">Compradores</p><p className="monto-grande cifra">{cuenta("comprador")}</p></div>
        <div className="tarjeta"><p className="texto-tenue">Vendedores</p><p className="monto-grande cifra">{cuenta("vendedor")}</p></div>
        <div className="tarjeta"><p className="texto-tenue">Solicitudes de puja rechazadas</p><p className="monto-grande cifra">{rechazadas ?? 0}</p></div>
      </section>

      <section className="tarjeta" style={{ marginBottom: 24 }}>
        <h2 className="titulo-seccion" style={{ fontSize: 22, marginBottom: 16 }}>Cuentas y roles</h2>
        <table className="tabla">
          <thead><tr><th>Nombre visible</th><th>Tienda</th><th>Registro</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {(perfiles ?? []).map((p) => (
              <tr key={p.id}>
                <td><strong>{p.nombre_visible}</strong>{p.id === sesion.usuarioId && <span className="texto-chico"> (tú)</span>}</td>
                <td>{tiendaDe.get(p.id) ?? <span className="texto-tenue">—</span>}</td>
                <td className="texto-tenue">{new Date(p.creado_en).toLocaleDateString("es-BO")}</td>
                <td><SelectorRol perfilId={p.id} rol={p.rol} deshabilitado={p.id === sesion.usuarioId} /></td>
                <td><EstadoCuenta activo={p.activo} /></td>
                <td className="derecha">
                  {p.rol !== "administrador" && <BotonSuspension tipo="cuenta" id={p.id} activo={p.activo} nombre={p.nombre_visible} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="tarjeta" style={{ marginBottom: 24 }}>
        <h2 className="titulo-seccion" style={{ fontSize: 22, marginBottom: 16 }}>Tiendas</h2>
        {(tiendas ?? []).length === 0 ? <p className="texto-tenue">Todavía no hay tiendas.</p> : (
          <table className="tabla">
            <thead><tr><th>Tienda</th><th>TikTok</th><th>Ciudad</th><th>Dueño</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {(tiendas ?? []).map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.nombre}</strong></td>
                  <td>{t.usuario_tiktok ?? <span className="texto-tenue">—</span>}</td>
                  <td>{t.ciudad}</td>
                  <td>{nombreDe.get(t.vendedor_id) ?? "—"}</td>
                  <td><EstadoCuenta activo={t.activa} /></td>
                  <td className="derecha"><BotonSuspension tipo="tienda" id={t.id} activo={t.activa} nombre={t.nombre} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="texto-chico" style={{ marginTop: 12 }}>Una tienda suspendida desaparece de la vitrina, no puede preparar ni abrir salas y sus salas abiertas dejan de aceptar pujas.</p>
      </section>

      <section className="tarjeta" style={{ marginBottom: 24 }}>
        <h2 className="titulo-seccion" style={{ fontSize: 22, marginBottom: 16 }}>Subastas</h2>
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
                  <td>{s.estado === "cerrada"
                    ? <Link href={`/acta/${s.codigo_sala}`}>{s.ganador ? `${s.ganador} · ${bs(s.monto_ganador)}` : "Sin ganador"}</Link>
                    : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function EstadoCuenta({ activo }: { activo: boolean }) {
  return activo
    ? <span className="estado estado-programada">Activa</span>
    : <span className="estado estado-cancelada">Suspendida</span>;
}
