-- Remate — separación de roles (comprador, vendedor, administrador).
--   * Nadie puede cambiar su propio rol; solo un administrador cambia roles.
--   * Un comprador pasa a vendedor al registrar su tienda (función registrar_tienda).
--   * El vendedor crea y edita sus subastas mientras no estén abiertas. Abrir, pujar y cerrar
--     siguen reservados al servidor.
--   * El administrador puede ver todas las subastas (también borradores) y las solicitudes de puja.

-- ¿La cuenta actual es administradora?
create function public.es_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfiles where id = (select auth.uid()) and rol = 'administrador');
$$;
revoke execute on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- ¿El producto pertenece a la tienda de la cuenta actual?
create function public.es_dueno_producto(p_producto_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.productos p join public.tiendas t on t.id = p.tienda_id
    where p.id = p_producto_id and t.vendedor_id = (select auth.uid())
  );
$$;
revoke execute on function public.es_dueno_producto(uuid) from public, anon;
grant execute on function public.es_dueno_producto(uuid) to authenticated;

-- ── Protección del rol ───────────────────────────────────────────────────
create function public.proteger_rol()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rol is distinct from old.rol
     and (select auth.uid()) is not null                                   -- peticiones de usuarios
     and coalesce(current_setting('remate.cambio_rol_autorizado', true), '') <> 'si'
     and not public.es_admin() then
    raise exception 'solo_un_administrador_puede_cambiar_roles' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger proteger_rol before update on public.perfiles
  for each row execute function public.proteger_rol();

grant update (rol) on public.perfiles to authenticated;
create policy "admin edita roles" on public.perfiles for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ── Registro de tienda: comprador → vendedor ─────────────────────────────
create function public.registrar_tienda(p_nombre text, p_usuario_tiktok text default null)
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
  insert into public.tiendas (vendedor_id, nombre, usuario_tiktok)
  values (uid, trim(p_nombre), nullif(trim(coalesce(p_usuario_tiktok, '')), ''))
  returning * into t;
  perform set_config('remate.cambio_rol_autorizado', 'si', true);
  update public.perfiles set rol = 'vendedor' where id = uid and rol = 'comprador';
  return t;
end;
$$;
revoke execute on function public.registrar_tienda(text, text) from public, anon;
grant execute on function public.registrar_tienda(text, text) to authenticated;

-- ── Código de sala generado por la base ──────────────────────────────────
create function public.generar_codigo_sala()
returns text
language sql volatile
set search_path = ''
as $$
  select 'RM-' || string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 5);
$$;
alter table public.subastas alter column codigo_sala set default public.generar_codigo_sala();

-- ── El vendedor prepara sus subastas (sin abrirlas) ──────────────────────
create policy "vendedor crea subasta" on public.subastas for insert to authenticated
  with check (
    public.es_dueno_producto(producto_id)
    and estado in ('borrador', 'programada')
    and oferta_vigente is null and postor_vigente_id is null and total_pujas = 0
    and abierta_en is null and cierra_en is null and cerrada_en is null
  );
create policy "vendedor edita subasta sin abrir" on public.subastas for update to authenticated
  using (public.es_dueno_producto(producto_id) and estado in ('borrador', 'programada'))
  with check (
    public.es_dueno_producto(producto_id)
    and estado in ('borrador', 'programada')
    and oferta_vigente is null and postor_vigente_id is null and total_pujas = 0
    and abierta_en is null and cierra_en is null and cerrada_en is null
  );

-- ── Supervisión del administrador ────────────────────────────────────────
create policy "admin ve todas las subastas" on public.subastas for select to authenticated
  using (public.es_admin());
create policy "admin ve solicitudes" on public.solicitudes_puja for select to authenticated
  using (public.es_admin());
