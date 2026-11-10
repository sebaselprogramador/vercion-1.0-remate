-- Remate — motor de pujas y cierre.
-- Cada operación se ejecuta en una transacción y bloquea la fila de la subasta
-- (SELECT ... FOR UPDATE), de modo que aceptar una puja y cerrar la subasta no
-- puedan producir resultados incompatibles. Solo el servidor (NestJS) puede llamarlas.

-- Las solicitudes rechazadas guardan el monto tal como llegó (puede ser inválido).
alter table public.solicitudes_puja drop constraint solicitudes_puja_monto_check;
alter table public.solicitudes_puja alter column monto type numeric;

-- Resultado común de las operaciones de puja.
create type public.resultado_puja as (
  resultado       public.resultado_solicitud,
  motivo          text,
  orden           bigint,
  oferta_vigente  numeric(12,2),
  cierra_en       timestamptz,
  total_pujas     integer,
  repetida        boolean
);

-- ── Aceptar o rechazar una solicitud de puja ─────────────────────────────
create function public.procesar_puja(
  p_id_solicitud uuid,
  p_codigo_sala  text,
  p_postor_id    uuid,
  p_monto        numeric
) returns public.resultado_puja
language plpgsql
set search_path = ''
as $$
declare
  s        public.subastas%rowtype;
  previa   public.solicitudes_puja%rowtype;
  minimo   numeric(12,2);
  motivo   text;
  v_orden  bigint;
  r        public.resultado_puja;
begin
  -- 1. Bloquea la subasta: las solicitudes y el cierre de una misma sala se atienden de una en una.
  select * into s from public.subastas where codigo_sala = upper(p_codigo_sala) for update;
  if not found then
    r.resultado := 'rechazada'; r.motivo := 'sala_inexistente'; r.repetida := false;
    return r;
  end if;

  -- 2. Reintento: si la solicitud ya se procesó, devuelve el resultado registrado.
  select * into previa from public.solicitudes_puja where id_solicitud = p_id_solicitud;
  if found then
    if previa.postor_id <> p_postor_id or previa.subasta_id <> s.id then
      raise exception 'id_solicitud reutilizado por otra cuenta o sala' using errcode = '22023';
    end if;
    r.resultado := previa.resultado; r.motivo := previa.motivo; r.repetida := true;
    select p.orden into r.orden from public.pujas p where p.id_solicitud = p_id_solicitud;
    r.oferta_vigente := s.oferta_vigente; r.cierra_en := s.cierra_en; r.total_pujas := s.total_pujas;
    return r;
  end if;

  -- 3. Reglas de aceptación (el reloj es el del servidor de base de datos).
  minimo := coalesce(s.oferta_vigente + s.incremento_minimo, s.precio_inicial);
  if s.estado <> 'abierta' then
    motivo := 'subasta_no_abierta';
  elsif clock_timestamp() >= s.cierra_en then
    motivo := 'plazo_vencido';
  elsif exists (
    select 1 from public.productos pr join public.tiendas t on t.id = pr.tienda_id
    where pr.id = s.producto_id and t.vendedor_id = p_postor_id
  ) then
    motivo := 'vendedor_no_puede_pujar';
  elsif p_monto is null or p_monto <= 0 or p_monto <> round(p_monto, 2) then
    motivo := 'monto_invalido';
  elsif p_monto < minimo then
    motivo := 'monto_insuficiente';
  end if;

  if motivo is not null then
    insert into public.solicitudes_puja (id_solicitud, subasta_id, postor_id, monto, resultado, motivo)
    values (p_id_solicitud, s.id, p_postor_id, coalesce(p_monto, 0), 'rechazada', motivo);
    r.resultado := 'rechazada'; r.motivo := motivo; r.repetida := false;
    r.oferta_vigente := s.oferta_vigente; r.cierra_en := s.cierra_en; r.total_pujas := s.total_pujas;
    return r;
  end if;

  -- 4. Aceptación: solicitud, puja y estado de la subasta se guardan juntos.
  insert into public.solicitudes_puja (id_solicitud, subasta_id, postor_id, monto, resultado)
  values (p_id_solicitud, s.id, p_postor_id, p_monto, 'aceptada');

  insert into public.pujas (subasta_id, postor_id, monto, id_solicitud)
  values (s.id, p_postor_id, p_monto, p_id_solicitud)
  returning orden into v_orden;

  update public.subastas
     set oferta_vigente    = p_monto,
         postor_vigente_id = p_postor_id,
         total_pujas       = total_pujas + 1,
         -- Ampliación solo si la puja llega dentro de la ventana final (valores por definir).
         cierra_en = case
           when ventana_ampliacion_seg is not null
            and cierra_en - clock_timestamp() <= make_interval(secs => ventana_ampliacion_seg)
           then greatest(cierra_en, clock_timestamp() + make_interval(secs => ampliacion_seg))
           else cierra_en
         end
   where id = s.id
   returning oferta_vigente, cierra_en, total_pujas into r.oferta_vigente, r.cierra_en, r.total_pujas;

  r.resultado := 'aceptada'; r.orden := v_orden; r.repetida := false;
  return r;
