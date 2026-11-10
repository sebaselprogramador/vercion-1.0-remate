import { Logger } from '@nestjs/common';
import {
  ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { SubastasService } from './subastas.service';
import { DatoInvalido, leerCodigoSala, leerIdSolicitud, leerMonto, mensajeRechazo } from './validacion';
import { LimitadorSolicitudes } from './limitador';

const sala = (codigo: string) => `sala:${codigo}`;

/**
 * Comunicación en tiempo real de las salas (Socket.IO).
 * Socket.IO transporta los eventos; NO decide si una puja es válida ni la guarda:
 * eso lo hace la función transaccional de PostgreSQL. El aviso de aceptación se envía
 * después de que la base confirma el registro.
 */
@WebSocketGateway({ namespace: '/salas', cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' } })
export class SalasGateway implements OnGatewayConnection {
  @WebSocketServer() servidor!: Server;
  private readonly log = new Logger('Salas');
  private readonly limitador = new LimitadorSolicitudes(5, 3000); // máx. 5 pujas cada 3 s por conexión

  constructor(private readonly subastas: SubastasService, private readonly auth: AuthService) {}

  /** La conexión puede ser anónima (solo mirar). Para pujar se exige sesión. */
  async handleConnection(cliente: Socket) {
    const token = cliente.handshake.auth?.token as string | undefined;
    if (!token) return;
    try {
      cliente.data.usuario = await this.auth.verificar(token);
    } catch {
      cliente.emit('sesion_invalida');
    }
  }

  /** Unirse a una sala devuelve el estado registrado: también sirve para recuperarse tras una desconexión. */
  @SubscribeMessage('unirse')
  async unirse(@ConnectedSocket() cliente: Socket, @MessageBody() datos: { codigo?: unknown }) {
    try {
      const codigo = leerCodigoSala(datos?.codigo);
      const estado = await this.subastas.estadoSala(codigo);
      await cliente.join(sala(codigo));
      const mias = cliente.data.usuario ? await this.subastas.misSolicitudes(codigo, cliente.data.usuario.id) : [];
      return { ok: true, estado, mis_solicitudes: mias };
    } catch (e) {
      return { ok: false, error: e instanceof DatoInvalido ? e.message : 'sala_inexistente' };
    }
  }

  @SubscribeMessage('pujar')
  async pujar(
    @ConnectedSocket() cliente: Socket,
    @MessageBody() datos: { codigo?: unknown; idSolicitud?: unknown; monto?: unknown },
  ) {
    const usuario = cliente.data.usuario;
    if (!usuario) return { ok: false, error: 'sesion_requerida' };
    if (!this.limitador.permitir(cliente.id)) return { ok: false, error: 'demasiadas_solicitudes' };

    let codigo: string, idSolicitud: string, monto: string;
    try {
      codigo = leerCodigoSala(datos?.codigo);
      idSolicitud = leerIdSolicitud(datos?.idSolicitud);
      monto = leerMonto(datos?.monto);
    } catch (e) {
      return { ok: false, error: e instanceof DatoInvalido ? e.message : 'datos_invalidos' };
    }

    try {
      const r = await this.subastas.procesarPuja(idSolicitud, codigo, usuario.id, monto);
      // La transacción ya terminó: el registro está confirmado antes de avisar a nadie.
      if (r.resultado === 'aceptada' && !r.repetida) {
        this.servidor.to(sala(codigo)).emit('estado', await this.subastas.estadoSala(codigo));
      }
      return {
        ok: true,
        idSolicitud,
        resultado: r.resultado,
        motivo: r.motivo,
        mensaje: r.motivo ? mensajeRechazo[r.motivo] ?? 'La puja no fue aceptada.' : 'Tu oferta quedó registrada.',
        oferta_vigente: r.oferta_vigente,
        cierra_en: r.cierra_en,
        repetida: r.repetida,
      };
    } catch (e) {
      this.log.error(`Error al procesar ${idSolicitud}: ${(e as Error).message}`);
      // Resultado desconocido: el cliente debe consultar el estado con el mismo idSolicitud.
      return { ok: false, error: 'resultado_no_confirmado', idSolicitud };
    }
  }

  /** Avisa el cierre a la sala. Lo llama el proceso periódico. */
  async anunciarCierre(codigo: string) {
    this.servidor.to(sala(codigo)).emit('estado', await this.subastas.estadoSala(codigo));
  }

  async anunciarApertura(codigo: string) {
    this.servidor.to(sala(codigo)).emit('estado', await this.subastas.estadoSala(codigo));
  }
}
