-- Pruebas de suspensión de cuentas y tiendas, y del acta de adjudicación.
-- Simula sesiones de usuarios (rol authenticated) y llama al motor como el servidor. Se deshace al final: no deja datos.
begin;
create temp table log (n serial, prueba text, obtenido text, esperado text, ok boolean);
grant all on log to authenticated; grant usage on sequence log_n_seq to authenticated;
create function pg_temp.r(p text, o text, e text) returns void language sql as $f$ insert into log(prueba, obtenido, esperado, ok) values (p, coalesce(o, 'null'), e, coalesce(o, 'null') = e) $f$;
grant execute on function pg_temp.r(text, text, text) to authenticated;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ana@remate.test','{"nombre_visible":"Ana"}',now(),now()),
 ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','casa@remate.test','{"nombre_visible":"Rocío"}',now(),now()),
 ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@remate.test','{"nombre_visible":"Admin"}',now(),now()),
 ('00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','luis@remate.test','{"nombre_visible":"Luis"}',now(),now());
update public.perfiles set rol = 'administrador' where id = '00000000-0000-0000-0000-0000000000b3';

create function pg_temp.como(uid text) returns void language sql as $f$
  select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$f$;
create temp table salas (nombre text primary key, codigo text);
grant all on salas to authenticated;

-- Preparación: la vendedora registra su tienda y deja dos subastas listas para abrir.
select pg_temp.como('00000000-0000-0000-0000-0000000000b2');
do $$ declare t public.tiendas; v_prod uuid; v_cod text; begin
  t := public.registrar_tienda('Casa Norte', '@casanorte.cbba');
  insert into public.productos (tienda_id, titulo) values (t.id, 'Sillón') returning id into v_prod;
  insert into public.subastas (producto_id, estado, precio_inicial, incremento_minimo, duracion_seg)
    values (v_prod, 'programada', 80, 10, 180) returning codigo_sala into v_cod;
  insert into salas values ('principal', v_cod);
  insert into public.subastas (producto_id, estado, precio_inicial, incremento_minimo, duracion_seg)
    values (v_prod, 'programada', 50, 5, 180) returning codigo_sala into v_cod;
  insert into salas values ('segunda', v_cod);
end $$;
reset role;
select public.abrir_subasta((select codigo from salas where nombre = 'principal'), '00000000-0000-0000-0000-0000000000b2');

-- 1-2. Nadie cambia su propia suspensión
select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  begin update public.perfiles set activo = false where id = '00000000-0000-0000-0000-0000000000b1';
        perform pg_temp.r('01 Una cuenta no cambia su propio estado', 'sin error', 'error');
  exception when others then perform pg_temp.r('01 Una cuenta no cambia su propio estado', 'error', 'error'); end;
end $$;
select pg_temp.como('00000000-0000-0000-0000-0000000000b2');
do $$ begin
  begin update public.tiendas set activa = false where vendedor_id = '00000000-0000-0000-0000-0000000000b2';
        perform pg_temp.r('02 Una tienda no cambia su propio estado', 'sin error', 'error');
  exception when others then perform pg_temp.r('02 Una tienda no cambia su propio estado', 'error', 'error'); end;
end $$;

-- 3-4. El administrador suspende cuentas, pero no a otro administrador
select pg_temp.como('00000000-0000-0000-0000-0000000000b3');
update public.perfiles set activo = false where id = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.r('03 Administrador suspende una cuenta',
  (select activo::text from public.perfiles where id = '00000000-0000-0000-0000-0000000000b1'), 'false');
do $$ begin
  begin update public.perfiles set activo = false where id = '00000000-0000-0000-0000-0000000000b3';
        perform pg_temp.r('04 No se puede suspender a un administrador', 'sin error', 'error');
  exception when others then perform pg_temp.r('04 No se puede suspender a un administrador', 'error', 'error'); end;
end $$;

-- 5-6. El motor rechaza a la cuenta suspendida y acepta a las demás
reset role;
select pg_temp.r('05 Cuenta suspendida no puede pujar',
  (public.procesar_puja(gen_random_uuid(), (select codigo from salas where nombre = 'principal'), '00000000-0000-0000-0000-0000000000b1', 80)).motivo, 'cuenta_suspendida');
