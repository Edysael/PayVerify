-- PayVerify 0008: add FK-supporting indexes and remove duplicate SELECT policy paths.
-- Additive and scoped only to PayVerify objects in the shared public schema.
-- The member SELECT policies already grant read access to all active organization members.
-- Operator write permissions are retained as separate INSERT/UPDATE/DELETE policies.

create index if not exists payverify_api_keys_org_idx
  on public.payverify_api_keys (organization_id);
create index if not exists payverify_api_keys_created_by_idx
  on public.payverify_api_keys (created_by);

create index if not exists payverify_orders_bank_account_idx
  on public.payverify_orders (bank_account_id);
create index if not exists payverify_orders_created_by_idx
  on public.payverify_orders (created_by);

create index if not exists pv_audit_logs_org_created_idx
  on public.pv_audit_logs (organization_id, created_at desc);
create index if not exists pv_audit_logs_user_idx
  on public.pv_audit_logs (user_id);

create index if not exists pv_authorized_sms_senders_bank_account_idx
  on public.pv_authorized_sms_senders (bank_account_id);
create index if not exists pv_bank_accounts_org_idx
  on public.pv_bank_accounts (organization_id);
create index if not exists pv_devices_user_idx
  on public.pv_devices (user_id);
create index if not exists pv_organization_members_user_idx
  on public.pv_organization_members (user_id);

create index if not exists pv_payment_events_matched_order_idx
  on public.pv_payment_events (matched_order_id);
create index if not exists pv_payment_events_bank_account_idx
  on public.pv_payment_events (bank_account_id);
create index if not exists pv_payment_events_device_idx
  on public.pv_payment_events (device_id);

create index if not exists pv_reconciliation_records_payment_idx
  on public.pv_reconciliation_records (payment_event_id);
create index if not exists pv_statement_import_batches_uploaded_by_idx
  on public.pv_statement_import_batches (uploaded_by);

create index if not exists pv_statement_lines_bank_account_idx
  on public.pv_statement_lines (bank_account_id);
create index if not exists pv_statement_lines_batch_idx
  on public.pv_statement_lines (batch_id);
create index if not exists pv_statement_lines_matched_payment_idx
  on public.pv_statement_lines (matched_payment_event_id);
create index if not exists pv_statement_lines_reviewed_by_idx
  on public.pv_statement_lines (reviewed_by);

-- Avoid duplicate permissive SELECT policies while preserving operator write access.
drop policy if exists bank_accounts_operator_all on public.pv_bank_accounts;
create policy bank_accounts_operator_insert
  on public.pv_bank_accounts for insert to authenticated
  with check (public.pv_can_operate_org(organization_id));
create policy bank_accounts_operator_update
  on public.pv_bank_accounts for update to authenticated
  using (public.pv_can_operate_org(organization_id))
  with check (public.pv_can_operate_org(organization_id));
create policy bank_accounts_operator_delete
  on public.pv_bank_accounts for delete to authenticated
  using (public.pv_can_operate_org(organization_id));

drop policy if exists sms_senders_operator_all on public.pv_authorized_sms_senders;
create policy sms_senders_operator_insert
  on public.pv_authorized_sms_senders for insert to authenticated
  with check (public.pv_can_operate_org(organization_id));
create policy sms_senders_operator_update
  on public.pv_authorized_sms_senders for update to authenticated
  using (public.pv_can_operate_org(organization_id))
  with check (public.pv_can_operate_org(organization_id));
create policy sms_senders_operator_delete
  on public.pv_authorized_sms_senders for delete to authenticated
  using (public.pv_can_operate_org(organization_id));
