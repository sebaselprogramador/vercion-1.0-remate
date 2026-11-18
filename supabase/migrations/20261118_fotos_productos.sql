-- Remate — fotos de productos.
--   * Bucket público "productos": cualquiera puede ver las fotos (la vitrina es pública para quien ingresa).
--   * Solo una cuenta activa sube fotos, y solo dentro de su propia carpeta (<id de la cuenta>/...).
--   * Máximo 5 MB; solo JPG, PNG o WEBP.
--   * productos.imagen_url solo acepta direcciones de ese bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "subir fotos propias" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'productos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.cuenta_activa((select auth.uid()))
  );

create policy "cambiar fotos propias" on storage.objects for update to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'productos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "borrar fotos propias" on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter table public.productos add constraint imagen_del_bucket check (
  imagen_url is null
  or imagen_url like 'https://mtxovxrsqjlblyzxvliq.supabase.co/storage/v1/object/public/productos/%'
);
