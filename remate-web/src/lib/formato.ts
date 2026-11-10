export type EstadoSubasta = "borrador" | "programada" | "abierta" | "cerrada" | "cancelada";

export const etiquetaEstado: Record<EstadoSubasta, string> = {
  borrador: "Borrador",
  programada: "Lista para abrir",
  abierta: "En curso",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};

/** Formatea un importe recibido como número o texto decimal (la base devuelve numeric como texto). */
export function bs(monto: number | string | null | undefined) {
  if (monto == null) return "Bs —";
  const n = typeof monto === "string" ? Number(monto) : monto;
  return `Bs ${n.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Solo la cifra, sin "Bs" (para el tablero de precio). */
export function cifra(monto: number | string | null | undefined) {
  if (monto == null) return "—";
  const n = typeof monto === "string" ? Number(monto) : monto;
  return n.toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Suma dos importes decimales con exactitud de centavos (evita errores de punto flotante). */
export function sumarMontos(a: number | string, b: number | string) {
  const c = Math.round(Number(a) * 100) + Math.round(Number(b) * 100);
  return (c / 100).toFixed(2).replace(/\.00$/, "");
}

export function reloj(seg: number) {
  const s = Math.max(0, Math.floor(seg));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function hace(fechaIso: string, ahora: number = Date.now()) {
  const seg = Math.max(0, Math.round((ahora - new Date(fechaIso).getTime()) / 1000));
  if (seg < 60) return `hace ${seg} s`;
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  return new Date(fechaIso).toLocaleDateString("es-BO");
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