end;
$$;

-- ── Abrir una subasta (solo su vendedor) ─────────────────────────────────
create function public.abrir_subasta(p_codigo_sala text, p_vendedor_id uuid)
returns public.subastas
language plpgsql
set search_path = ''
as $$
declare
  s public.subastas%rowtype;
begin
  select su.* into s
    from public.subastas su
    join public.productos pr on pr.id = su.producto_id
    join public.tiendas t on t.id = pr.tienda_id
   where su.codigo_sala = upper(p_codigo_sala) and t.vendedor_id = p_vendedor_id
   for update of su;
  if not found then
    raise exception 'sala_inexistente_o_ajena' using errcode = 'P0002';
  end if;
  if s.estado <> 'programada' then
    raise exception 'la subasta debe estar lista para abrir (estado actual: %)', s.estado using errcode = '22023';
  end if;
  update public.subastas
     set estado = 'abierta', abierta_en = clock_timestamp(),
         cierra_en = clock_timestamp() + make_interval(secs => duracion_seg)
   where id = s.id
   returning * into s;
  return s;
end;
$$;

-- ── Cerrar una subasta vencida y registrar al ganador ────────────────────
create function public.cerrar_subasta(p_subasta_id uuid)
returns public.subastas
language plpgsql
set search_path = ''
as $$
declare
  s     public.subastas%rowtype;
  ultima public.pujas%rowtype;
begin
  -- Mismo bloqueo que procesar_puja: una oferta y el cierre nunca se intercalan.
  select * into s from public.subastas where id = p_subasta_id for update;
  if not found or s.estado <> 'abierta' or clock_timestamp() < s.cierra_en then
    return null;   -- nada que cerrar (ya cerrada, o el plazo se amplió)
  end if;

  update public.subastas set estado = 'cerrada', cerrada_en = clock_timestamp()
   where id = s.id returning * into s;

  select * into ultima from public.pujas where subasta_id = s.id order by orden desc limit 1;
  if found then
    insert into public.adjudicaciones (subasta_id, puja_orden, ganador_id, monto)
    values (s.id, ultima.orden, ultima.postor_id, ultima.monto);
  end if;
  return s;
end;
$$;

-- Cierra todas las subastas cuyo vencimiento ya pasó. La llama el proceso periódico del servidor.
create function public.cerrar_vencidas()
returns setof public.subastas
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  s    public.subastas;
begin
  for v_id in
    select id from public.subastas where estado = 'abierta' and cierra_en <= clock_timestamp()
  loop
    s := public.cerrar_subasta(v_id);
    if s.id is not null then
      return next s;
    end if;
  end loop;
end;
$$;

-- Solo el servidor (rol postgres / service_role) puede ejecutar el motor.
revoke execute on function public.procesar_puja(uuid, text, uuid, numeric) from public, anon, authenticated;
revoke execute on function public.abrir_subasta(text, uuid) from public, anon, authenticated;
revoke execute on function public.cerrar_subasta(uuid) from public, anon, authenticated;
revoke execute on function public.cerrar_vencidas() from public, anon, authenticated;
