-- PayVerify 0005: orders, payer hints and automatic payment-to-order matching.
-- ADDITIVE ONLY: does not change existing tables' behaviour or existing functions.
-- Apply first to a staging project. Tested against PostgreSQL 16 with 0001-0004.

-- 1) Payer hints and capture channel on payments (all optional)
alter table public.pv_payment_events
  add column if not exists origin_phone text check (origin_phone is null or origin_phone ~ '^04(12|14|16|24|26)[0-9]{7}$'),
  add column if not exists origin_phone_last4 text check (origin_phone_last4 is null or origin_phone_last4 ~ '^[0-9]{4}$'),
  add column if not exists origin_bank_code text check (origin_bank_code is null or origin_bank_code ~ '^01[0-9]{2}$'),
  add column if not exists capture_channel text not null default 'sms'
    check (capture_channel in ('sms','notification','manual')),
  add column if not exists matched_order_id uuid;

-- 2) Orders created by the merchant's checkout
create table if not exists public.payverify_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pv_organizations(id) on delete cascade,
  bank_account_id uuid references public.pv_bank_accounts(id) on delete set null,
  external_ref text not null check (length(trim(external_ref)) between 1 and 64),
  description text check (description is null or length(description) <= 200),
  amount numeric(18,2) not null check (amount > 0),
  currency text not null default 'VES' check (currency = 'VES'),
  customer_phone_last4 text check (customer_phone_last4 is null or customer_phone_last4 ~ '^[0-9]{4}$'),
  expected_reference_tail text check (expected_reference_tail is null or expected_reference_tail ~ '^[A-Z0-9]{4,12}$'),
  status text not null default 'pending'
    check (status in ('pending','paid_probable','paid_confirmed','needs_review','expired','cancelled')),
  expires_at timestamptz not null,
  matched_payment_event_id uuid references public.pv_payment_events(id) on delete set null,
  match_method text check (match_method is null or match_method in
    ('reference','amount_phone','amount_only','manual_approved','manual_link')),
  matched_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, external_ref)
);
create unique index if not exists payverify_orders_one_payment_idx
  on public.payverify_orders(matched_payment_event_id) where matched_payment_event_id is not null;
create index if not exists payverify_orders_org_status_idx
  on public.payverify_orders(organization_id, status, created_at desc);
create index if not exists payverify_orders_match_idx
  on public.payverify_orders(organization_id, status, amount) where status = 'pending';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'payment_events_matched_order_fk') then
    alter table public.pv_payment_events
      add constraint payment_events_matched_order_fk
      foreign key (matched_order_id) references public.payverify_orders(id) on delete set null;
  end if;
end $$;

drop trigger if exists payverify_orders_set_updated_at on public.payverify_orders;
create trigger payverify_orders_set_updated_at before update on public.payverify_orders
  for each row execute function public.pv_set_updated_at();

alter table public.payverify_orders enable row level security;
drop policy if exists payverify_orders_member_select on public.payverify_orders;
create policy payverify_orders_member_select on public.payverify_orders
  for select to authenticated using (public.pv_is_org_member(organization_id));
revoke insert, update, delete on public.payverify_orders from anon, authenticated;
revoke all on public.payverify_orders from anon;

-- 3) API keys so the merchant's own checkout can create orders / read their status
create table if not exists public.payverify_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pv_organizations(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 80),
  key_hash text not null unique check (key_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);
alter table public.payverify_api_keys enable row level security;
revoke all on public.payverify_api_keys from anon, authenticated;
grant select (id, organization_id, label, created_at, revoked_at, last_used_at)
  on public.payverify_api_keys to authenticated;
drop policy if exists payverify_api_keys_member_select on public.payverify_api_keys;
create policy payverify_api_keys_member_select on public.payverify_api_keys
  for select to authenticated using (public.pv_is_org_member(organization_id));

