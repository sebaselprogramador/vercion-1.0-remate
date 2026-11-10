-- Remate (versión proyecto de grado: solo subastas)
-- Esquema base: cuentas, tiendas, productos, subastas, pujas y adjudicación.
--
-- Decisiones reflejadas:
--   * La autenticación la provee Supabase Auth (auth.users). Cada cuenta tiene un perfil.
--   * Las pujas, el cierre y la adjudicación los escribe solo el servidor (NestJS con la
--     clave de servicio). Los clientes no tienen permisos de escritura sobre esas tablas.
--   * Importes en numeric(12,2) (decimal exacto, bolivianos).
--   * Vencimiento persistido en subastas.cierra_en; el contador del navegador es informativo.
--   * Ampliación del plazo solo si una puja llega en la ventana final (anti-sniping).
--     Los valores concretos de ventana y ampliación AÚN NO están definidos: columnas nulas.

-- ── Tipos ────────────────────────────────────────────────────────────────
create type public.rol_usuario as enum ('comprador', 'vendedor', 'administrador');
create type public.estado_subasta as enum ('borrador', 'programada', 'abierta', 'cerrada', 'cancelada');
create type public.resultado_solicitud as enum ('aceptada', 'rechazada');

-- ── Perfiles (1 a 1 con auth.users) ──────────────────────────────────────
create table public.perfiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  nombre_visible  text not null check (char_length(nombre_visible) between 1 and 60),
  rol             public.rol_usuario not null default 'comprador',
  creado_en       timestamptz not null default now()
);
comment on table public.perfiles is 'Datos públicos de cada cuenta. Autenticar una cuenta no verifica la identidad real.';

-- Crea el perfil automáticamente al registrarse.
create function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre_visible)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre_visible'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- ── Tiendas (vendedores) ─────────────────────────────────────────────────
create table public.tiendas (
  id              uuid primary key default gen_random_uuid(),
  vendedor_id     uuid not null unique references public.perfiles (id) on delete cascade,
  nombre          text not null check (char_length(nombre) between 2 and 80),
  usuario_tiktok  text check (usuario_tiktok ~ '^@?[A-Za-z0-9._]{2,24}$'),
  ciudad          text not null default 'Cochabamba',
  creado_en       timestamptz not null default now()
);

-- ── Categorías ───────────────────────────────────────────────────────────
create table public.categorias (
  id      smallint generated always as identity primary key,
  nombre  text not null unique
);
insert into public.categorias (nombre) values ('Hogar'), ('Tecnología'), ('Moda'), ('Coleccionables');

-- ── Productos ────────────────────────────────────────────────────────────
create table public.productos (
  id            uuid primary key default gen_random_uuid(),
  tienda_id     uuid not null references public.tiendas (id) on delete cascade,
  categoria_id  smallint references public.categorias (id),
  titulo        text not null check (char_length(titulo) between 2 and 120),
  descripcion   text check (char_length(descripcion) <= 2000),
  imagen_url    text,
  creado_en     timestamptz not null default now()
);
create index on public.productos (tienda_id);
create index on public.productos (categoria_id);

-- ── Subastas ─────────────────────────────────────────────────────────────
create table public.subastas (
  id                      uuid primary key default gen_random_uuid(),
  producto_id             uuid not null references public.productos (id) on delete restrict,
  codigo_sala             text not null unique check (codigo_sala ~ '^RM-[0-9A-Z]{4,8}$'),
  estado                  public.estado_subasta not null default 'borrador',
  precio_inicial          numeric(12,2) not null check (precio_inicial > 0),
  incremento_minimo       numeric(12,2) not null check (incremento_minimo > 0),
  duracion_seg            integer not null check (duracion_seg > 0),
  ventana_ampliacion_seg  integer check (ventana_ampliacion_seg > 0),   -- pendiente de definir
  ampliacion_seg          integer check (ampliacion_seg > 0),           -- pendiente de definir
  abierta_en              timestamptz,
  cierra_en               timestamptz,                                  -- vencimiento autoritativo
  cerrada_en              timestamptz,
  oferta_vigente          numeric(12,2) check (oferta_vigente > 0),
  postor_vigente_id       uuid references public.perfiles (id),
  total_pujas             integer not null default 0 check (total_pujas >= 0),
  creado_en               timestamptz not null default now(),
  constraint ampliacion_completa check ((ventana_ampliacion_seg is null) = (ampliacion_seg is null)),
  constraint abierta_tiene_vencimiento check (estado <> 'abierta' or cierra_en is not null),
  constraint vigente_coherente check ((oferta_vigente is null) = (postor_vigente_id is null))
);
create index on public.subastas (estado);
create index on public.subastas (producto_id);

