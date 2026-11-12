"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navegacion } from "@/components/Navegacion";
import { Cargando, useRequerirRol, useSesion } from "@/lib/sesion";
import { useDatos } from "@/lib/useDatos";
import { FormularioSubasta } from "./FormularioSubasta";

export default function NuevaSubasta() {
  const sesion = useRequerirRol(["vendedor"]);
  const { supabase } = useSesion();
  const router = useRouter();
  const sinTienda = !!sesion && !sesion.tienda;
  useEffect(() => { if (sinTienda) router.replace("/vendedor/registro"); }, [sinTienda, router]);
  const { datos } = useDatos(async () => {
    const { data } = await supabase.from("categorias").select("id, nombre").order("id");
    return { categorias: data ?? [] };
  }, [supabase]);
  if (!sesion || !sesion.tienda || !datos) return <Cargando />;
  if (!sesion.activo || !sesion.tienda.activa) {
    return (
      <main className="contenedor">
        <Navegacion activa="/vendedor/nueva" />
        <section className="tarjeta pila" style={{ gap: 10, maxWidth: 640 }}>
          <h1 className="titulo-tarjeta">No puedes crear subastas por ahora</h1>
          <p className="texto-tenue">{sesion.tienda.activa ? "Tu cuenta" : "Tu tienda"} está suspendida por administración.</p>
          <Link className="boton" href="/vendedor" style={{ alignSelf: "flex-start", marginTop: 6 }}>Volver a mis subastas</Link>
        </section>
      </main>
    );
  }
  const { categorias } = datos;

  return (
    <main className="contenedor">
      <Navegacion activa="/vendedor/nueva" />
      <FormularioSubasta tiendaId={sesion.tienda.id} categorias={categorias} />
    </main>
  );
}
