-- Preserve the public review RPC's RLS boundary; elevate only private access writes.
create or replace function epistable_private.complete_marketplace_application(target_org text, review_decision text)
returns void language plpgsql security definer set search_path=''
as $$
declare org public.organizations%rowtype;
declare application epistable_private.marketplace_applications%rowtype;
begin
 if auth.uid() is null or (epistable_private.context()->>'role') is distinct from 'platform_admin' then
  raise exception 'Platform administrator required' using errcode='42501';
 end if;
 if review_decision is null or review_decision not in ('verified','rejected') then
  raise exception 'Invalid review decision' using errcode='23514';
 end if;
 select * into org from public.organizations where id=target_org for update;
 if org.id is null or org.verification_status is distinct from review_decision then
  raise exception 'Organisation must have the matching review decision' using errcode='23514';
 end if;
 select * into application from epistable_private.marketplace_applications
  where organization_id=target_org and status='pending' for update;
 -- Manually provisioned organisations may legitimately have no application.
 if not found then return; end if;
 if review_decision='verified' then
  if not ((org.type='seller' and application.requested_role='seller_admin')
       or (org.type='buyer' and application.requested_role='buyer_admin')) then
   raise exception 'Application role does not match organisation type' using errcode='23514';
  end if;
  if not exists(select 1 from public.profiles where auth_user_id=application.auth_user_id and status='active') then
   raise exception 'Application requires an active linked profile' using errcode='23514';
  end if;
  -- Never replace an existing tenant membership or platform-level grant.
  insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
   values(application.auth_user_id,application.organization_id,application.requested_role)
   on conflict(auth_user_id) do nothing;
  if not exists(select 1 from epistable_private.marketplace_access
   where auth_user_id=application.auth_user_id and organization_id=target_org and access_role=application.requested_role) then
   raise exception 'Existing marketplace access conflicts with application' using errcode='23514';
  end if;
 end if;
 update epistable_private.marketplace_applications
  set status=case when review_decision='verified' then 'approved' else 'rejected' end,reviewed_at=now()
  where id=application.id and status='pending';
end $$;
revoke all on function epistable_private.complete_marketplace_application(text,text) from public,anon,authenticated;
grant execute on function epistable_private.complete_marketplace_application(text,text) to authenticated;

create or replace function public.review_marketplace_record(target_kind text,target_id text,decision text,reason text)
returns void language plpgsql security invoker set search_path=''
as $$
declare changed integer;
begin
 if auth.uid() is null or (epistable_private.context()->>'role') is distinct from 'platform_admin' then
  raise exception 'Platform administrator required' using errcode='42501';
 end if;
 if decision is null or decision not in ('verified','rejected') or nullif(trim(reason),'') is null or length(reason)>4000 then
  raise exception 'Choose approve or reject and give a review reason' using errcode='23514';
 end if;
 if target_kind='organization' then
  update public.organizations set verification_status=decision,review_note=trim(reason) where id=target_id
   and verification_status in ('pending','unverified')
   and (decision='rejected' or nullif(trim(country),'') is not null);
  get diagnostics changed=row_count;
  if changed=1 then
   perform epistable_private.complete_marketplace_application(target_id,decision);
  end if;
 elsif target_kind='product' then
  update public.products p set
    verification_status=decision,
    review_note=trim(reason),
    status=case when decision='verified' then 'active' else 'draft' end,
    risk_status=case when decision='verified' then 'clear' else 'blocked' end,
    risk_reason=case when decision='verified' then null else trim(reason) end
   where p.id=target_id and p.verification_status='pending'
   and (decision='rejected' or exists(select 1 from public.organizations o where o.id=p.seller_org_id and o.verification_status='verified'));
  get diagnostics changed=row_count;
 elsif target_kind='document' then
  update public.trade_documents set verification_status=decision,review_note=trim(reason)
   where id=target_id and verification_status='pending'
   and (decision='rejected' or ((storage_path is not null or file_url ~ '^https://') and (expires_at is null or expires_at>extract(epoch from now())*1000)));
  get diagnostics changed=row_count;
 else
  raise exception 'Unknown review target' using errcode='23514';
 end if;
 if changed<>1 then raise exception 'Record changed or is not ready for this review. Refresh and check its details.' using errcode='23514'; end if;
end $$;


revoke all on function public.review_marketplace_record(text,text,text,text) from public,anon;
grant execute on function public.review_marketplace_record(text,text,text,text) to authenticated;