-- 4) Automatic matching. Service-role only. The edge function calls it after a payment is stored.
create or replace function public.payverify_match_payment(p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  pay public.pv_payment_events%rowtype;
  cand record;
  strong uuid[] := '{}'; by_phone uuid[] := '{}'; allc uuid[] := '{}';
  chosen uuid; method text; new_status text;
begin
  select * into pay from public.pv_payment_events where id = p_payment_id for update;
  if not found then return jsonb_build_object('matched', false, 'reason', 'payment_not_found'); end if;
  if pay.matched_order_id is not null then
    return jsonb_build_object('matched', true, 'orderId', pay.matched_order_id, 'already', true);
  end if;
  if pay.verification_status in ('POSSIBLE_DUPLICATE','REJECTED','PARSING_ERROR') then
    return jsonb_build_object('matched', false, 'reason', 'not_matchable');
  end if;

  for cand in
    select o.id, o.expected_reference_tail, o.customer_phone_last4
    from public.payverify_orders o
    where o.organization_id = pay.organization_id
      and o.status = 'pending'
      and o.currency = pay.currency
      and o.amount = pay.amount
      and pay.transaction_date >= o.created_at - interval '2 minutes'
      and pay.transaction_date <= o.expires_at + interval '2 minutes'
      and (o.bank_account_id is null or pay.bank_account_id is null or o.bank_account_id = pay.bank_account_id)
    order by o.created_at
    for update of o
  loop
    -- The customer reported a reference tail and the payment shows a different one: not this order.
    if cand.expected_reference_tail is not null
       and right(upper(pay.reference), length(cand.expected_reference_tail)) <> cand.expected_reference_tail then
      continue;
    end if;
    allc := allc || cand.id;
    if cand.expected_reference_tail is not null then strong := strong || cand.id; end if;
    if cand.customer_phone_last4 is not null and pay.origin_phone_last4 is not null
       and cand.customer_phone_last4 = pay.origin_phone_last4 then
      by_phone := by_phone || cand.id;
    end if;
  end loop;

  if cardinality(strong) = 1 then
    chosen := strong[1]; method := 'reference'; new_status := 'paid_probable';
  elsif cardinality(strong) = 0 and cardinality(by_phone) = 1 then
    chosen := by_phone[1]; method := 'amount_phone'; new_status := 'paid_probable';
  elsif cardinality(strong) = 0 and cardinality(allc) = 1 then
    -- Same amount, nothing else to confirm who paid: a person must look at it.
    chosen := allc[1]; method := 'amount_only'; new_status := 'needs_review';
  else
    return jsonb_build_object('matched', false, 'reason',
      case when cardinality(allc) = 0 then 'no_candidate' else 'ambiguous' end);
  end if;

  update public.payverify_orders
     set status = new_status, matched_payment_event_id = pay.id, match_method = method, matched_at = now()
   where id = chosen;
  update public.pv_payment_events set matched_order_id = chosen where id = pay.id;
  insert into public.pv_audit_logs(organization_id, action, entity_type, entity_id)
    values (pay.organization_id, 'order_matched_' || method, 'payverify_order', chosen);
  return jsonb_build_object('matched', true, 'orderId', chosen, 'method', method, 'orderStatus', new_status);
end $$;
revoke all on function public.payverify_match_payment(uuid) from public, anon, authenticated;
grant execute on function public.payverify_match_payment(uuid) to service_role;

-- 5) Human actions on orders (service-role only; the edge function checks the session first)
create or replace function public.payverify_order_action(
  p_order_id uuid, p_user_id uuid, p_action text, p_payment_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.payverify_orders%rowtype;
  pay public.pv_payment_events%rowtype;
  role_ok boolean;
begin
  select * into o from public.payverify_orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  select exists(select 1 from public.pv_organization_members m
    where m.organization_id = o.organization_id and m.user_id = p_user_id and m.status = 'active'
      and m.role in ('owner','admin','operator')) into role_ok;
  if not role_ok then raise exception 'forbidden'; end if;

  if p_action = 'approve' then
    if o.status <> 'needs_review' or o.matched_payment_event_id is null then raise exception 'invalid_state'; end if;
    update public.payverify_orders set status = 'paid_probable', match_method = 'manual_approved' where id = o.id;
  elsif p_action = 'reject_match' then
    if o.status <> 'needs_review' or o.matched_payment_event_id is null then raise exception 'invalid_state'; end if;
    update public.pv_payment_events set matched_order_id = null where id = o.matched_payment_event_id;
    update public.payverify_orders
       set status = case when expires_at < now() then 'expired' else 'pending' end,
           matched_payment_event_id = null, match_method = null, matched_at = null
     where id = o.id;
  elsif p_action = 'link' then
    if p_payment_id is null then raise exception 'payment_required'; end if;
    if o.status not in ('pending','expired','needs_review') then raise exception 'invalid_state'; end if;
    select * into pay from public.pv_payment_events where id = p_payment_id for update;
    if not found or pay.organization_id <> o.organization_id then raise exception 'payment_not_found'; end if;
    if pay.matched_order_id is not null and pay.matched_order_id <> o.id then raise exception 'payment_already_linked'; end if;
    if pay.amount <> o.amount then raise exception 'amount_mismatch'; end if;
    if pay.verification_status in ('POSSIBLE_DUPLICATE','REJECTED','PARSING_ERROR') then raise exception 'payment_not_linkable'; end if;
    if o.matched_payment_event_id is not null and o.matched_payment_event_id <> pay.id then
      update public.pv_payment_events set matched_order_id = null where id = o.matched_payment_event_id;
    end if;
    update public.payverify_orders
       set status = case when pay.verification_status = 'RECONCILED' then 'paid_confirmed' else 'paid_probable' end,
           matched_payment_event_id = pay.id, match_method = 'manual_link', matched_at = now()
     where id = o.id;
    update public.pv_payment_events set matched_order_id = o.id where id = pay.id;
  elsif p_action = 'cancel' then
    if o.status not in ('pending','expired') then raise exception 'invalid_state'; end if;
    update public.payverify_orders set status = 'cancelled' where id = o.id;
  else
    raise exception 'unknown_action';
  end if;

  insert into public.pv_audit_logs(organization_id, user_id, action, entity_type, entity_id)
    values (o.organization_id, p_user_id, 'order_' || p_action, 'payverify_order', o.id);
  return (select to_jsonb(x) from (select id, status, match_method, matched_payment_event_id
                                    from public.payverify_orders where id = o.id) x);
end $$;
revoke all on function public.payverify_order_action(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.payverify_order_action(uuid, uuid, text, uuid) to service_role;

-- 5b) The customer reports the reference / phone AFTER the bank notification already arrived (very common).
-- Re-evaluates this order against payments that are still unlinked. Service-role only.
create or replace function public.payverify_order_set_hints(
  p_order_id uuid, p_phone_last4 text, p_reference_tail text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.payverify_orders%rowtype;
  pay public.pv_payment_events%rowtype;
  tail text := nullif(upper(trim(coalesce(p_reference_tail, ''))), '');
  ph text := nullif(trim(coalesce(p_phone_last4, '')), '');
  r jsonb;
begin
  if tail is not null and tail !~ '^[A-Z0-9]{4,12}$' then raise exception 'invalid_reference_tail'; end if;
  if ph is not null and ph !~ '^[0-9]{4}$' then raise exception 'invalid_phone'; end if;
  select * into o from public.payverify_orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.status not in ('pending','needs_review') then raise exception 'invalid_state'; end if;

  update public.payverify_orders
     set expected_reference_tail = coalesce(tail, expected_reference_tail),
         customer_phone_last4 = coalesce(ph, customer_phone_last4)
   where id = o.id returning * into o;

  if o.status = 'needs_review' and o.match_method = 'amount_only' and o.matched_payment_event_id is not null then
    select * into pay from public.pv_payment_events where id = o.matched_payment_event_id;
    if o.expected_reference_tail is not null
       and right(upper(pay.reference), length(o.expected_reference_tail)) = o.expected_reference_tail then
      update public.payverify_orders set status = 'paid_probable', match_method = 'reference' where id = o.id;
    end if;
  elsif o.status = 'pending' then
    for pay in
      select * from public.pv_payment_events pe
      where pe.organization_id = o.organization_id and pe.matched_order_id is null
        and pe.amount = o.amount and pe.currency = o.currency
        and pe.verification_status not in ('POSSIBLE_DUPLICATE','REJECTED','PARSING_ERROR')
        and pe.transaction_date >= o.created_at - interval '2 minutes'
        and pe.transaction_date <= o.expires_at + interval '2 minutes'
      order by pe.transaction_date
    loop
      r := public.payverify_match_payment(pay.id);
      exit when (r->>'matched')::boolean and r->>'orderId' = o.id::text;
    end loop;
  end if;
  return (select to_jsonb(x) from (select id, status, match_method, matched_payment_event_id
                                    from public.payverify_orders where id = o.id) x);
end $$;
revoke all on function public.payverify_order_set_hints(uuid, text, text) from public, anon, authenticated;
grant execute on function public.payverify_order_set_hints(uuid, text, text) to service_role;

-- 6) Expire old pending orders. Call from a scheduled job or an edge function.
create or replace function public.payverify_expire_orders()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.payverify_orders set status = 'expired'
   where status = 'pending' and expires_at < now() - interval '2 minutes';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.payverify_expire_orders() from public, anon, authenticated;
grant execute on function public.payverify_expire_orders() to service_role;

-- 7) When a statement line reconciles the payment, the order becomes CONFIRMED (and back if undone).
create or replace function public.payverify_sync_order_on_reconcile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.matched_order_id is not null and new.verification_status is distinct from old.verification_status then
    if new.verification_status = 'RECONCILED' then
      update public.payverify_orders set status = 'paid_confirmed'
       where id = new.matched_order_id and status = 'paid_probable';
    elsif old.verification_status = 'RECONCILED' then
      update public.payverify_orders set status = 'paid_probable'
       where id = new.matched_order_id and status = 'paid_confirmed';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists payverify_order_reconcile_sync on public.pv_payment_events;
create trigger payverify_order_reconcile_sync after update on public.pv_payment_events
  for each row execute function public.payverify_sync_order_on_reconcile();

comment on table public.payverify_orders is
  'Orders from the merchant checkout. paid_probable = payment detected and matched; paid_confirmed = also reconciled with a bank statement.';
