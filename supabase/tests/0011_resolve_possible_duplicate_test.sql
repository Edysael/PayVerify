-- 0011: resolver POSSIBLE_DUPLICATE a mano.
\set ON_ERROR_STOP on
begin;
do $$
declare
  org uuid := gen_random_uuid(); usr uuid := gen_random_uuid(); viewer uuid := gen_random_uuid(); dev uuid := gen_random_uuid();
  o uuid; p1 uuid; p2 uuid; p3 uuid; r jsonb; st text; msg text; t timestamptz := now();
begin
  insert into auth.users(id,email) values (usr,'t11@e'),(viewer,'v11@e');
  insert into pv_organizations(id,name) values (org,'T11');
  insert into pv_organization_members(organization_id,user_id,role) values (org,usr,'operator'),(org,viewer,'viewer');
  insert into pv_devices(id,organization_id,user_id,device_name,device_status) values (dev,org,usr,'tel','active');
  insert into payverify_orders(organization_id,external_ref,amount,expected_reference_tail,expires_at,created_at)
    values (org,'T11-1',80.00,'4455',t+interval '30 min',t-interval '1 min') returning id into o;
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key,verification_status)
    values (org,dev,80.00,'99114455',t,'t11a','POSSIBLE_DUPLICATE') returning id into p1;
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key,verification_status)
    values (org,dev,80.00,'99114455',t,'t11b','POSSIBLE_DUPLICATE') returning id into p2;
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key)
    values (org,dev,5.00,'1',t,'t11c') returning id into p3;

  -- (a) un viewer no puede resolver
  msg := null;
  begin perform payverify_resolve_duplicate(p1,viewer,'not_duplicate'); exception when others then msg := sqlerrm; end;
  assert msg like '%forbidden%', 'a: '||coalesce(msg,'(sin error)');

  -- (b) no es duplicado -> RECEIVED_BY_SERVER y se vincula a la orden pendiente
  r := payverify_resolve_duplicate(p1,usr,'not_duplicate');
  select verification_status::text into st from pv_payment_events where id=p1;
  assert st='RECEIVED_BY_SERVER', 'b: estado '||st;
  assert (r->'order'->>'matched')::boolean, 'b: debía vincular la orden '||r::text;
  select status into st from payverify_orders where id=o;
  assert st='paid_probable', 'b: orden '||st;
  assert exists(select 1 from pv_audit_logs where entity_id=p1 and action='payment_duplicate_dismissed'), 'b: falta auditoría';

  -- (c) sí es duplicado -> REJECTED
  r := payverify_resolve_duplicate(p2,usr,'duplicate');
  select verification_status::text into st from pv_payment_events where id=p2;
  assert st='REJECTED', 'c: estado '||st;

  -- (d) solo aplica a POSSIBLE_DUPLICATE, y la decisión debe ser válida
  msg := null;
  begin perform payverify_resolve_duplicate(p3,usr,'duplicate'); exception when others then msg := sqlerrm; end;
  assert msg like '%not_possible_duplicate%', 'd: '||coalesce(msg,'(sin error)');
  msg := null;
  begin perform payverify_resolve_duplicate(p3,usr,'x'); exception when others then msg := sqlerrm; end;
  assert msg like '%invalid_decision%', 'd2: '||coalesce(msg,'(sin error)');

  raise notice '0011 OK';
end $$;
rollback;
