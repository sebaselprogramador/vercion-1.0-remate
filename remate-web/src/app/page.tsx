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
  const visibles = categoria ? salas.filter((s) => s.categoria === categoria) : salas;

  return (
    <main className="contenedor">
      <Navegacion activa="/" />

      <div className="fila envolver" style={{ gap: 14, marginBottom: 22 }}>
        <Link href="/" className={`chip ${!categoria ? "chip-activo" : ""}`}>Todo</Link>
        {(categorias ?? []).map((c) => (
          <Link key={c.nombre} href={`/?categoria=${encodeURIComponent(c.nombre)}`}
            className={`chip ${categoria === c.nombre ? "chip-activo" : ""}`}>{c.nombre}</Link>
        ))}
      </div>

      <section className="bloque-destacado fila entre envolver" style={{ gap: 24, minHeight: 250 }}>
        <h1 className="titular">Tu próximo hallazgo<br />está en vivo.</h1>
        <div style={{ width: 360, maxWidth: "100%" }}><Ilustracion tipo="sillon" alto={200} /></div>
      </section>

      <form action="/sala" className="tarjeta fila envolver" style={{ gap: 16, marginTop: 22 }}>
        <h2 className="titulo-tarjeta" style={{ fontSize: 18, minWidth: 220 }}>¿Vienes de un live?</h2>
        <input className="entrada" name="codigo" placeholder="Ej. RM-4821" aria-label="Código de sala" style={{ maxWidth: 320 }} />
        <button className="boton" type="submit" style={{ minWidth: 200 }}>Entrar a la sala</button>
      </form>

      <div className="fila entre" style={{ margin: "36px 0 22px" }}>
        <h2 className="titulo-seccion">Encuentra algo para ti</h2>
        <span className="texto-tenue">En Cochabamba</span>
      </div>

      {visibles.length === 0 ? (
        <section className="tarjeta" style={{ marginBottom: 48 }}>
          <h3 className="titulo-tarjeta">Todavía no hay subastas{categoria ? ` en ${categoria}` : ""}.</h3>
          <p className="texto-tenue" style={{ marginTop: 8 }}>
            Cuando un vendedor prepare o abra una subasta, aparecerá aquí. Si vienes de un live, entra con el código de la sala.
          </p>
        </section>
      ) : (
        <section className="grilla-3" style={{ marginBottom: 48 }}>
          {visibles.map((s) => (
            <article key={s.codigo_sala} className="pila" style={{ gap: 12 }}>
              <Ilustracion tipo={ilustracionDeCategoria(s.categoria)} alto={145} />
              <div className="fila entre">
                <EstadoChip estado={s.estado} />
                <span className="texto-chico">{s.total_pujas} pujas</span>
              </div>
              <h3 className="titulo-tarjeta">{s.producto}</h3>
              <p className="texto-tenue" style={{ fontSize: 13 }}>{s.tienda} · {s.ciudad}</p>
              <div className="fila entre">
                <span className="monto cifra">{bs(s.oferta_vigente ?? s.precio_inicial)}</span>
                <Link className="boton" href={`/sala/${s.codigo_sala}`}>Ver sala</Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
