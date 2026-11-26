-- PayVerify 0008 migration assertions.
do $$
declare
  required_indexes text[] := array[
    'payverify_api_keys_org_idx',
    'payverify_api_keys_created_by_idx',
    'payverify_orders_bank_account_idx',
    'payverify_orders_created_by_idx',
    'pv_audit_logs_org_created_idx',
    'pv_audit_logs_user_idx',
    'pv_authorized_sms_senders_bank_account_idx',
    'pv_bank_accounts_org_idx',
    'pv_devices_user_idx',
    'pv_organization_members_user_idx',
    'pv_payment_events_matched_order_idx',
    'pv_payment_events_bank_account_idx',
    'pv_payment_events_device_idx',
    'pv_reconciliation_records_payment_idx',
    'pv_statement_import_batches_uploaded_by_idx',
    'pv_statement_lines_bank_account_idx',
    'pv_statement_lines_batch_idx',
    'pv_statement_lines_matched_payment_idx',
    'pv_statement_lines_reviewed_by_idx'
  ];
  missing_indexes text;
begin
  select string_agg(required_name, ', ')
    into missing_indexes
  from unnest(required_indexes) as required_name
  where not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname=required_name
  );

  if missing_indexes is not null then
    raise exception 'PayVerify 0008 missing indexes: %', missing_indexes;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename in ('pv_bank_accounts','pv_authorized_sms_senders')
      and policyname in ('bank_accounts_operator_all','sms_senders_operator_all')
  ) then
    raise exception 'PayVerify 0008 duplicate operator ALL policies remain';
  end if;

  if (select count(*) from pg_policies
      where schemaname='public' and tablename='pv_bank_accounts'
        and policyname in ('bank_accounts_operator_insert','bank_accounts_operator_update','bank_accounts_operator_delete')) <> 3 then
    raise exception 'PayVerify 0008 bank account operator write policies incomplete';
  end if;

  if (select count(*) from pg_policies
      where schemaname='public' and tablename='pv_authorized_sms_senders'
        and policyname in ('sms_senders_operator_insert','sms_senders_operator_update','sms_senders_operator_delete')) <> 3 then
    raise exception 'PayVerify 0008 sender operator write policies incomplete';
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pv_bank_accounts' and policyname='bank_accounts_member_select' and cmd='SELECT')
     or not exists (select 1 from pg_policies where schemaname='public' and tablename='pv_authorized_sms_senders' and policyname='sms_senders_member_select' and cmd='SELECT') then
    raise exception 'PayVerify 0008 member SELECT policies missing';
  end if;
end $$;

select 'PayVerify 0008 indexes and policy assertions passed' as result;
