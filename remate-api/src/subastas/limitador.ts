/** Limita cuántas solicitudes puede enviar una conexión en una ventana de tiempo. */
export class LimitadorSolicitudes {
  private readonly registros = new Map<string, number[]>();

  constructor(private readonly maximo: number, private readonly ventanaMs: number) {}

  permitir(clave: string, ahora: number = Date.now()): boolean {
    const recientes = (this.registros.get(clave) ?? []).filter((t) => ahora - t < this.ventanaMs);
    if (recientes.length >= this.maximo) {
      this.registros.set(clave, recientes);
      return false;
    }
    recientes.push(ahora);
    this.registros.set(clave, recientes);
    return true;
  }
}
