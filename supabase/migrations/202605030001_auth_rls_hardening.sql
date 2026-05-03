-- Epistable Auth/RLS hardening draft
-- Review in Supabase SQL editor before applying. This is intentionally additive first.

create table if not exists public.profiles (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('owner', 'admin', 'manager', 'inspector', 'buyer')),
  factory_id text references public.factories(id),
  factory_name text,
  company text,
  avatar text,
  status text not null default 'active',
  scans_total integer not null default 0,
  last_active bigint,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists profiles_factory_id_idx on public.profiles(factory_id);
create index if not exists profiles_auth_user_id_idx on public.profiles(auth_user_id);

alter table public.factories enable row level security;
alter table public.inspections enable row level security;
alter table public.suppliers enable row level security;
alter table public.disputes enable row level security;
alter table public.inquiries enable row level security;
alter table public.notifications enable row level security;
alter table public.profiles enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.current_profile_factory_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select factory_id from public.profiles where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'owner'
$$;

create or replace function public.same_factory(factory_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_owner() or public.current_profile_factory_id() = factory_id
$$;

-- Profiles
create policy "profiles read own factory" on public.profiles
  for select using (public.is_owner() or auth_user_id = auth.uid() or public.same_factory(factory_id));

create policy "profiles owner writes" on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

-- Factories
create policy "factories read own" on public.factories
  for select using (public.is_owner() or public.same_factory(id));

create policy "factories owner writes" on public.factories
  for all using (public.is_owner()) with check (public.is_owner());

create policy "factories admins update own" on public.factories
  for update using (public.current_profile_role() in ('admin', 'manager') and public.same_factory(id))
  with check (public.current_profile_role() in ('admin', 'manager') and public.same_factory(id));

-- Inspections
create policy "inspections read own factory" on public.inspections
  for select using (public.is_owner() or public.same_factory(factory_id));

create policy "inspections create own factory" on public.inspections
  for insert with check (public.current_profile_role() in ('admin', 'manager', 'inspector') and public.same_factory(factory_id));

create policy "inspections update own factory" on public.inspections
  for update using (public.current_profile_role() in ('admin', 'manager') and public.same_factory(factory_id))
  with check (public.current_profile_role() in ('admin', 'manager') and public.same_factory(factory_id));

-- Factory-scoped tables
create policy "suppliers own factory" on public.suppliers
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "disputes own factory" on public.disputes
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "inquiries own factory" on public.inquiries
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "notifications own user" on public.notifications
  for all using (public.is_owner() or user_id in (select id from public.profiles where auth_user_id = auth.uid()))
  with check (public.is_owner() or user_id in (select id from public.profiles where auth_user_id = auth.uid()));

-- After creating Supabase Auth users and migrating rows into profiles, remove plaintext password columns:
-- alter table public.users drop column if exists password;
-- alter table public.buyers drop column if exists password;
