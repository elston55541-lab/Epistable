-- Organization administration uses existing Auth users; it never sends invitations.
create function epistable_private.marketplace_accounts()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
 if auth.uid() is null or (epistable_private.context()->>'role') is distinct from 'platform_admin' then
  raise exception 'Platform administrator required' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
  'id',p.auth_user_id,'name',p.name,'email',p.email,'status',p.status,
  'organization_id',a.organization_id,'access_role',a.access_role) order by p.name)
 from public.profiles p left join epistable_private.marketplace_access a on a.auth_user_id=p.auth_user_id
 where p.auth_user_id is not null),'[]'::jsonb);
end $$;

create function epistable_private.assign_marketplace_access(target_user uuid,target_org text,target_role text)
returns void language plpgsql security definer set search_path=''
as $$
declare org_type text;
begin
 if auth.uid() is null or (epistable_private.context()->>'role') is distinct from 'platform_admin' then
  raise exception 'Platform administrator required' using errcode='42501';
 end if;
 if exists(select 1 from epistable_private.marketplace_access where auth_user_id=target_user and access_role='platform_admin') then
  raise exception 'Platform administrator access cannot be changed here' using errcode='42501';
 end if;
 if not exists(select 1 from public.profiles where auth_user_id=target_user and status='active') then
  raise exception 'Choose an active linked account' using errcode='23514';
 end if;
 select type into org_type from public.organizations where id=target_org;
 if org_type is null or target_role is null or target_role not in ('seller_admin','seller_member','buyer_admin','buyer_member')
   or split_part(target_role,'_',1)<>org_type then
  raise exception 'Role must match the organisation type' using errcode='23514';
 end if;
 insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
 values(target_user,target_org,target_role)
 on conflict(auth_user_id) do update set organization_id=excluded.organization_id,access_role=excluded.access_role;
 -- Compatibility fields: marketplace policies continue to trust ONLY the private access table.
 update public.profiles set organization_id=target_org,organization_role=target_role where auth_user_id=target_user;
end $$;
revoke all on function epistable_private.marketplace_accounts() from public,anon,authenticated;
revoke all on function epistable_private.assign_marketplace_access(uuid,text,text) from public,anon,authenticated;
grant execute on function epistable_private.marketplace_accounts() to authenticated;
grant execute on function epistable_private.assign_marketplace_access(uuid,text,text) to authenticated;

create function public.marketplace_accounts()
returns jsonb language sql stable security invoker set search_path=''
as $$ select epistable_private.marketplace_accounts() $$;
create function public.assign_marketplace_access(target_user uuid,target_org text,target_role text)
returns void language sql security invoker set search_path=''
as $$ select epistable_private.assign_marketplace_access(target_user,target_org,target_role) $$;
revoke all on function public.marketplace_accounts() from public,anon;
revoke all on function public.assign_marketplace_access(uuid,text,text) from public,anon;
grant execute on function public.marketplace_accounts() to authenticated;
grant execute on function public.assign_marketplace_access(uuid,text,text) to authenticated;
