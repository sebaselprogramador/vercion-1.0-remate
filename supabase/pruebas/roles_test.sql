-- Pruebas de roles y permisos por fila, simulando sesiones de usuarios (rol authenticated).
-- Se deshace al final: no deja datos.
begin;
create temp table log (n serial, prueba text, obtenido text, esperado text, ok boolean);
grant all on log to authenticated; grant usage on sequence log_n_seq to authenticated;
create function pg_temp.r(p text, o text, e text) returns void language sql as $f$ insert into log(prueba, obtenido, esperado, ok) values (p, o, e, o = e) $f$;
grant execute on function pg_temp.r(text, text, text) to authenticated;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','compradora@remate.test','{"nombre_visible":"Ana"}',now(),now()),
 ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','vendedor@remate.test','{"nombre_visible":"Casa Norte"}',now(),now()),
 ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@remate.test','{"nombre_visible":"Admin"}',now(),now());
update public.perfiles set rol = 'administrador' where id = '00000000-0000-0000-0000-0000000000a3';

create function pg_temp.como(uid text) returns void language sql as $f$
  select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$f$;

-- 1. Nadie cambia su propio rol
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  begin update public.perfiles set rol = 'administrador' where id = '00000000-0000-0000-0000-0000000000a1';
        perform pg_temp.r('01 Comprador no puede hacerse administrador', 'sin error', 'error');
  exception when others then perform pg_temp.r('01 Comprador no puede hacerse administrador', 'error', 'error'); end;
end $$;

-- 2-6. Vendedor
select pg_temp.como('00000000-0000-0000-0000-0000000000a2');
do $$ declare t public.tiendas; v_prod uuid; v_cod text; begin
  t := public.registrar_tienda('Casa Norte', '@casanorte.cbba');
  perform pg_temp.r('02 Registrar tienda convierte en vendedor',
    (select rol::text from public.perfiles where id = '00000000-0000-0000-0000-0000000000a2'), 'vendedor');
  insert into public.productos (tienda_id, titulo) values (t.id, 'Sillón') returning id into v_prod;
  insert into public.subastas (producto_id, estado, precio_inicial, incremento_minimo, duracion_seg)
    values (v_prod, 'programada', 80, 10, 180) returning codigo_sala into v_cod;
  perform pg_temp.r('03 Vendedor crea subasta con código generado', (v_cod ~ '^RM-[0-9A-Z]{5}$')::text, 'true');
  insert into public.subastas (producto_id, estado, precio_inicial, incremento_minimo, duracion_seg)
    values (v_prod, 'borrador', 50, 5, 180);
  begin insert into public.subastas (producto_id, estado, precio_inicial, incremento_minimo, duracion_seg, cierra_en)
          values (v_prod, 'abierta', 80, 10, 180, now() + interval '1 hour');
        perform pg_temp.r('04 Vendedor no puede crear una subasta ya abierta', 'sin error', 'error');
  exception when others then perform pg_temp.r('04 Vendedor no puede crear una subasta ya abierta', 'error', 'error'); end;
  begin update public.subastas set estado = 'abierta', cierra_en = now() + interval '1 hour' where codigo_sala = v_cod;
        perform pg_temp.r('05 Vendedor no puede abrir la subasta por su cuenta', 'sin error', 'error');
  exception when others then perform pg_temp.r('05 Vendedor no puede abrir la subasta por su cuenta', 'error', 'error'); end;
  begin perform public.procesar_puja(gen_random_uuid(), v_cod, '00000000-0000-0000-0000-0000000000a1', 80);
        perform pg_temp.r('06 Un usuario no puede ejecutar el motor de pujas', 'sin error', 'error');
  exception when others then perform pg_temp.r('06 Un usuario no puede ejecutar el motor de pujas', 'error', 'error'); end;
end $$;

-- 7. Otro usuario no ve borradores ajenos
select pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select pg_temp.r('07 Compradora ve solo la subasta programada', (select count(*)::text from public.subastas), '1');
do $$ begin
  begin insert into public.tiendas (vendedor_id, nombre) values ('00000000-0000-0000-0000-0000000000a2', 'Falsa');
        perform pg_temp.r('08 No se puede crear una tienda a nombre de otro', 'sin error', 'error');
  exception when others then perform pg_temp.r('08 No se puede crear una tienda a nombre de otro', 'error', 'error'); end;
end $$;

-- 9-10. Administrador
select pg_temp.como('00000000-0000-0000-0000-0000000000a3');
select pg_temp.r('09 Administrador ve todas, incluso borradores', (select count(*)::text from public.subastas), '2');
update public.perfiles set rol = 'vendedor' where id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.r('10 Administrador cambia el rol de otra cuenta',
  (select rol::text from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1'), 'vendedor');

reset role;
select n, prueba, obtenido, esperado, ok from log order by n;
rollback;
