-- Distinguish SMS arrival time from bank transaction time.
alter table public.pv_payment_events
  add column if not exists event_time_source text not null default 'unknown'
  check (event_time_source in ('sms_received','bank_statement','manual','unknown'));

-- PayVerify integrated pilot: atomic import and authorized reconciliation.
-- Apply only to the dedicated PayVerify Supabase project after staging validation.

create or replace function public.pv_can_operate_org(target_org uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.pv_organization_members m
    where m.organization_id=target_org
      and m.user_id=auth.uid()
      and m.status='active'
      and m.role in ('owner','admin','operator')
  );
$$;
revoke all on function public.pv_can_operate_org(uuid) from public;
grant execute on function public.pv_can_operate_org(uuid) to authenticated;


-- Operators may manage operational configuration; viewers remain read-only.
drop policy if exists bank_accounts_member_all on public.pv_bank_accounts;
create policy bank_accounts_member_select on public.pv_bank_accounts
  for select to authenticated using (public.pv_is_org_member(organization_id));
create policy bank_accounts_operator_all on public.pv_bank_accounts
  for all to authenticated using (public.pv_can_operate_org(organization_id))
  with check (public.pv_can_operate_org(organization_id));
drop policy if exists sms_senders_member_all on public.pv_authorized_sms_senders;
create policy sms_senders_member_select on public.pv_authorized_sms_senders
  for select to authenticated using (public.pv_is_org_member(organization_id));
create policy sms_senders_operator_all on public.pv_authorized_sms_senders
  for all to authenticated using (public.pv_can_operate_org(organization_id))
  with check (public.pv_can_operate_org(organization_id));

-- Service-role-only RPC. Edge Function verifies session, membership and role first.
create or replace function public.payverify_reconcile_statement_line(
  p_line_id uuid,
  p_payment_id uuid,
  p_user_id uuid,
  p_tolerance_minutes integer default 2880
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  line public.pv_statement_lines%rowtype;
  payment public.pv_payment_events%rowtype;
  member_role public.pv_org_role;
begin
  if p_tolerance_minutes < 0 or p_tolerance_minutes > 10080 then
    raise exception 'invalid_tolerance';
  end if;

  select m.role into member_role
  from public.pv_organization_members m
  join public.pv_statement_lines sl on sl.organization_id=m.organization_id
  where sl.id=p_line_id and m.user_id=p_user_id and m.status='active'
    and m.role in ('owner','admin','operator')
  limit 1;
  if member_role is null then raise exception 'forbidden'; end if;

  select * into line from public.pv_statement_lines where id=p_line_id for update;
  select * into payment from public.pv_payment_events where id=p_payment_id for update;

  if line.id is null or payment.id is null then raise exception 'not_found'; end if;
  if line.organization_id <> payment.organization_id then raise exception 'organization_mismatch'; end if;
  if line.reconciliation_status='matched' or payment.verification_status='RECONCILED' then
    raise exception 'already_reconciled';
  end if;
  if line.amount <= 0 or round(line.amount,2) <> round(payment.amount,2) then
    raise exception 'amount_mismatch';
  end if;
  if line.currency <> payment.currency then raise exception 'currency_mismatch'; end if;
  if line.reference is null or trim(line.reference)='' or upper(trim(line.reference)) <> upper(trim(payment.reference)) then
    raise exception 'reference_mismatch';
  end if;
  if abs(extract(epoch from (line.transaction_date-payment.transaction_date))) > p_tolerance_minutes*60 then
    raise exception 'date_outside_tolerance';
  end if;

  update public.pv_statement_lines set
    reconciliation_status='matched',
    matched_payment_event_id=payment.id,
    reviewed_by=p_user_id,
    reviewed_at=now()
  where id=line.id;

  update public.pv_payment_events set verification_status='RECONCILED'
  where id=payment.id;

  insert into public.pv_reconciliation_records(
    organization_id,payment_event_id,reconciliation_source,reconciliation_status,
    matched_amount,matched_reference,reconciled_at
  ) values(
    payment.organization_id,payment.id,'statement_import','matched',
    payment.amount,line.reference,now()
  );

  insert into public.pv_audit_logs(organization_id,user_id,action,entity_type,entity_id)
  values(payment.organization_id,p_user_id,'statement_line_reconciled','statement_line',line.id);

  return jsonb_build_object('ok',true,'lineId',line.id,'paymentId',payment.id,'status','RECONCILED');
end;
$$;
revoke all on function public.payverify_reconcile_statement_line(uuid,uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.payverify_reconcile_statement_line(uuid,uuid,uuid,integer) to service_role;

-- Prevent changing reconciliation links through the browser client.
revoke insert, update, delete on public.pv_statement_lines from anon, authenticated;
revoke insert, update, delete on public.pv_statement_import_batches from anon, authenticated;

comment on function public.payverify_reconcile_statement_line(uuid,uuid,uuid,integer) is
  'Atomic, audited reconciliation; call only from authenticated edge function after role verification.';


create or replace function public.payverify_unreconcile_statement_line(
  p_line_id uuid,
  p_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  line public.pv_statement_lines%rowtype;
  member_role public.pv_org_role;
begin
  select m.role into member_role
  from public.pv_organization_members m
  join public.pv_statement_lines sl on sl.organization_id=m.organization_id
  where sl.id=p_line_id and m.user_id=p_user_id and m.status='active'
    and m.role in ('owner','admin','operator')
  limit 1;
  if member_role is null then raise exception 'forbidden'; end if;

  select * into line from public.pv_statement_lines where id=p_line_id for update;
  if line.id is null then raise exception 'not_found'; end if;
  if line.reconciliation_status <> 'matched' or line.matched_payment_event_id is null then
    raise exception 'not_reconciled';
  end if;

  update public.pv_statement_lines set
    reconciliation_status='unmatched',
    matched_payment_event_id=null,
    reviewed_by=p_user_id,
    reviewed_at=now()
  where id=line.id;

  update public.pv_payment_events set verification_status='PENDING_REVIEW'
  where id=line.matched_payment_event_id and verification_status='RECONCILED';

  update public.pv_reconciliation_records set
    reconciliation_status='unmatched',
    reconciled_at=null
  where payment_event_id=line.matched_payment_event_id
    and reconciliation_status='matched';

  insert into public.pv_audit_logs(organization_id,user_id,action,entity_type,entity_id)
  values(line.organization_id,p_user_id,'statement_line_unreconciled','statement_line',line.id);

  return jsonb_build_object('ok',true,'lineId',line.id,'status','unmatched');
end;
$$;
revoke all on function public.payverify_unreconcile_statement_line(uuid,uuid) from public, anon, authenticated;
grant execute on function public.payverify_unreconcile_statement_line(uuid,uuid) to service_role;
