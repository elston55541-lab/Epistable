-- Let invited users link their Supabase Auth account to a pending Epistable profile.

create or replace function public.accept_profile_invite()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_profile public.profiles;
  user_email text := lower(auth.email());
begin
  if auth.uid() is null or user_email is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set
    auth_user_id = auth.uid(),
    status = 'active',
    last_active = extract(epoch from now())::bigint * 1000
  where lower(email) = user_email
    and coalesce(status, 'pending') in ('pending', 'inactive', 'active')
    and (auth_user_id is null or auth_user_id = auth.uid())
  returning * into invited_profile;

  if invited_profile.id is null then
    raise exception 'No pending invite found for this email';
  end if;

  return invited_profile;
end;
$$;

grant execute on function public.accept_profile_invite() to authenticated;
