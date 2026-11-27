-- 0009: pagos no conciliables, cuentas bancarias cruzadas y orden confirmada si el pago ya estaba conciliado.
\set ON_ERROR_STOP on
begin;
do $$
declare
  org uuid := gen_random_uuid(); usr uuid := gen_random_uuid(); dev uuid := gen_random_uuid();
  acc1 uuid := gen_random_uuid(); acc2 uuid := gen_random_uuid();
  o uuid; p1 uuid; p2 uuid; p3 uuid; b uuid; l1 uuid; l2 uuid;
  st text; t timestamptz := now(); msg text;
begin
  insert into auth.users(id,email) values (usr,'t9@e');
  insert into pv_organizations(id,name) values (org,'T9');
  insert into pv_organization_members(organization_id,user_id,role) values (org,usr,'owner');
  insert into pv_devices(id,organization_id,user_id,device_name,device_status) values (dev,org,usr,'tel','active');
  insert into pv_bank_accounts(id,organization_id,bank_name,account_alias) values (acc1,org,'Banco','A1'),(acc2,org,'Banco','A2');
  insert into pv_statement_import_batches(organization_id,uploaded_by,source_label,file_sha256,row_count,imported_count)
    values (org,usr,'extracto',repeat('d',64),2,2) returning id into b;

  -- (a) un pago REJECTED no puede conciliarse
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key,verification_status)
    values (org,dev,100.00,'REF100',t,'t9a','REJECTED') returning id into p1;
  insert into pv_statement_lines(organization_id,batch_id,transaction_date,amount,currency,reference,line_fingerprint)
    values (org,b,t,100.00,'VES','REF100',repeat('1',64)) returning id into l1;
  msg := null;
  begin perform payverify_reconcile_statement_line(l1,p1,usr);
  exception when others then msg := sqlerrm; end;
  assert msg like '%payment_not_reconcilable%', 'a: esperaba payment_not_reconcilable, obtuvo '||coalesce(msg,'(sin error)');

  -- (b) cuentas bancarias distintas => rechaza; misma cuenta => concilia
  insert into pv_payment_events(organization_id,device_id,bank_account_id,amount,reference,transaction_date,idempotency_key,verification_status)
    values (org,dev,acc1,250.00,'REF250',t,'t9b','RECEIVED_BY_SERVER') returning id into p2;
  insert into pv_statement_lines(organization_id,batch_id,bank_account_id,transaction_date,amount,currency,reference,line_fingerprint)
    values (org,b,acc2,t,250.00,'VES','REF250',repeat('2',64)) returning id into l2;
  msg := null;
  begin perform payverify_reconcile_statement_line(l2,p2,usr);
  exception when others then msg := sqlerrm; end;
  assert msg like '%bank_account_mismatch%', 'b: esperaba bank_account_mismatch, obtuvo '||coalesce(msg,'(sin error)');
  update pv_statement_lines set bank_account_id=acc1 where id=l2;
  perform payverify_reconcile_statement_line(l2,p2,usr);
  select verification_status::text into st from pv_payment_events where id=p2;
  assert st='RECONCILED', 'b: con la misma cuenta debía conciliar, estado '||st;

  -- (c) pago ya conciliado + orden que se vincula después => paid_confirmed (no paid_probable)
  insert into payverify_orders(organization_id,external_ref,amount,expected_reference_tail,expires_at,created_at)
    values (org,'T9-1',700.00,'123456',t+interval '30 min',t-interval '1 min') returning id into o;
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key,verification_status)
    values (org,dev,700.00,'77123456',t,'t9c','RECONCILED') returning id into p3;
  perform payverify_match_payment(p3);
  select status into st from payverify_orders where id=o;
  assert st='paid_confirmed', 'c: esperaba paid_confirmed, obtuvo '||st;

  raise notice '0009 OK';
end $$;
rollback;
