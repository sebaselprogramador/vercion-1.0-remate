"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/sesion";

/** Cierra la sesión y vuelve al login. */
export function BotonSalir() {
  const router = useRouter();
  const { supabase, recargar } = useSesion();
  const [saliendo, setSaliendo] = useState(false);
  return (
    <button className="boton boton-secundario" disabled={saliendo} onClick={async () => {
      setSaliendo(true);
      await supabase.auth.signOut();
      await recargar();
      router.push("/ingresar");
    }}>
      {saliendo ? "Saliendo…" : "Salir"}
    </button>
  );
}
