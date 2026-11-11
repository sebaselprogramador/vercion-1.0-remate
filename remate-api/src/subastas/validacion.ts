/**
 * Validación de datos recibidos desde el cliente.
 * Comprueba el formato; las reglas de la subasta (mínimo, plazo, vendedor) las aplica la base de datos
 * dentro de la transacción, con la fila de la subasta bloqueada.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODIGO = /^RM-[0-9A-Z]{4,8}$/;
const MONTO = /^\d{1,10}(\.\d{1,2})?$/;

export class DatoInvalido extends Error {}

/** Normaliza un código de sala ("rm-4821" → "RM-4821"). */
export function leerCodigoSala(valor: unknown): string {
  if (typeof valor !== 'string') throw new DatoInvalido('codigo_invalido');
  const codigo = valor.trim().toUpperCase();
  if (!CODIGO.test(codigo)) throw new DatoInvalido('codigo_invalido');
  return codigo;
}

export function leerIdSolicitud(valor: unknown): string {
  if (typeof valor !== 'string' || !UUID.test(valor)) throw new DatoInvalido('id_solicitud_invalido');
  return valor.toLowerCase();
}

/**
 * Lee un importe en bolivianos como TEXTO decimal exacto, sin pasar por números de punto flotante.
 * Acepta "130", "130.5", "130.50" y también la coma decimal ("130,50").
 */
export function leerMonto(valor: unknown): string {
  const texto = typeof valor === 'number' ? String(valor) : valor;
  if (typeof texto !== 'string') throw new DatoInvalido('monto_invalido');
  const limpio = texto.trim().replace(',', '.');
  if (!MONTO.test(limpio)) throw new DatoInvalido('monto_invalido');
  if (/^0+(\.0+)?$/.test(limpio)) throw new DatoInvalido('monto_invalido');
  return limpio;
}

export function leerDuracion(valor: unknown): number {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 30 || n > 3600) throw new DatoInvalido('duracion_invalida');
  return n;
}

export function leerTexto(valor: unknown, min: number, max: number, error: string): string {
  if (typeof valor !== 'string') throw new DatoInvalido(error);
  const t = valor.trim();
  if (t.length < min || t.length > max) throw new DatoInvalido(error);
  return t;
}

/** Genera un código de sala legible, sin caracteres que se confundan (0/O, 1/I). */
export function generarCodigoSala(aleatorio: () => number = Math.random): string {
  const alfabeto = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = 'RM-';
  for (let i = 0; i < 5; i++) s += alfabeto[Math.floor(aleatorio() * alfabeto.length)];
  return s;
}

/** Mensajes para el comprador según el motivo de rechazo registrado. */
export const mensajeRechazo: Record<string, string> = {
  sala_inexistente: 'No encontramos esa sala.',
  subasta_no_abierta: 'La subasta no está abierta.',
  plazo_vencido: 'El tiempo de la subasta terminó antes de recibir tu oferta.',
  vendedor_no_puede_pujar: 'No puedes pujar por tus propios productos.',
  cuenta_suspendida: 'Tu cuenta está suspendida: no puedes pujar.',
  tienda_suspendida: 'La tienda está suspendida: esta sala no acepta pujas.',
  monto_invalido: 'El monto no es válido.',
  monto_insuficiente: 'Otra persona ofertó antes o el monto no alcanza el mínimo.',
};
