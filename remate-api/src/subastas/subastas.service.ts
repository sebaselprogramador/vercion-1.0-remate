import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { generarCodigoSala } from './validacion';

export interface ResultadoPuja {
  resultado: 'aceptada' | 'rechazada';
  motivo: string | null;
  orden: string | null;
  oferta_vigente: string | null;
  cierra_en: string | null;
  total_pujas: number | null;
  repetida: boolean;
}

/** Reglas de negocio de Remate. Las operaciones críticas se delegan a funciones transaccionales de PostgreSQL. */
@Injectable()
export class SubastasService {
  constructor(private readonly db: DbService) {}

  /** El servidor se conecta sin las políticas por filas: comprueba aquí que la cuenta no esté suspendida. */
  private async exigirCuentaActiva(usuarioId: string) {
    const [p] = await this.db.consulta<{ activo: boolean }>(`select activo from public.perfiles where id = $1`, [usuarioId]);
    if (!p || !p.activo) throw new ForbiddenException('cuenta_suspendida');
  }

  /** Estado público de una sala: lo que un participante necesita ver, también tras reconectarse. */
  async estadoSala(codigo: string) {
    const [sala] = await this.db.consulta(
      `select s.codigo_sala, s.estado, s.precio_inicial, s.incremento_minimo, s.duracion_seg,
              s.ventana_ampliacion_seg, s.ampliacion_seg, s.cierra_en, s.oferta_vigente, s.total_pujas,
              p.titulo as producto, p.descripcion, p.imagen_url, c.nombre as categoria, t.nombre as tienda, t.ciudad,
              pv.nombre_visible as postor_vigente,
              g.nombre_visible as ganador, a.monto as monto_ganador,
              clock_timestamp() as hora_servidor
         from public.subastas s
         join public.productos p on p.id = s.producto_id
         join public.tiendas t on t.id = p.tienda_id
         left join public.categorias c on c.id = p.categoria_id
         left join public.perfiles pv on pv.id = s.postor_vigente_id
         left join public.adjudicaciones a on a.subasta_id = s.id
         left join public.perfiles g on g.id = a.ganador_id
        where s.codigo_sala = $1 and s.estado <> 'borrador'`,
      [codigo],
    );
    if (!sala) throw new NotFoundException('sala_inexistente');
    const pujas = await this.db.consulta(
      `select pu.orden, pu.monto, pu.aceptada_en, pe.nombre_visible as postor
         from public.pujas pu
         join public.subastas s on s.id = pu.subasta_id
         join public.perfiles pe on pe.id = pu.postor_id
        where s.codigo_sala = $1
        order by pu.orden desc limit 10`,
      [codigo],
    );
    return { ...sala, ultimas_pujas: pujas };
  }

  procesarPuja(idSolicitud: string, codigo: string, postorId: string, monto: string) {
    return this.db
      .consulta<ResultadoPuja>(`select (public.procesar_puja($1, $2, $3, $4::numeric)).*`, [idSolicitud, codigo, postorId, monto])
      .then((filas) => filas[0]);
  }

  /** Resultado de las solicitudes propias en una sala: sirve para resolver pendientes al reconectarse. */
  misSolicitudes(codigo: string, postorId: string) {
    return this.db.consulta(
      `select sp.id_solicitud, sp.monto, sp.resultado, sp.motivo, sp.procesada_en
         from public.solicitudes_puja sp join public.subastas s on s.id = sp.subasta_id
        where s.codigo_sala = $1 and sp.postor_id = $2
        order by sp.procesada_en desc limit 20`,
      [codigo, postorId],
    );
  }

