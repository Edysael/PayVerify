-- 0013: columnas del latido con valores por defecto seguros e índice parcial.
\set ON_ERROR_STOP on
begin;
do $$
declare org uuid := gen_random_uuid(); usr uuid := gen_random_uuid(); dev uuid; r record;
begin
  insert into auth.users(id,email) values (usr,'t13@e');
  insert into pv_organizations(id,name) values (org,'T13');
  insert into pv_devices(organization_id,user_id,device_name,device_status) values (org,usr,'tel','active') returning id into dev;
  select capture_active, last_heartbeat_at, app_version into r from pv_devices where id=dev;
  assert r.capture_active = false and r.last_heartbeat_at is null and r.app_version is null, '0013: valores por defecto';
  update pv_devices set last_heartbeat_at=now(), capture_active=true, app_version='0.3.0', battery_unrestricted=true where id=dev;
  begin
    update pv_devices set app_version=repeat('x',40) where id=dev;
    raise exception 'debía rechazar app_version larga';
  exception when check_violation then null; end;
  assert to_regclass('public.pv_devices_org_heartbeat_idx') is not null, '0013: falta índice';
  raise notice '0013 OK';
end $$;
rollback;
