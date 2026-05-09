-- Allow factory admins/managers to manage access for profiles in their own factory.
-- Owners keep full profile access through the existing owner policy.

drop policy if exists "profiles factory admins insert own" on public.profiles;
drop policy if exists "profiles factory admins update own" on public.profiles;

create policy "profiles factory admins insert own" on public.profiles
  for insert
  with check (
    public.current_profile_role() in ('admin', 'manager')
    and public.same_factory(factory_id)
    and role in ('admin', 'manager', 'inspector', 'buyer')
  );

create policy "profiles factory admins update own" on public.profiles
  for update
  using (
    public.current_profile_role() in ('admin', 'manager')
    and public.same_factory(factory_id)
    and role <> 'owner'
  )
  with check (
    public.current_profile_role() in ('admin', 'manager')
    and public.same_factory(factory_id)
    and role in ('admin', 'manager', 'inspector', 'buyer')
  );
