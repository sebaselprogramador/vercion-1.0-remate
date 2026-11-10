"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tablero } from "@/components/Tablero";
import { Historial } from "@/components/Historial";
import { API_URL, bs, reloj, sumarMontos } from "@/lib/formato";
import type { EstadoSala } from "@/lib/salas";
import { crearClienteSupabase } from "@/lib/supabase/cliente";
import { useSala, useSegundosRestantes } from "@/lib/useSala";

/**
 * Sala del vendedor, pensada para usar en el teléfono durante el live.
 * El reloj es informativo: el cierre real lo decide el servidor con el vencimiento guardado.
 */
export function SalaVendedor({ inicial }: { inicial: EstadoSala }) {
  const router = useRouter();
  const { estado: s, conexion, desfaseMs } = useSala(inicial);
  const restante = useSegundosRestantes(s.cierra_en, desfaseMs);
  const [copiado, setCopiado] = useState<"codigo" | "enlace" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function copiar(que: "codigo" | "enlace") {
    const texto = que === "codigo" ? s.codigo_sala : `${window.location.origin}/sala/${s.codigo_sala}`;
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
    if (error) return setAviso("No se pudo actualizar la subasta. Inténtalo de nuevo.");
    router.refresh();
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
      if (!r.ok) throw new Error(String(r.status));
      router.refresh();
    } catch {
      setAviso("No se pudo abrir la sala porque el servidor de subastas no respondió. Verifica que esté en marcha y vuelve a intentarlo.");
    } finally {
      setOcupado(false);
    }
  }

  const siguiente = s.oferta_vigente != null ? sumarMontos(s.oferta_vigente, s.incremento_minimo) : s.precio_inicial;

  return (
    <main className="contenedor pagina">
      <div className="fila entre envolver" style={{ gap: 12 }}>
        <div className="pila" style={{ gap: 4 }}>
          <Link href="/vendedor" className="texto-chico">Mis subastas</Link>
          <h1 className="titulo-pagina">{s.producto}</h1>
        </div>
      </div>

      <div className="sala">
        <div className="sala-columna sala-tablero">
          <Tablero s={s} restante={restante} conexion={s.estado === "borrador" ? undefined : conexion} />

          {s.estado === "borrador" && (
            <section className="panel pila" style={{ gap: 12 }}>
              <p className="texto-guia">Este borrador todavía no es visible para los compradores. Márcalo como listo cuando quieras anunciarlo.</p>
              <button className="boton boton-grande boton-bloque" disabled={ocupado} onClick={marcarLista}>Marcar como lista para abrir</button>
            </section>
          )}
          {s.estado === "programada" && (
            <section className="panel pila" style={{ gap: 12 }}>
              <p className="texto-guia">Anuncia el código en tu live y, cuando presentes el producto, abre la subasta. Desde ese momento corre el tiempo de {reloj(s.duracion_seg)}.</p>
              <button className="boton boton-grande boton-bloque" disabled={ocupado} onClick={abrir}>{ocupado ? "Abriendo…" : "Abrir subasta"}</button>
            </section>
          )}
          {s.estado === "abierta" && (
            <p className="aviso">Siguiente puja válida desde <strong style={{ display: "inline" }}>{bs(siguiente)}</strong>. El cierre es automático.</p>
          )}
          {s.estado === "cerrada" && (
            <p className="aviso aviso-propio">
              {s.ganador
                ? <>Coordina el pago y la entrega con <strong style={{ display: "inline" }}>{s.ganador}</strong> fuera de Remate. La adjudicación no confirma un pago.</>
                : "La subasta terminó sin ofertas válidas. Puedes preparar otra con el mismo producto."}
            </p>
          )}
          {aviso && <p className="aviso aviso-error" role="alert">{aviso}</p>}
        </div>

        <div className="sala-columna">
          <section className="panel pila" style={{ gap: 14 }}>
            <div className="pila" style={{ gap: 4 }}>
              <span className="texto-chico">Código para tu live</span>
              <span className="codigo-sala">{s.codigo_sala}</span>
            </div>
            <div className="grilla-2" style={{ gap: 8 }}>
              <button className="boton boton-secundario" onClick={() => copiar("codigo")}>{copiado === "codigo" ? "Código copiado" : "Copiar código"}</button>
              <button className="boton boton-secundario" onClick={() => copiar("enlace")}>{copiado === "enlace" ? "Enlace copiado" : "Copiar enlace"}</button>
            </div>
            <p className="texto-chico">Compártelo en el live o en tus grupos de WhatsApp. El código solo sirve para encontrar la sala; no da permisos sobre ella.</p>
          </section>

          <section className="panel pila" style={{ gap: 4 }}>
            <h2 className="titulo-seccion" style={{ fontSize: 17, marginBottom: 6 }}>Pujas aceptadas</h2>
            <Historial pujas={s.ultimas_pujas} limite={10} />
          </section>
        </div>
      </div>
    </main>
  );
}
