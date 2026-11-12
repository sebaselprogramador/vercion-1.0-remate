"use client";

import { useState } from "react";
import Link from "next/link";
import { Logotipo } from "@/components/Logo";
import { Ilustracion, ilustracionDeCategoria } from "@/components/Ilustracion";
import { EstadoChip } from "@/components/EstadoChip";
import { API_URL, bs, reloj, sumarMontos } from "@/lib/formato";
import { Hace } from "@/components/Hace";
import type { EstadoSala } from "@/lib/salas";
import { crearClienteSupabase } from "@/lib/supabase/cliente";
import { useSala, useSegundosRestantes } from "@/lib/useSala";

/**
 * Sala del vendedor, pensada para el teléfono durante el live.
 * El contador es informativo: el cierre real lo decide el servidor con el vencimiento guardado.
 */
export function SalaVendedor({ inicial, suspendida, onCambio }: { inicial: EstadoSala; suspendida: boolean; onCambio: () => void }) {
  const { estado: s, conexion, desfaseMs } = useSala(inicial);
  const restante = useSegundosRestantes(s.cierra_en, desfaseMs);
  const [copiado, setCopiado] = useState<"codigo" | "enlace" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function copiar(que: "codigo" | "enlace") {
    const texto = que === "codigo" ? s.codigo_sala : `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/sala/?codigo=${s.codigo_sala}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(que);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setCopiado(null);
    }
  }

  async function marcarLista() {
    setOcupado(true);
    const { error } = await crearClienteSupabase().from("subastas").update({ estado: "programada" }).eq("codigo_sala", s.codigo_sala);
    setOcupado(false);
    if (error) return setAviso("No se pudo actualizar la subasta.");
    onCambio();
  }

  async function abrir() {
    setOcupado(true);
    setAviso(null);
    try {
      const { data } = await crearClienteSupabase().auth.getSession();
      const r = await fetch(`${API_URL}/vendedor/salas/${s.codigo_sala}/abrir`, {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      });
      if (r.status === 403) {
        const cuerpo = (await r.json().catch(() => null)) as { message?: string } | null;
        setAviso(cuerpo?.message === "cuenta_suspendida"
          ? "Tu cuenta está suspendida por administración: no puedes abrir salas."
          : "Tu tienda está suspendida por administración: no puedes abrir salas.");
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      onCambio();
    } catch {
      setAviso("No se pudo abrir la sala: el servidor de subastas no respondió. Verifica que esté en marcha.");
    } finally {
      setOcupado(false);
    }
  }

  const siguiente = s.oferta_vigente != null ? sumarMontos(s.oferta_vigente, s.incremento_minimo) : s.precio_inicial;

  return (
    <main className="marco-movil pila" style={{ gap: 16 }}>
      <header className="fila entre">
        <Link href="/vendedor" className="marca" aria-label="Remate, inicio"><Logotipo ancho={96} /></Link>
        <span className="texto-chico">Panel del vendedor</span>
      </header>

      <div className="fila entre">
        <EstadoChip estado={s.estado} />
        {s.estado !== "borrador" && (
          <span className="texto-chico" role="status">
            {conexion === "conectado" ? "Conectado" : conexion === "sin_servidor" ? "Servidor de subastas no disponible" : "Conectando…"}
          </span>
        )}
      </div>

      <section className="tarjeta pila" style={{ gap: 12, textAlign: "center" }}>
        <p className="texto-tenue">Código de la sala para tu live</p>
        <p className="codigo" style={{ fontSize: 40, fontWeight: 700, color: "var(--primario)", letterSpacing: 2 }}>{s.codigo_sala}</p>
        <div className="grilla-2" style={{ gap: 10 }}>
          <button className="boton boton-secundario" onClick={() => copiar("codigo")}>{copiado === "codigo" ? "Código copiado" : "Copiar código"}</button>
          <button className="boton boton-secundario" onClick={() => copiar("enlace")}>{copiado === "enlace" ? "Enlace copiado" : "Copiar enlace"}</button>
        </div>
        <p className="texto-chico">Compártelo en tu live o en tus grupos de WhatsApp. El código solo localiza la sala.</p>
      </section>

      <div className="fila" style={{ gap: 14 }}>
        <div style={{ width: 96, flexShrink: 0 }}><Ilustracion tipo={ilustracionDeCategoria(s.categoria)} alto={88} /></div>
        <div className="pila" style={{ gap: 4 }}>
          <h1 className="titulo-tarjeta" style={{ fontSize: 22 }}>{s.producto}</h1>
          <span className="texto-tenue">{s.tienda} · {s.categoria ?? "Sin categoría"}</span>
        </div>
      </div>

      {s.estado === "cerrada" ? (
        <section className="bloque-destacado pila" style={{ gap: 8 }}>
          <p className="texto-tenue">Resultado registrado</p>
          {s.ganador ? (
            <>
              <p className="titulo-tarjeta">Ganó {s.ganador}</p>
              <p className="monto-grande cifra">{bs(s.monto_ganador)}</p>
              <p className="texto-chico">{s.total_pujas} pujas aceptadas. Coordina el pago y la entrega con el ganador fuera de Remate.</p>
            </>
          ) : <p className="titulo-tarjeta">Terminó sin ofertas válidas.</p>}
          <Link className="boton boton-secundario" href={`/acta?codigo=${s.codigo_sala}`} style={{ alignSelf: "flex-start" }}>Ver acta de adjudicación</Link>
        </section>
      ) : (
        <section className="tarjeta tablero-bloque fila entre">
          <div>
            <p className="texto-chico">{s.oferta_vigente != null ? "Oferta vigente" : "Precio inicial"}</p>
            <p className="monto-grande cifra">{bs(s.oferta_vigente ?? s.precio_inicial)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="texto-chico">{s.estado === "abierta" ? "Cierra en" : "Duración"}</p>
            <p className="cifra" style={{ fontSize: 30, fontWeight: 700 }}>{s.estado === "abierta" ? (restante == null ? "—:—" : reloj(restante)) : reloj(s.duracion_seg)}</p>
          </div>
        </section>
      )}

      {s.estado === "abierta" && (
        <p className="aviso">Siguiente puja válida: desde {bs(siguiente)} · Incremento mínimo {bs(s.incremento_minimo)}</p>
      )}

      <section className="pila" style={{ gap: 10 }}>
        <div className="fila entre">
          <h2 className="titulo-tarjeta" style={{ fontSize: 16 }}>Pujas aceptadas</h2>
          <span className="texto-chico">{s.total_pujas} en total</span>
        </div>
        {s.ultimas_pujas.length === 0 ? <p className="texto-tenue">Todavía no hay pujas.</p>
          : s.ultimas_pujas.map((p) => (
              <div key={p.orden} className="fila entre" style={{ fontSize: 14 }}>
                <span className="texto-tenue">{p.postor} · <Hace fecha={p.aceptada_en} /></span>
                <strong className="cifra">{bs(p.monto)}</strong>
              </div>
            ))}
      </section>

      <hr className="separador" style={{ margin: 0 }} />

      {suspendida && s.estado !== "cerrada" && (
        <p className="aviso aviso-alerta">Tu cuenta o tu tienda está suspendida por administración: no puedes preparar ni abrir salas.</p>
      )}
      {s.estado === "borrador" && (
        <button className="boton boton-bloque" disabled={ocupado || suspendida} onClick={marcarLista}>Marcar como lista para abrir</button>
      )}
      {s.estado === "programada" && (
        <>
          <button className="boton boton-bloque" disabled={ocupado || suspendida} onClick={abrir}>{ocupado ? "Abriendo…" : "Abrir subasta"}</button>
          <p className="texto-chico">Al abrirla empieza el tiempo de {reloj(s.duracion_seg)}. Anuncia el código en el live antes de abrir.</p>
        </>
      )}
      {s.estado === "abierta" && (
        <p className="texto-chico">El cierre es automático. Solo cuentan las pujas aceptadas aquí, no los comentarios del live.</p>
      )}
      {aviso && <p className="aviso aviso-alerta" role="status">{aviso}</p>}
    </main>
  );
}
