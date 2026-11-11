-- Remate — suspensión de cuentas y tiendas, y acta de adjudicación.
--   * Solo un administrador suspende o reactiva una cuenta o una tienda. Un administrador no puede ser suspendido.
--   * Una cuenta suspendida no puede pujar, registrar una tienda, preparar subastas ni abrir salas.
--   * Una tienda suspendida no puede preparar subastas ni abrir salas, y sus salas abiertas dejan de aceptar pujas.
--     El cierre y la adjudicación siguen su curso normal.
--   * El acta de una subasta cerrada la ven su vendedor, el ganador y los administradores.

alter table public.perfiles add column activo boolean not null default true;
alter table public.tiendas  add column activa boolean not null default true;

-- ── Funciones auxiliares ─────────────────────────────────────────────────
create function public.cuenta_activa(p_perfil_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select activo from public.perfiles where id = p_perfil_id), false);
$$;
revoke execute on function public.cuenta_activa(uuid) from public, anon;
grant execute on function public.cuenta_activa(uuid) to authenticated;

create function public.tienda_activa_de_producto(p_producto_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.productos p join public.tiendas t on t.id = p.tienda_id
    where p.id = p_producto_id and t.activa
  );
$$;
revoke execute on function public.tienda_activa_de_producto(uuid) from public, anon;
grant execute on function public.tienda_activa_de_producto(uuid) to authenticated;

-- ── Protección de la suspensión ──────────────────────────────────────────
create function public.proteger_suspension_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.activo is distinct from old.activo then
    if (select auth.uid()) is not null and not public.es_admin() then
      raise exception 'solo_un_administrador_puede_suspender' using errcode = '42501';
    end if;
    if not new.activo and new.rol = 'administrador' then
      raise exception 'no_se_puede_suspender_a_un_administrador' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger proteger_suspension before update on public.perfiles
  for each row execute function public.proteger_suspension_perfil();
grant update (activo) on public.perfiles to authenticated;

create function public.proteger_suspension_tienda()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.activa is distinct from old.activa
     and (select auth.uid()) is not null and not public.es_admin() then
    raise exception 'solo_un_administrador_puede_suspender' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger proteger_suspension before update on public.tiendas
  for each row execute function public.proteger_suspension_tienda();
create policy "admin suspende tiendas" on public.tiendas for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ── Preparar subastas exige cuenta y tienda activas ──────────────────────
drop policy "crear producto propio" on public.productos;
create policy "crear producto propio" on public.productos for insert to authenticated
  with check (
    public.cuenta_activa((select auth.uid()))
    and exists (select 1 from public.tiendas t where t.id = tienda_id and t.vendedor_id = (select auth.uid()) and t.activa)
  );

drop policy "vendedor crea subasta" on public.subastas;
create policy "vendedor crea subasta" on public.subastas for insert to authenticated
  with check (
    public.es_dueno_producto(producto_id)
    and public.cuenta_activa((select auth.uid()))
    and public.tienda_activa_de_producto(producto_id)
    and estado in ('borrador', 'programada')
    and oferta_vigente is null and postor_vigente_id is null and total_pujas = 0
    and abierta_en is null and cierra_en is null and cerrada_en is null
  );

drop policy "vendedor edita subasta sin abrir" on public.subastas;
create policy "vendedor edita subasta sin abrir" on public.subastas for update to authenticated
  using (
    public.es_dueno_producto(producto_id)
    and public.cuenta_activa((select auth.uid()))
    and public.tienda_activa_de_producto(producto_id)
    and estado in ('borrador', 'programada')
  )
  with check (
    public.es_dueno_producto(producto_id)
    and public.cuenta_activa((select auth.uid()))
    and public.tienda_activa_de_producto(producto_id)
    and estado in ('borrador', 'programada')
    and oferta_vigente is null and postor_vigente_id is null and total_pujas = 0
    and abierta_en is null and cierra_en is null and cerrada_en is null
  );

