"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logotipo } from "@/components/Logo";
import { cargarSala } from "@/lib/salas";
import { Cargando, useSesion } from "@/lib/sesion";
import { useDatos } from "@/lib/useDatos";
import { SalaComprador } from "./SalaComprador";

/** Sala de una subasta: /sala?codigo=RM-XXXXX (el código llega del live o de la vitrina). */
export default function PaginaSala() {
  return <Suspense fallback={<Cargando />}><Sala /></Suspense>;
}

function Sala() {
  const codigo = (useSearchParams().get("codigo") ?? "").trim().toUpperCase();
  const { supabase, sesion } = useSesion();
  const { datos } = useDatos(async () => ({ sala: codigo ? await cargarSala(supabase, codigo) : null }), [supabase, codigo]);
  if (!datos) return <Cargando />;
  const { sala } = datos;

  if (!sala || sala.estado === "borrador") {
    return (
      <main className="marco-movil pila" style={{ gap: 16 }}>
        <Link href="/" className="marca" aria-label="Remate, inicio"><Logotipo ancho={96} /></Link>
        <div className="tarjeta pila" style={{ gap: 8 }}>
          <h1 className="titulo-tarjeta">No encontramos esa sala</h1>
          <p className="texto-tenue">Revisa el código que compartió el vendedor, por ejemplo RM-4821.</p>
          <Link href="/" className="boton" style={{ marginTop: 8 }}>Volver a la vitrina</Link>
        </div>
      </main>
    );
  }

  const esSuVendedor = !!sesion && sesion.usuarioId === sala.vendedor_id;
  return (
    <SalaComprador
      inicial={sala}
      conSesion={!!sesion}
      usuarioId={sesion?.usuarioId ?? null}
      esVendedorDeLaSala={esSuVendedor}
      cuentaSuspendida={!!sesion && !sesion.activo}
      tiendaSuspendida={sala.tienda_activa === false}
    />
  );
}
