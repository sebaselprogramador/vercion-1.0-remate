"use client";

import { useEffect, useState } from "react";
import { bs, hace } from "@/lib/formato";
import type { EstadoSala } from "@/lib/salas";

/**
 * Pujas aceptadas, de la más reciente a la más antigua. La primera es la que va ganando.
 * El tiempo relativo se calcula solo en el navegador para que coincida con el reloj del visitante.
 */
export function Historial({ pujas, limite = 8 }: { pujas: EstadoSala["ultimas_pujas"]; limite?: number }) {
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => {
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  if (pujas.length === 0) {
    return <p className="texto-tenue" style={{ padding: "8px 0" }}>Todavía no hay pujas aceptadas.</p>;
  }
  return (
    <div className="historial">
      {pujas.slice(0, limite).map((p, i) => (
        <div key={p.orden} className={`historial-fila ${i === 0 ? "lider" : ""}`}>
          <span className="quien">{p.postor}</span>
          <span className="cuando">
            {i === 0 ? "Oferta más alta" : `Puja n.º ${p.orden}`}
            {ahora != null && `, ${hace(p.aceptada_en, ahora)}`}
          </span>
          <span className="cuanto">{bs(p.monto)}</span>
        </div>
      ))}
    </div>
  );
}
