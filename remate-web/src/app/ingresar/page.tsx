"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cargando, useSesion } from "@/lib/sesion";
import { FormularioIngreso, destinoSeguro } from "./FormularioIngreso";

/** Entrada a la app. Con la sesión iniciada, cada rol va directo a su sección. */
export default function Ingresar() {
  const { sesion, cargando } = useSesion();
  const router = useRouter();
  useEffect(() => { if (sesion) router.replace(destinoSeguro()); }, [sesion, router]);
  if (cargando || sesion) return <Cargando />;
  return <FormularioIngreso />;
}
