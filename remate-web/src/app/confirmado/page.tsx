"use client";

import { useEffect, useState } from "react";
import { Logotipo } from "@/components/Logo";

/**
 * Destino del enlace del correo de confirmación. Supabase confirma el correo antes de redirigir aquí;
 * si el enlace venció o ya se usó, Supabase agrega "error" a la dirección.
 */
export default function CorreoConfirmado() {
  const [estado, setEstado] = useState<"revisando" | "ok" | "error">("revisando");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search + "&" + window.location.hash.replace(/^#/, ""));
    setEstado(params.get("error") || params.get("error_code") ? "error" : "ok");
  }, []);

  return (
    <main className="confirmado">
      <div className="confirmado-caja">
        <Logotipo ancho={150} />
        {estado === "revisando" ? null : estado === "ok" ? (
          <>
            <div className="confirmado-sello" aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </div>
            <h1 className="titulo-seccion" style={{ fontSize: 26 }}>Tu correo ha sido confirmado</h1>
            <p className="texto-tenue">Ya puedes cerrar esta pestaña.</p>
          </>
        ) : (
          <>
            <h1 className="titulo-seccion" style={{ fontSize: 26 }}>No pudimos confirmar tu correo</h1>
            <p className="texto-tenue">El enlace venció o ya fue usado. Si ya confirmaste tu correo, puedes cerrar esta pestaña e ingresar a Remate.</p>
          </>
        )}
      </div>
    </main>
  );
}
