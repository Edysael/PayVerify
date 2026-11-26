-- End to end: detected payment -> matched order -> statement line reconciled -> order CONFIRMED -> undone -> back.
\set ON_ERROR_STOP on
begin;
do $$
declare
  org uuid := gen_random_uuid(); usr uuid := gen_random_uuid(); dev uuid := gen_random_uuid();
  o uuid; p uuid; b uuid; l uuid; st text; r jsonb; t timestamptz := now();
begin
  insert into auth.users(id,email) values (usr,'e@e');
  insert into pv_organizations(id,name) values (org,'E2E');
  insert into pv_organization_members(organization_id,user_id,role) values (org,usr,'owner');
  insert into pv_devices(id,organization_id,user_id,device_name,device_status) values (dev,org,usr,'tel','active');
  insert into payverify_orders(organization_id,external_ref,amount,expected_reference_tail,expires_at,created_at)
    values (org,'E2E-1',500.00,'424242',t+interval '30 min',t-interval '1 min') returning id into o;
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key,verification_status)
    values (org,dev,500.00,'99424242',t,'e2e1','PENDING_REVIEW') returning id into p;
  perform payverify_match_payment(p);
  select status into st from payverify_orders where id=o; assert st='paid_probable','pre '||st;

  insert into pv_statement_import_batches(organization_id,uploaded_by,source_label,file_sha256,row_count,imported_count)
    values (org,usr,'extracto',repeat('b',64),1,1) returning id into b;
  insert into pv_statement_lines(organization_id,batch_id,transaction_date,amount,currency,reference,line_fingerprint)
    values (org,b,t,500.00,'VES','99424242',repeat('c',64)) returning id into l;

  r := payverify_reconcile_statement_line(l,p,usr);
  select status into st from payverify_orders where id=o;
  assert st='paid_confirmed','after reconcile '||st||' '||r::text;

  r := payverify_unreconcile_statement_line(l,usr);
  select status into st from payverify_orders where id=o;
  assert st='paid_probable','after undo '||st||' '||r::text;
  raise notice 'E2E OK';
end $$;
rollback;
