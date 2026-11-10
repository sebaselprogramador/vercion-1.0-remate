import Link from "next/link";
import { Navegacion } from "@/components/Navegacion";
import { Ilustracion, ilustracionDeCategoria } from "@/components/Ilustracion";
import { EstadoChip } from "@/components/EstadoChip";
import { bs } from "@/lib/formato";
import { listarSalas } from "@/lib/salas";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

export default async function Vitrina({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const { categoria } = await searchParams;
  const supabase = await crearClienteServidor();
  const [salas, { data: categorias }] = await Promise.all([
    listarSalas(supabase, ["abierta", "programada"]),
    supabase.from("categorias").select("nombre").order("id"),
  ]);
  const enVivo = salas.filter((s) => s.estado === "abierta").slice(0, 4);
  const visibles = categoria ? salas.filter((s) => s.categoria === categoria) : salas;

  return (
    <>
      <Navegacion activa="/" />
      <main className="contenedor">
        <section className="acceso">
          <div className="pila" style={{ gap: 20 }}>
            <h1 className="titulo-hero">Entra a la sala<br />del live.</h1>
            <p className="texto-guia">
              Escribe el código que anunció el vendedor en TikTok y puja desde tu teléfono. Solo cuentan las pujas que Remate acepta y registra.
            </p>
            <form action="/sala" className="acceso-formulario">
              <input className="entrada entrada-codigo" name="codigo" placeholder="RM-4821" aria-label="Código de sala"
                autoComplete="off" autoCapitalize="characters" required />
              <button className="boton boton-grande" type="submit">Entrar</button>
            </form>
          </div>

          <aside className="en-vivo" aria-label="Salas en vivo">
            <div className="en-vivo-titulo">
              <span>En vivo ahora</span>
              <span className="estado estado-abierta" style={{ background: "rgba(46,139,87,.18)", color: "#7fd3a3" }}>{enVivo.length} {enVivo.length === 1 ? "sala" : "salas"}</span>
            </div>
            {enVivo.length === 0 ? (
              <p style={{ padding: "18px 0 20px", color: "rgba(255,255,255,.72)", fontSize: 14 }}>
                Ninguna subasta está abierta en este momento. Cuando un vendedor abra su sala, la verás aquí con su precio actual.
              </p>
            ) : enVivo.map((s) => (
              <Link key={s.codigo_sala} href={`/sala/${s.codigo_sala}`} className="en-vivo-fila">
                <span className="nombre">{s.producto}</span>
                <span className="detalle">{s.tienda}, sala {s.codigo_sala}</span>
                <span className="precio">{bs(s.oferta_vigente ?? s.precio_inicial)}</span>
              </Link>
            ))}
          </aside>
        </section>

        <section className="pila" style={{ gap: 20, padding: "40px 0 64px" }}>
          <div className="encabezado">
            <div className="pila">
              <h2 className="titulo-seccion">Subastas en Cochabamba</h2>
              <p className="texto-chico">Abiertas y por abrir. Las que todavía no abren aceptarán pujas cuando el vendedor las inicie en su live.</p>
            </div>
            <nav className="filtros" aria-label="Categorías">
              <Link href="/" className="filtro" aria-current={!categoria ? "page" : undefined}>Todas</Link>
              {(categorias ?? []).map((c) => (
                <Link key={c.nombre} href={`/?categoria=${encodeURIComponent(c.nombre)}`} className="filtro"
                  aria-current={categoria === c.nombre ? "page" : undefined}>{c.nombre}</Link>
              ))}
            </nav>
          </div>

          {visibles.length === 0 ? (
            <div className="panel pila" style={{ gap: 6, alignItems: "flex-start" }}>
              <h3 className="titulo-tarjeta">No hay subastas{categoria ? ` en ${categoria}` : ""} por ahora</h3>
              <p className="texto-tenue">Si vienes de un live, entra con el código de la sala. Si vendes por TikTok, prepara tu primera subasta.</p>
              <Link href="/vendedor/registro" className="boton boton-secundario boton-chico" style={{ marginTop: 10 }}>Vender en Remate</Link>
            </div>
          ) : (
            <div className="lotes">
              {visibles.map((s) => (
                <Link key={s.codigo_sala} href={`/sala/${s.codigo_sala}`} className="lote">
                  <div className="lote-imagen">
                    <Ilustracion tipo={ilustracionDeCategoria(s.categoria)} alto={150} />
                    <EstadoChip estado={s.estado} />
                  </div>
                  <div className="lote-cuerpo">
                    <h3 className="titulo-tarjeta">{s.producto}</h3>
                    <p className="texto-chico">{s.tienda}, {s.ciudad}</p>
                    <div className="lote-pie">
                      <div>
                        <p className="texto-chico">{s.oferta_vigente != null ? "Oferta actual" : "Precio inicial"}</p>
                        <p className="monto">{bs(s.oferta_vigente ?? s.precio_inicial)}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p className="texto-chico">{s.total_pujas} {s.total_pujas === 1 ? "puja" : "pujas"}</p>
                        <p className="codigo texto-chico" style={{ color: "var(--tinta)" }}>{s.codigo_sala}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
