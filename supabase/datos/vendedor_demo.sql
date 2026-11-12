-- Datos de demostración: un vendedor (Casa Norte (demo)) con cinco productos y sus subastas listas para abrir.
-- La cuenta no tiene contraseña, así que nadie puede ingresar con ella. Se aplicó el 2026-11-11.
-- Para quitarlos:  delete from auth.users where email = 'casanorte@demo.remate.test';
--   (borra en cascada perfil, tienda y productos; las subastas sin pujas se borran antes:)
--   delete from public.subastas s using public.productos p, public.tiendas t
--    where p.id = s.producto_id and t.id = p.tienda_id and t.nombre = 'Casa Norte (demo)';
do $$
declare
  v_uid  uuid := gen_random_uuid();
  v_tid  uuid;
  v_prod uuid;
  r record;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'casanorte@demo.remate.test',
          '{"nombre_visible":"Casa Norte (demo)"}', '{"provider":"email","providers":["email"]}', now(), now());
  update public.perfiles set rol = 'vendedor' where id = v_uid;
  insert into public.tiendas (vendedor_id, nombre, usuario_tiktok, ciudad)
  values (v_uid, 'Casa Norte (demo)', '@casanorte.demo', 'Cochabamba') returning id into v_tid;

  for r in select * from (values
      ('Sillón de lectura', 'Hogar', 'Producto de demostración. Sillón tapizado en verde, estructura de madera.', 80, 10, 180),
      ('Lámpara de mesa', 'Hogar', 'Producto de demostración. Lámpara con pantalla de tela y base metálica.', 50, 5, 120),
      ('Radio antigua', 'Coleccionables', 'Producto de demostración. Radio de mesa de los años 70.', 150, 10, 180),
      ('Chamarra de cuero', 'Moda', 'Producto de demostración. Chamarra talla M.', 120, 10, 180),
      ('Audífonos inalámbricos', 'Tecnología', 'Producto de demostración. Audífonos con estuche de carga.', 90, 5, 120)
    ) as t(titulo, categoria, descripcion, precio, incremento, duracion)
  loop
    insert into public.productos (tienda_id, categoria_id, titulo, descripcion)
    values (v_tid, (select id from public.categorias where nombre = r.categoria), r.titulo, r.descripcion)
    returning id into v_prod;
    insert into public.subastas (producto_id, estado, precio_inicial, incremento_minimo, duracion_seg)
    values (v_prod, 'programada', r.precio, r.incremento, r.duracion);
  end loop;
end $$;
