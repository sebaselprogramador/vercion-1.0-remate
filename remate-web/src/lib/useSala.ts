"use client";

import { useCallback, useEffect, useState } from "react";
import { cargarSala, type EstadoSala } from "@/lib/salas";
import { useSesion } from "@/lib/sesion";

export type Conexion = "conectando" | "conectado" | "reconectando" | "sin_servidor";

/** Resultado de la función pujar() de la base (tipo resultado_puja). */
export interface ResultadoPuja {
  resultado: "aceptada" | "rechazada";
  motivo: string | null;
  orden: number | null;
  oferta_vigente: string | null;
  cierra_en: string | null;
  total_pujas: number | null;
  repetida: boolean;
}

/** Mensajes para quien puja según el motivo de rechazo que registra la base. */
export const mensajeRechazo: Record<string, string> = {
  sala_inexistente: "No encontramos esa sala.",
  subasta_no_abierta: "La subasta no está abierta.",
  plazo_vencido: "El tiempo de la subasta terminó antes de recibir tu oferta.",
  tienda_suspendida: "La tienda está suspendida: esta sala no acepta pujas.",
  cuenta_suspendida: "Tu cuenta está suspendida: no puedes pujar.",
  vendedor_no_puede_pujar: "No puedes pujar por tus propios productos.",
  monto_invalido: "El monto no es válido. Usa hasta dos decimales.",
  monto_insuficiente: "Otra persona ofertó antes o el monto no alcanza el mínimo.",
  demasiadas_solicitudes: "Estás enviando ofertas muy rápido. Espera un momento.",
};

/**
 * Sala en tiempo real con Supabase: la base publica cada cambio de la subasta y cada puja aceptada
 * (Realtime), y la sala vuelve a leer su estado. Las pujas se registran con la función pujar() de la base,
 * que decide con su propio reloj y su bloqueo; la app solo muestra lo que la base confirmó.
 */
export function useSala(inicial: EstadoSala) {
  const { supabase } = useSesion();
  const [estado, setEstado] = useState(inicial);
  const [conexion, setConexion] = useState<Conexion>("conectando");
  const [desfaseMs, setDesfaseMs] = useState(0);
  const codigo = inicial.codigo_sala;

  // Si la página vuelve a cargar los datos (por ejemplo tras abrir la sala), se adopta el estado nuevo.
  useEffect(() => setEstado(inicial), [inicial]);

  const recargar = useCallback(async () => {
    const s = await cargarSala(supabase, codigo);
    if (s) setEstado(s);
  }, [supabase, codigo]);

  // Hora de la base: la cuenta regresiva se ajusta a ella, no al reloj del teléfono.
  useEffect(() => {
    const antes = Date.now();
    supabase.rpc("hora_servidor").then(({ data }) => {
      if (data) setDesfaseMs(new Date(data as string).getTime() - (antes + Date.now()) / 2);
    });
  }, [supabase]);

  useEffect(() => {
    const canal = supabase
      .channel(`sala-${codigo}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subastas", filter: `codigo_sala=eq.${codigo}` }, () => void recargar())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pujas", filter: `subasta_id=eq.${inicial.id}` }, () => void recargar())
      .subscribe((estadoCanal) => {
        if (estadoCanal === "SUBSCRIBED") {
          setConexion("conectado");
          void recargar(); // recupera lo ocurrido mientras no hubo conexión
        } else if (estadoCanal === "CHANNEL_ERROR" || estadoCanal === "TIMED_OUT") {
          setConexion("reconectando");
        } else if (estadoCanal === "CLOSED") {
          setConexion("sin_servidor");
        }
      });
    return () => { void supabase.removeChannel(canal); };
  }, [supabase, codigo, inicial.id, recargar]);

  // Al vencer el plazo, la base cierra la subasta en pocos segundos; se vuelve a leer por si el aviso se demora.
  useEffect(() => {
    if (estado.estado !== "abierta" || !estado.cierra_en) return;
    const espera = new Date(estado.cierra_en).getTime() - (Date.now() + desfaseMs) + 3000;
    const t = setTimeout(() => void recargar(), Math.max(1000, espera));
    return () => clearTimeout(t);
  }, [estado.estado, estado.cierra_en, desfaseMs, recargar]);

  /** Registra una puja. Reintentar con el mismo id devuelve el resultado ya registrado (no duplica). */
  const pujar = useCallback(async (idSolicitud: string, monto: string) => {
    const { data, error } = await supabase.rpc("pujar", { p_id_solicitud: idSolicitud, p_codigo_sala: codigo, p_monto: monto });
    if (!error) void recargar();
    return { resultado: (data as ResultadoPuja | null) ?? null, error };
  }, [supabase, codigo, recargar]);

  return { estado, conexion, desfaseMs, pujar, recargar };
}

/** Segundos restantes según la hora de la base. Es solo informativo: el cierre lo decide la base. */
export function useSegundosRestantes(cierraEn: string | null, desfaseMs: number): number | null {
  const calcular = () => (cierraEn ? Math.max(0, (new Date(cierraEn).getTime() - (Date.now() + desfaseMs)) / 1000) : 0);
  // null hasta montar en el navegador: la hora del visitante solo existe en su navegador.
  const [seg, setSeg] = useState<number | null>(null);
  useEffect(() => {
    setSeg(calcular());
    const t = setInterval(() => setSeg(calcular()), 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cierraEn, desfaseMs]);
  return seg;
}
