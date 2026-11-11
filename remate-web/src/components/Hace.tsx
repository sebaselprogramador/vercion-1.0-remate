"use client";

import { useEffect, useState } from "react";
import { hace } from "@/lib/formato";

/**
 * "hace 8 s": se calcula solo en el navegador, porque el servidor no conoce la hora del visitante
 * y la diferencia provocaba un error de hidratación de React.
 */
export function Hace({ fecha }: { fecha: string }) {
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => {
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  return <>{ahora == null ? "" : hace(fecha, ahora)}</>;
}
