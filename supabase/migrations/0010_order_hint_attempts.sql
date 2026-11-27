-- PayVerify 0010: limita los intentos de pista (terminación de referencia / teléfono) por orden.
-- Motivo: payverify_order_set_hints no tenía límite, así que una terminación de 4 caracteres
-- o los 4 dígitos del teléfono podían adivinarse probando.
-- Aditiva e idempotente: agrega una columna con default y reemplaza la función con la misma firma.
-- Solo toca objetos payverify_*.

alter table public.payverify_orders
  add column if not exists hint_attempts integer not null default 0 check (hint_attempts >= 0);

create or replace function public.payverify_order_set_hints(
  p_order_id uuid, p_phone_last4 text, p_reference_tail text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  max_attempts constant integer := 5;
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

  -- Cada llamada que trae una pista cuenta como intento, acierte o no.
  if tail is not null or ph is not null then
    if o.hint_attempts >= max_attempts then raise exception 'too_many_attempts'; end if;
  end if;

  update public.payverify_orders
     set expected_reference_tail = coalesce(tail, expected_reference_tail),
         customer_phone_last4 = coalesce(ph, customer_phone_last4),
         hint_attempts = hint_attempts + case when tail is not null or ph is not null then 1 else 0 end
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
