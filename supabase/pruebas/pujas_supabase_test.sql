-- Pruebas de pujar(), abrir_mi_subasta() y hora_servidor() llamadas como usuarios (rol authenticated).
-- Se deshace al final: no deja datos.
begin;
create temp table log (n serial, prueba text, obtenido text, esperado text, ok boolean);
grant all on log to authenticated, anon; grant usage on sequence log_n_seq to authenticated, anon;
create function pg_temp.r(p text, o text, e text) returns void language sql as $f$ insert into log(prueba, obtenido, esperado, ok) values (p, coalesce(o,'null'), e, coalesce(o,'null') = e) $f$;
grant execute on function pg_temp.r(text, text, text) to authenticated, anon;
create temp table salas (codigo text); grant all on salas to authenticated, anon;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
 ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','vende@remate.test','{"nombre_visible":"Rocío"}',now(),now()),
 ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','compra@remate.test','{"nombre_visible":"Ana"}',now(),now());

create function pg_temp.como(uid text) returns void language sql as $f$
  select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$f$;

-- La vendedora prepara y abre su sala.
select pg_temp.como('00000000-0000-0000-0000-0000000000d1');
do $$ declare t public.tiendas; v_prod uuid; v_cod text; s public.subastas; begin
  t := public.registrar_tienda('Casa Prueba', null);
  insert into public.productos (tienda_id, titulo) values (t.id, 'Sillón') returning id into v_prod;
  insert into public.subastas (producto_id, estado, precio_inicial, incremento_minimo, duracion_seg)
    values (v_prod, 'programada', 80, 10, 180) returning codigo_sala into v_cod;
  insert into salas values (v_cod);
  s := public.abrir_mi_subasta(v_cod);
  perform pg_temp.r('01 La vendedora abre su sala', s.estado::text, 'abierta');
  perform pg_temp.r('02 La vendedora no puede pujar en su sala',
    (public.pujar(gen_random_uuid(), v_cod, 80)).motivo, 'vendedor_no_puede_pujar');
end $$;

-- La compradora puja.
select pg_temp.como('00000000-0000-0000-0000-0000000000d2');
do $$ declare v_cod text := (select codigo from salas); x public.resultado_puja; id1 uuid := gen_random_uuid(); begin
  begin perform public.abrir_mi_subasta(v_cod); perform pg_temp.r('03 Otra cuenta no abre la sala', 'sin error', 'error');
  exception when others then perform pg_temp.r('03 Otra cuenta no abre la sala', 'error', 'error'); end;
  x := public.pujar(id1, v_cod, 80);
  perform pg_temp.r('04 Puja aceptada', x.resultado::text || ' ' || x.oferta_vigente, 'aceptada 80.00');
  x := public.pujar(id1, v_cod, 80);
  perform pg_temp.r('05 Reintento no duplica', x.repetida::text || ' ' || x.total_pujas, 'true 1');
  x := public.pujar(gen_random_uuid(), v_cod, 85);
  perform pg_temp.r('06 Monto insuficiente', x.motivo, 'monto_insuficiente');
  perform public.pujar(gen_random_uuid(), v_cod, 90);
  perform public.pujar(gen_random_uuid(), v_cod, 100);
  perform public.pujar(gen_random_uuid(), v_cod, 110);
  x := public.pujar(gen_random_uuid(), v_cod, 120);
  perform pg_temp.r('07 Límite: más de 5 solicitudes en 3 s', x.motivo, 'demasiadas_solicitudes');
  perform pg_temp.r('08 hora_servidor responde', (public.hora_servidor() is not null)::text, 'true');
end $$;

-- Sin sesión no se puede pujar.
reset role;
select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin perform public.pujar(gen_random_uuid(), (select codigo from salas), 500); perform pg_temp.r('09 Sin sesión no se puja', 'sin error', 'error');
  exception when others then perform pg_temp.r('09 Sin sesión no se puja', 'error', 'error'); end;
end $$;

reset role;
select pg_temp.r('10 Tarea de cierre programada', (select schedule from cron.job where jobname = 'remate-cerrar-vencidas'), '2 seconds');
select n, prueba, obtenido, esperado, ok from log order by n;
rollback;
