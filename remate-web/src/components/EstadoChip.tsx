import { etiquetaEstado, type EstadoSubasta } from "@/lib/formato";

export function EstadoChip({ estado }: { estado: EstadoSubasta }) {
  return <span className={`estado estado-${estado}`}>{etiquetaEstado[estado]}</span>;
}
