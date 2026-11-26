-- Phase 3: integrity controls. Apply only to the separate PayVerify Supabase project.
create index if not exists payment_events_org_status_date_idx
  on public.pv_payment_events(organization_id, verification_status, transaction_date desc);
create index if not exists devices_org_status_idx
  on public.pv_devices(organization_id, device_status);
create index if not exists reconciliation_org_created_idx
  on public.pv_reconciliation_records(organization_id, created_at desc);

create or replace function public.pv_set_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists payment_events_set_updated_at on public.pv_payment_events;
create trigger payment_events_set_updated_at before update on public.pv_payment_events
for each row execute function public.pv_set_updated_at();

-- Prevent client-side writes to sensitive operational tables. Trusted edge functions
-- using service role are responsible for validated writes and audit events.
revoke insert, update, delete on public.pv_payment_events from authenticated;
revoke insert, update, delete on public.pv_devices from authenticated;
revoke insert, update, delete on public.pv_audit_logs from authenticated;
revoke insert, update, delete on public.pv_reconciliation_records from authenticated;

-- Audit records are append-only even for authenticated application roles.
revoke update, delete on public.pv_audit_logs from authenticated;

create or replace function public.pv_log_payment_status_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.verification_status is distinct from old.verification_status then
    insert into public.pv_audit_logs(organization_id, action, entity_type, entity_id)
    values(new.organization_id, 'payment_status_changed', 'payment_event', new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists payment_status_audit on public.pv_payment_events;
create trigger payment_status_audit after update on public.pv_payment_events
for each row execute function public.pv_log_payment_status_change();
