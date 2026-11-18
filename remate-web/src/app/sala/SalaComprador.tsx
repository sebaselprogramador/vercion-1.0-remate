"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logotipo } from "@/components/Logo";
import { FotoProducto } from "@/components/FotoProducto";
import { EstadoChip } from "@/components/EstadoChip";
import { bs, reloj, sumarMontos } from "@/lib/formato";
import { Hace } from "@/components/Hace";
import type { EstadoSala } from "@/lib/salas";
import { mensajeRechazo, useSala, useSegundosRestantes } from "@/lib/useSala";
import { useSesion } from "@/lib/sesion";
import { CelebracionAdjudicacion } from "@/components/CelebracionAdjudicacion";

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
  sin_servidor: "Sin conexión en vivo",
} as const;

export function SalaComprador({ inicial, conSesion, usuarioId, esVendedorDeLaSala, cuentaSuspendida, tiendaSuspendida }: {
  inicial: EstadoSala; conSesion: boolean; usuarioId: string | null; esVendedorDeLaSala: boolean;
  cuentaSuspendida: boolean; tiendaSuspendida: boolean;
}) {
  const { estado: s, conexion, desfaseMs, pujar } = useSala(inicial);
  const { supabase } = useSesion();
  const restante = useSegundosRestantes(s.cierra_en, desfaseMs);
  const [mia, setMia] = useState<MiOferta | null>(null);

  const minimo = s.oferta_vigente != null ? sumarMontos(s.oferta_vigente, s.incremento_minimo) : s.precio_inicial;
  const [monto, setMonto] = useState(minimo);
  useEffect(() => setMonto(minimo), [minimo]);

  /** Envía la puja a la base. Si no llega respuesta, se puede reintentar con el mismo id sin duplicarla. */
  async function enviar(id: string, valor: string) {
    setMia({ fase: "enviando", id, monto: valor });
    const { resultado, error } = await pujar(id, valor);
    if (error) {
      const sinRed = /fetch|network|load failed|timeout/i.test(error.message);
      setMia(sinRed ? { fase: "sin_confirmar", id, monto: valor }
        : { fase: "rechazada", id, monto: valor, mensaje: traducirError(error.message) });
    } else if (resultado?.resultado === "aceptada") {
      setMia({ fase: "aceptada", id, monto: valor, mensaje: "Tu oferta quedó registrada." });
    } else {
      setMia({ fase: "rechazada", id, monto: valor, mensaje: traducirError(resultado?.motivo ?? undefined) });
    }
  }

  // Al cerrar, comprueba si la adjudicación es de esta cuenta para ofrecer el acta.
  const [gane, setGane] = useState(false);
  useEffect(() => {
    if (s.estado !== "cerrada" || !usuarioId || !s.ganador) return;
    let vigente = true;
    supabase.from("adjudicaciones").select("ganador_id, subastas!inner(codigo_sala)")
      .eq("subastas.codigo_sala", s.codigo_sala).maybeSingle()
      .then(({ data }) => { if (vigente) setGane(data?.ganador_id === usuarioId); });
    return () => { vigente = false; };
  }, [s.estado, s.ganador, s.codigo_sala, usuarioId, supabase]);

  // Animación cuando la subasta se cierra con la sala abierta en pantalla.
  const estadoAnterior = useRef(s.estado);
  const [celebrar, setCelebrar] = useState(false);
  useEffect(() => {
    if (estadoAnterior.current === "abierta" && s.estado === "cerrada") setCelebrar(true);
    estadoAnterior.current = s.estado;
  }, [s.estado]);
  const cerrarCelebracion = useCallback(() => setCelebrar(false), []);

  const abierta = s.estado === "abierta" && (restante == null || restante > 0);
  const puedeOfertar = abierta && conSesion && !esVendedorDeLaSala && !cuentaSuspendida && !tiendaSuspendida
    && conexion === "conectado" && mia?.fase !== "enviando";

  return (
    <main className="marco-movil pila" style={{ gap: 16 }}>
      {celebrar && (
        <CelebracionAdjudicacion esGanador={gane} ganador={s.ganador} monto={s.monto_ganador}
          producto={s.producto} onCerrar={cerrarCelebracion} />
      )}
      <header className="fila entre">
        <Link href="/" className="marca" aria-label="Remate, inicio"><Logotipo ancho={96} /></Link>
        <span className="texto-chico codigo">Sala {s.codigo_sala}</span>
      </header>
      <div className="fila entre">
        <EstadoChip estado={s.estado} />
        <span className="texto-chico" role="status">{textoConexion[conexion]}</span>
      </div>

      <FotoProducto url={s.imagen_url} categoria={s.categoria} alto={240} alt={s.producto} />
      <div className="pila" style={{ gap: 4 }}>
        <h1 className="titulo-tarjeta" style={{ fontSize: 26 }}>{s.producto}</h1>
        <span className="texto-tenue">{s.tienda} · {s.ciudad}</span>
      </div>
      {s.descripcion && <p className="descripcion-producto">{s.descripcion}</p>}

      {s.estado === "cerrada" ? (
        <section className="bloque-destacado pila" style={{ gap: 6 }}>
          <p className="texto-tenue">Subasta cerrada</p>
          {s.ganador
            ? <><p className="titulo-tarjeta">Ganó {s.ganador}</p><p className="monto-grande cifra">{bs(s.monto_ganador)}</p>
                {gane && <Link className="boton boton-secundario" href={`/acta?codigo=${s.codigo_sala}`} style={{ alignSelf: "flex-start" }}>Ver acta de adjudicación</Link>}</>
            : <p className="titulo-tarjeta">Terminó sin ofertas válidas.</p>}
        </section>
      ) : (
        <section className="tarjeta tablero-bloque fila entre">
          <div>
            <p className="texto-chico">{s.oferta_vigente != null ? "Oferta actual" : "Precio inicial"}</p>
            <p className="monto-grande cifra">{bs(s.oferta_vigente ?? s.precio_inicial)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="texto-chico">{s.estado === "abierta" ? "Cierra en" : "Duración"}</p>
            <p className="cifra" style={{ fontSize: 30, fontWeight: 700 }}>
              {s.estado === "abierta" ? (restante == null ? "—:—" : reloj(restante)) : reloj(s.duracion_seg)}
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
                <span className="texto-tenue">{p.postor} · <Hace fecha={p.aceptada_en} /></span>
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
        <Link className="boton boton-bloque" href={`/ingresar?volver=${encodeURIComponent(`/sala?codigo=${s.codigo_sala}`)}`}>Ingresa para ofertar</Link>
      ) : esVendedorDeLaSala ? (
        <p className="aviso">Esta es tu subasta: no puedes pujar en ella.</p>
      ) : cuentaSuspendida ? (
        <p className="aviso aviso-alerta">Tu cuenta está suspendida por administración: no puedes pujar.</p>
      ) : tiendaSuspendida && s.estado !== "cerrada" ? (
        <p className="aviso aviso-alerta">La tienda está suspendida por administración: esta sala no acepta pujas.</p>
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
  if (e && /sesion_requerida/.test(e)) return "Ingresa con tu cuenta para ofertar.";
  return (e && mensajeRechazo[e]) || "La puja no fue aceptada.";
}
