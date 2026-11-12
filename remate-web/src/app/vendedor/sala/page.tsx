"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cargarSala } from "@/lib/salas";
import { Cargando, useRequerirRol, useSesion } from "@/lib/sesion";
import { useDatos } from "@/lib/useDatos";
import { SalaVendedor } from "./SalaVendedor";

/** Panel de una sala del vendedor: /vendedor/sala?codigo=RM-XXXXX. */
export default function PaginaSalaVendedor() {
  return <Suspense fallback={<Cargando />}><Sala /></Suspense>;
}

function Sala() {
  const codigo = (useSearchParams().get("codigo") ?? "").trim().toUpperCase();
  const sesion = useRequerirRol(["vendedor"]);
  const { supabase } = useSesion();
  const { datos, recargar } = useDatos(async () => ({ sala: codigo ? await cargarSala(supabase, codigo) : null }), [supabase, codigo]);
  if (!sesion || !datos) return <Cargando />;
  const { sala } = datos;

  if (!sala || sala.vendedor_id !== sesion.usuarioId) {
    return (
      <main className="marco-movil pila" style={{ gap: 16 }}>
        <div className="tarjeta pila" style={{ gap: 8 }}>
          <h1 className="titulo-tarjeta">No encontramos esa sala entre tus subastas</h1>
          <Link href="/vendedor" className="boton" style={{ marginTop: 8 }}>Volver a mis subastas</Link>
        </div>
      </main>
    );
  }
  return <SalaVendedor inicial={sala} suspendida={!sesion.activo || sala.tienda_activa === false} onCambio={recargar} />;
}
