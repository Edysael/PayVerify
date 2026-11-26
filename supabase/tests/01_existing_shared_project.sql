-- Simula lo que YA existe en el proyecto compartido LEGAL TECH-IT API SERVICES (Mensajero Pro),
-- para probar que las migraciones de PayVerify conviven sin chocar ni sobrescribir nada.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  sender_number text, credits integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default now());
create table public.profiles (id uuid primary key references auth.users(id), full_name text, created_at timestamptz not null default now());
create table public.org_members (org_id uuid references public.organizations(id), user_id uuid references auth.users(id),
  role text not null default 'member', created_at timestamptz not null default now(), primary key(org_id,user_id));
create table public.messages (id uuid primary key default gen_random_uuid(), org_id uuid references public.organizations(id), body text);
create function public.is_org_member(p_org uuid) returns boolean language sql stable security definer as
 $$ select exists(select 1 from public.org_members where org_id=p_org and user_id=auth.uid()) $$;
create function public.is_org_admin(p_org uuid) returns boolean language sql stable as $$ select false $$;
create function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
insert into auth.users(id,email) values ('00000000-0000-0000-0000-00000000f001','mp@x');
insert into public.organizations(id,name,credits) values ('00000000-0000-0000-0000-00000000f0f0','Org Mensajero',500);
insert into public.org_members(org_id,user_id,role) values ('00000000-0000-0000-0000-00000000f0f0','00000000-0000-0000-0000-00000000f001','admin');