select pg_temp.r('06 Cuenta activa sí puede pujar',
  (public.procesar_puja(gen_random_uuid(), (select codigo from salas where nombre = 'principal'), '00000000-0000-0000-0000-0000000000b4', 80)).resultado::text, 'aceptada');

-- 7. Una cuenta suspendida no registra tienda
select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  begin perform public.registrar_tienda('Otra', null);
        perform pg_temp.r('07 Cuenta suspendida no registra tienda', 'sin error', 'error');
  exception when others then perform pg_temp.r('07 Cuenta suspendida no registra tienda', 'error', 'error'); end;
end $$;

-- 8-11. Tienda suspendida
select pg_temp.como('00000000-0000-0000-0000-0000000000b3');
update public.tiendas set activa = false where vendedor_id = '00000000-0000-0000-0000-0000000000b2';
select pg_temp.r('08 Administrador suspende una tienda',
  (select activa::text from public.tiendas where vendedor_id = '00000000-0000-0000-0000-0000000000b2'), 'false');
reset role;
select pg_temp.r('09 Sala de tienda suspendida no acepta pujas',
  (public.procesar_puja(gen_random_uuid(), (select codigo from salas where nombre = 'principal'), '00000000-0000-0000-0000-0000000000b4', 90)).motivo, 'tienda_suspendida');
do $$ begin
  begin perform public.abrir_subasta((select codigo from salas where nombre = 'segunda'), '00000000-0000-0000-0000-0000000000b2');
        perform pg_temp.r('10 Tienda suspendida no abre salas', 'sin error', 'error');
  exception when others then perform pg_temp.r('10 Tienda suspendida no abre salas', sqlerrm, 'tienda_suspendida'); end;
end $$;
select pg_temp.como('00000000-0000-0000-0000-0000000000b2');
do $$ begin
  begin insert into public.productos (tienda_id, titulo)
          values ((select id from public.tiendas where vendedor_id = '00000000-0000-0000-0000-0000000000b2'), 'Espejo');
        perform pg_temp.r('11 Tienda suspendida no crea productos', 'sin error', 'error');
  exception when others then perform pg_temp.r('11 Tienda suspendida no crea productos', 'error', 'error'); end;
end $$;

-- 12. Reactivación
select pg_temp.como('00000000-0000-0000-0000-0000000000b3');
update public.tiendas set activa = true where vendedor_id = '00000000-0000-0000-0000-0000000000b2';
reset role;
select pg_temp.r('12 Tienda reactivada vuelve a aceptar pujas',
  (public.procesar_puja(gen_random_uuid(), (select codigo from salas where nombre = 'principal'), '00000000-0000-0000-0000-0000000000b4', 90)).resultado::text, 'aceptada');

-- 13-17. Acta: se cierra la subasta y solo la ven vendedor, ganador y administrador
update public.subastas set cierra_en = clock_timestamp() - interval '1 second'
 where codigo_sala = (select codigo from salas where nombre = 'principal');
select public.cerrar_subasta((select id from public.subastas where codigo_sala = (select codigo from salas where nombre = 'principal')));
select pg_temp.como('00000000-0000-0000-0000-0000000000b4');
select pg_temp.r('13 El ganador ve el acta con su monto',
  (select monto::text from public.acta_adjudicacion((select codigo from salas where nombre = 'principal'))), '90.00');
select pg_temp.r('14 El acta cuenta pujas aceptadas y rechazadas',
  (select pujas_aceptadas || '/' || solicitudes_rechazadas from public.acta_adjudicacion((select codigo from salas where nombre = 'principal'))), '2/2');
select pg_temp.como('00000000-0000-0000-0000-0000000000b2');
select pg_temp.r('15 La vendedora ve el acta',
  (select count(*)::text from public.acta_adjudicacion((select codigo from salas where nombre = 'principal'))), '1');
select pg_temp.como('00000000-0000-0000-0000-0000000000b1');
select pg_temp.r('16 Otra cuenta no ve el acta',
  (select count(*)::text from public.acta_adjudicacion((select codigo from salas where nombre = 'principal'))), '0');
select pg_temp.como('00000000-0000-0000-0000-0000000000b3');
select pg_temp.r('17 El administrador ve el acta',
  (select count(*)::text from public.acta_adjudicacion((select codigo from salas where nombre = 'principal'))), '1');

reset role;
select n, prueba, obtenido, esperado, ok from log order by n;
rollback;
