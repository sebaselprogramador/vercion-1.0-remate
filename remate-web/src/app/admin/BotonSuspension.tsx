"use client";

import { useState } from "react";
import { crearClienteSupabase } from "@/lib/supabase/cliente";

/**
 * Suspende o reactiva una cuenta o una tienda. La base de datos rechaza el cambio si quien lo pide
 * no es administrador, y nunca permite suspender a un administrador.
 */
export function BotonSuspension({ tipo, id, activo, nombre, onCambio }: { tipo: "cuenta" | "tienda"; id: string; activo: boolean; nombre: string; onCambio: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(false);

  async function cambiar() {
    if (activo && !window.confirm(`¿Suspender ${tipo === "cuenta" ? "la cuenta de" : "la tienda"} ${nombre}?`)) return;
    setOcupado(true);
    setError(false);
    const supabase = crearClienteSupabase();
    const { error } = tipo === "cuenta"
      ? await supabase.from("perfiles").update({ activo: !activo }).eq("id", id)
      : await supabase.from("tiendas").update({ activa: !activo }).eq("id", id);
    setOcupado(false);
    if (error) return setError(true);
    onCambio();
  }

  return (
    <div className="fila" style={{ gap: 8, justifyContent: "flex-end" }}>
      {error && <span className="texto-chico" style={{ color: "var(--error)" }}>No se pudo cambiar</span>}
      <button className="boton boton-secundario boton-chico" disabled={ocupado} onClick={() => void cambiar()}>
        {ocupado ? "Guardando…" : activo ? "Suspender" : "Reactivar"}
      </button>
    </div>
  );
}
