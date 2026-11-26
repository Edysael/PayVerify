-- PayVerify phase 4: statement import and manual reconciliation foundation.
-- Run only after reviewing against the live schema and applying in a test project.
create table if not exists public.pv_statement_import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pv_organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  source_label text not null check (length(trim(source_label)) between 1 and 120),
  file_sha256 text not null check (file_sha256 ~ '^[a-f0-9]{64}$'),
  row_count integer not null default 0 check (row_count >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  status text not null default 'pending_review'
    check (status in ('pending_review','validated','completed','failed')),
  created_at timestamptz not null default now(),
  unique (organization_id, file_sha256)
);

create table if not exists public.pv_statement_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pv_organizations(id) on delete cascade,
  batch_id uuid not null references public.pv_statement_import_batches(id) on delete cascade,
  bank_account_id uuid references public.pv_bank_accounts(id) on delete set null,
  transaction_date timestamptz not null,
  amount numeric(18,2) not null check (amount <> 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  reference text,
  description_redacted text,
  line_fingerprint text not null check (line_fingerprint ~ '^[a-f0-9]{64}$'),
  reconciliation_status text not null default 'unmatched'
    check (reconciliation_status in ('unmatched','candidate','matched','ignored')),
  matched_payment_event_id uuid references public.pv_payment_events(id) on delete set null,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, line_fingerprint)
);

create index if not exists statement_lines_org_date_idx
  on public.pv_statement_lines (organization_id, transaction_date desc);
create index if not exists statement_lines_match_idx
  on public.pv_statement_lines (organization_id, reconciliation_status, amount, currency);

alter table public.pv_statement_import_batches enable row level security;
alter table public.pv_statement_lines enable row level security;

drop policy if exists statement_batches_member_read on public.pv_statement_import_batches;
create policy statement_batches_member_read on public.pv_statement_import_batches
  for select to authenticated using (public.pv_is_org_member(organization_id));

drop policy if exists statement_lines_member_read on public.pv_statement_lines;
create policy statement_lines_member_read on public.pv_statement_lines
  for select to authenticated using (public.pv_is_org_member(organization_id));

-- Client direct writes intentionally not granted; import/reconciliation must use
-- a reviewed server-side function with membership/role checks and audit logging.
revoke insert, update, delete on public.pv_statement_import_batches from anon, authenticated;
revoke insert, update, delete on public.pv_statement_lines from anon, authenticated;

comment on table public.pv_statement_lines is
  'Imported bank statement rows; only an authorized reconciliation process may mark a row matched.';
