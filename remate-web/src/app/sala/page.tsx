import { redirect } from "next/navigation";

/** Recibe el código escrito en la portada y abre la sala correspondiente. */
export default async function BuscarSala({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  const limpio = (codigo ?? "").trim().toUpperCase();
  redirect(limpio ? `/sala/${encodeURIComponent(limpio)}` : "/");
}