  async abrir(codigo: string, vendedorId: string) {
    try {
      await this.db.consulta(`select public.abrir_subasta($1, $2)`, [codigo, vendedorId]);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'P0002') throw new NotFoundException('sala_inexistente_o_ajena');
      if (err.code === '42501') throw new ForbiddenException(err.message); // cuenta_suspendida o tienda_suspendida
      if (err.code === '22023') throw new ConflictException(err.message);
      throw e;
    }
    return this.estadoSala(codigo);
  }

  cerrarVencidas() {
    return this.db.consulta<{ codigo_sala: string }>(`select codigo_sala from public.cerrar_vencidas()`);
  }

  /** Registra la tienda del vendedor y marca su perfil como vendedor. */
  async crearTienda(usuarioId: string, nombre: string, usuarioTiktok: string | null) {
    await this.exigirCuentaActiva(usuarioId);
    const cliente = await this.db.pool.connect();
    try {
      await cliente.query('begin');
      const r = await cliente.query(
        `insert into public.tiendas (vendedor_id, nombre, usuario_tiktok) values ($1, $2, $3)
         on conflict (vendedor_id) do nothing returning id, nombre, usuario_tiktok, ciudad`,
        [usuarioId, nombre, usuarioTiktok],
      );
      if (r.rowCount === 0) throw new ConflictException('ya_tienes_tienda');
      await cliente.query(`update public.perfiles set rol = 'vendedor' where id = $1 and rol = 'comprador'`, [usuarioId]);
      await cliente.query('commit');
      return r.rows[0];
    } catch (e) {
      await cliente.query('rollback');
      throw e;
    } finally {
      cliente.release();
    }
  }

  /** Crea producto y subasta "lista para abrir" en una sola transacción. */
  async crearSubasta(
    vendedorId: string,
    datos: { titulo: string; descripcion: string | null; categoria: string | null; precioInicial: string; incrementoMinimo: string; duracionSeg: number },
  ) {
    await this.exigirCuentaActiva(vendedorId);
    const [tienda] = await this.db.consulta<{ id: string; activa: boolean }>(`select id, activa from public.tiendas where vendedor_id = $1`, [vendedorId]);
    if (!tienda) throw new ForbiddenException('primero_registra_tu_tienda');
    if (!tienda.activa) throw new ForbiddenException('tienda_suspendida');

    const cliente = await this.db.pool.connect();
    try {
      await cliente.query('begin');
      const producto = await cliente.query(
        `insert into public.productos (tienda_id, categoria_id, titulo, descripcion)
         values ($1, (select id from public.categorias where nombre = $2), $3, $4) returning id`,
        [tienda.id, datos.categoria, datos.titulo, datos.descripcion],
      );
      // Reintenta si el código generado ya existe (restricción unique).
      for (let intento = 0; intento < 5; intento++) {
        const codigo = generarCodigoSala();
        await cliente.query('savepoint codigo');
        try {
          await cliente.query(
            `insert into public.subastas (producto_id, codigo_sala, estado, precio_inicial, incremento_minimo, duracion_seg)
             values ($1, $2, 'programada', $3::numeric, $4::numeric, $5)`,
            [producto.rows[0].id, codigo, datos.precioInicial, datos.incrementoMinimo, datos.duracionSeg],
          );
          await cliente.query('commit');
          return { codigo_sala: codigo };
        } catch (e) {
          if ((e as { code?: string }).code !== '23505') throw e;
          await cliente.query('rollback to savepoint codigo');
        }
      }
      throw new ConflictException('no_se_pudo_generar_codigo');
    } catch (e) {
      await cliente.query('rollback');
      throw e;
    } finally {
      cliente.release();
    }
  }

  misSubastas(vendedorId: string) {
    return this.db.consulta(
      `select s.codigo_sala, s.estado, s.precio_inicial, s.incremento_minimo, s.duracion_seg, s.cierra_en,
              s.oferta_vigente, s.total_pujas, p.titulo as producto, c.nombre as categoria,
              g.nombre_visible as ganador, a.monto as monto_ganador
         from public.subastas s
         join public.productos p on p.id = s.producto_id
         join public.tiendas t on t.id = p.tienda_id
         left join public.categorias c on c.id = p.categoria_id
         left join public.adjudicaciones a on a.subasta_id = s.id
         left join public.perfiles g on g.id = a.ganador_id
        where t.vendedor_id = $1
        order by s.creado_en desc`,
      [vendedorId],
    );
  }
}
