"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ilustracion, ilustracionDeCategoria } from "@/components/Ilustracion";
import { Tablero } from "@/components/Tablero";
import { Historial } from "@/components/Historial";
import { bs, sumarMontos } from "@/lib/formato";
import type { EstadoSala } from "@/lib/salas";
import { useSala, useSegundosRestantes } from "@/lib/useSala";

/** Estados de la última oferta propia (coinciden con la propuesta "Qué ocurre después de ofertar"). */
type MiOferta =
  | { fase: "enviando"; id: string; monto: string }
  | { fase: "aceptada"; id: string; monto: string; mensaje: string }
  | { fase: "rechazada"; id: string; monto: string; mensaje: string }
  | { fase: "sin_confirmar"; id: string; monto: string };

/** Acepta montos con hasta dos decimales y mayores que cero. */
function montoValido(t: string) {
  const l = t.trim().replace(",", ".");
  return /^\d{1,10}(\.\d{1,2})?$/.test(l) && Number(l) > 0 ? l : null;
}

export function SalaComprador({ inicial, conSesion, esVendedorDeLaSala }: {
  inicial: EstadoSala; conSesion: boolean; esVendedorDeLaSala: boolean;
}) {
  const { estado: s, conexion, desfaseMs, misSolicitudes, socketRef } = useSala(inicial);
  const restante = useSegundosRestantes(s.cierra_en, desfaseMs);
  const [mia, setMia] = useState<MiOferta | null>(null);

  const minimo = s.oferta_vigente != null ? sumarMontos(s.oferta_vigente, s.incremento_minimo) : s.precio_inicial;
  const opciones = [minimo, sumarMontos(minimo, s.incremento_minimo), sumarMontos(minimo, sumarMontos(s.incremento_minimo, s.incremento_minimo))];
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
        if (err || !r || (!r.ok && r.error === "resultado_no_confirmado")) setMia({ fase: "sin_confirmar", id, monto: valor });
        else if (r.ok && r.resultado === "aceptada") setMia({ fase: "aceptada", id, monto: valor, mensaje: r.mensaje ?? "Tu oferta quedó registrada." });
        else setMia({ fase: "rechazada", id, monto: valor, mensaje: r.mensaje ?? traducirError(r.error) });
      });
  }

  const valido = montoValido(monto);
  const bajoMinimo = valido != null && Number(valido) < Number(minimo);
  const abierta = s.estado === "abierta" && (restante == null || restante > 0);
  const puedeOfertar = abierta && conSesion && !esVendedorDeLaSala && conexion === "conectado" && mia?.fase !== "enviando";

  return (
    <main className="contenedor pagina">
      <div className="sala">
        <div className="sala-columna sala-tablero">
          <Tablero s={s} restante={restante} conexion={conexion} />

          {mia && <EstadoMiOferta mia={mia} onReintentar={() => enviar(mia.id, mia.monto)} />}

          {s.estado === "abierta" && (
            <section className="panel pila" style={{ gap: 14 }} aria-label="Hacer una oferta">
              {!conSesion ? (
                <>
                  <p className="texto-guia">Ingresa con tu cuenta para ofertar. Tu nombre visible aparecerá en el historial de la sala.</p>
                  <Link className="boton boton-grande boton-bloque" href={`/ingresar?volver=/sala/${s.codigo_sala}`}>Ingresar para ofertar</Link>
                </>
              ) : esVendedorDeLaSala ? (
                <p className="aviso aviso-neutro">Esta es tu subasta. Puedes seguirla aquí, pero no pujar en ella.</p>
              ) : (
                <>
                  <div className="fila entre">
                    <span style={{ fontWeight: 600 }}>Tu oferta</span>
                    <span className="texto-chico">Mínimo {bs(minimo)}</span>
                  </div>
                  <div className="pujas-rapidas" role="group" aria-label="Montos sugeridos">
                    {opciones.map((o) => (
                      <button key={o} type="button" className="puja-rapida" aria-pressed={monto === o}
                        disabled={!puedeOfertar} onClick={() => setMonto(o)}>{bs(o)}</button>
                    ))}
                  </div>
                  <div className="campo">
                    <label htmlFor="monto" className="texto-chico" style={{ fontWeight: 500 }}>Otro monto</label>
                    <div className="entrada-moneda">
                      <input id="monto" className="entrada" inputMode="decimal" value={monto} disabled={!puedeOfertar}
                        onChange={(e) => setMonto(e.target.value)} aria-invalid={!valido || bajoMinimo} />
                    </div>
                    {bajoMinimo && <span className="error">La oferta debe ser de al menos {bs(minimo)}.</span>}
                  </div>
                  <button className="boton boton-grande boton-bloque" disabled={!puedeOfertar || !valido || bajoMinimo}
                    onClick={() => valido && enviar(crypto.randomUUID(), valido)}>
                    {mia?.fase === "enviando" ? "Enviando…" : `Ofertar ${valido ? bs(valido) : ""}`}
                  </button>
                  {conexion === "sin_servidor" && (
                    <p className="aviso aviso-error">No hay conexión con la sala. Revisa tu internet; cuando vuelva, la sala se actualizará sola.</p>
                  )}
                </>
              )}
            </section>
          )}
          {s.estado === "programada" && (
            <p className="aviso aviso-neutro">Esta subasta todavía no abre. Cuando el vendedor la inicie en su live, podrás ofertar aquí sin recargar la página.</p>
          )}
        </div>

        <div className="sala-columna">
          <div className="fila" style={{ gap: 18, alignItems: "flex-start" }}>
            <div style={{ width: 120, flexShrink: 0 }}><Ilustracion tipo={ilustracionDeCategoria(s.categoria)} alto={120} /></div>
            <div className="pila" style={{ gap: 6 }}>
              <h1 className="titulo-pagina">{s.producto}</h1>
              <p className="texto-tenue">{s.tienda}, {s.ciudad}{s.categoria ? `. ${s.categoria}` : ""}</p>
            </div>
          </div>
          {s.descripcion && <p className="texto-guia">{s.descripcion}</p>}

          <section className="panel pila" style={{ gap: 4 }}>
            <h2 className="titulo-seccion" style={{ fontSize: 17, marginBottom: 6 }}>Historial de pujas</h2>
            <Historial pujas={s.ultimas_pujas} />
          </section>

          <section className="pila" style={{ gap: 8 }}>
            <h2 className="titulo-seccion" style={{ fontSize: 17 }}>Cómo funciona esta sala</h2>
            <ul className="texto-tenue" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              <li>Solo cuentan las pujas aceptadas aquí, no los comentarios del live.</li>
              <li>Cada oferta debe superar la actual al menos por {bs(s.incremento_minimo)}.</li>
              <li>Gana la oferta más alta registrada cuando termina el tiempo.</li>
              <li>El pago y la entrega se coordinan con el vendedor, fuera de Remate.</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

function EstadoMiOferta({ mia, onReintentar }: { mia: MiOferta; onReintentar: () => void }) {
  if (mia.fase === "enviando")
    return <div className="aviso aviso-neutro" role="status"><strong>Enviando tu puja de {bs(mia.monto)}</strong>Esperando la confirmación de la sala.</div>;
  if (mia.fase === "aceptada")
    return <div className="aviso aviso-propio" role="status"><strong>Puja aceptada: {bs(mia.monto)}</strong>{mia.mensaje}</div>;
  if (mia.fase === "rechazada")
    return <div className="aviso aviso-error" role="status"><strong>Puja rechazada: {bs(mia.monto)}</strong>{mia.mensaje}</div>;
  return (
    <div className="aviso aviso-error pila" role="status" style={{ gap: 10 }}>
      <span><strong>No pudimos confirmar tu puja de {bs(mia.monto)}</strong>Puede haberse registrado. Reintentar no la duplica.</span>
      <button className="boton boton-secundario boton-chico" style={{ alignSelf: "flex-start" }} onClick={onReintentar}>Reintentar</button>
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
