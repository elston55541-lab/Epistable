-- Marketplace authority is explicit; legacy profile.role and editable JWT metadata
-- never grant marketplace privileges. Existing auth and legacy policies are untouched.
create schema epistable_private;
revoke all on schema epistable_private from public, anon, authenticated;
grant usage on schema epistable_private to authenticated;
create table epistable_private.marketplace_access (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id text references public.organizations(id),
  access_role text not null check (access_role in ('platform_admin','seller_admin','seller_member','buyer_admin','buyer_member')),
  check ((access_role = 'platform_admin') = (organization_id is null))
);
alter table epistable_private.marketplace_access enable row level security;
revoke all on epistable_private.marketplace_access from public, anon, authenticated;
create index marketplace_access_org_idx on epistable_private.marketplace_access(organization_id);

-- One-time bootstrap; later owner/admin invites do not confer marketplace access.
insert into epistable_private.marketplace_access(auth_user_id,access_role)
select auth_user_id,'platform_admin' from public.profiles
where role='owner' and status='active' and auth_user_id is not null;

-- Narrow read-only helper avoids recursion through legacy profile policies.
create function epistable_private.context()
returns jsonb language sql stable security definer set search_path = ''
as $$
 select jsonb_build_object('org',a.organization_id,'role',a.access_role)
 from epistable_private.marketplace_access a
 join public.profiles p on p.auth_user_id=a.auth_user_id
 left join public.organizations o on o.id=a.organization_id
 where auth.uid() is not null and a.auth_user_id=auth.uid() and p.status='active'
 and (a.access_role='platform_admin'
   or (a.access_role like 'seller_%' and o.type='seller')
   or (a.access_role like 'buyer_%' and o.type='buyer'))
$$;
revoke all on function epistable_private.context() from public, anon, authenticated;
grant execute on function epistable_private.context() to authenticated;

-- Safe session description for Phase 1 clients. Invoker only, no input identity.
create function public.marketplace_context()
returns jsonb language sql stable security invoker set search_path = ''
as $$ select epistable_private.context() $$;
revoke all on function public.marketplace_context() from public, anon;
grant execute on function public.marketplace_context() to authenticated;

-- These five tables previously had no policies. Preserve default deny for anon.
revoke all on public.organizations,public.products,public.trade_documents,public.rfqs,public.trade_quotes from public,anon,authenticated;
grant select,insert,update,delete on public.organizations,public.products,public.trade_documents,public.rfqs,public.trade_quotes to authenticated;

create policy marketplace_org_read on public.organizations for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or id=(select epistable_private.context()->>'org')
 or ((select epistable_private.context()->>'role') like 'buyer_%' and type='seller' and verification_status='verified')
);
create policy marketplace_org_insert on public.organizations for insert to authenticated with check (
 (select epistable_private.context()->>'role')='platform_admin'
);
create policy marketplace_org_update on public.organizations for update to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or (id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') in ('seller_admin','buyer_admin'))
) with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') in ('seller_admin','buyer_admin'))
);

create policy marketplace_product_read on public.products for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or seller_org_id=(select epistable_private.context()->>'org')
 or ((select epistable_private.context()->>'role') like 'buyer_%' and status='active' and verification_status='verified'
 and exists(select 1 from public.organizations o where o.id=seller_org_id and o.type='seller' and o.verification_status='verified'))
);
create policy marketplace_product_insert on public.products for insert to authenticated with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%'
 and verification_status in ('unverified','pending') and status='draft')
);
create policy marketplace_product_update on public.products for update to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%')
) with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%'
 and verification_status in ('unverified','pending') and status in ('draft','inactive'))
);

create policy marketplace_document_read on public.trade_documents for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or organization_id=(select epistable_private.context()->>'org')
 or ((select epistable_private.context()->>'role') like 'buyer_%' and visibility in ('buyers','public')
 and verification_status='verified' and (expires_at is null or expires_at > extract(epoch from now())*1000)
 and exists(select 1 from public.organizations o where o.id=organization_id and o.type='seller' and o.verification_status='verified')
 and (product_id is null or exists(select 1 from public.products p where p.id=product_id)))
);
create policy marketplace_document_insert on public.trade_documents for insert to authenticated with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (organization_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%' and verification_status='pending')
);
create policy marketplace_document_update on public.trade_documents for update to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or (organization_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%')
) with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (organization_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%' and verification_status='pending')
);

create policy marketplace_rfq_read on public.rfqs for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or buyer_org_id=(select epistable_private.context()->>'org')
 or ((select epistable_private.context()->>'role') like 'seller_%' and status not in ('draft','cancelled')
 and (seller_org_id=(select epistable_private.context()->>'org') or (seller_org_id is null and status='open')))
);
create policy marketplace_rfq_insert on public.rfqs for insert to authenticated with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (buyer_org_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'buyer_%' and status in ('draft','open'))
);
-- Submitted RFQs and quote decisions need controlled transition APIs in Phase 5.
create policy marketplace_rfq_update on public.rfqs for update to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or (buyer_org_id=(select epistable_private.context()->>'org') and status='draft')
) with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (buyer_org_id=(select epistable_private.context()->>'org') and status in ('draft','open','cancelled'))
);

