"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { crearClienteSupabase } from "@/lib/supabase/cliente";
import { API_URL } from "@/lib/formato";
import type { EstadoSala } from "@/lib/salas";

export type Conexion = "conectando" | "conectado" | "reconectando" | "sin_servidor";

export interface SolicitudPropia {
  id_solicitud: string;
  monto: string;
  resultado: "aceptada" | "rechazada";
  motivo: string | null;
}

/**
 * Conecta la sala al servidor de subastas (Socket.IO).
 * Al conectarse y al reconectarse pide el estado registrado, así se recupera lo ocurrido durante una desconexión.
 */
export function useSala(inicial: EstadoSala) {
  const [estado, setEstado] = useState(inicial);
  const [conexion, setConexion] = useState<Conexion>("conectando");
  const [desfaseMs, setDesfaseMs] = useState(0);
  const [misSolicitudes, setMisSolicitudes] = useState<SolicitudPropia[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Si la página vuelve a cargar los datos (por ejemplo tras abrir la sala), se adopta el estado nuevo.
  useEffect(() => setEstado(inicial), [inicial]);

  useEffect(() => {
    let cancelado = false;
    let socket: Socket | null = null;

    (async () => {
      const { data } = await crearClienteSupabase().auth.getSession();
      if (cancelado) return;
      socket = io(`${API_URL}/salas`, {
        auth: data.session ? { token: data.session.access_token } : {},
        reconnectionDelayMax: 5000,
        timeout: 5000,
      });
      socketRef.current = socket;

      const unirse = () =>
        socket!.timeout(8000).emit("unirse", { codigo: inicial.codigo_sala }, (err: unknown, r: {
          ok: boolean; estado?: EstadoSala; mis_solicitudes?: SolicitudPropia[];
        }) => {
          if (err || !r?.ok || !r.estado) return;
          setEstado(r.estado);
          if (r.estado.hora_servidor) setDesfaseMs(new Date(r.estado.hora_servidor).getTime() - Date.now());
          setMisSolicitudes(r.mis_solicitudes ?? []);
        });

      socket.on("connect", () => { setConexion("conectado"); unirse(); });
      socket.on("disconnect", () => setConexion("reconectando"));
      socket.on("connect_error", () => setConexion(socket?.active ? "reconectando" : "sin_servidor"));
      socket.io.on("reconnect_failed", () => setConexion("sin_servidor"));
      socket.on("estado", (e: EstadoSala) => {
        setEstado(e);
        if (e.hora_servidor) setDesfaseMs(new Date(e.hora_servidor).getTime() - Date.now());
      });
      // Si tras unos segundos no hay conexión, se informa que el servidor no está disponible.
      setTimeout(() => { if (!cancelado && !socket?.connected) setConexion("sin_servidor"); }, 6000);
    })();

    return () => {
      cancelado = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [inicial.codigo_sala]);

  return { estado, conexion, desfaseMs, misSolicitudes, socketRef };
}

/** Segundos restantes según la hora del servidor. Es solo informativo: el cierre lo decide el servidor. */
export function useSegundosRestantes(cierraEn: string | null, desfaseMs: number): number | null {
  const calcular = () => (cierraEn ? Math.max(0, (new Date(cierraEn).getTime() - (Date.now() + desfaseMs)) / 1000) : 0);
  // null hasta montar en el navegador: el servidor no conoce la hora del visitante.
  const [seg, setSeg] = useState<number | null>(null);
  useEffect(() => {
    setSeg(calcular());
    const t = setInterval(() => setSeg(calcular()), 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cierraEn, desfaseMs]);
  return seg;
}
