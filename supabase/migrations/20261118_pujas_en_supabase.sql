-- Remate — las pujas pasan a Supabase (sin servidor de subastas propio).
--   * pujar(): la app la llama con la sesión de la cuenta. Usa el mismo motor transaccional (procesar_puja),
--     que sigue decidiendo con el reloj y el bloqueo de la base. Limita a 5 solicitudes nuevas cada 3 s por cuenta.
--   * abrir_mi_subasta(): el vendedor abre su propia sala (abrir_subasta con la cuenta de la sesión).
--   * hora_servidor(): la app ajusta su cuenta regresiva a la hora de la base.
--   * pg_cron cierra las subastas vencidas cada 2 segundos. Una puja que llega tras el vencimiento ya se rechaza
--     en procesar_puja ("plazo_vencido"), así que la demora del cierre no cambia al ganador.
--   * Realtime publica los cambios de subastas y pujas para que las salas se actualicen solas.

create function public.pujar(p_id_solicitud uuid, p_codigo_sala text, p_monto numeric)
returns public.resultado_puja
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  recientes integer;
  r public.resultado_puja;
begin
  if uid is null then
    raise exception 'sesion_requerida' using errcode = '42501';
  end if;
  -- Un reintento con el mismo id no cuenta para el límite: devuelve el resultado registrado.
  if not exists (select 1 from public.solicitudes_puja where id_solicitud = p_id_solicitud) then
    select count(*) into recientes from public.solicitudes_puja
     where postor_id = uid and procesada_en > clock_timestamp() - interval '3 seconds';
    if recientes >= 5 then
      r.resultado := 'rechazada'; r.motivo := 'demasiadas_solicitudes'; r.repetida := false;
      return r;
    end if;
  end if;
  return public.procesar_puja(p_id_solicitud, p_codigo_sala, uid, p_monto);
end;
$$;
revoke execute on function public.pujar(uuid, text, numeric) from public, anon;
grant execute on function public.pujar(uuid, text, numeric) to authenticated;

create function public.abrir_mi_subasta(p_codigo_sala text)
returns public.subastas
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'sesion_requerida' using errcode = '42501';
  end if;
  return public.abrir_subasta(p_codigo_sala, uid);
end;
$$;
revoke execute on function public.abrir_mi_subasta(text) from public, anon;
grant execute on function public.abrir_mi_subasta(text) to authenticated;

create function public.hora_servidor()
returns timestamptz
language sql volatile
set search_path = ''
as $$ select clock_timestamp(); $$;
grant execute on function public.hora_servidor() to anon, authenticated;

-- Cierre automático.
create extension if not exists pg_cron;
select cron.schedule('remate-cerrar-vencidas', '2 seconds', $$select public.cerrar_vencidas()$$);

-- Tiempo real para las salas (Realtime respeta las políticas por fila).
alter publication supabase_realtime add table public.subastas, public.pujas;

-- Cada ejecución deja una fila en cron.job_run_details (~43 000 al día): se limpia a diario (03:00 en Bolivia).
select cron.schedule('remate-limpiar-registro-cron', '0 7 * * *', $$delete from cron.job_run_details where end_time < now() - interval '1 day'$$);
