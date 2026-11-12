"use client";

import { useState } from "react";
import { crearClienteSupabase } from "@/lib/supabase/cliente";

const roles = [
  { valor: "comprador", texto: "Comprador" },
  { valor: "vendedor", texto: "Vendedor" },
  { valor: "administrador", texto: "Administrador" },
];

/** Cambia el rol de una cuenta. La base de datos rechaza el cambio si quien lo pide no es administrador. */
export function SelectorRol({ perfilId, rol, deshabilitado, onCambio }: { perfilId: string; rol: string; deshabilitado: boolean; onCambio: () => void }) {
  const [valor, setValor] = useState(rol);
  const [estado, setEstado] = useState<"" | "guardando" | "error">("");

  async function cambiar(nuevo: string) {
    if (nuevo === "administrador" && !window.confirm("¿Dar permisos de administrador a esta cuenta?")) return;
    const anterior = valor;
    setValor(nuevo);
    setEstado("guardando");
    const { error } = await crearClienteSupabase().from("perfiles").update({ rol: nuevo }).eq("id", perfilId);
    if (error) {
      setValor(anterior);
      setEstado("error");
      return;
    }
    setEstado("");
    onCambio();
  }

  return (
    <div className="fila" style={{ gap: 8 }}>
      <select className="entrada" style={{ minHeight: 38, maxWidth: 170 }} value={valor} disabled={deshabilitado || estado === "guardando"}
        onChange={(e) => void cambiar(e.target.value)} aria-label="Rol de la cuenta">
        {roles.map((r) => <option key={r.valor} value={r.valor}>{r.texto}</option>)}
      </select>
      {estado === "error" && <span className="texto-chico" style={{ color: "var(--alerta)" }}>No se pudo cambiar</span>}
    </div>
  );
}
