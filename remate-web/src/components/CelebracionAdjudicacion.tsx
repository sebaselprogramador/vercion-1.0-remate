"use client";

import { useEffect, useRef } from "react";
import { bs } from "@/lib/formato";

const COLORES = ["#c8ad7a", "#f3f4f1", "#5cbf8f", "#e5eee8", "#d6bd8a"];

/**
 * Animación del momento de adjudicación: el martillo golpea y aparece el resultado.
 * Para quien ganó, "¡Ganaste!"; para los demás, a quién se adjudicó. Con "reducir movimiento" se muestra sin animar.
 */
export function CelebracionAdjudicacion({ esGanador, ganador, monto, producto, onCerrar }: {
  esGanador: boolean; ganador: string | null; monto: string | null; producto: string; onCerrar: () => void;
}) {
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    boton.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);

  return (
    <div className="celebracion" role="dialog" aria-modal="true" aria-labelledby="celebracion-titulo">
      {esGanador && (
        <div className="confeti" aria-hidden="true">
          {Array.from({ length: 36 }, (_, i) => (
            <i key={i} style={{
              left: `${(i * 37) % 100}%`,
              background: COLORES[i % COLORES.length],
              animationDelay: `${(i % 9) * 0.12}s`,
              animationDuration: `${2.4 + (i % 5) * 0.35}s`,
            }} />
          ))}
        </div>
      )}
      <div className="celebracion-caja">
        <svg className="celebracion-martillo" width="84" height="84" viewBox="0 0 40 40" aria-hidden="true">
          <g transform="rotate(-38 20 20)">
            <rect x="9" y="8" width="22" height="11" rx="3" fill="#c8ad7a" />
            <rect x="18.2" y="18" width="3.6" height="17" rx="1.8" fill="#f3f4f1" />
          </g>
        </svg>
        <span className="celebracion-golpe" aria-hidden="true" />
        <h2 id="celebracion-titulo" className="celebracion-titulo">{esGanador ? "¡Ganaste!" : ganador ? "Adjudicado" : "Subasta cerrada"}</h2>
        {monto && <p className="celebracion-monto cifra">{bs(monto)}</p>}
        <p className="celebracion-texto">
          {esGanador
            ? `${producto} es tuyo. Coordina el pago y la entrega con la tienda.`
            : ganador ? `${producto} se adjudicó a ${ganador}.` : `${producto} terminó sin ofertas válidas.`}
        </p>
        <button ref={boton} className="boton boton-claro" onClick={onCerrar}>Continuar</button>
      </div>
    </div>
  );
}