-- ── Solicitudes de puja (idempotencia y auditoría) ───────────────────────
-- Cada solicitud enviada desde el teléfono trae un id único. Un reintento con el mismo id
-- devuelve el resultado registrado en vez de crear otra puja.
create table public.solicitudes_puja (
  id_solicitud  uuid primary key,
  subasta_id    uuid not null references public.subastas (id) on delete cascade,
  postor_id     uuid not null references public.perfiles (id),
  monto         numeric(12,2) not null check (monto > 0),
  resultado     public.resultado_solicitud not null,
  motivo        text,                                   -- motivo del rechazo
  procesada_en  timestamptz not null default now()
);
create index on public.solicitudes_puja (subasta_id);
create index on public.solicitudes_puja (postor_id);

-- ── Pujas aceptadas ──────────────────────────────────────────────────────
-- orden = orden de aceptación en el servidor (no la hora del teléfono).
create table public.pujas (
  orden         bigint generated always as identity primary key,
  subasta_id    uuid not null references public.subastas (id) on delete cascade,
  postor_id     uuid not null references public.perfiles (id),
  monto         numeric(12,2) not null check (monto > 0),
  id_solicitud  uuid not null unique references public.solicitudes_puja (id_solicitud),
  aceptada_en   timestamptz not null default now()
);
create index on public.pujas (subasta_id, orden desc);

-- ── Adjudicación (una por subasta) ───────────────────────────────────────
create table public.adjudicaciones (
  subasta_id     uuid primary key references public.subastas (id) on delete cascade,
  puja_orden     bigint not null unique references public.pujas (orden),
  ganador_id     uuid not null references public.perfiles (id),
  monto          numeric(12,2) not null check (monto > 0),
  adjudicada_en  timestamptz not null default now()
);
comment on table public.adjudicaciones is 'Registro del ganador al cierre. No representa un pago confirmado ni una entrega.';

-- ── Seguridad por filas ──────────────────────────────────────────────────
alter table public.perfiles         enable row level security;
alter table public.tiendas          enable row level security;
alter table public.categorias       enable row level security;
alter table public.productos        enable row level security;
alter table public.subastas         enable row level security;
alter table public.solicitudes_puja enable row level security;
alter table public.pujas            enable row level security;
alter table public.adjudicaciones   enable row level security;

-- Perfiles: lectura pública del nombre visible; cada cuenta edita solo el suyo (sin cambiar rol).
create policy "perfiles visibles" on public.perfiles for select to anon, authenticated using (true);
create policy "editar perfil propio" on public.perfiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke update on public.perfiles from authenticated;
grant update (nombre_visible) on public.perfiles to authenticated;

-- Tiendas y productos: lectura pública; escritura solo del vendedor dueño.
create policy "tiendas visibles" on public.tiendas for select to anon, authenticated using (true);
create policy "crear tienda propia" on public.tiendas for insert to authenticated
  with check ((select auth.uid()) = vendedor_id);
create policy "editar tienda propia" on public.tiendas for update to authenticated
  using ((select auth.uid()) = vendedor_id) with check ((select auth.uid()) = vendedor_id);

create policy "categorias visibles" on public.categorias for select to anon, authenticated using (true);

create policy "productos visibles" on public.productos for select to anon, authenticated using (true);
create policy "crear producto propio" on public.productos for insert to authenticated
  with check (exists (select 1 from public.tiendas t where t.id = tienda_id and t.vendedor_id = (select auth.uid())));
create policy "editar producto propio" on public.productos for update to authenticated
  using (exists (select 1 from public.tiendas t where t.id = tienda_id and t.vendedor_id = (select auth.uid())))
  with check (exists (select 1 from public.tiendas t where t.id = tienda_id and t.vendedor_id = (select auth.uid())));

-- Subastas: públicas salvo borradores, que solo ve su vendedor. Escritura solo desde el servidor.
create policy "subastas visibles" on public.subastas for select to anon, authenticated
  using (
    estado <> 'borrador'
    or exists (
      select 1 from public.productos p join public.tiendas t on t.id = p.tienda_id
      where p.id = producto_id and t.vendedor_id = (select auth.uid())
    )
  );

-- Pujas y adjudicaciones: historial público. Escritura solo desde el servidor.
create policy "pujas visibles" on public.pujas for select to anon, authenticated using (true);
create policy "adjudicaciones visibles" on public.adjudicaciones for select to anon, authenticated using (true);

-- Solicitudes: cada postor ve solo las suyas (para recuperar el resultado tras reconectarse).
create policy "solicitudes propias" on public.solicitudes_puja for select to authenticated
  using ((select auth.uid()) = postor_id);

-- ── Ajustes tras revisar los avisos de Supabase ──────────────────────────
-- La función del disparador no debe poder llamarse desde la API pública.
revoke execute on function public.crear_perfil_nuevo_usuario() from public, anon, authenticated;
create index on public.subastas (postor_vigente_id);
create index on public.pujas (postor_id);
create index on public.adjudicaciones (ganador_id);
