-- PayVerify 0012: deja en el repo el job que vence órdenes pendientes cada 5 minutos.
-- En el proyecto actual el job ya existe (payverify-expire-orders, */5 * * * *) y esta migración no lo toca.
-- Idempotente y conservadora:
--   - No instala pg_cron (el proyecto Supabase es compartido; se habilita desde el panel si falta).
--   - Si pg_cron no está, solo avisa y no falla.
--   - Si ya existe un job con ese nombre, no lo modifica.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron no está instalado: programa payverify_expire_orders() cada 5 minutos por otra vía.';
    return;
  end if;
  if exists (select 1 from cron.job where jobname = 'payverify-expire-orders') then
    raise notice 'payverify-expire-orders ya existe: sin cambios.';
    return;
  end if;
  perform cron.schedule('payverify-expire-orders', '*/5 * * * *', 'select public.payverify_expire_orders();');
end $$;
