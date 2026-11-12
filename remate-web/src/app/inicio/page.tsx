"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cargando, useSesion } from "@/lib/sesion";

/** Destino después de ingresar: cada rol entra a su sección. */
export default function Inicio() {
  const { sesion } = useSesion();
  const router = useRouter();
  useEffect(() => {
    if (!sesion) return;
    router.replace(sesion.rol === "administrador" ? "/admin" : sesion.rol === "vendedor" ? "/vendedor" : "/");
  }, [sesion, router]);
  return <Cargando />;
}
