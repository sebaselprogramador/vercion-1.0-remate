"use client";

import { EstadoChip } from "./EstadoChip";
import { bs, cifra, reloj } from "@/lib/formato";
import type { EstadoSala } from "@/lib/salas";
import type { Conexion } from "@/lib/useSala";

const textoConexion: Record<Conexion, string> = {
  conectando: "Conectando…",
  conectado: "En directo",
  reconectando: "Reconectando…",
  sin_servidor: "Sin conexión con la sala",
};

/**
 * Tablero de precio de una sala. El reloj es informativo: el cierre lo decide el servidor.
 */
export function Tablero({ s, restante, conexion }: { s: EstadoSala; restante: number | null; conexion?: Conexion }) {
  const precio = s.estado === "cerrada" ? s.monto_ganador ?? s.oferta_vigente : s.oferta_vigente ?? s.precio_inicial;
  const etiqueta =
    s.estado === "cerrada" ? (s.ganador ? "Precio de adjudicación" : "Sin ofertas válidas")
    : s.oferta_vigente != null ? "Oferta actual" : "Precio inicial";

  return (
    <section className="tablero" aria-label="Estado de la subasta">
      <div className="tablero-cabecera">
        <EstadoChip estado={s.estado} />
        <span className="tablero-etiqueta fila" style={{ gap: 14 }}>
          {conexion && s.estado !== "borrador" && <span>{textoConexion[conexion]}</span>}
          <span>Sala <strong className="codigo" style={{ color: "#fff" }}>{s.codigo_sala}</strong></span>
        </span>
      </div>

      <div className="pila" style={{ gap: 8 }}>
        <span className="tablero-etiqueta">{etiqueta}</span>
        <span key={String(precio)} className="tablero-precio precio-cambio" aria-live="polite">
          <small>Bs</small>{cifra(precio ?? s.precio_inicial)}
        </span>
      </div>

      <div className="fila entre" style={{ gap: 16, alignItems: "flex-end" }}>
        <div className="pila" style={{ gap: 2 }}>
          <span className="tablero-etiqueta">
            {s.estado === "cerrada" ? "Ganador" : s.postor_vigente ? "Va ganando" : "Pujas"}
          </span>
          <span style={{ fontWeight: 600, fontSize: 17 }}>
            {s.estado === "cerrada" ? s.ganador ?? "Nadie" : s.postor_vigente ?? "Todavía no hay"}
          </span>
        </div>
        <div className="pila" style={{ gap: 2, alignItems: "flex-end" }}>
          <span className="tablero-etiqueta">{s.estado === "abierta" ? "Cierra en" : s.estado === "cerrada" ? "Estado" : "Duración"}</span>
          <span className={`tablero-reloj ${s.estado === "abierta" && restante != null && restante <= 10 ? "urgente" : ""}`}>
            {s.estado === "abierta" ? (restante == null ? "—:—" : restante > 0 ? reloj(restante) : "Cerrando…") : s.estado === "cerrada" ? "Cerrada" : reloj(s.duracion_seg)}
          </span>
        </div>
      </div>

      <div className="tablero-pie">
        <span>Incremento mínimo <strong>{bs(s.incremento_minimo)}</strong></span>
        <span><strong>{s.total_pujas}</strong> {s.total_pujas === 1 ? "puja aceptada" : "pujas aceptadas"}</span>
      </div>
    </section>
  );
}
