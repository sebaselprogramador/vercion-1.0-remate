import { Ilustracion, ilustracionDeCategoria } from "@/components/Ilustracion";

/** Foto del producto si el vendedor subió una; si no, la ilustración de su categoría. */
export function FotoProducto({ url, categoria, alto, alt }: { url: string | null | undefined; categoria: string | null; alto: number; alt: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- sitio estático: sin optimización de imágenes de Next.
    return <img src={url} alt={alt} className="foto-producto" style={{ height: alto }} loading="lazy" />;
  }
  return <Ilustracion tipo={ilustracionDeCategoria(categoria)} alto={alto} />;
}
