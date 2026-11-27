-- PayVerify 0009: endurece la conciliación y mantiene coherente el estado de las órdenes.
-- Aditiva e idempotente. No modifica tablas, columnas ni la firma de ninguna función pública.
-- No toca objetos de otras aplicaciones del mismo proyecto (solo pv_* y payverify_*).

-- 1) Conciliación: rechaza pagos que no pueden confirmarse y cruza cuentas bancarias cuando ambas están definidas.
--    (POSSIBLE_DUPLICATE sigue permitido: es una falsa alarma frecuente y no existe otra vía para limpiarla.)
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
  if payment.verification_status in ('REJECTED','PARSING_ERROR') then
    raise exception 'payment_not_reconcilable';
  end if;
  if line.bank_account_id is not null and payment.bank_account_id is not null
     and line.bank_account_id <> payment.bank_account_id then
    raise exception 'bank_account_mismatch';
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

-- 2) Si el pago ya estaba conciliado cuando se vincula la orden (match automático o acción approve),
--    la orden pasa directo a paid_confirmed. Antes se quedaba en paid_probable porque el trigger
--    existente solo reacciona cuando cambia el estado del PAGO.
create or replace function public.payverify_order_confirm_if_reconciled()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status='paid_probable'
     and old.status is distinct from 'paid_probable'
     and new.matched_payment_event_id is not null
     and exists (
       select 1 from public.pv_payment_events pe
       where pe.id=new.matched_payment_event_id and pe.verification_status='RECONCILED'
     ) then
    new.status:='paid_confirmed';
  end if;
  return new;
end;
$$;
revoke execute on function public.payverify_order_confirm_if_reconciled() from public, anon, authenticated;

drop trigger if exists payverify_order_confirm_on_match on public.payverify_orders;
create trigger payverify_order_confirm_on_match
  before update on public.payverify_orders
  for each row execute function public.payverify_order_confirm_if_reconciled();
