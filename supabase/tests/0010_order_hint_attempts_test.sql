-- 0010: máximo 5 intentos de pista por orden; llamadas sin pista no cuentan.
\set ON_ERROR_STOP on
begin;
do $$
declare
  org uuid := gen_random_uuid(); usr uuid := gen_random_uuid();
  o uuid; o2 uuid; n int; msg text; t timestamptz := now();
begin
  insert into auth.users(id,email) values (usr,'t10@e');
  insert into pv_organizations(id,name) values (org,'T10');
  insert into payverify_orders(organization_id,external_ref,amount,expires_at,created_at)
    values (org,'T10-1',10.00,t+interval '30 min',t-interval '1 min') returning id into o;

  -- llamada sin pistas: no consume intentos
  perform payverify_order_set_hints(o,null,null);
  select hint_attempts into n from payverify_orders where id=o;
  assert n=0, 'sin pistas no debe contar, contó '||n;

  -- 5 intentos fallidos se aceptan
  for i in 1..5 loop perform payverify_order_set_hints(o,null,lpad(i::text,4,'0')); end loop;
  select hint_attempts into n from payverify_orders where id=o;
  assert n=5, 'esperaba 5 intentos, hay '||n;

  -- el sexto se rechaza, también con teléfono
  msg := null;
  begin perform payverify_order_set_hints(o,null,'9999'); exception when others then msg := sqlerrm; end;
  assert msg like '%too_many_attempts%', '6º intento: esperaba too_many_attempts, obtuvo '||coalesce(msg,'(sin error)');
  msg := null;
  begin perform payverify_order_set_hints(o,'1234',null); exception when others then msg := sqlerrm; end;
  assert msg like '%too_many_attempts%', 'teléfono tras el límite: obtuvo '||coalesce(msg,'(sin error)');
  select hint_attempts into n from payverify_orders where id=o;
  assert n=5, 'los rechazos no deben sumar, hay '||n;

  -- una pista inválida no consume intento (se rechaza antes)
  insert into payverify_orders(organization_id,external_ref,amount,expires_at,created_at)
    values (org,'T10-2',10.00,t+interval '30 min',t-interval '1 min') returning id into o2;
  begin perform payverify_order_set_hints(o2,null,'12'); exception when others then null; end;
  select hint_attempts into n from payverify_orders where id=o2;
  assert n=0, 'pista inválida no debe contar, contó '||n;

  raise notice '0010 OK';
end $$;
rollback;
