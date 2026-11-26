-- Después de aplicar PayVerify: lo que ya existía debe seguir idéntico.
do $$ declare n int; src text; begin
  select count(*) into n from public.organizations; assert n=1,'organizations de Mensajero Pro alterada';
  assert (select credits from public.organizations)=500,'datos de Mensajero Pro alterados';
  assert exists(select 1 from information_schema.columns where table_name='organizations' and column_name='sender_number'),'columna perdida';
  assert not exists(select 1 from information_schema.columns where table_name='organizations' and column_name='status'),'organizations recibió columnas de PayVerify';
  select prosrc into src from pg_proc where proname='is_org_member' and pronamespace='public'::regnamespace;
  assert src like '%org_members%','is_org_member de Mensajero Pro fue sobrescrita';
  assert (select count(*) from pg_proc where proname='is_org_member' and pronamespace='public'::regnamespace)=1,'is_org_member duplicada';
  assert to_regclass('public.pv_organizations') is not null and to_regclass('public.pv_payment_events') is not null,'tablas pv_ faltan';
  raise notice 'COEXISTENCIA OK: Mensajero Pro intacto';
end $$;
