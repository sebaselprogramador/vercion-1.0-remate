import { notFound } from "next/navigation";
import { cargarSala } from "@/lib/salas";
import { requerirRol } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { SalaVendedor } from "./SalaVendedor";

export const dynamic = "force-dynamic";

export default async function PaginaSalaVendedor({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const sesion = await requerirRol(["vendedor"], `/vendedor/sala/${codigo}`);
  const supabase = await crearClienteServidor();
  const sala = await cargarSala(supabase, decodeURIComponent(codigo));
  if (!sala || sala.vendedor_id !== sesion.usuarioId) notFound();
  return <SalaVendedor inicial={sala} suspendida={!sesion.activo || sala.tienda_activa === false} />;
}
