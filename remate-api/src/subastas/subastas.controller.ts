import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { SesionGuard, UsuarioActual } from '../auth/sesion.guard';
import type { Usuario } from '../auth/auth.service';
import { SubastasService } from './subastas.service';
import { SalasGateway } from './salas.gateway';
import { DatoInvalido, leerCodigoSala, leerDuracion, leerMonto, leerTexto } from './validacion';

function validar<T>(f: () => T): T {
  try {
    return f();
  } catch (e) {
    if (e instanceof DatoInvalido) throw new BadRequestException(e.message);
    throw e;
  }
}

@Controller()
export class SubastasController {
  constructor(private readonly subastas: SubastasService, private readonly salas: SalasGateway) {}

  @Get('salud')
  salud() {
    return { ok: true };
  }

  /** Estado público de una sala (no requiere sesión). */
  @Get('salas/:codigo')
  estado(@Param('codigo') codigo: string) {
    return this.subastas.estadoSala(validar(() => leerCodigoSala(codigo)));
  }

  @UseGuards(SesionGuard)
  @Get('salas/:codigo/mis-solicitudes')
  misSolicitudes(@Param('codigo') codigo: string, @UsuarioActual() u: Usuario) {
    return this.subastas.misSolicitudes(validar(() => leerCodigoSala(codigo)), u.id);
  }

  @UseGuards(SesionGuard)
  @Post('tiendas')
  crearTienda(@Body() b: { nombre?: unknown; usuarioTiktok?: unknown }, @UsuarioActual() u: Usuario) {
    const nombre = validar(() => leerTexto(b?.nombre, 2, 80, 'nombre_invalido'));
    const tiktok = b?.usuarioTiktok ? validar(() => leerTexto(b.usuarioTiktok, 2, 25, 'usuario_tiktok_invalido')) : null;
    return this.subastas.crearTienda(u.id, nombre, tiktok);
  }

  @UseGuards(SesionGuard)
  @Get('vendedor/subastas')
  misSubastas(@UsuarioActual() u: Usuario) {
    return this.subastas.misSubastas(u.id);
  }

  @UseGuards(SesionGuard)
  @Post('vendedor/subastas')
  crear(@Body() b: Record<string, unknown>, @UsuarioActual() u: Usuario) {
    const datos = validar(() => ({
      titulo: leerTexto(b?.titulo, 2, 120, 'titulo_invalido'),
      descripcion: b?.descripcion ? leerTexto(b.descripcion, 0, 2000, 'descripcion_invalida') : null,
      categoria: typeof b?.categoria === 'string' ? b.categoria : null,
      precioInicial: leerMonto(b?.precioInicial),
      incrementoMinimo: leerMonto(b?.incrementoMinimo),
      duracionSeg: leerDuracion(b?.duracionSeg),
    }));
    return this.subastas.crearSubasta(u.id, datos);
  }

  @UseGuards(SesionGuard)
  @Post('vendedor/salas/:codigo/abrir')
  @HttpCode(200)
  async abrir(@Param('codigo') codigo: string, @UsuarioActual() u: Usuario) {
    const c = validar(() => leerCodigoSala(codigo));
    const estado = await this.subastas.abrir(c, u.id);
    await this.salas.anunciarApertura(c);
    return estado;
  }
}
