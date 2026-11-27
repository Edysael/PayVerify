-- PayVerify 0009 hardening regression tests.
\set ON_ERROR_STOP on
begin;
do $$
declare
  org uuid:=gen_random_uuid();usr uuid:=gen_random_uuid();dev uuid:=gen_random_uuid();
  a1 uuid;a2 uuid;o1 uuid;o2 uuid;o3 uuid;p1 uuid;p2 uuid;b uuid;l uuid;
  r jsonb;st text;allowed boolean;i integer;t timestamptz:=now();
begin
  insert into auth.users(id,email) values(usr,'harden@t');
  insert into pv_organizations(id,name) values(org,'Hardening');
  insert into pv_organization_members(organization_id,user_id,role) values(org,usr,'owner');
  insert into pv_devices(id,organization_id,user_id,device_name,device_status) values(dev,org,usr,'device','active');
  insert into pv_bank_accounts(organization_id,bank_name,account_alias,currency,status)
    values(org,'Banco A','Cuenta A','VES','active') returning id into a1;
  insert into pv_bank_accounts(organization_id,bank_name,account_alias,currency,status)
    values(org,'Banco B','Cuenta B','VES','active') returning id into a2;
  insert into payverify_orders(organization_id,bank_account_id,external_ref,amount,expected_reference_tail,expires_at,created_at)
    values(org,a1,'H-1',12.34,'424242',t+interval '30 min',t-interval '1 min') returning id into o1;
  insert into pv_payment_events(organization_id,bank_account_id,device_id,amount,reference,transaction_date,idempotency_key,verification_status)
    values(org,a2,dev,12.34,'99424242',t,'h1','RECEIVED_BY_SERVER') returning id into p1;
  r:=payverify_match_payment(p1);
  assert not (r->>'matched')::boolean and r->>'reason'='no_candidate','account mismatch auto-match '||r::text;
  update pv_payment_events set bank_account_id=a1,verification_status='SMS_DETECTED' where id=p1;
  r:=payverify_match_payment(p1);assert r->>'reason'='not_matchable','SMS-only status must not match';
  update pv_payment_events set verification_status='PENDING_REVIEW' where id=p1;
  r:=payverify_match_payment(p1);assert r->>'method'='reference','eligible payment should match '||r::text;
  select status into st from payverify_orders where id=o1;assert st='paid_probable','probable status '||st;
  insert into pv_statement_import_batches(organization_id,bank_account_id,uploaded_by,source_label,file_sha256,row_count,imported_count)
    values(org,a2,usr,'stmt',repeat('d',64),1,1) returning id into b;
  insert into pv_statement_lines(organization_id,bank_account_id,batch_id,transaction_date,amount,currency,reference,line_fingerprint)
    values(org,a2,b,t,12.34,'VES','99424242',repeat('e',64)) returning id into l;
  begin
    perform payverify_reconcile_statement_line(l,p1,usr,2880);
    raise exception 'expected bank_account_mismatch';
  exception when others then assert sqlerrm='bank_account_mismatch','wrong account error: '||sqlerrm; end;
  update pv_statement_lines set bank_account_id=a1 where id=l;
  perform payverify_reconcile_statement_line(l,p1,usr,2880);
  select status into st from payverify_orders where id=o1;assert st='paid_confirmed','reconciled order '||st;
  for i in 1..10 loop
    allowed:=payverify_order_hint_rate_limit(o1,10,600);
    assert allowed,'hint attempt '||i||' unexpectedly denied';
  end loop;
  allowed:=payverify_order_hint_rate_limit(o1,10,600);
  assert not allowed,'eleventh hint attempt should be throttled';
  insert into payverify_orders(organization_id,bank_account_id,external_ref,amount,expires_at)
    values(org,a1,'H-2',20.00,t+interval '30 min') returning id into o2;
  insert into pv_payment_events(organization_id,bank_account_id,device_id,amount,reference,transaction_date,idempotency_key,verification_status)
    values(org,a2,dev,20.00,'222222',t,'h2','RECEIVED_BY_SERVER') returning id into p2;
  begin
    perform payverify_order_action(o2,usr,'link',p2);
    raise exception 'expected manual bank_account_mismatch';
  exception when others then assert sqlerrm='bank_account_mismatch','manual link error: '||sqlerrm; end;
  insert into payverify_orders(organization_id,bank_account_id,external_ref,amount,expected_reference_tail,expires_at,created_at)
    values(org,a1,'H-3',25.00,'333333',t+interval '30 min',t-interval '1 min') returning id into o3;
  insert into pv_payment_events(organization_id,bank_account_id,device_id,amount,reference,transaction_date,idempotency_key,verification_status)
    values(org,a1,dev,25.00,'88333333',t,'h3','RECONCILED') returning id into p2;
  r:=payverify_match_payment(p2);
  select status into st from payverify_orders where id=o3;
  assert r->>'method'='reference' and st='paid_confirmed','reconciled-before-match '||r::text||st;

  -- A reference hint on an already reconciled amount-only match must confirm, not downgrade.
  insert into pv_payment_events(organization_id,bank_account_id,device_id,amount,reference,transaction_date,idempotency_key,verification_status)
    values(org,a1,dev,30.00,'883344',t,'h4','RECONCILED') returning id into p2;
  insert into payverify_orders(organization_id,bank_account_id,external_ref,amount,status,matched_payment_event_id,match_method,expires_at,created_at)
    values(org,a1,'H-4',30.00,'needs_review',p2,'amount_only',t+interval '30 min',t-interval '1 min') returning id into o3;
  update pv_payment_events set matched_order_id=o3 where id=p2;
  r:=payverify_order_set_hints(o3,null,'3344');
  select status into st from payverify_orders where id=o3;
  assert st='paid_confirmed' and r->>'match_method'='reference','reconciled hint must confirm '||r::text;

  -- Approving a previously reconciled review match must also preserve confirmed status.
  insert into pv_payment_events(organization_id,bank_account_id,device_id,amount,reference,transaction_date,idempotency_key,verification_status)
    values(org,a1,dev,31.00,'883355',t,'h5','RECONCILED') returning id into p2;
  insert into payverify_orders(organization_id,bank_account_id,external_ref,amount,status,matched_payment_event_id,match_method,expires_at,created_at)
    values(org,a1,'H-5',31.00,'needs_review',p2,'amount_only',t+interval '30 min',t-interval '1 min') returning id into o3;
  update pv_payment_events set matched_order_id=o3 where id=p2;
  r:=payverify_order_action(o3,usr,'approve');
  select status into st from payverify_orders where id=o3;
  assert st='paid_confirmed' and r->>'status'='paid_confirmed','reconciled approval must confirm';

  assert not has_table_privilege('anon','public.payverify_order_hint_attempts','select'),'anon can read hint counters';
  assert not has_function_privilege('authenticated','public.payverify_order_hint_rate_limit(uuid,integer,integer)','execute'),'authenticated can call limiter directly';
  raise notice 'PayVerify 0009 hardening tests passed';
end $$;
rollback;
