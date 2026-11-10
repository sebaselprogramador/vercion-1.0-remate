"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ilustracion, ilustracionDeCategoria } from "@/components/Ilustracion";
import { EstadoChip } from "@/components/EstadoChip";
import { bs, hace, reloj, sumarMontos } from "@/lib/formato";
import type { EstadoSala } from "@/lib/salas";
import { useSala, useSegundosRestantes } from "@/lib/useSala";

/** Estados de la última oferta propia (coinciden con la propuesta "Qué ocurre después de ofertar"). */
type MiOferta =
  | { fase: "enviando"; id: string; monto: string }
  | { fase: "aceptada"; id: string; monto: string; mensaje: string }
  | { fase: "rechazada"; id: string; monto: string; mensaje: string }
  | { fase: "sin_confirmar"; id: string; monto: string };

const textoConexion = {
  conectando: "Conectando…",
  conectado: "Conectado",
  reconectando: "Reconectando…",
  sin_servidor: "Servidor de subastas no disponible",
} as const;

export function SalaComprador({ inicial, conSesion, esVendedorDeLaSala }: {
  inicial: EstadoSala; conSesion: boolean; esVendedorDeLaSala: boolean;
}) {
  const { estado: s, conexion, desfaseMs, misSolicitudes, socketRef } = useSala(inicial);
  const restante = useSegundosRestantes(s.cierra_en, desfaseMs);
  const [mia, setMia] = useState<MiOferta | null>(null);

  const minimo = s.oferta_vigente != null ? sumarMontos(s.oferta_vigente, s.incremento_minimo) : s.precio_inicial;
  const [monto, setMonto] = useState(minimo);
  useEffect(() => setMonto(minimo), [minimo]);

  // Tras reconectarse, resuelve una oferta que había quedado sin confirmar con el registro del servidor.
  useEffect(() => {
    if (!mia || (mia.fase !== "sin_confirmar" && mia.fase !== "enviando")) return;
    const registrada = misSolicitudes.find((x) => x.id_solicitud === mia.id);
    if (registrada) {
      setMia(registrada.resultado === "aceptada"
        ? { fase: "aceptada", id: mia.id, monto: mia.monto, mensaje: "Tu oferta quedó registrada." }
        : { fase: "rechazada", id: mia.id, monto: mia.monto, mensaje: "Tu oferta no fue aceptada." });
    }
  }, [misSolicitudes, mia]);

  function enviar(id: string, valor: string) {
    const socket = socketRef.current;
    setMia({ fase: "enviando", id, monto: valor });
    if (!socket?.connected) {
      setMia({ fase: "sin_confirmar", id, monto: valor });
      return;
    }
    socket.timeout(8000).emit("pujar", { codigo: s.codigo_sala, idSolicitud: id, monto: valor },
      (err: unknown, r: { ok: boolean; resultado?: string; mensaje?: string; error?: string }) => {
        if (err || !r || (!r.ok && r.error === "resultado_no_confirmado")) {
          setMia({ fase: "sin_confirmar", id, monto: valor });
        } else if (r.ok && r.resultado === "aceptada") {
          setMia({ fase: "aceptada", id, monto: valor, mensaje: r.mensaje ?? "Tu oferta quedó registrada." });
        } else {
          setMia({ fase: "rechazada", id, monto: valor, mensaje: r.mensaje ?? traducirError(r.error) });
        }
      });
  }

  const abierta = s.estado === "abierta" && restante > 0;
  const puedeOfertar = abierta && conSesion && !esVendedorDeLaSala && conexion === "conectado" && mia?.fase !== "enviando";

  return (
    <main className="marco-movil pila" style={{ gap: 16 }}>
      <header className="fila entre">
        <Link href="/" className="marca" style={{ fontSize: 28 }}>remate.</Link>
        <span className="texto-chico codigo">Sala {s.codigo_sala}</span>
      </header>
      <div className="fila entre">
        <EstadoChip estado={s.estado} />
        <span className="texto-chico" role="status">{textoConexion[conexion]}</span>
      </div>

      <Ilustracion tipo={ilustracionDeCategoria(s.categoria)} alto={200} />
      <div className="pila" style={{ gap: 4 }}>
        <h1 className="titulo-tarjeta" style={{ fontSize: 26 }}>{s.producto}</h1>
        <span className="texto-tenue">{s.tienda} · {s.ciudad}</span>
      </div>

      {s.estado === "cerrada" ? (
        <section className="bloque-destacado pila" style={{ gap: 6 }}>
          <p className="texto-tenue">Subasta cerrada</p>
          {s.ganador
            ? <><p className="titulo-tarjeta">Ganó {s.ganador}</p><p className="monto-grande cifra">{bs(s.monto_ganador)}</p></>
            : <p className="titulo-tarjeta">Terminó sin ofertas válidas.</p>}
        </section>
      ) : (
        <section className="tarjeta fila entre">
          <div>
            <p className="texto-chico">{s.oferta_vigente != null ? "Oferta actual" : "Precio inicial"}</p>
            <p className="monto-grande cifra">{bs(s.oferta_vigente ?? s.precio_inicial)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="texto-chico">{s.estado === "abierta" ? "Cierra en" : "Duración"}</p>
            <p className="cifra" style={{ fontSize: 30, fontWeight: 700 }}>
              {s.estado === "abierta" ? reloj(restante) : reloj(s.duracion_seg)}
            </p>
          </div>
        </section>
      )}

      {mia && <EstadoMiOferta mia={mia} onReintentar={() => enviar(mia.id, mia.monto)} />}

      <section className="pila" style={{ gap: 10 }}>
        <h2 className="titulo-tarjeta" style={{ fontSize: 16 }}>Últimas pujas</h2>
        {s.ultimas_pujas.length === 0
          ? <p className="texto-tenue">Todavía no hay pujas.</p>
          : s.ultimas_pujas.slice(0, 5).map((p) => (
              <div key={p.orden} className="fila entre" style={{ fontSize: 14 }}>
                <span className="texto-tenue">{p.postor} · {hace(p.aceptada_en)}</span>
                <strong className="cifra">{bs(p.monto)}</strong>
              </div>
            ))}
      </section>

      <hr className="separador" style={{ margin: 0 }} />

      {s.estado === "abierta" && (
        <>
          <p className="texto-chico">Mínimo para ofertar: {bs(minimo)} · Incremento mínimo: {bs(s.incremento_minimo)}</p>
          <div className="campo">
            <label htmlFor="monto">Tu oferta (Bs)</label>
            <input id="monto" className="entrada cifra" inputMode="decimal" value={monto}
              onChange={(e) => setMonto(e.target.value)} disabled={!puedeOfertar} />
          </div>
        </>
      )}

      {!conSesion && s.estado === "abierta" ? (
        <Link className="boton boton-bloque" href={`/ingresar?volver=/sala/${s.codigo_sala}`}>Ingresa para ofertar</Link>
      ) : esVendedorDeLaSala ? (
        <p className="aviso">Esta es tu subasta: no puedes pujar en ella.</p>
      ) : (
        <button className="boton boton-bloque" disabled={!puedeOfertar}
          onClick={() => enviar(crypto.randomUUID(), monto)}>
          {s.estado === "abierta" ? `Ofertar ${bs(monto)}` : s.estado === "cerrada" ? "Subasta cerrada" : "Aún no abre"}
        </button>
      )}
      <p className="texto-chico">Solo cuentan las pujas aceptadas aquí, no los comentarios del live. Enviar una oferta no la acepta: espera la confirmación.</p>
    </main>
  );
}

function EstadoMiOferta({ mia, onReintentar }: { mia: MiOferta; onReintentar: () => void }) {
  if (mia.fase === "enviando")
    return <p className="aviso" role="status"><strong>Enviando tu puja de {bs(mia.monto)}</strong><br />Esperando confirmación de la sala.</p>;
  if (mia.fase === "aceptada")
    return <p className="aviso" role="status"><strong>Puja aceptada: {bs(mia.monto)}</strong><br />{mia.mensaje}</p>;
  if (mia.fase === "rechazada")
    return <p className="aviso aviso-alerta" role="status"><strong>Puja rechazada: {bs(mia.monto)}</strong><br />{mia.mensaje}</p>;
  return (
    <div className="aviso aviso-alerta pila" role="status" style={{ gap: 8 }}>
      <span><strong>No pudimos confirmar tu puja de {bs(mia.monto)}</strong><br />Puede haberse registrado. Reintentar no la duplica.</span>
      <button className="boton boton-secundario" onClick={onReintentar}>Reintentar</button>
    </div>
  );
}

function traducirError(e?: string) {
  const m: Record<string, string> = {
    sesion_requerida: "Ingresa con tu cuenta para ofertar.",
    demasiadas_solicitudes: "Estás enviando ofertas muy rápido. Espera un momento.",
    monto_invalido: "El monto no es válido. Usa hasta dos decimales.",
  };
  return (e && m[e]) || "La puja no fue aceptada.";
}
