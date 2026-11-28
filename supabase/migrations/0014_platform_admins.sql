-- PayVerify 0014: administradores de la plataforma (quienes dan de alta clientes).
-- Aditiva e idempotente. Solo crea objetos pv_*; no toca tablas de otras apps del proyecto compartido.
-- Un administrador de plataforma puede crear la organización de un cliente e invitar a su dueño por correo
-- (Edge Function client-invite). No le da acceso a datos de organizaciones donde no es miembro.

create table if not exists public.pv_platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.pv_platform_admins enable row level security;
revoke all on public.pv_platform_admins from anon, authenticated;

-- ¿El usuario de la sesión es administrador de plataforma? Lo usa el panel para mostrar «Nuevo cliente».
create or replace function public.pv_is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.pv_platform_admins a where a.user_id = auth.uid());
$$;
revoke all on function public.pv_is_platform_admin() from public, anon;
grant execute on function public.pv_is_platform_admin() to authenticated;

-- Primer administrador: el dueño de la plataforma (si su cuenta existe).
insert into public.pv_platform_admins(user_id)
select id from auth.users where lower(email) = 'edgardoisael@gmail.com'
on conflict (user_id) do nothing;
