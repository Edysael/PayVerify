-- PayVerify 0011: permite resolver a mano un pago marcado POSSIBLE_DUPLICATE.
-- Motivo: payment-event-ingest marca POSSIBLE_DUPLICATE cuando llega otro pago con el mismo monto y referencia
-- en 48 h. Es una falsa alarma frecuente y no había forma de limpiarla: el pago quedaba fuera del matching.
-- Aditiva e idempotente: solo crea una función nueva (service_role). Solo toca objetos payverify_*/pv_*.
--   p_decision = 'not_duplicate' -> RECEIVED_BY_SERVER y se intenta vincular a una orden pendiente.
--   p_decision = 'duplicate'     -> REJECTED.

create or replace function public.payverify_resolve_duplicate(
  p_payment_id uuid, p_user_id uuid, p_decision text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  pay public.pv_payment_events%rowtype;
  new_status public.pv_payment_status;
  m jsonb := null;
begin
  if p_decision not in ('not_duplicate','duplicate') then raise exception 'invalid_decision'; end if;
  select * into pay from public.pv_payment_events where id = p_payment_id for update;
  if not found then raise exception 'payment_not_found'; end if;
  if not exists (
    select 1 from public.pv_organization_members mb
    where mb.organization_id = pay.organization_id and mb.user_id = p_user_id
      and mb.status = 'active' and mb.role in ('owner','admin','operator')
  ) then raise exception 'forbidden'; end if;
  if pay.verification_status <> 'POSSIBLE_DUPLICATE' then raise exception 'not_possible_duplicate'; end if;

  new_status := case when p_decision = 'not_duplicate' then 'RECEIVED_BY_SERVER' else 'REJECTED' end;
  update public.pv_payment_events set verification_status = new_status where id = pay.id;

  insert into public.pv_audit_logs(organization_id, user_id, action, entity_type, entity_id)
  values (pay.organization_id, p_user_id,
          case when p_decision = 'not_duplicate' then 'payment_duplicate_dismissed' else 'payment_duplicate_confirmed' end,
          'payment_event', pay.id);

  if p_decision = 'not_duplicate' then
    m := public.payverify_match_payment(pay.id);
  end if;
  return jsonb_build_object('ok', true, 'paymentId', pay.id, 'status', new_status::text, 'order', m);
end $$;
revoke all on function public.payverify_resolve_duplicate(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.payverify_resolve_duplicate(uuid, uuid, text) to service_role;
