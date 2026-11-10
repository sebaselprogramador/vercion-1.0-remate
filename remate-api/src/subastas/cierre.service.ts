import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { SubastasService } from './subastas.service';
import { SalasGateway } from './salas.gateway';

/**
 * Proceso periódico de cierre. Cada segundo cierra las subastas cuyo vencimiento (guardado en la base)
 * ya pasó. Como el vencimiento está persistido, al reiniciar el servidor se retoma sin perder estado.
 */
@Injectable()
export class CierreService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger('Cierre');
  private temporizador?: NodeJS.Timeout;
  private ocupado = false;

  constructor(private readonly subastas: SubastasService, private readonly salas: SalasGateway) {}

  onApplicationBootstrap() {
    this.temporizador = setInterval(() => void this.revisar(), 1000);
  }

  onApplicationShutdown() {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  async revisar() {
    if (this.ocupado) return;
    this.ocupado = true;
    try {
      const cerradas = await this.subastas.cerrarVencidas();
      for (const { codigo_sala } of cerradas) {
        this.log.log(`Subasta ${codigo_sala} cerrada`);
        await this.salas.anunciarCierre(codigo_sala);
      }
    } catch (e) {
      this.log.error(`No se pudo revisar vencimientos: ${(e as Error).message}`);
    } finally {
      this.ocupado = false;
    }
  }
}
