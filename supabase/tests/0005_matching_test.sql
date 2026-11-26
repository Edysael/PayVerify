-- Run after 0001-0005 on a scratch database. Raises an exception if any scenario fails.
\set ON_ERROR_STOP on
begin;
do $$
declare
  org uuid := gen_random_uuid(); usr uuid := gen_random_uuid(); dev uuid := gen_random_uuid();
  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid; o6 uuid;
  p uuid; r jsonb; st text; t timestamptz := now();
  function_cnt int;
begin
  insert into auth.users(id,email) values (usr,'t@t');
  insert into pv_organizations(id,name) values (org,'Comercio Prueba');
  insert into pv_organization_members(organization_id,user_id,role) values (org,usr,'owner');
  insert into pv_devices(id,organization_id,user_id,device_name,device_status) values (dev,org,usr,'tel','active');

  -- T1: reference tail matches -> paid_probable by 'reference'
  insert into payverify_orders(organization_id,external_ref,amount,expected_reference_tail,expires_at,created_at)
    values (org,'ORD-1',702.75,'849201',t+interval '30 min',t-interval '1 min') returning id into o1;
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key,origin_phone_last4)
    values (org,dev,702.75,'849201',t,'k1','9812') returning id into p;
  r := payverify_match_payment(p);
  select status into st from payverify_orders where id=o1;
  assert (r->>'matched')::boolean and r->>'method'='reference' and st='paid_probable', 'T1 '||r::text||st;

  -- T2: same payment matched again is idempotent
  r := payverify_match_payment(p);
  assert (r->>'already')::boolean, 'T2';

  -- T3: wrong reference tail -> not matched
  insert into payverify_orders(organization_id,external_ref,amount,expected_reference_tail,expires_at,created_at)
    values (org,'ORD-2',50.00,'111111',t+interval '30 min',t-interval '1 min') returning id into o2;
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key)
    values (org,dev,50.00,'222222',t,'k3') returning id into p;
  r := payverify_match_payment(p);
  assert not (r->>'matched')::boolean, 'T3 '||r::text;

  -- T4: amount-only unique -> needs_review
  insert into payverify_orders(organization_id,external_ref,amount,expires_at,created_at)
    values (org,'ORD-3',33.33,t+interval '30 min',t-interval '1 min') returning id into o3;
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key)
    values (org,dev,33.33,'555555',t,'k4') returning id into p;
  r := payverify_match_payment(p);
  select status into st from payverify_orders where id=o3;
  assert r->>'method'='amount_only' and st='needs_review', 'T4 '||r::text;
  -- manual approve
  r := payverify_order_action(o3,usr,'approve');
  assert r->>'status'='paid_probable', 'T4b';

  -- T5: two orders same amount, phone disambiguates
  insert into payverify_orders(organization_id,external_ref,amount,customer_phone_last4,expires_at,created_at)
    values (org,'ORD-4',20.00,'1111',t+interval '30 min',t-interval '1 min') returning id into o4;
  insert into payverify_orders(organization_id,external_ref,amount,customer_phone_last4,expires_at,created_at)
    values (org,'ORD-5',20.00,'2222',t+interval '30 min',t-interval '1 min') returning id into o5;
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key,origin_phone_last4)
    values (org,dev,20.00,'777777',t,'k5','2222') returning id into p;
  r := payverify_match_payment(p);
  assert r->>'orderId'=o5::text and r->>'method'='amount_phone', 'T5 '||r::text;

  -- T6: two orders same amount, no info -> ambiguous, both stay pending
  insert into payverify_orders(organization_id,external_ref,amount,expires_at,created_at)
    values (org,'ORD-6A',15.00,t+interval '30 min',t-interval '1 min') returning id into o4;
  insert into payverify_orders(organization_id,external_ref,amount,expires_at,created_at)
    values (org,'ORD-6B',15.00,t+interval '30 min',t-interval '1 min');
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key)
    values (org,dev,15.00,'888888',t,'k6') returning id into p;
  r := payverify_match_payment(p);
  select status into st from payverify_orders where id=o4;
  assert not (r->>'matched')::boolean and r->>'reason'='ambiguous' and st='pending', 'T6 '||r::text;

  -- T7: payment BEFORE the order existed -> not matched
  insert into payverify_orders(organization_id,external_ref,amount,expires_at,created_at)
    values (org,'ORD-6',9.99,t+interval '30 min',t) returning id into o6;
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key)
    values (org,dev,9.99,'999999',t-interval '1 hour','k7') returning id into p;
  r := payverify_match_payment(p);
  assert not (r->>'matched')::boolean, 'T7 '||r::text;

  -- T8: manual link of that unmatched payment to the order (same amount)
  r := payverify_order_action(o6,usr,'link',p);
  assert r->>'status'='paid_probable' and r->>'match_method'='manual_link', 'T8 '||r::text;

  -- T9: link with wrong amount is refused
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key)
    values (org,dev,1.00,'123123',t,'k9') returning id into p;
  begin
    perform payverify_order_action(o4,usr,'link',p);
    raise exception 'T9 should have failed';
  exception when others then
    assert sqlerrm='amount_mismatch', 'T9 '||sqlerrm;
  end;

  -- T10: statement reconcile flips the order to paid_confirmed and back
  select matched_payment_event_id into p from payverify_orders where id=o1;
  update pv_payment_events set verification_status='RECONCILED' where id=p;
  select status into st from payverify_orders where id=o1;
  assert st='paid_confirmed', 'T10a '||st;
  update pv_payment_events set verification_status='PENDING_REVIEW' where id=p;
  select status into st from payverify_orders where id=o1;
  assert st='paid_probable', 'T10b '||st;

  -- T11: a non-member cannot act
  begin
    perform payverify_order_action(o4,gen_random_uuid(),'cancel');
    raise exception 'T11 should have failed';
  exception when others then assert sqlerrm='forbidden','T11 '||sqlerrm; end;

  -- T12: one payment cannot be linked to two orders
  select matched_payment_event_id into p from payverify_orders where id=o1;
  begin
    perform payverify_order_action(o4,usr,'link',p);
    raise exception 'T12 should have failed';
  exception when others then assert sqlerrm in ('payment_already_linked','amount_mismatch'),'T12 '||sqlerrm; end;

  -- T13: duplicate-flagged payments are never matched
  insert into payverify_orders(organization_id,external_ref,amount,expires_at,created_at)
    values (org,'ORD-7',44.44,t+interval '30 min',t-interval '1 min');
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key,verification_status)
    values (org,dev,44.44,'444444',t,'k13','POSSIBLE_DUPLICATE') returning id into p;
  r := payverify_match_payment(p);
  assert r->>'reason'='not_matchable','T13';

  -- T14: expiry
  update payverify_orders set expires_at=now()-interval '1 hour' where external_ref='ORD-7';
  assert payverify_expire_orders() >= 1,'T14';

  -- T15: payment arrives first with no hints (amount_only), customer then reports the right tail -> upgraded
  insert into payverify_orders(organization_id,external_ref,amount,expires_at,created_at)
    values (org,'ORD-15',61.00,t+interval '30 min',t-interval '1 min') returning id into o4;
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key)
    values (org,dev,61.00,'650123456',t,'k15') returning id into p;
  r := payverify_match_payment(p);
  assert r->>'orderStatus'='needs_review','T15a '||r::text;
  r := payverify_order_set_hints(o4,null,'123456');
  assert r->>'status'='paid_probable' and r->>'match_method'='reference','T15b '||r::text;

  -- T16: ambiguous payment arrived first; customer of order A then reports tail -> A matches, B stays pending
  insert into payverify_orders(organization_id,external_ref,amount,expires_at,created_at)
    values (org,'ORD-16A',71.00,t+interval '30 min',t-interval '1 min') returning id into o4;
  insert into payverify_orders(organization_id,external_ref,amount,expires_at,created_at)
    values (org,'ORD-16B',71.00,t+interval '30 min',t-interval '1 min') returning id into o5;
  insert into pv_payment_events(organization_id,device_id,amount,reference,transaction_date,idempotency_key)
    values (org,dev,71.00,'7777000099',t,'k16') returning id into p;
  r := payverify_match_payment(p);
  assert r->>'reason'='ambiguous','T16a '||r::text;
  r := payverify_order_set_hints(o4,null,'000099');
  assert r->>'status'='paid_probable','T16b '||r::text;
  select status into st from payverify_orders where id=o5;
  assert st='pending','T16c '||st;

  -- T17: invalid hints rejected
  begin perform payverify_order_set_hints(o5,null,'12'); raise exception 'T17 should fail';
  exception when others then assert sqlerrm='invalid_reference_tail','T17 '||sqlerrm; end;

  raise notice 'TODAS LAS PRUEBAS SQL PASARON';
end $$;
rollback;
