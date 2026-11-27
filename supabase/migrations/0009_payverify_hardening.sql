-- PayVerify 0009: harden reconciliation, order matching, and payer-hint attempts.
-- Additive migration. Does not alter objects belonging to other applications.
alter table public.pv_statement_import_batches
  add column if not exists bank_account_id uuid references public.pv_bank_accounts(id) on delete set null;
alter table public.pv_statement_import_batches
  drop constraint if exists pv_statement_import_batches_organization_id_file_sha256_key;
create unique index if not exists pv_statement_batches_org_account_hash_idx
  on public.pv_statement_import_batches (organization_id, bank_account_id, file_sha256);
create index if not exists pv_statement_batches_org_account_created_idx
  on public.pv_statement_import_batches (organization_id, bank_account_id, created_at desc);
create unique index if not exists pv_statement_lines_one_payment_match_idx
  on public.pv_statement_lines (matched_payment_event_id)
  where matched_payment_event_id is not null;

create or replace function public.payverify_reconcile_statement_line(
  p_line_id uuid,p_payment_id uuid,p_user_id uuid,p_tolerance_minutes integer default 2880
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  line public.pv_statement_lines%rowtype;
  payment public.pv_payment_events%rowtype;
  member_role public.pv_org_role;
begin
  if p_user_id is null then raise exception 'forbidden'; end if;
  if p_tolerance_minutes is null or p_tolerance_minutes < 0 or p_tolerance_minutes > 10080 then raise exception 'invalid_tolerance'; end if;
  select m.role into member_role
  from public.pv_organization_members m join public.pv_statement_lines sl on sl.organization_id=m.organization_id
  where sl.id=p_line_id and m.user_id=p_user_id and m.status='active' and m.role in ('owner','admin','operator') limit 1;
  if member_role is null then raise exception 'forbidden'; end if;
  select * into line from public.pv_statement_lines where id=p_line_id for update;
  select * into payment from public.pv_payment_events where id=p_payment_id for update;
  if line.id is null or payment.id is null then raise exception 'not_found'; end if;
  if line.organization_id <> payment.organization_id then raise exception 'organization_mismatch'; end if;
  if line.reconciliation_status='matched' or payment.verification_status='RECONCILED' then raise exception 'already_reconciled'; end if;
  if payment.verification_status not in ('RECEIVED_BY_SERVER','PENDING_REVIEW') then raise exception 'payment_status_not_reconcilable'; end if;
  if line.bank_account_id is null or payment.bank_account_id is null then raise exception 'bank_account_required'; end if;
  if line.bank_account_id <> payment.bank_account_id then raise exception 'bank_account_mismatch'; end if;
  if not exists(select 1 from public.pv_bank_accounts ba where ba.id=line.bank_account_id
    and ba.organization_id=line.organization_id and ba.status='active' and ba.currency=line.currency) then
    raise exception 'bank_account_not_active_or_wrong_org';
  end if;
  if line.amount <= 0 or round(line.amount,2) <> round(payment.amount,2) then raise exception 'amount_mismatch'; end if;
  if line.currency <> payment.currency then raise exception 'currency_mismatch'; end if;
  if line.reference is null or trim(line.reference)='' or upper(trim(line.reference)) <> upper(trim(payment.reference)) then raise exception 'reference_mismatch'; end if;
  if abs(extract(epoch from (line.transaction_date-payment.transaction_date))) > p_tolerance_minutes*60 then raise exception 'date_outside_tolerance'; end if;
  update public.pv_statement_lines set reconciliation_status='matched',matched_payment_event_id=payment.id,reviewed_by=p_user_id,reviewed_at=now() where id=line.id;
  update public.pv_payment_events set verification_status='RECONCILED' where id=payment.id;
  insert into public.pv_reconciliation_records(organization_id,payment_event_id,reconciliation_source,reconciliation_status,matched_amount,matched_reference,reconciled_at)
    values(payment.organization_id,payment.id,'statement_import','matched',payment.amount,line.reference,now());
  insert into public.pv_audit_logs(organization_id,user_id,action,entity_type,entity_id)
    values(payment.organization_id,p_user_id,'statement_line_reconciled','statement_line',line.id);
  return jsonb_build_object('ok',true,'lineId',line.id,'paymentId',payment.id,'status','RECONCILED');
end;
$$;
revoke all on function public.payverify_reconcile_statement_line(uuid,uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.payverify_reconcile_statement_line(uuid,uuid,uuid,integer) to service_role;

create table if not exists public.payverify_order_hint_attempts (
  order_id uuid primary key references public.payverify_orders(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists payverify_order_hint_attempts_updated_idx on public.payverify_order_hint_attempts(updated_at);
alter table public.payverify_order_hint_attempts enable row level security;
revoke all on public.payverify_order_hint_attempts from public, anon, authenticated;
grant all on public.payverify_order_hint_attempts to service_role;

create or replace function public.payverify_order_hint_rate_limit(
  p_order_id uuid,p_max_attempts integer default 10,p_window_seconds integer default 600
) returns boolean language plpgsql security definer set search_path=public as $$
declare v_attempts integer;
begin
  if p_max_attempts is null or p_max_attempts < 1 or p_max_attempts > 100
     or p_window_seconds is null or p_window_seconds < 60 or p_window_seconds > 3600 then raise exception 'invalid_rate_limit'; end if;
  if not exists(select 1 from public.payverify_orders where id=p_order_id) then raise exception 'order_not_found'; end if;
  insert into public.payverify_order_hint_attempts as a(order_id,window_started_at,attempts,updated_at)
    values(p_order_id,now(),1,now())
  on conflict(order_id) do update set
    window_started_at=case when now() >= a.window_started_at + make_interval(secs => p_window_seconds) then now() else a.window_started_at end,
    attempts=case when now() >= a.window_started_at + make_interval(secs => p_window_seconds) then 1 else a.attempts+1 end,
    updated_at=now()
  returning attempts into v_attempts;
  return v_attempts <= p_max_attempts;
end;
$$;
revoke all on function public.payverify_order_hint_rate_limit(uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.payverify_order_hint_rate_limit(uuid,integer,integer) to service_role;

create or replace function public.payverify_match_payment(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  pay public.pv_payment_events%rowtype; cand record;
  strong uuid[] := '{}'; by_phone uuid[] := '{}'; allc uuid[] := '{}';
  chosen uuid; method text; new_status text;
begin
  select * into pay from public.pv_payment_events where id=p_payment_id for update;
  if not found then return jsonb_build_object('matched',false,'reason','payment_not_found'); end if;
  if pay.matched_order_id is not null then return jsonb_build_object('matched',true,'orderId',pay.matched_order_id,'already',true); end if;
  if pay.verification_status not in ('RECEIVED_BY_SERVER','PENDING_REVIEW','RECONCILED') then
    return jsonb_build_object('matched',false,'reason','not_matchable');
  end if;
  for cand in
    select o.id,o.expected_reference_tail,o.customer_phone_last4
    from public.payverify_orders o
    where o.organization_id=pay.organization_id and o.status='pending' and o.currency=pay.currency and o.amount=pay.amount
      and pay.transaction_date >= o.created_at - interval '2 minutes'
      and pay.transaction_date <= o.expires_at + interval '2 minutes'
      and (o.bank_account_id is null or o.bank_account_id=pay.bank_account_id)
      and (o.bank_account_id is null or exists(select 1 from public.pv_bank_accounts oba where oba.id=o.bank_account_id
        and oba.organization_id=o.organization_id and oba.status='active' and oba.currency=o.currency))
      and (pay.bank_account_id is null or exists(select 1 from public.pv_bank_accounts pba where pba.id=pay.bank_account_id
        and pba.organization_id=pay.organization_id and pba.status='active' and pba.currency=pay.currency))
    order by o.created_at for update of o
  loop
    if cand.expected_reference_tail is not null and right(upper(pay.reference),length(cand.expected_reference_tail)) <> cand.expected_reference_tail then continue; end if;
    allc:=allc||cand.id;
    if cand.expected_reference_tail is not null then strong:=strong||cand.id; end if;
    if cand.customer_phone_last4 is not null and pay.origin_phone_last4 is not null and cand.customer_phone_last4=pay.origin_phone_last4 then by_phone:=by_phone||cand.id; end if;
  end loop;
  if cardinality(strong)=1 then
    chosen:=strong[1];method:='reference';new_status:=case when pay.verification_status='RECONCILED' then 'paid_confirmed' else 'paid_probable' end;
  elsif cardinality(strong)=0 and cardinality(by_phone)=1 then
    chosen:=by_phone[1];method:='amount_phone';new_status:=case when pay.verification_status='RECONCILED' then 'paid_confirmed' else 'paid_probable' end;
  elsif cardinality(strong)=0 and cardinality(allc)=1 then
    chosen:=allc[1];method:='amount_only';new_status:='needs_review';
  else
    return jsonb_build_object('matched',false,'reason',case when cardinality(allc)=0 then 'no_candidate' else 'ambiguous' end);
  end if;
  update public.payverify_orders set status=new_status,matched_payment_event_id=pay.id,match_method=method,matched_at=now() where id=chosen;
  update public.pv_payment_events set matched_order_id=chosen where id=pay.id;
  insert into public.pv_audit_logs(organization_id,action,entity_type,entity_id) values(pay.organization_id,'order_matched_'||method,'payverify_order',chosen);
  return jsonb_build_object('matched',true,'orderId',chosen,'method',method,'orderStatus',new_status);
end $$;
revoke all on function public.payverify_match_payment(uuid) from public, anon, authenticated;
grant execute on function public.payverify_match_payment(uuid) to service_role;

create or replace function public.payverify_order_action(
  p_order_id uuid,p_user_id uuid,p_action text,p_payment_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare o public.payverify_orders%rowtype; pay public.pv_payment_events%rowtype; role_ok boolean;
begin
  select * into o from public.payverify_orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  select exists(select 1 from public.pv_organization_members m where m.organization_id=o.organization_id and m.user_id=p_user_id
    and m.status='active' and m.role in ('owner','admin','operator')) into role_ok;
  if not role_ok then raise exception 'forbidden'; end if;
  if p_action='approve' then
    if o.status<>'needs_review' or o.matched_payment_event_id is null then raise exception 'invalid_state'; end if;
    select * into pay from public.pv_payment_events where id=o.matched_payment_event_id for update;
    if not found or pay.verification_status not in ('RECEIVED_BY_SERVER','PENDING_REVIEW','RECONCILED') then raise exception 'payment_not_linkable'; end if;
    if o.bank_account_id is not null and pay.bank_account_id is distinct from o.bank_account_id then raise exception 'bank_account_mismatch'; end if;
    if pay.bank_account_id is not null and not exists(select 1 from public.pv_bank_accounts ba where ba.id=pay.bank_account_id
      and ba.organization_id=pay.organization_id and ba.status='active' and ba.currency=pay.currency) then raise exception 'bank_account_not_active_or_wrong_org'; end if;
    update public.payverify_orders set status=case when pay.verification_status='RECONCILED' then 'paid_confirmed' else 'paid_probable' end,
      match_method='manual_approved' where id=o.id;
  elsif p_action='reject_match' then
    if o.status<>'needs_review' or o.matched_payment_event_id is null then raise exception 'invalid_state'; end if;
    update public.pv_payment_events set matched_order_id=null where id=o.matched_payment_event_id;
    update public.payverify_orders set status=case when expires_at<now() then 'expired' else 'pending' end,
      matched_payment_event_id=null,match_method=null,matched_at=null where id=o.id;
  elsif p_action='link' then
    if p_payment_id is null then raise exception 'payment_required'; end if;
    if o.status not in ('pending','expired','needs_review') then raise exception 'invalid_state'; end if;
    select * into pay from public.pv_payment_events where id=p_payment_id for update;
    if not found or pay.organization_id<>o.organization_id then raise exception 'payment_not_found'; end if;
    if pay.matched_order_id is not null and pay.matched_order_id<>o.id then raise exception 'payment_already_linked'; end if;
    if pay.amount<>o.amount then raise exception 'amount_mismatch'; end if;
    if pay.verification_status not in ('RECEIVED_BY_SERVER','PENDING_REVIEW','RECONCILED') then raise exception 'payment_not_linkable'; end if;
    if o.bank_account_id is not null and pay.bank_account_id is distinct from o.bank_account_id then raise exception 'bank_account_mismatch'; end if;
    if pay.bank_account_id is not null and not exists(select 1 from public.pv_bank_accounts ba where ba.id=pay.bank_account_id
      and ba.organization_id=pay.organization_id and ba.status='active' and ba.currency=pay.currency) then raise exception 'bank_account_not_active_or_wrong_org'; end if;
    if o.matched_payment_event_id is not null and o.matched_payment_event_id<>pay.id then update public.pv_payment_events set matched_order_id=null where id=o.matched_payment_event_id; end if;
    update public.payverify_orders set status=case when pay.verification_status='RECONCILED' then 'paid_confirmed' else 'paid_probable' end,
      matched_payment_event_id=pay.id,match_method='manual_link',matched_at=now() where id=o.id;
    update public.pv_payment_events set matched_order_id=o.id where id=pay.id;
  elsif p_action='cancel' then
    if o.status not in ('pending','expired') then raise exception 'invalid_state'; end if;
    update public.payverify_orders set status='cancelled' where id=o.id;
  else raise exception 'unknown_action';
  end if;
  insert into public.pv_audit_logs(organization_id,user_id,action,entity_type,entity_id) values(o.organization_id,p_user_id,'order_'||p_action,'payverify_order',o.id);
  return (select to_jsonb(x) from (select id,status,match_method,matched_payment_event_id from public.payverify_orders where id=o.id) x);
end $$;
revoke all on function public.payverify_order_action(uuid,uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.payverify_order_action(uuid,uuid,text,uuid) to service_role;


create or replace function public.payverify_order_set_hints(
  p_order_id uuid,p_phone_last4 text,p_reference_tail text
) returns jsonb language plpgsql security definer set search_path=public as $
declare
  o public.payverify_orders%rowtype;
  pay public.pv_payment_events%rowtype;
  tail text:=nullif(upper(trim(coalesce(p_reference_tail,''))),'');
  ph text:=nullif(trim(coalesce(p_phone_last4,'')),'');
  r jsonb;
begin
  if tail is not null and tail !~ '^[A-Z0-9]{4,12}(uuid,uuid,uuid,integer) is
  'Atomic audited reconciliation. Requires eligible payment status and same active bank account.';
comment on function public.payverify_order_hint_rate_limit(uuid,integer,integer) is
  'Atomic per-order rate limiter for payer reference/phone hint attempts.';
 then raise exception 'invalid_reference_tail'; end if;
  if ph is not null and ph !~ '^[0-9]{4}(uuid,uuid,uuid,integer) is
  'Atomic audited reconciliation. Requires eligible payment status and same active bank account.';
comment on function public.payverify_order_hint_rate_limit(uuid,integer,integer) is
  'Atomic per-order rate limiter for payer reference/phone hint attempts.';
 then raise exception 'invalid_phone'; end if;
  select * into o from public.payverify_orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.status not in ('pending','needs_review') then raise exception 'invalid_state'; end if;
  update public.payverify_orders set expected_reference_tail=coalesce(tail,expected_reference_tail),
    customer_phone_last4=coalesce(ph,customer_phone_last4) where id=o.id returning * into o;
  if o.status='needs_review' and o.match_method='amount_only' and o.matched_payment_event_id is not null then
    select * into pay from public.pv_payment_events where id=o.matched_payment_event_id for update;
    if pay.id is not null and pay.verification_status in ('RECEIVED_BY_SERVER','PENDING_REVIEW','RECONCILED')
       and (o.bank_account_id is null or o.bank_account_id=pay.bank_account_id)
       and (pay.bank_account_id is null or exists(select 1 from public.pv_bank_accounts ba where ba.id=pay.bank_account_id
         and ba.organization_id=pay.organization_id and ba.status='active' and ba.currency=pay.currency))
       and o.expected_reference_tail is not null
       and right(upper(pay.reference),length(o.expected_reference_tail))=o.expected_reference_tail then
      update public.payverify_orders set status=case when pay.verification_status='RECONCILED' then 'paid_confirmed' else 'paid_probable' end,
        match_method='reference' where id=o.id;
    end if;
  elsif o.status='pending' then
    for pay in
      select * from public.pv_payment_events pe
      where pe.organization_id=o.organization_id and pe.matched_order_id is null
        and pe.amount=o.amount and pe.currency=o.currency
        and pe.verification_status in ('RECEIVED_BY_SERVER','PENDING_REVIEW','RECONCILED')
        and pe.transaction_date>=o.created_at-interval '2 minutes'
        and pe.transaction_date<=o.expires_at+interval '2 minutes'
        and (o.bank_account_id is null or o.bank_account_id=pe.bank_account_id)
        and (o.bank_account_id is null or exists(select 1 from public.pv_bank_accounts oba where oba.id=o.bank_account_id
          and oba.organization_id=o.organization_id and oba.status='active' and oba.currency=o.currency))
        and (pe.bank_account_id is null or exists(select 1 from public.pv_bank_accounts pba where pba.id=pe.bank_account_id
          and pba.organization_id=pe.organization_id and pba.status='active' and pba.currency=pe.currency))
      order by pe.transaction_date
    loop
      r:=public.payverify_match_payment(pay.id);
      exit when coalesce((r->>'matched')::boolean,false) and r->>'orderId'=o.id::text;
    end loop;
  end if;
  return (select to_jsonb(x) from (select id,status,match_method,matched_payment_event_id from public.payverify_orders where id=o.id) x);
end $;
revoke all on function public.payverify_order_set_hints(uuid,text,text) from public, anon, authenticated;
grant execute on function public.payverify_order_set_hints(uuid,text,text) to service_role;

comment on function public.payverify_reconcile_statement_line(uuid,uuid,uuid,integer) is
  'Atomic audited reconciliation. Requires eligible payment status and same active bank account.';
comment on function public.payverify_order_hint_rate_limit(uuid,integer,integer) is
  'Atomic per-order rate limiter for payer reference/phone hint attempts.';
