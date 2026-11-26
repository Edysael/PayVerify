create extension if not exists pgcrypto;
create type public.pv_org_role as enum ('owner','admin','operator','viewer');
create type public.pv_device_status as enum ('pending','active','revoked');
create type public.pv_payment_status as enum ('SMS_DETECTED','DATA_EXTRACTED','RECEIVED_BY_SERVER','PENDING_REVIEW','RECONCILED','POSSIBLE_DUPLICATE','PARSING_ERROR','REJECTED');

create table public.pv_organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 160),
 legal_name text, tax_identifier text,
 status text not null default 'active' check(status in ('active','suspended')),
 created_at timestamptz not null default now()
);
create table public.pv_organization_members (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.pv_organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role public.pv_org_role not null default 'operator',
 status text not null default 'active' check(status in ('active','invited','disabled')),
 created_at timestamptz not null default now(), unique(organization_id,user_id)
);
create or replace function public.pv_is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.pv_organization_members m where m.organization_id=target_org and m.user_id=auth.uid() and m.status='active');
$$;
revoke all on function public.pv_is_org_member(uuid) from public;
grant execute on function public.pv_is_org_member(uuid) to authenticated;

create table public.pv_devices (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.pv_organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id), device_name text not null,
 platform text not null default 'android' check(platform='android'),
 device_status public.pv_device_status not null default 'pending',
 last_seen_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now()
);
create table public.pv_bank_accounts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.pv_organizations(id) on delete cascade,
 bank_name text not null, account_alias text not null, account_type text,
 currency text not null default 'VES', status text not null default 'active', created_at timestamptz not null default now()
);
create table public.pv_authorized_sms_senders (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.pv_organizations(id) on delete cascade,
 bank_account_id uuid references public.pv_bank_accounts(id) on delete set null,
 sender_identifier text not null, bank_name text not null, enabled boolean not null default false,
 created_at timestamptz not null default now(), unique(organization_id,sender_identifier)
);
create table public.pv_payment_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.pv_organizations(id) on delete cascade,
 bank_account_id uuid references public.pv_bank_accounts(id) on delete set null,
 device_id uuid references public.pv_devices(id) on delete set null, bank_name text,
 amount numeric(18,2) not null check(amount>0), currency text not null default 'VES',
 reference text not null, transaction_date timestamptz not null, origin_bank text, destination_bank text,
 payment_type text, source_type text not null default 'sms' check(source_type in ('sms','manual','statement')),
 verification_status public.pv_payment_status not null default 'RECEIVED_BY_SERVER',
 idempotency_key text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,idempotency_key)
);
create index payment_events_org_date_idx on public.pv_payment_events(organization_id,transaction_date desc);
create index payment_events_org_ref_idx on public.pv_payment_events(organization_id,reference);
create table public.pv_reconciliation_records (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.pv_organizations(id) on delete cascade,
 payment_event_id uuid not null references public.pv_payment_events(id) on delete cascade,
 reconciliation_source text not null, reconciliation_status text not null check(reconciliation_status in ('matched','partial','unmatched','review')),
 matched_amount numeric(18,2), matched_reference text, reconciled_at timestamptz, created_at timestamptz not null default now()
);
create table public.pv_audit_logs (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.pv_organizations(id) on delete cascade,
 user_id uuid references auth.users(id), action text not null, entity_type text not null, entity_id uuid, created_at timestamptz not null default now()
);
alter table public.pv_organizations enable row level security;
alter table public.pv_organization_members enable row level security;
alter table public.pv_devices enable row level security;
alter table public.pv_bank_accounts enable row level security;
alter table public.pv_authorized_sms_senders enable row level security;
alter table public.pv_payment_events enable row level security;
alter table public.pv_reconciliation_records enable row level security;
alter table public.pv_audit_logs enable row level security;
create policy org_member_select on public.pv_organizations for select to authenticated using(public.pv_is_org_member(id));
create policy member_select on public.pv_organization_members for select to authenticated using(public.pv_is_org_member(organization_id));
create policy device_select on public.pv_devices for select to authenticated using(public.pv_is_org_member(organization_id));
create policy bank_accounts_member_all on public.pv_bank_accounts for all to authenticated using(public.pv_is_org_member(organization_id)) with check(public.pv_is_org_member(organization_id));
create policy sms_senders_member_all on public.pv_authorized_sms_senders for all to authenticated using(public.pv_is_org_member(organization_id)) with check(public.pv_is_org_member(organization_id));
create policy payment_events_member_select on public.pv_payment_events for select to authenticated using(public.pv_is_org_member(organization_id));
create policy reconciliation_member_select on public.pv_reconciliation_records for select to authenticated using(public.pv_is_org_member(organization_id));
create policy audit_member_select on public.pv_audit_logs for select to authenticated using(public.pv_is_org_member(organization_id));
-- Deliberately no client insert/update policies for payments/pv_devices/audit. Trusted backend must validate and write.
-- Organization onboarding must be implemented through trusted server flow before production.
