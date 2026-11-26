-- RLS / privilege checks for 0005. Run as superuser; it switches roles internally.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','a@a'),('00000000-0000-0000-0000-0000000000b1','b@b');
insert into pv_organizations(id,name) values ('00000000-0000-0000-0000-00000000aa01','Org A'),('00000000-0000-0000-0000-00000000bb01','Org B');
insert into pv_organization_members(organization_id,user_id,role) values
 ('00000000-0000-0000-0000-00000000aa01','00000000-0000-0000-0000-0000000000a1','operator'),
 ('00000000-0000-0000-0000-00000000bb01','00000000-0000-0000-0000-0000000000b1','operator');
insert into payverify_orders(organization_id,external_ref,amount,expires_at) values
 ('00000000-0000-0000-0000-00000000aa01','A-1',10,now()+interval '1 hour'),
 ('00000000-0000-0000-0000-00000000bb01','B-1',10,now()+interval '1 hour');
insert into payverify_api_keys(organization_id,label,key_hash) values
 ('00000000-0000-0000-0000-00000000aa01','k',repeat('a',64));

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',true);
do $$ declare n int; begin
  select count(*) into n from payverify_orders;
  assert n = 1, 'user A must see only its own org orders, saw '||n;
  begin insert into payverify_orders(organization_id,external_ref,amount,expires_at)
    values ('00000000-0000-0000-0000-00000000aa01','HACK',1,now()+interval '1 hour');
    raise exception 'client insert on orders must be denied';
  exception when insufficient_privilege then null; end;
  begin update payverify_orders set status='paid_confirmed'; raise exception 'client update must be denied';
  exception when insufficient_privilege then null; end;
  begin perform payverify_match_payment(gen_random_uuid()); raise exception 'client must not call match';
  exception when insufficient_privilege then null; end;
  begin perform payverify_order_action(gen_random_uuid(),gen_random_uuid(),'cancel'); raise exception 'client must not call action';
  exception when insufficient_privilege then null; end;
  begin perform payverify_order_set_hints(gen_random_uuid(),null,null); raise exception 'client must not call hints';
  exception when insufficient_privilege then null; end;
  -- API key: label visible, hash NOT readable
  perform id,label from payverify_api_keys;
  begin perform key_hash from payverify_api_keys; raise exception 'key_hash must not be readable';
  exception when insufficient_privilege then null; end;
  raise notice 'RLS OK';
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform 1 from payverify_orders; raise exception 'anon must not read orders';
  exception when insufficient_privilege then null; end;
  raise notice 'ANON OK';
end $$;
rollback;
