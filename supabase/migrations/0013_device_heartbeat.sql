-- PayVerify 0013: latido de los teléfonos lectores para saber si están escuchando pagos.
-- Aditiva e idempotente. Solo agrega columnas a pv_devices (escritas por la Edge Function device-heartbeat con service_role).
alter table public.pv_devices
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists capture_active boolean not null default false,
  add column if not exists app_version text check (app_version is null or length(app_version) <= 32),
  add column if not exists battery_unrestricted boolean;

-- Consulta del estado del lector por organización (función reader-status).
create index if not exists pv_devices_org_heartbeat_idx
  on public.pv_devices(organization_id, last_heartbeat_at desc) where device_status = 'active';
