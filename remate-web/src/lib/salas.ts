import type { SupabaseClient } from "@supabase/supabase-js";
import type { EstadoSubasta } from "./formato";

/** Estado de una sala. Tiene la misma forma que el evento "estado" que emite el servidor (remate-api). */
export interface EstadoSala {
  /** Id de la subasta (para escuchar sus pujas en tiempo real). */
  id: string;
  codigo_sala: string;
  estado: EstadoSubasta;
  precio_inicial: string;
  incremento_minimo: string;
  duracion_seg: number;
  cierra_en: string | null;
  oferta_vigente: string | null;
  total_pujas: number;
  producto: string;
  descripcion: string | null;
  /** Foto subida por el vendedor (Supabase Storage), o null. */
  imagen_url?: string | null;
  categoria: string | null;
  tienda: string;
  ciudad: string;
  vendedor_id?: string;
  /** false si un administrador suspendió la tienda. Solo viene en las lecturas directas de Supabase. */
  tienda_activa?: boolean;
  postor_vigente: string | null;
  ganador: string | null;
  monto_ganador: string | null;
  hora_servidor?: string;
  ultimas_pujas: { orden: string; monto: string; aceptada_en: string; postor: string }[];
}

type Uno<T> = T | T[] | null;
const uno = <T,>(v: Uno<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v);

const SELECCION = `id, codigo_sala, estado, precio_inicial, incremento_minimo, duracion_seg, cierra_en, oferta_vigente, total_pujas,
  productos!inner(titulo, descripcion, imagen_url, categorias(nombre), tiendas!inner(nombre, ciudad, vendedor_id, activa)),
  postor:perfiles!subastas_postor_vigente_id_fkey(nombre_visible),
  adjudicaciones(monto, ganador:perfiles!adjudicaciones_ganador_id_fkey(nombre_visible))`;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function aEstadoSala(f: any, pujas: any[] = []): EstadoSala {
  const p = uno<any>(f.productos);
  const adj = uno<any>(f.adjudicaciones);
  return {
    id: f.id,
    codigo_sala: f.codigo_sala,
    estado: f.estado,
    precio_inicial: String(f.precio_inicial),
    incremento_minimo: String(f.incremento_minimo),
    duracion_seg: f.duracion_seg,
    cierra_en: f.cierra_en,
    oferta_vigente: f.oferta_vigente != null ? String(f.oferta_vigente) : null,
    total_pujas: f.total_pujas,
    producto: p?.titulo ?? "",
    descripcion: p?.descripcion ?? null,
    imagen_url: p?.imagen_url ?? null,
    categoria: uno<any>(p?.categorias)?.nombre ?? null,
    tienda: uno<any>(p?.tiendas)?.nombre ?? "",
    ciudad: uno<any>(p?.tiendas)?.ciudad ?? "",
    vendedor_id: uno<any>(p?.tiendas)?.vendedor_id,
    tienda_activa: uno<any>(p?.tiendas)?.activa,
    postor_vigente: uno<any>(f.postor)?.nombre_visible ?? null,
    ganador: uno<any>(adj?.ganador)?.nombre_visible ?? null,
    monto_ganador: adj?.monto != null ? String(adj.monto) : null,
    ultimas_pujas: pujas.map((x) => ({
      orden: String(x.orden),
      monto: String(x.monto),
      aceptada_en: x.aceptada_en,
      postor: uno<any>(x.postor)?.nombre_visible ?? "",
    })),
  };
}

/** Lee una sala directamente de Supabase (respeta RLS: un borrador solo lo ve su vendedor o un administrador). */
export async function cargarSala(supabase: SupabaseClient, codigo: string): Promise<EstadoSala | null> {
  const { data } = await supabase.from("subastas").select(SELECCION).eq("codigo_sala", codigo.toUpperCase()).maybeSingle();
  if (!data) return null;
  const { data: pujas } = await supabase
    .from("pujas")
    .select("orden, monto, aceptada_en, postor:perfiles(nombre_visible), subastas!inner(codigo_sala)")
    .eq("subastas.codigo_sala", codigo.toUpperCase())
    .order("orden", { ascending: false })
    .limit(10);
  return aEstadoSala(data, pujas ?? []);
}

/** Lista de salas visibles para la vitrina (sin las tiendas suspendidas). */
export async function listarSalas(supabase: SupabaseClient, estados: EstadoSubasta[]) {
  const { data } = await supabase
    .from("subastas")
    .select(SELECCION)
    .in("estado", estados)
    .eq("productos.tiendas.activa", true)
    .order("creado_en", { ascending: false })
    .limit(30);
  return (data ?? []).map((f) => aEstadoSala(f));
}
/* eslint-enable @typescript-eslint/no-explicit-any */
