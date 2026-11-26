-- PayVerify 0006: quita permisos que Supabase concede por defecto a `anon` sobre objetos de PayVerify.
-- Solo objetos nombrados de PayVerify; no toca nada de otras apps del mismo proyecto.
revoke all on public.pv_organizations, public.pv_organization_members, public.pv_devices,
  public.pv_bank_accounts, public.pv_authorized_sms_senders, public.pv_payment_events,
  public.pv_reconciliation_records, public.pv_audit_logs, public.pv_statement_import_batches,
  public.pv_statement_lines, public.payverify_orders, public.payverify_api_keys
  from anon;
revoke execute on function public.pv_is_org_member(uuid) from anon;
revoke execute on function public.pv_can_operate_org(uuid) from anon;
revoke execute on function public.pv_log_payment_status_change() from anon, authenticated;
revoke execute on function public.payverify_sync_order_on_reconcile() from anon, authenticated;
revoke execute on function public.pv_set_updated_at() from anon, authenticated;