create policy marketplace_quote_read on public.trade_quotes for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or seller_org_id=(select epistable_private.context()->>'org')
 or (status<>'draft' and exists(select 1 from public.rfqs r where r.id=rfq_id and r.buyer_org_id=(select epistable_private.context()->>'org')))
);
create policy marketplace_quote_insert on public.trade_quotes for insert to authenticated with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%'
 and status in ('draft','sent') and exists(select 1 from public.rfqs r where r.id=rfq_id and r.status='open'
 and (r.seller_org_id is null or r.seller_org_id=trade_quotes.seller_org_id)))
);
create policy marketplace_quote_update on public.trade_quotes for update to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and status='draft')
) with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and status in ('draft','sent')
 and exists(select 1 from public.rfqs r where r.id=rfq_id and r.status='open' and (r.seller_org_id is null or r.seller_org_id=trade_quotes.seller_org_id)))
);
-- No DELETE policy: preserve trade evidence; status changes provide archival.
-- Row ownership and review metadata must not be reassigned by members.
create function epistable_private.guard_marketplace_update()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 if (epistable_private.context()->>'role') is distinct from 'platform_admin' then
   if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
     raise exception 'Record identity is immutable' using errcode='42501';
   end if;
   if TG_TABLE_NAME='organizations' then
     if new.type is distinct from old.type then raise exception 'Organization type is immutable' using errcode='42501'; end if;
     if new.verification_status not in ('unverified','pending') then
       raise exception 'Profile changes require verification review' using errcode='42501';
     end if;
   elsif TG_TABLE_NAME='products' then
     if new.seller_org_id is distinct from old.seller_org_id then raise exception 'Seller is immutable' using errcode='42501'; end if;
   elsif TG_TABLE_NAME='trade_documents' then
     if new.organization_id is distinct from old.organization_id then raise exception 'Organization is immutable' using errcode='42501'; end if;
   elsif TG_TABLE_NAME='rfqs' then
     if new.buyer_org_id is distinct from old.buyer_org_id then raise exception 'Buyer is immutable' using errcode='42501'; end if;
   elsif TG_TABLE_NAME='trade_quotes' then
     if new.seller_org_id is distinct from old.seller_org_id or new.rfq_id is distinct from old.rfq_id then raise exception 'Quote parties are immutable' using errcode='42501'; end if;
   end if;
 end if;
 return new;
end
$$;
revoke all on function epistable_private.guard_marketplace_update() from public,anon,authenticated;

create trigger marketplace_update_guard before update on public.organizations for each row execute function epistable_private.guard_marketplace_update();

create trigger marketplace_update_guard before update on public.products for each row execute function epistable_private.guard_marketplace_update();

create trigger marketplace_update_guard before update on public.trade_documents for each row execute function epistable_private.guard_marketplace_update();

create trigger marketplace_update_guard before update on public.rfqs for each row execute function epistable_private.guard_marketplace_update();

create trigger marketplace_update_guard before update on public.trade_quotes for each row execute function epistable_private.guard_marketplace_update();

-- Enforce relationships even for platform admins; FK alone only checks existence.
create function epistable_private.validate_marketplace_links()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 if TG_TABLE_NAME='products' then
   if not exists(select 1 from public.organizations where id=new.seller_org_id and type='seller') then raise exception 'Product needs a seller organization' using errcode='23514'; end if;
 elsif TG_TABLE_NAME='trade_documents' then
   if new.product_id is not null and not exists(select 1 from public.products where id=new.product_id and seller_org_id=new.organization_id) then raise exception 'Document product must belong to its organization' using errcode='23514'; end if;
 elsif TG_TABLE_NAME='rfqs' then
   if not exists(select 1 from public.organizations where id=new.buyer_org_id and type='buyer') then raise exception 'RFQ needs a buyer organization' using errcode='23514'; end if;
   if new.seller_org_id is not null and not exists(select 1 from public.organizations where id=new.seller_org_id and type='seller') then raise exception 'RFQ seller must be a seller organization' using errcode='23514'; end if;
   if new.product_id is not null and (new.seller_org_id is null or not exists(select 1 from public.products where id=new.product_id and seller_org_id=new.seller_org_id)) then raise exception 'RFQ product must belong to target seller' using errcode='23514'; end if;
 end if;
 return new;
end
$$;
revoke all on function epistable_private.validate_marketplace_links() from public,anon,authenticated;

create trigger marketplace_link_guard before insert or update on public.products for each row execute function epistable_private.validate_marketplace_links();

create trigger marketplace_link_guard before insert or update on public.trade_documents for each row execute function epistable_private.validate_marketplace_links();

create trigger marketplace_link_guard before insert or update on public.rfqs for each row execute function epistable_private.validate_marketplace_links();

create index if not exists profiles_organization_id_idx on public.profiles(organization_id);
create index if not exists trade_documents_organization_id_idx on public.trade_documents(organization_id);
create index if not exists trade_documents_product_id_idx on public.trade_documents(product_id);
create index if not exists rfqs_product_id_idx on public.rfqs(product_id);
create index if not exists trade_quotes_seller_org_id_idx on public.trade_quotes(seller_org_id);
grant usage on schema epistable_private to service_role;
grant select,insert,update,delete on epistable_private.marketplace_access to service_role;
