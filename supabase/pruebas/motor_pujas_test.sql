-- Pruebas del motor de pujas. Se ejecutan dentro de una transacción que se deshace al final:
-- no dejan datos en la base. Resultado obtenido el 2026-11-05: 18 de 18 correctas.
begin;
create temp table log (n serial, prueba text, obtenido text, esperado text, ok boolean);
create function pg_temp.r(p text, o text, e text) returns void language sql as $f$ insert into log(prueba, obtenido, esperado, ok) values (p, o, e, o = e) $f$;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
 ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','v@remate.test','{"nombre_visible":"Vendedor"}',now(),now()),
 ('00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@remate.test','{"nombre_visible":"Ana"}',now(),now()),
 ('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@remate.test','{"nombre_visible":"Luis"}',now(),now());
insert into public.tiendas (id, vendedor_id, nombre) values ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-00000000000a','Casa Norte');
insert into public.productos (id, tienda_id, titulo) values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000d1','Sillón'),('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000d1','Lámpara');
-- Ventana de 10 s y ampliación de 15 s: valores SOLO para la prueba, no son la regla definida del proyecto.
insert into public.subastas (id, producto_id, codigo_sala, estado, precio_inicial, incremento_minimo, duracion_seg, ventana_ampliacion_seg, ampliacion_seg) values
 ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000e1','RM-T001','programada',80,10,300,10,15),
 ('00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-0000000000e2','RM-T002','programada',50,5,300,null,null);

do $$
declare x public.resultado_puja; s public.subastas; v_err text; v_n int;
  V uuid := '00000000-0000-0000-0000-00000000000a'; A uuid := '00000000-0000-0000-0000-00000000000b'; B uuid := '00000000-0000-0000-0000-00000000000c';
  idA uuid := gen_random_uuid();
begin
  begin perform public.abrir_subasta('RM-T001', A); v_err := 'sin error'; exception when others then v_err := 'error'; end;
  perform pg_temp.r('01 Otra cuenta no puede abrir la subasta', v_err, 'error');
  s := public.abrir_subasta('rm-t001', V);
  perform pg_temp.r('02 El vendedor abre la subasta', s.estado::text, 'abierta');
  perform public.abrir_subasta('RM-T002', V);
  x := public.procesar_puja(gen_random_uuid(), 'RM-T001', A, 50);
  perform pg_temp.r('03 Primera puja bajo el precio inicial', x.motivo, 'monto_insuficiente');
  x := public.procesar_puja(idA, 'RM-T001', A, 80);
  perform pg_temp.r('04 Primera puja igual al precio inicial', x.resultado::text || ' vigente ' || x.oferta_vigente, 'aceptada vigente 80.00');
  x := public.procesar_puja(idA, 'RM-T001', A, 80);
  perform pg_temp.r('05 Reintento con el mismo id no duplica', x.resultado::text || ' repetida=' || x.repetida || ' total=' || x.total_pujas, 'aceptada repetida=true total=1');
  x := public.procesar_puja(gen_random_uuid(), 'RM-T001', B, 85);
  perform pg_temp.r('06 Puja que no alcanza el incremento', x.motivo, 'monto_insuficiente');
  x := public.procesar_puja(gen_random_uuid(), 'RM-T001', B, 90.005);
  perform pg_temp.r('07 Monto con mas de dos decimales', x.motivo, 'monto_invalido');
  x := public.procesar_puja(gen_random_uuid(), 'RM-T001', V, 100);
  perform pg_temp.r('08 El vendedor no puede pujar', x.motivo, 'vendedor_no_puede_pujar');
  x := public.procesar_puja(gen_random_uuid(), 'RM-T001', B, 90);
  perform pg_temp.r('09 Segunda puja valida', x.resultado::text || ' vigente ' || x.oferta_vigente, 'aceptada vigente 90.00');
  x := public.procesar_puja(gen_random_uuid(), 'RM-T999', B, 90);
  perform pg_temp.r('10 Sala inexistente', x.motivo, 'sala_inexistente');
  update public.subastas set cierra_en = clock_timestamp() + interval '5 seconds' where id = '00000000-0000-0000-0000-0000000000f1';
  x := public.procesar_puja(gen_random_uuid(), 'RM-T001', A, 100);
  perform pg_temp.r('11 Puja en la ventana final amplia el cierre', (x.resultado = 'aceptada' and x.cierra_en > clock_timestamp() + interval '14 seconds')::text, 'true');
  update public.subastas set cierra_en = clock_timestamp() - interval '1 second' where estado = 'abierta' and codigo_sala like 'RM-T%';
  x := public.procesar_puja(gen_random_uuid(), 'RM-T001', B, 110);
  perform pg_temp.r('12 Puja despues del vencimiento', x.motivo, 'plazo_vencido');
  select count(*) into v_n from public.cerrar_vencidas();
  perform pg_temp.r('13 El proceso periodico cierra las vencidas', v_n::text, '2');
  perform pg_temp.r('14 Ganador = mayor puja aceptada',
    (select g.nombre_visible || ' ' || a.monto from public.adjudicaciones a join public.perfiles g on g.id = a.ganador_id where a.subasta_id = '00000000-0000-0000-0000-0000000000f1'), 'Ana 100.00');
  perform pg_temp.r('15 Subasta sin pujas termina sin ganador',
    (select count(*)::text from public.adjudicaciones where subasta_id = '00000000-0000-0000-0000-0000000000f2'), '0');
  x := public.procesar_puja(gen_random_uuid(), 'RM-T001', B, 200);
  perform pg_temp.r('16 Subasta cerrada no acepta pujas', x.motivo, 'subasta_no_abierta');
  s := public.cerrar_subasta('00000000-0000-0000-0000-0000000000f1');
  perform pg_temp.r('17 Cerrar dos veces no duplica la adjudicacion',
    (s.id is null)::text || ' ' || (select count(*) from public.adjudicaciones where subasta_id = '00000000-0000-0000-0000-0000000000f1'), 'true 1');
  -- La sala inexistente no se registra (no hay subasta a la que asociarla).
  perform pg_temp.r('18 Solicitudes registradas (aceptadas+rechazadas)',
    (select count(*) filter (where resultado='aceptada') || '+' || count(*) filter (where resultado='rechazada') from public.solicitudes_puja), '3+6');
end $$;

select n, prueba, obtenido, esperado, ok from log order by n;
rollback;