-- ── Registro de tienda: la cuenta debe estar activa ──────────────────────
create or replace function public.registrar_tienda(p_nombre text, p_usuario_tiktok text default null)
returns public.tiendas
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  t   public.tiendas;
begin
  if uid is null then
    raise exception 'sesion_requerida' using errcode = '42501';
  end if;
  if not public.cuenta_activa(uid) then
    raise exception 'cuenta_suspendida' using errcode = '42501';
  end if;
  insert into public.tiendas (vendedor_id, nombre, usuario_tiktok)
  values (uid, trim(p_nombre), nullif(trim(coalesce(p_usuario_tiktok, '')), ''))
  returning * into t;
  perform set_config('remate.cambio_rol_autorizado', 'si', true);
  update public.perfiles set rol = 'vendedor' where id = uid and rol = 'comprador';
  return t;
end;
$$;

-- ── Motor: rechazar pujas de cuentas o tiendas suspendidas ───────────────
create or replace function public.procesar_puja(
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
  elsif not public.tienda_activa_de_producto(s.producto_id) then
    motivo := 'tienda_suspendida';
  elsif not public.cuenta_activa(p_postor_id) then
    motivo := 'cuenta_suspendida';
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

-- ── Motor: abrir exige cuenta y tienda activas ───────────────────────────
create or replace function public.abrir_subasta(p_codigo_sala text, p_vendedor_id uuid)
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
  if not public.cuenta_activa(p_vendedor_id) then
    raise exception 'cuenta_suspendida' using errcode = '42501';
  end if;
  if not public.tienda_activa_de_producto(s.producto_id) then
    raise exception 'tienda_suspendida' using errcode = '42501';
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

-- create or replace conserva los permisos, pero se repiten por claridad.
revoke execute on function public.procesar_puja(uuid, text, uuid, numeric) from public, anon, authenticated;
revoke execute on function public.abrir_subasta(text, uuid) from public, anon, authenticated;

-- ── Acta de adjudicación ─────────────────────────────────────────────────
-- Devuelve una fila solo si la subasta está cerrada y quien consulta es su vendedor, el ganador o un administrador.
create function public.acta_adjudicacion(p_codigo_sala text)
returns table (
  codigo_sala            text,
  producto               text,
  tienda                 text,
  usuario_tiktok         text,
  vendedor_id            uuid,
  precio_inicial         numeric,
  incremento_minimo      numeric,
  duracion_seg           integer,
  abierta_en             timestamptz,
  cierre_previsto        timestamptz,
  plazo_final            timestamptz,
  cerrada_en             timestamptz,
  ganador_id             uuid,
  ganador                text,
  monto                  numeric,
  puja_orden             bigint,
  adjudicada_en          timestamptz,
  pujas_aceptadas        integer,
  solicitudes_rechazadas integer
)
language sql stable security definer
set search_path = ''
as $$
  select s.codigo_sala, p.titulo, t.nombre, t.usuario_tiktok, t.vendedor_id,
         s.precio_inicial, s.incremento_minimo, s.duracion_seg,
         s.abierta_en, s.abierta_en + make_interval(secs => s.duracion_seg), s.cierra_en, s.cerrada_en,
         a.ganador_id, g.nombre_visible, a.monto, a.puja_orden, a.adjudicada_en,
         s.total_pujas,
         (select count(*)::integer from public.solicitudes_puja sp where sp.subasta_id = s.id and sp.resultado = 'rechazada')
    from public.subastas s
    join public.productos p on p.id = s.producto_id
    join public.tiendas t on t.id = p.tienda_id
    left join public.adjudicaciones a on a.subasta_id = s.id
    left join public.perfiles g on g.id = a.ganador_id
   where s.codigo_sala = upper(p_codigo_sala)
     and s.estado = 'cerrada'
     and (
       t.vendedor_id = (select auth.uid())
       or a.ganador_id = (select auth.uid())
       or public.es_admin()
     );
$$;
revoke execute on function public.acta_adjudicacion(text) from public, anon;
grant execute on function public.acta_adjudicacion(text) to authenticated;
