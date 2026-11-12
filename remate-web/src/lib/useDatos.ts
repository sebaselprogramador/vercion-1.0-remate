"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Carga datos en el navegador y permite volver a cargarlos (reemplaza el refresco de página del servidor).
 * `cargar` devuelve null cuando todavía no hay lo necesario (por ejemplo, la sesión).
 */
export function useDatos<T>(cargar: () => Promise<T | null>, deps: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    setError(false);
    cargar()
      .then((d) => { if (vigente && d !== null) setDatos(d); })
      .catch(() => { if (vigente) setError(true); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { datos, error, recargar };
}
