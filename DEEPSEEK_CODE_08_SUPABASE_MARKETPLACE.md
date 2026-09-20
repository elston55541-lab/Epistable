# Epistable DeepSeek Code Bundle — Part 08: Supabase Marketplace & Finance Readiness
Snapshot: 31d78c0ee3bd70f7a934b44140549048a41e6a01


===== FILE: supabase/migrations/20260913142135_processed_foods_marketplace_core.sql =====
```sql
create table if not exists public.organizations (
  id text primary key,
  type text not null check (type in ('buyer','seller')),
  name text not null,
  country text,
  city text,
  website text,
  description text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create table if not exists public.products (
  id text primary key,
  seller_org_id text not null references public.organizations(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  ingredients text,
  country_of_origin text,
  moq numeric,
  moq_unit text,
  capacity numeric,
  capacity_unit text,
  packaging jsonb not null default '[]'::jsonb,
  shelf_life text,
  storage_requirements text,
  lead_time_days integer,
  export_markets jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  allergens jsonb not null default '[]'::jsonb,
  dietary_attributes jsonb not null default '[]'::jsonb,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  status text not null default 'draft' check (status in ('draft','active','inactive')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create table if not exists public.trade_documents (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  product_id text references public.products(id) on delete cascade,
  document_type text not null,
  title text not null,
  issuer text,
  reference_number text,
  issued_at bigint,
  expires_at bigint,
  file_url text,
  visibility text not null default 'buyers' check (visibility in ('public','buyers','private')),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','expired')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create table if not exists public.rfqs (
  id text primary key,
  buyer_org_id text not null references public.organizations(id),
  seller_org_id text references public.organizations(id),
  product_id text references public.products(id),
  product_category text,
  quantity numeric,
  quantity_unit text,
  destination_country text,
  destination_city text,
  required_by bigint,
  requirements text,
  status text not null default 'open' check (status in ('draft','open','quoted','negotiating','accepted','closed','cancelled')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create table if not exists public.trade_quotes (
  id text primary key,
  rfq_id text not null references public.rfqs(id) on delete cascade,
  seller_org_id text not null references public.organizations(id),
  currency text not null default 'USD',
  unit_price numeric,
  quantity numeric,
  quantity_unit text,
  total_amount numeric,
  incoterm text,
  lead_time_days integer,
  validity_ts bigint,
  notes text,
  status text not null default 'sent' check (status in ('draft','sent','accepted','revision_requested','revised','expired','rejected')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

alter table public.profiles add column if not exists organization_id text references public.organizations(id);
alter table public.profiles add column if not exists organization_role text;

alter table public.organizations enable row level security;
alter table public.products enable row level security;
alter table public.trade_documents enable row level security;
alter table public.rfqs enable row level security;
alter table public.trade_quotes enable row level security;

create index if not exists products_seller_org_idx on public.products(seller_org_id);
create index if not exists products_category_idx on public.products(category);
create index if not exists rfqs_buyer_org_idx on public.rfqs(buyer_org_id);
create index if not exists rfqs_seller_org_idx on public.rfqs(seller_org_id);
create index if not exists trade_quotes_rfq_idx on public.trade_quotes(rfq_id);

```

===== FILE: supabase/migrations/20260913154327_marketplace_access_foundation.sql =====
```sql
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

```

===== FILE: supabase/migrations/20260913161333_marketplace_organisation_management.sql =====
```sql
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

```

===== FILE: supabase/migrations/20260913163014_marketplace_trade_workflows.sql =====
```sql
-- Marketplace-only validation and immutable verification history.
alter table public.organizations add column review_note text;
alter table public.products add column review_note text;
alter table public.trade_documents add column review_note text;

alter table public.products add constraint products_positive_trade_values check (
 (moq is null or (moq>0 and moq<1e12)) and (capacity is null or (capacity>0 and capacity<1e12)) and
 (lead_time_days is null or lead_time_days between 0 and 3650));
alter table public.rfqs add constraint rfqs_valid_quantity check (
 (quantity is null or (quantity>0 and quantity<1e12)) and
 (status='draft' or status='cancelled' or (quantity is not null and nullif(trim(quantity_unit),'') is not null and nullif(trim(destination_country),'') is not null)));
alter table public.trade_quotes add constraint trade_quotes_valid_terms check (
 (quantity is null or (quantity>0 and quantity<1e12)) and
 (unit_price is null or (unit_price>0 and unit_price<1e12)) and
 (total_amount is null or (total_amount>0 and total_amount<1e24)) and
 (lead_time_days is null or lead_time_days between 0 and 3650) and
 (status='draft' or (quantity is not null and unit_price is not null and total_amount is not null and currency is not null and incoterm is not null and total_amount=round(quantity*unit_price,2)
  and currency ~ '^[A-Z]{3}$' and nullif(trim(quantity_unit),'') is not null and validity_ts is not null
  and incoterm in ('EXW','FCA','CPT','CIP','DAP','DPU','DDP','FAS','FOB','CFR','CIF'))));
create unique index trade_quotes_one_per_seller_rfq on public.trade_quotes(rfq_id,seller_org_id) where status<>'draft';

create table public.marketplace_reviews (
 id uuid primary key default gen_random_uuid(),
 organization_id text not null references public.organizations(id),
 target_kind text not null check(target_kind in ('organization','product','document')),
 target_id text not null,
 decision text not null,
 reason text,
 reviewer_id uuid references auth.users(id),
 snapshot jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.marketplace_reviews enable row level security;
revoke all on public.marketplace_reviews from public,anon,authenticated;
grant select on public.marketplace_reviews to authenticated;
create policy marketplace_reviews_read on public.marketplace_reviews for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin' or organization_id=(select epistable_private.context()->>'org'));
create index marketplace_reviews_org_created on public.marketplace_reviews(organization_id,created_at desc);
create index marketplace_reviews_reviewer on public.marketplace_reviews(reviewer_id);

create function epistable_private.validate_trade_submission() returns trigger language plpgsql security invoker set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
begin
 if tg_table_name in ('organizations','products','trade_documents') and ctx->>'role' is distinct from 'platform_admin' then
  new.review_note := null;
 end if;
 if tg_table_name='products' then
  if new.verification_status in ('pending','verified') and
   (nullif(trim(new.name),'') is null or nullif(trim(new.category),'') is null or nullif(trim(new.country_of_origin),'') is null
    or new.moq is null or new.packaging is null or nullif(trim(new.moq_unit),'') is null or jsonb_array_length(new.packaging)=0
    or nullif(trim(new.shelf_life),'') is null or nullif(trim(new.storage_requirements),'') is null) then
   raise exception 'Complete origin, minimum order, packaging, shelf life and storage before submitting a product' using errcode='23514';
  end if;
 elsif tg_table_name='rfqs' then
  if new.status='open' and (tg_op='INSERT' or old.status='draft') then
   if new.required_by is not null and new.required_by<=extract(epoch from now())*1000 then
    raise exception 'Required date must be in the future' using errcode='23514';
   end if;
   if ctx->>'role' in ('buyer_admin','buyer_member') and new.product_id is not null and not exists(
    select 1 from public.products p join public.organizations o on o.id=p.seller_org_id
    where p.id=new.product_id and p.status='active' and p.verification_status='verified' and o.verification_status='verified') then
    raise exception 'Choose an active verified product from a verified seller' using errcode='23514';
   end if;
  end if;
 elsif tg_table_name='trade_quotes' then
  if new.status='sent' and ctx->>'role' in ('seller_admin','seller_member') and not exists(select 1 from public.organizations where id=new.seller_org_id and verification_status='verified') then
   raise exception 'Your organisation must be verified before sending quotes' using errcode='23514';
  end if;
  if new.status='sent' and (tg_op='INSERT' or old.status='draft') and
   (new.validity_ts is null or new.validity_ts<=extract(epoch from now())*1000) then
   raise exception 'Quote validity must be in the future' using errcode='23514';
  end if;
 elsif tg_table_name='trade_documents' then
  if new.file_url is not null and new.file_url !~ '^https://' then
   raise exception 'Evidence source must be an HTTPS URL' using errcode='23514';
  end if;
  if new.expires_at is not null and new.issued_at is not null and new.expires_at<=new.issued_at then
   raise exception 'Expiry must follow issue date' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
revoke all on function epistable_private.validate_trade_submission() from public,anon,authenticated;
create trigger validate_trade_submission before insert or update on public.organizations for each row execute function epistable_private.validate_trade_submission();
create trigger validate_trade_submission before insert or update on public.products for each row execute function epistable_private.validate_trade_submission();
create trigger validate_trade_submission before insert or update on public.trade_documents for each row execute function epistable_private.validate_trade_submission();
create trigger validate_trade_submission before insert or update on public.rfqs for each row execute function epistable_private.validate_trade_submission();
create trigger validate_trade_submission before insert or update on public.trade_quotes for each row execute function epistable_private.validate_trade_submission();

create function epistable_private.record_marketplace_review() returns trigger language plpgsql security definer set search_path=''
as $$
begin
 -- Ordinary writes still pass table RLS. The trigger can only append history.
 if auth.uid() is null then return new; end if;
 if tg_op='INSERT' or new.verification_status is distinct from old.verification_status then
  insert into public.marketplace_reviews(organization_id,target_kind,target_id,decision,reason,reviewer_id,snapshot)
  values(case tg_table_name when 'organizations' then new.id when 'products' then to_jsonb(new)->>'seller_org_id' else to_jsonb(new)->>'organization_id' end,
  case tg_table_name when 'organizations' then 'organization' when 'products' then 'product' else 'document' end,
  new.id,new.verification_status,new.review_note,auth.uid(),to_jsonb(new));
 end if;
 return new;
end $$;
revoke all on function epistable_private.record_marketplace_review() from public,anon,authenticated;
create trigger record_marketplace_review after insert or update on public.organizations for each row execute function epistable_private.record_marketplace_review();
create trigger record_marketplace_review after insert or update on public.products for each row execute function epistable_private.record_marketplace_review();
create trigger record_marketplace_review after insert or update on public.trade_documents for each row execute function epistable_private.record_marketplace_review();

create function public.review_marketplace_record(target_kind text,target_id text,decision text,reason text)
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
 elsif target_kind='product' then
  update public.products p set verification_status=decision,review_note=trim(reason),status=case when decision='verified' then 'active' else 'draft' end
   where p.id=target_id and p.verification_status='pending'
   and (decision='rejected' or exists(select 1 from public.organizations o where o.id=p.seller_org_id and o.verification_status='verified'));
 elsif target_kind='document' then
  update public.trade_documents set verification_status=decision,review_note=trim(reason)
   where id=target_id and verification_status='pending'
   and (decision='rejected' or (file_url ~ '^https://' and (expires_at is null or expires_at>extract(epoch from now())*1000)));
 else raise exception 'Unknown review target' using errcode='23514';
 end if;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Record changed or is not ready for this review. Refresh and check its details.' using errcode='23514'; end if;
end $$;
revoke all on function public.review_marketplace_record(text,text,text,text) from public,anon;
grant execute on function public.review_marketplace_record(text,text,text,text) to authenticated;

```

===== FILE: supabase/migrations/20260919170000_seller_publish_product_images.sql =====
```sql
-- Seller self-publishing, product images, and risk-based review for processed foods.

alter table public.products
  add column if not exists image_urls jsonb not null default '[]'::jsonb,
  add column if not exists cover_image_url text,
  add column if not exists risk_status text not null default 'clear',
  add column if not exists risk_reason text;

alter table public.products drop constraint if exists products_risk_status_check;
alter table public.products add constraint products_risk_status_check
  check (risk_status in ('clear','review_required','blocked'));

alter table public.products drop constraint if exists products_image_urls_array;
alter table public.products add constraint products_image_urls_array
  check (jsonb_typeof(image_urls)='array' and jsonb_array_length(image_urls)<=6);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists product_images_insert on storage.objects;
drop policy if exists product_images_update on storage.objects;
drop policy if exists product_images_delete on storage.objects;
drop policy if exists product_images_select on storage.objects;

create policy product_images_select on storage.objects
for select to authenticated using (bucket_id='product-images');

create policy product_images_insert on storage.objects
for insert to authenticated with check (
  bucket_id='product-images'
  and (select public.marketplace_context()->>'role') in ('seller_admin','seller_member')
  and (storage.foldername(name))[1]=(select public.marketplace_context()->>'org')
);

create policy product_images_update on storage.objects
for update to authenticated using (
  bucket_id='product-images'
  and (select public.marketplace_context()->>'role') in ('seller_admin','seller_member')
  and (storage.foldername(name))[1]=(select public.marketplace_context()->>'org')
) with check (
  bucket_id='product-images'
  and (storage.foldername(name))[1]=(select public.marketplace_context()->>'org')
);

create policy product_images_delete on storage.objects
for delete to authenticated using (
  bucket_id='product-images'
  and (select public.marketplace_context()->>'role') in ('seller_admin','seller_member')
  and (storage.foldername(name))[1]=(select public.marketplace_context()->>'org')
);

create or replace function epistable_private.product_requires_review(
  product_name text,
  product_description text,
  dietary jsonb,
  certifications jsonb
) returns boolean
language sql immutable set search_path=''
as $$
  select lower(
    coalesce(product_name,'') || ' ' ||
    coalesce(product_description,'') || ' ' ||
    coalesce(dietary::text,'') || ' ' ||
    coalesce(certifications::text,'')
  ) ~ '(cure|treat|prevent)[[:space:]]+(cancer|diabetes|disease|infection)|medicinal|therapeutic|miracle[[:space:]]+cure|guaranteed[[:space:]]+weight[[:space:]]+loss|fda[[:space:]]+approved';
$$;
revoke all on function epistable_private.product_requires_review(text,text,jsonb,jsonb) from public,anon,authenticated;

drop policy if exists marketplace_product_read on public.products;
create policy marketplace_product_read on public.products for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or seller_org_id=(select epistable_private.context()->>'org')
 or ((select epistable_private.context()->>'role') like 'buyer_%' and status='active'
 and exists(select 1 from public.organizations o where o.id=seller_org_id and o.type='seller' and o.verification_status='verified'))
);

drop policy if exists marketplace_product_insert on public.products;
create policy marketplace_product_insert on public.products for insert to authenticated with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (
   seller_org_id=(select epistable_private.context()->>'org')
   and (select epistable_private.context()->>'role') like 'seller_%'
   and verification_status in ('unverified','pending')
   and status in ('draft','active')
 )
);

drop policy if exists marketplace_product_update on public.products;
create policy marketplace_product_update on public.products for update to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%')
) with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (
   seller_org_id=(select epistable_private.context()->>'org')
   and (select epistable_private.context()->>'role') like 'seller_%'
   and verification_status in ('unverified','pending')
   and status in ('draft','active','inactive')
 )
);

create or replace function epistable_private.validate_trade_submission() returns trigger
language plpgsql security invoker set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare seller_is_verified boolean;
begin
 if tg_table_name in ('organizations','products','trade_documents') and ctx->>'role' is distinct from 'platform_admin' then
  new.review_note := null;
 end if;

 if tg_table_name='products' then
  if new.verification_status in ('pending','verified') or new.status='active' then
   if nullif(trim(new.name),'') is null or nullif(trim(new.category),'') is null or nullif(trim(new.country_of_origin),'') is null
    or new.moq is null or new.packaging is null or nullif(trim(new.moq_unit),'') is null or jsonb_array_length(new.packaging)=0
    or nullif(trim(new.shelf_life),'') is null or nullif(trim(new.storage_requirements),'') is null then
    raise exception 'Complete origin, minimum order, packaging, shelf life and storage before publishing a product' using errcode='23514';
   end if;
  end if;

  if ctx->>'role' in ('seller_admin','seller_member') and new.status='active' then
   select verification_status='verified' into seller_is_verified from public.organizations where id=new.seller_org_id;
   if coalesce(seller_is_verified,false) is not true then
    raise exception 'Your seller organisation must be verified before publishing products' using errcode='23514';
   end if;
   if jsonb_array_length(coalesce(new.image_urls,'[]'::jsonb))=0 then
    raise exception 'Add at least one product image before publishing' using errcode='23514';
   end if;
   if epistable_private.product_requires_review(new.name,new.description,new.dietary_attributes,new.certifications) then
    raise exception 'This listing contains a health or regulated claim that needs Epistable review before publication' using errcode='23514';
   end if;
   new.verification_status := 'unverified';
   new.risk_status := 'clear';
   new.risk_reason := null;
  elsif new.verification_status='pending' and epistable_private.product_requires_review(new.name,new.description,new.dietary_attributes,new.certifications) then
   new.risk_status := 'review_required';
   new.risk_reason := 'Health or regulated claim requires manual review before publication';
  end if;

 elsif tg_table_name='rfqs' then
  if new.status='open' and (tg_op='INSERT' or old.status='draft') then
   if new.required_by is not null and new.required_by<=extract(epoch from now())*1000 then
    raise exception 'Required date must be in the future' using errcode='23514';
   end if;
   if ctx->>'role' in ('buyer_admin','buyer_member') and new.product_id is not null and not exists(
    select 1 from public.products p join public.organizations o on o.id=p.seller_org_id
    where p.id=new.product_id and p.status='active' and o.verification_status='verified') then
    raise exception 'Choose a published product from a verified seller' using errcode='23514';
   end if;
  end if;
 elsif tg_table_name='trade_quotes' then
  if new.status='sent' and ctx->>'role' in ('seller_admin','seller_member') and not exists(select 1 from public.organizations where id=new.seller_org_id and verification_status='verified') then
   raise exception 'Your organisation must be verified before sending quotes' using errcode='23514';
  end if;
  if new.status='sent' and (tg_op='INSERT' or old.status='draft') and
   (new.validity_ts is null or new.validity_ts<=extract(epoch from now())*1000) then
   raise exception 'Quote validity must be in the future' using errcode='23514';
  end if;
 elsif tg_table_name='trade_documents' then
  if new.file_url is not null and new.file_url !~ '^https://' then
   raise exception 'Evidence source must be an HTTPS URL' using errcode='23514';
  end if;
  if new.expires_at is not null and new.issued_at is not null and new.expires_at<=new.issued_at then
   raise exception 'Expiry must follow issue date' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
revoke all on function epistable_private.validate_trade_submission() from public,anon,authenticated;

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
 elsif target_kind='product' then
  update public.products p set
    verification_status=decision,
    review_note=trim(reason),
    status=case when decision='verified' then 'active' else 'draft' end,
    risk_status=case when decision='verified' then 'clear' else 'blocked' end,
    risk_reason=case when decision='verified' then null else trim(reason) end
   where p.id=target_id and p.verification_status='pending'
   and (decision='rejected' or exists(select 1 from public.organizations o where o.id=p.seller_org_id and o.verification_status='verified'));
 elsif target_kind='document' then
  update public.trade_documents set verification_status=decision,review_note=trim(reason)
   where id=target_id and verification_status='pending'
   and (decision='rejected' or (file_url ~ '^https://' and (expires_at is null or expires_at>extract(epoch from now())*1000)));
 else raise exception 'Unknown review target' using errcode='23514';
 end if;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Record changed or is not ready for this review. Refresh and check its details.' using errcode='23514'; end if;
end $$;
revoke all on function public.review_marketplace_record(text,text,text,text) from public,anon;
grant execute on function public.review_marketplace_record(text,text,text,text) to authenticated;

```

===== FILE: supabase/migrations/20260920153000_marketplace_pilot_readiness.sql =====
```sql
-- Pilot readiness: quote decisions, order lifecycle, private evidence uploads and self-serve marketplace onboarding.

alter table public.trade_quotes
  add column if not exists buyer_message text,
  add column if not exists buyer_decided_at bigint,
  add column if not exists revision_number integer not null default 1,
  add column if not exists updated_at bigint not null default ((extract(epoch from now())*1000)::bigint);

alter table public.trade_documents
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint;

alter table public.trade_documents drop constraint if exists trade_documents_file_size_check;
alter table public.trade_documents add constraint trade_documents_file_size_check
  check (file_size is null or (file_size > 0 and file_size <= 10485760));

create table if not exists public.trade_orders (
  id text primary key,
  rfq_id text not null references public.rfqs(id),
  quote_id text not null unique references public.trade_quotes(id),
  buyer_org_id text not null references public.organizations(id),
  seller_org_id text not null references public.organizations(id),
  product_id text references public.products(id),
  currency text not null,
  total_amount numeric not null,
  quantity numeric not null,
  quantity_unit text not null,
  incoterm text,
  status text not null default 'confirmed'
    check (status in ('confirmed','production','inspection','ready_to_dispatch','dispatched','delivered','completed','cancelled')),
  status_note text,
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint),
  updated_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create index if not exists trade_orders_buyer_idx on public.trade_orders(buyer_org_id,created_at desc);
create index if not exists trade_orders_seller_idx on public.trade_orders(seller_org_id,created_at desc);
alter table public.trade_orders enable row level security;
revoke all on public.trade_orders from public,anon,authenticated;
grant select on public.trade_orders to authenticated;

drop policy if exists marketplace_order_read on public.trade_orders;
create policy marketplace_order_read on public.trade_orders for select to authenticated using (
  (select epistable_private.context()->>'role')='platform_admin'
  or buyer_org_id=(select epistable_private.context()->>'org')
  or seller_org_id=(select epistable_private.context()->>'org')
);

create table if not exists epistable_private.marketplace_applications (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  organization_id text not null unique references public.organizations(id) on delete cascade,
  requested_role text not null check (requested_role in ('seller_admin','buyer_admin')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table epistable_private.marketplace_applications enable row level security;
revoke all on epistable_private.marketplace_applications from public,anon,authenticated;
grant select,insert,update,delete on epistable_private.marketplace_applications to service_role;

-- Private certification/evidence storage.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('trade-evidence','trade-evidence',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists trade_evidence_select on storage.objects;
create policy trade_evidence_select on storage.objects for select to authenticated using (
  bucket_id='trade-evidence' and (
    (select epistable_private.context()->>'role')='platform_admin'
    or ((select epistable_private.context()->>'role') like 'seller_%'
        and (storage.foldername(name))[1]=(select epistable_private.context()->>'org'))
    or ((select epistable_private.context()->>'role') like 'buyer_%' and exists(
      select 1
      from public.trade_documents d
      join public.organizations o on o.id=d.organization_id
      where d.storage_path=storage.objects.name
        and d.verification_status='verified'
        and d.visibility in ('buyers','public')
        and (d.expires_at is null or d.expires_at>extract(epoch from now())*1000)
        and o.verification_status='verified'
    ))
  )
);

drop policy if exists trade_evidence_insert on storage.objects;
create policy trade_evidence_insert on storage.objects for insert to authenticated with check (
  bucket_id='trade-evidence' and (
    (select epistable_private.context()->>'role')='platform_admin'
    or ((select epistable_private.context()->>'role') like 'seller_%'
        and (storage.foldername(name))[1]=(select epistable_private.context()->>'org'))
  )
);

drop policy if exists trade_evidence_update on storage.objects;
create policy trade_evidence_update on storage.objects for update to authenticated using (
  bucket_id='trade-evidence' and (
    (select epistable_private.context()->>'role')='platform_admin'
    or ((select epistable_private.context()->>'role') like 'seller_%'
        and (storage.foldername(name))[1]=(select epistable_private.context()->>'org'))
  )
) with check (
  bucket_id='trade-evidence' and (
    (select epistable_private.context()->>'role')='platform_admin'
    or ((select epistable_private.context()->>'role') like 'seller_%'
        and (storage.foldername(name))[1]=(select epistable_private.context()->>'org'))
  )
);

drop policy if exists trade_evidence_delete on storage.objects;
create policy trade_evidence_delete on storage.objects for delete to authenticated using (
  bucket_id='trade-evidence' and (
    (select epistable_private.context()->>'role')='platform_admin'
    or ((select epistable_private.context()->>'role') like 'seller_%'
        and (storage.foldername(name))[1]=(select epistable_private.context()->>'org'))
  )
);

create or replace function epistable_private.validate_trade_submission()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare seller_is_verified boolean;
begin
 if tg_table_name in ('organizations','products','trade_documents') and ctx->>'role' is distinct from 'platform_admin' then
  new.review_note := null;
 end if;

 if tg_table_name='products' then
  if new.verification_status in ('pending','verified') or new.status='active' then
   if nullif(trim(new.name),'') is null or nullif(trim(new.category),'') is null or nullif(trim(new.country_of_origin),'') is null
    or new.moq is null or new.packaging is null or nullif(trim(new.moq_unit),'') is null or jsonb_array_length(new.packaging)=0
    or nullif(trim(new.shelf_life),'') is null or nullif(trim(new.storage_requirements),'') is null then
    raise exception 'Complete origin, minimum order, packaging, shelf life and storage before publishing a product' using errcode='23514';
   end if;
  end if;

  if ctx->>'role' in ('seller_admin','seller_member') and new.status='active' then
   select verification_status='verified' into seller_is_verified from public.organizations where id=new.seller_org_id;
   if coalesce(seller_is_verified,false) is not true then
    raise exception 'Your seller organisation must be verified before publishing products' using errcode='23514';
   end if;
   if jsonb_array_length(coalesce(new.image_urls,'[]'::jsonb))=0 then
    raise exception 'Add at least one product image before publishing' using errcode='23514';
   end if;
   if epistable_private.product_requires_review(new.name,new.description,new.dietary_attributes,new.certifications) then
    raise exception 'This listing contains a health or regulated claim that needs Epistable review before publication' using errcode='23514';
   end if;
   new.verification_status := 'unverified';
   new.risk_status := 'clear';
   new.risk_reason := null;
  elsif new.verification_status='pending' and epistable_private.product_requires_review(new.name,new.description,new.dietary_attributes,new.certifications) then
   new.risk_status := 'review_required';
   new.risk_reason := 'Health or regulated claim requires manual review before publication';
  end if;

 elsif tg_table_name='rfqs' then
  if new.status='open' and (tg_op='INSERT' or old.status='draft') then
   if new.required_by is not null and new.required_by<=extract(epoch from now())*1000 then
    raise exception 'Required date must be in the future' using errcode='23514';
   end if;
   if ctx->>'role' in ('buyer_admin','buyer_member') and new.product_id is not null and not exists(
    select 1 from public.products p join public.organizations o on o.id=p.seller_org_id
    where p.id=new.product_id and p.status='active' and o.verification_status='verified') then
    raise exception 'Choose a published product from a verified seller' using errcode='23514';
   end if;
  end if;
 elsif tg_table_name='trade_quotes' then
  if new.status='sent' and ctx->>'role' in ('seller_admin','seller_member') and not exists(select 1 from public.organizations where id=new.seller_org_id and verification_status='verified') then
   raise exception 'Your organisation must be verified before sending quotes' using errcode='23514';
  end if;
  if new.status='sent' and (tg_op='INSERT' or old.status='draft') and
   (new.validity_ts is null or new.validity_ts<=extract(epoch from now())*1000) then
   raise exception 'Quote validity must be in the future' using errcode='23514';
  end if;
 elsif tg_table_name='trade_documents' then
  if new.file_url is not null and new.file_url !~ '^https://' then
   raise exception 'Evidence source must be an HTTPS URL' using errcode='23514';
  end if;
  if new.storage_path is not null and split_part(new.storage_path,'/',1)<>new.organization_id then
   raise exception 'Evidence file must be stored under its organisation' using errcode='23514';
  end if;
  if new.expires_at is not null and new.issued_at is not null and new.expires_at<=new.issued_at then
   raise exception 'Expiry must follow issue date' using errcode='23514';
  end if;
 end if;
 return new;
end $$;

-- Buyers can decide sent/revised quotes. Acceptance atomically creates the order.
create or replace function public.decide_trade_quote(target_quote_id text, decision text, message text default null)
returns text language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare q public.trade_quotes%rowtype;
declare r public.rfqs%rowtype;
declare order_id text;
begin
 if auth.uid() is null or ctx->>'role' not like 'buyer_%' then
  raise exception 'Buyer access required' using errcode='42501';
 end if;
 if decision not in ('accepted','revision_requested','rejected') then
  raise exception 'Invalid quote decision' using errcode='23514';
 end if;
 if message is not null and length(message)>4000 then
  raise exception 'Decision message is too long' using errcode='23514';
 end if;

 select * into q from public.trade_quotes where id=target_quote_id for update;
 if q.id is null or q.status not in ('sent','revised') then
  raise exception 'This quote is no longer awaiting a buyer decision' using errcode='23514';
 end if;
 select * into r from public.rfqs where id=q.rfq_id for update;
 if r.buyer_org_id is distinct from ctx->>'org' then
  raise exception 'This quote does not belong to your organisation' using errcode='42501';
 end if;
 if q.validity_ts is not null and q.validity_ts<=extract(epoch from now())*1000 then
  raise exception 'This quote has expired' using errcode='23514';
 end if;

 update public.trade_quotes set
  status=decision,
  buyer_message=nullif(trim(message),''),
  buyer_decided_at=((extract(epoch from now())*1000)::bigint),
  updated_at=((extract(epoch from now())*1000)::bigint)
 where id=q.id;

 if decision='accepted' then
  update public.trade_quotes set status='rejected',updated_at=((extract(epoch from now())*1000)::bigint)
   where rfq_id=q.rfq_id and id<>q.id and status in ('sent','revised','revision_requested');
  update public.rfqs set status='accepted' where id=q.rfq_id;
  order_id := 'ORD_'||gen_random_uuid()::text;
  insert into public.trade_orders(id,rfq_id,quote_id,buyer_org_id,seller_org_id,product_id,currency,total_amount,quantity,quantity_unit,incoterm,status)
  values(order_id,q.rfq_id,q.id,r.buyer_org_id,q.seller_org_id,r.product_id,q.currency,q.total_amount,q.quantity,q.quantity_unit,q.incoterm,'confirmed')
  on conflict(quote_id) do update set updated_at=((extract(epoch from now())*1000)::bigint)
  returning id into order_id;
 elsif decision='revision_requested' then
  if r.seller_org_id is not null then update public.rfqs set status='negotiating' where id=q.rfq_id; end if;
 end if;
 return order_id;
end $$;
revoke all on function public.decide_trade_quote(text,text,text) from public,anon;
grant execute on function public.decide_trade_quote(text,text,text) to authenticated;

create or replace function public.revise_trade_quote(
 target_quote_id text,
 quote_currency text,
 quote_unit_price numeric,
 quote_quantity numeric,
 quote_quantity_unit text,
 quote_incoterm text,
 quote_lead_time_days integer,
 quote_validity_ts bigint,
 quote_notes text default null
)
returns void language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare q public.trade_quotes%rowtype;
declare r public.rfqs%rowtype;
begin
 if auth.uid() is null or ctx->>'role' not like 'seller_%' then
  raise exception 'Seller access required' using errcode='42501';
 end if;
 select * into q from public.trade_quotes where id=target_quote_id for update;
 if q.id is null or q.seller_org_id is distinct from ctx->>'org' or q.status<>'revision_requested' then
  raise exception 'This quote is not awaiting your revision' using errcode='23514';
 end if;
 select * into r from public.rfqs where id=q.rfq_id;
 if r.status in ('accepted','closed','cancelled') then raise exception 'This RFQ is no longer open for revision' using errcode='23514'; end if;
 if not exists(select 1 from public.organizations where id=q.seller_org_id and verification_status='verified') then
  raise exception 'Your organisation must be verified before sending quotes' using errcode='23514';
 end if;
 if quote_unit_price is null or quote_unit_price<=0 or quote_quantity is null or quote_quantity<=0
   or quote_validity_ts is null or quote_validity_ts<=extract(epoch from now())*1000
   or quote_currency !~ '^[A-Z]{3}$'
   or nullif(trim(quote_quantity_unit),'') is null
   or quote_incoterm not in ('EXW','FCA','CPT','CIP','DAP','DPU','DDP','FAS','FOB','CFR','CIF')
   or (quote_lead_time_days is not null and (quote_lead_time_days<0 or quote_lead_time_days>3650)) then
  raise exception 'Complete valid revised commercial terms' using errcode='23514';
 end if;

 update public.trade_quotes set
  currency=quote_currency,
  unit_price=quote_unit_price,
  quantity=quote_quantity,
  quantity_unit=trim(quote_quantity_unit),
  total_amount=round(quote_unit_price*quote_quantity,2),
  incoterm=quote_incoterm,
  lead_time_days=quote_lead_time_days,
  validity_ts=quote_validity_ts,
  notes=nullif(trim(quote_notes),''),
  status='revised',
  revision_number=revision_number+1,
  updated_at=((extract(epoch from now())*1000)::bigint)
 where id=q.id;
 if r.seller_org_id is not null then update public.rfqs set status='negotiating' where id=q.rfq_id; end if;
end $$;
revoke all on function public.revise_trade_quote(text,text,numeric,numeric,text,text,integer,bigint,text) from public,anon;
grant execute on function public.revise_trade_quote(text,text,numeric,numeric,text,text,integer,bigint,text) to authenticated;

create or replace function public.update_trade_order_status(target_order_id text,new_status text,note text default null)
returns void language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare current_order public.trade_orders%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if new_status not in ('confirmed','production','inspection','ready_to_dispatch','dispatched','delivered','completed','cancelled') then
  raise exception 'Invalid order status' using errcode='23514';
 end if;
 if note is not null and length(note)>4000 then raise exception 'Order note is too long' using errcode='23514'; end if;
 select * into current_order from public.trade_orders where id=target_order_id for update;
 if current_order.id is null then raise exception 'Order not found' using errcode='23514'; end if;
 if ctx->>'role'<>'platform_admin' and not (ctx->>'role' like 'seller_%' and current_order.seller_org_id=ctx->>'org') then
  raise exception 'Seller or platform administrator access required' using errcode='42501';
 end if;
 if current_order.status in ('completed','cancelled') and ctx->>'role'<>'platform_admin' then
  raise exception 'Closed orders cannot be changed' using errcode='23514';
 end if;
 update public.trade_orders set status=new_status,status_note=nullif(trim(note),''),updated_at=((extract(epoch from now())*1000)::bigint)
 where id=target_order_id;
end $$;
revoke all on function public.update_trade_order_status(text,text,text) from public,anon;
grant execute on function public.update_trade_order_status(text,text,text) to authenticated;

-- Sellers with an existing quote retain access to their RFQ during negotiation.
drop policy if exists marketplace_rfq_read on public.rfqs;
create policy marketplace_rfq_read on public.rfqs for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or buyer_org_id=(select epistable_private.context()->>'org')
 or ((select epistable_private.context()->>'role') like 'seller_%' and status not in ('draft','cancelled') and (
   seller_org_id=(select epistable_private.context()->>'org')
   or (seller_org_id is null and status='open')
   or exists(select 1 from public.trade_quotes tq where tq.rfq_id=rfqs.id and tq.seller_org_id=(select epistable_private.context()->>'org'))
 ))
);

-- Marketplace signup is created by Supabase Auth metadata; access is granted only after admin verification.
create or replace function epistable_private.handle_marketplace_signup()
returns trigger language plpgsql security definer set search_path=''
as $$
declare meta jsonb := coalesce(new.raw_user_meta_data,'{}'::jsonb);
declare org_type text;
declare org_name text;
declare person_name text;
declare country_name text;
declare org_id text;
declare requested text;
begin
 if coalesce(meta->>'marketplace_onboarding','')<>'true' then return new; end if;
 org_type := meta->>'marketplace_type';
 org_name := trim(coalesce(meta->>'organization_name',''));
 person_name := trim(coalesce(meta->>'name',''));
 country_name := trim(coalesce(meta->>'country',''));
 if org_type not in ('buyer','seller') or org_name='' or person_name='' or country_name='' then
  raise exception 'Complete name, organisation, country and account type';
 end if;
 if length(org_name)>200 or length(person_name)>200 or length(country_name)>120 then
  raise exception 'Marketplace signup details are too long';
 end if;
 org_id := case when org_type='seller' then 'SELORG_' else 'BUYORG_' end||gen_random_uuid()::text;
 requested := case when org_type='seller' then 'seller_admin' else 'buyer_admin' end;

 insert into public.organizations(id,type,name,country,city,website,description,verification_status)
 values(org_id,org_type,org_name,country_name,nullif(trim(meta->>'city'),''),nullif(trim(meta->>'website'),''),nullif(trim(meta->>'description'),''),'pending');

 insert into public.profiles(id,auth_user_id,name,email,role,status,organization_id,organization_role)
 values('MP_'||gen_random_uuid()::text,new.id,person_name,lower(new.email),case when org_type='buyer' then 'buyer' else 'manager' end,'active',org_id,requested);

 insert into epistable_private.marketplace_applications(auth_user_id,organization_id,requested_role)
 values(new.id,org_id,requested);
 return new;
end $$;
revoke all on function epistable_private.handle_marketplace_signup() from public,anon,authenticated;

drop trigger if exists marketplace_signup_after_auth_user on auth.users;
create trigger marketplace_signup_after_auth_user
after insert on auth.users for each row execute function epistable_private.handle_marketplace_signup();

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
    if decision='verified' then
      insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
      select a.auth_user_id,a.organization_id,a.requested_role
      from epistable_private.marketplace_applications a
      where a.organization_id=target_id and a.status='pending'
      on conflict(auth_user_id) do update set organization_id=excluded.organization_id,access_role=excluded.access_role;
      update epistable_private.marketplace_applications set status='approved',reviewed_at=now()
       where organization_id=target_id and status='pending';
    else
      update epistable_private.marketplace_applications set status='rejected',reviewed_at=now()
       where organization_id=target_id and status='pending';
    end if;
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

grant select on public.trade_orders to authenticated;

```

===== FILE: supabase/migrations/20260920154500_marketplace_order_indexes.sql =====
```sql
create index if not exists trade_orders_rfq_idx on public.trade_orders(rfq_id);
create index if not exists trade_orders_product_idx on public.trade_orders(product_id) where product_id is not null;

```

===== FILE: supabase/migrations/20260920162000_fix_trade_quotes_rls_recursion.sql =====
```sql
-- Break the RFQ <-> trade_quotes RLS recursion introduced by the negotiation access rule.
-- The private helper performs the ownership lookup as the function owner, so the RFQ
-- policy no longer queries trade_quotes through its own RLS policy.

create or replace function epistable_private.current_seller_has_quote(target_rfq text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select
    (epistable_private.context()->>'role') like 'seller_%'
    and exists (
      select 1
      from public.trade_quotes tq
      where tq.rfq_id=target_rfq
        and tq.seller_org_id=(epistable_private.context()->>'org')
    )
$$;

revoke all on function epistable_private.current_seller_has_quote(text) from public,anon;
grant execute on function epistable_private.current_seller_has_quote(text) to authenticated;

drop policy if exists marketplace_rfq_read on public.rfqs;
create policy marketplace_rfq_read on public.rfqs for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or buyer_org_id=(select epistable_private.context()->>'org')
 or (
   (select epistable_private.context()->>'role') like 'seller_%'
   and status not in ('draft','cancelled')
   and (
     seller_org_id=(select epistable_private.context()->>'org')
     or (seller_org_id is null and status='open')
     or epistable_private.current_seller_has_quote(id)
   )
 )
);

```

===== FILE: supabase/migrations/20260920183000_finance_readiness_foundation.sql =====
```sql
-- Finance-readiness foundation for future BRICS/emerging-market trade-finance integrations.
-- No marketplace UI changes: current order actions automatically build a transaction history
-- that can later support payment protection, PO/invoice finance and insurance partners.

alter table public.trade_orders
  add column if not exists confirmed_at bigint,
  add column if not exists production_started_at bigint,
  add column if not exists inspection_started_at bigint,
  add column if not exists ready_to_dispatch_at bigint,
  add column if not exists dispatched_at bigint,
  add column if not exists delivered_at bigint,
  add column if not exists completed_at bigint,
  add column if not exists cancelled_at bigint,
  add column if not exists purchase_order_number text,
  add column if not exists purchase_order_issued_at bigint,
  add column if not exists purchase_order_value numeric,
  add column if not exists payment_terms_days integer,
  add column if not exists payment_terms_text text,
  add column if not exists invoice_number text,
  add column if not exists invoice_amount numeric,
  add column if not exists invoice_issued_at bigint,
  add column if not exists invoice_due_at bigint,
  add column if not exists invoice_status text not null default 'not_issued',
  add column if not exists payment_status text not null default 'not_recorded',
  add column if not exists amount_paid numeric not null default 0,
  add column if not exists paid_at bigint,
  add column if not exists finance_metadata jsonb not null default '{}'::jsonb;

update public.trade_orders
set confirmed_at=coalesce(confirmed_at,created_at)
where status<>'cancelled';

alter table public.trade_orders drop constraint if exists trade_orders_purchase_order_value_check;
alter table public.trade_orders add constraint trade_orders_purchase_order_value_check
  check (purchase_order_value is null or purchase_order_value>0);

alter table public.trade_orders drop constraint if exists trade_orders_payment_terms_days_check;
alter table public.trade_orders add constraint trade_orders_payment_terms_days_check
  check (payment_terms_days is null or payment_terms_days between 0 and 3650);

alter table public.trade_orders drop constraint if exists trade_orders_invoice_amount_check;
alter table public.trade_orders add constraint trade_orders_invoice_amount_check
  check (invoice_amount is null or invoice_amount>0);

alter table public.trade_orders drop constraint if exists trade_orders_amount_paid_check;
alter table public.trade_orders add constraint trade_orders_amount_paid_check
  check (amount_paid>=0);

alter table public.trade_orders drop constraint if exists trade_orders_invoice_dates_check;
alter table public.trade_orders add constraint trade_orders_invoice_dates_check
  check (invoice_due_at is null or invoice_issued_at is null or invoice_due_at>=invoice_issued_at);

alter table public.trade_orders drop constraint if exists trade_orders_invoice_status_check;
alter table public.trade_orders add constraint trade_orders_invoice_status_check
  check (invoice_status in ('not_issued','issued','partially_paid','paid','overdue','cancelled','disputed'));

alter table public.trade_orders drop constraint if exists trade_orders_payment_status_check;
alter table public.trade_orders add constraint trade_orders_payment_status_check
  check (payment_status in ('not_recorded','pending','partially_paid','paid','overdue','disputed','refunded'));

create index if not exists trade_orders_po_number_idx
  on public.trade_orders(purchase_order_number)
  where purchase_order_number is not null;

create index if not exists trade_orders_invoice_number_idx
  on public.trade_orders(invoice_number)
  where invoice_number is not null;

create index if not exists trade_orders_invoice_due_idx
  on public.trade_orders(invoice_due_at)
  where invoice_due_at is not null and invoice_status not in ('paid','cancelled');

create table if not exists public.trade_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.trade_orders(id) on delete cascade,
  event_type text not null check (event_type in (
    'order_confirmed','production_started','inspection_started','ready_to_dispatch',
    'dispatched','delivered','completed','cancelled',
    'purchase_order_recorded','invoice_recorded','payment_recorded'
  )),
  actor_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trade_order_events_order_created_idx
  on public.trade_order_events(order_id,created_at desc);

alter table public.trade_order_events enable row level security;
revoke all on public.trade_order_events from public,anon,authenticated;
grant select on public.trade_order_events to authenticated;

drop policy if exists marketplace_order_event_read on public.trade_order_events;
create policy marketplace_order_event_read on public.trade_order_events
for select to authenticated using (
  (select epistable_private.context()->>'role')='platform_admin'
  or exists (
    select 1
    from public.trade_orders o
    where o.id=trade_order_events.order_id
      and (
        o.buyer_org_id=(select epistable_private.context()->>'org')
        or o.seller_org_id=(select epistable_private.context()->>'org')
      )
  )
);

create or replace function public.decide_trade_quote(target_quote_id text, decision text, message text default null)
returns text language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare q public.trade_quotes%rowtype;
declare r public.rfqs%rowtype;
declare new_order_id text;
declare now_ms bigint := ((extract(epoch from now())*1000)::bigint);
begin
 if auth.uid() is null or ctx->>'role' not like 'buyer_%' then
  raise exception 'Buyer access required' using errcode='42501';
 end if;
 if decision not in ('accepted','revision_requested','rejected') then
  raise exception 'Invalid quote decision' using errcode='23514';
 end if;
 if message is not null and length(message)>4000 then
  raise exception 'Decision message is too long' using errcode='23514';
 end if;

 select * into q from public.trade_quotes where id=target_quote_id for update;
 if q.id is null or q.status not in ('sent','revised') then
  raise exception 'This quote is no longer awaiting a buyer decision' using errcode='23514';
 end if;
 select * into r from public.rfqs where id=q.rfq_id for update;
 if r.buyer_org_id is distinct from ctx->>'org' then
  raise exception 'This quote does not belong to your organisation' using errcode='42501';
 end if;
 if q.validity_ts is not null and q.validity_ts<=now_ms then
  raise exception 'This quote has expired' using errcode='23514';
 end if;

 update public.trade_quotes set
  status=decision,
  buyer_message=nullif(trim(message),''),
  buyer_decided_at=now_ms,
  updated_at=now_ms
 where id=q.id;

 if decision='accepted' then
  update public.trade_quotes set status='rejected',updated_at=now_ms
   where rfq_id=q.rfq_id and id<>q.id and status in ('sent','revised','revision_requested');
  update public.rfqs set status='accepted' where id=q.rfq_id;
  new_order_id := 'ORD_'||gen_random_uuid()::text;
  insert into public.trade_orders(
    id,rfq_id,quote_id,buyer_org_id,seller_org_id,product_id,
    currency,total_amount,quantity,quantity_unit,incoterm,status,confirmed_at
  )
  values(
    new_order_id,q.rfq_id,q.id,r.buyer_org_id,q.seller_org_id,r.product_id,
    q.currency,q.total_amount,q.quantity,q.quantity_unit,q.incoterm,'confirmed',now_ms
  )
  on conflict(quote_id) do update set updated_at=now_ms
  returning id into new_order_id;

  if not exists (
    select 1 from public.trade_order_events e
    where e.order_id=new_order_id and e.event_type='order_confirmed'
  ) then
    insert into public.trade_order_events(order_id,event_type,actor_id,metadata)
    values(new_order_id,'order_confirmed',auth.uid(),jsonb_build_object(
      'quote_id',q.id,
      'rfq_id',q.rfq_id,
      'currency',q.currency,
      'order_value',q.total_amount
    ));
  end if;
 elsif decision='revision_requested' then
  if r.seller_org_id is not null then update public.rfqs set status='negotiating' where id=q.rfq_id; end if;
 end if;
 return new_order_id;
end $$;

revoke all on function public.decide_trade_quote(text,text,text) from public,anon;
grant execute on function public.decide_trade_quote(text,text,text) to authenticated;

create or replace function public.update_trade_order_status(target_order_id text,new_status text,note text default null)
returns void language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare current_order public.trade_orders%rowtype;
declare now_ms bigint := ((extract(epoch from now())*1000)::bigint);
declare event_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if new_status not in ('confirmed','production','inspection','ready_to_dispatch','dispatched','delivered','completed','cancelled') then
  raise exception 'Invalid order status' using errcode='23514';
 end if;
 if note is not null and length(note)>4000 then raise exception 'Order note is too long' using errcode='23514'; end if;

 select * into current_order from public.trade_orders where id=target_order_id for update;
 if current_order.id is null then raise exception 'Order not found' using errcode='23514'; end if;
 if ctx->>'role'<>'platform_admin'
   and not (ctx->>'role' like 'seller_%' and current_order.seller_org_id=ctx->>'org') then
  raise exception 'Seller or platform administrator access required' using errcode='42501';
 end if;
 if current_order.status in ('completed','cancelled') and ctx->>'role'<>'platform_admin' then
  raise exception 'Closed orders cannot be changed' using errcode='23514';
 end if;

 update public.trade_orders set
   status=new_status,
   status_note=nullif(trim(note),''),
   updated_at=now_ms,
   confirmed_at=case when new_status='confirmed' then coalesce(confirmed_at,now_ms) else confirmed_at end,
   production_started_at=case when new_status='production' then coalesce(production_started_at,now_ms) else production_started_at end,
   inspection_started_at=case when new_status='inspection' then coalesce(inspection_started_at,now_ms) else inspection_started_at end,
   ready_to_dispatch_at=case when new_status='ready_to_dispatch' then coalesce(ready_to_dispatch_at,now_ms) else ready_to_dispatch_at end,
   dispatched_at=case when new_status='dispatched' then coalesce(dispatched_at,now_ms) else dispatched_at end,
   delivered_at=case when new_status='delivered' then coalesce(delivered_at,now_ms) else delivered_at end,
   completed_at=case when new_status='completed' then coalesce(completed_at,now_ms) else completed_at end,
   cancelled_at=case when new_status='cancelled' then coalesce(cancelled_at,now_ms) else cancelled_at end
 where id=target_order_id;

 if new_status is distinct from current_order.status then
   event_name := case new_status
     when 'confirmed' then 'order_confirmed'
     when 'production' then 'production_started'
     when 'inspection' then 'inspection_started'
     when 'ready_to_dispatch' then 'ready_to_dispatch'
     when 'dispatched' then 'dispatched'
     when 'delivered' then 'delivered'
     when 'completed' then 'completed'
     when 'cancelled' then 'cancelled'
   end;
   insert into public.trade_order_events(order_id,event_type,actor_id,metadata)
   values(target_order_id,event_name,auth.uid(),jsonb_build_object('note',nullif(trim(note),'')));
 end if;
end $$;

revoke all on function public.update_trade_order_status(text,text,text) from public,anon;
grant execute on function public.update_trade_order_status(text,text,text) to authenticated;

-- Controlled backend hooks for future PO/invoice/payment integrations.
create or replace function public.record_trade_order_purchase_order(
  target_order_id text,
  po_number text,
  po_issued_at bigint,
  po_value numeric,
  terms_days integer default null,
  terms_text text default null
)
returns void language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare o public.trade_orders%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into o from public.trade_orders where id=target_order_id for update;
 if o.id is null then raise exception 'Order not found' using errcode='23514'; end if;
 if ctx->>'role'<>'platform_admin'
   and not (ctx->>'role'='buyer_admin' and o.buyer_org_id=ctx->>'org') then
  raise exception 'Buyer administrator or platform administrator access required' using errcode='42501';
 end if;
 if nullif(trim(po_number),'') is null or po_value is null or po_value<=0 then
  raise exception 'Purchase order number and positive value are required' using errcode='23514';
 end if;
 if terms_days is not null and (terms_days<0 or terms_days>3650) then
  raise exception 'Invalid payment terms' using errcode='23514';
 end if;
 update public.trade_orders set
   purchase_order_number=trim(po_number),
   purchase_order_issued_at=po_issued_at,
   purchase_order_value=po_value,
   payment_terms_days=terms_days,
   payment_terms_text=nullif(trim(terms_text),''),
   updated_at=((extract(epoch from now())*1000)::bigint)
 where id=target_order_id;
 insert into public.trade_order_events(order_id,event_type,actor_id,metadata)
 values(target_order_id,'purchase_order_recorded',auth.uid(),jsonb_build_object(
   'purchase_order_number',trim(po_number),
   'purchase_order_value',po_value,
   'payment_terms_days',terms_days
 ));
end $$;

revoke all on function public.record_trade_order_purchase_order(text,text,bigint,numeric,integer,text) from public,anon;
grant execute on function public.record_trade_order_purchase_order(text,text,bigint,numeric,integer,text) to authenticated;

create or replace function public.record_trade_order_invoice(
  target_order_id text,
  target_invoice_number text,
  target_invoice_amount numeric,
  target_invoice_issued_at bigint,
  target_invoice_due_at bigint
)
returns void language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare o public.trade_orders%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into o from public.trade_orders where id=target_order_id for update;
 if o.id is null then raise exception 'Order not found' using errcode='23514'; end if;
 if ctx->>'role'<>'platform_admin'
   and not (ctx->>'role'='seller_admin' and o.seller_org_id=ctx->>'org') then
  raise exception 'Seller administrator or platform administrator access required' using errcode='42501';
 end if;
 if nullif(trim(target_invoice_number),'') is null or target_invoice_amount is null or target_invoice_amount<=0 then
  raise exception 'Invoice number and positive amount are required' using errcode='23514';
 end if;
 if target_invoice_due_at is not null and target_invoice_issued_at is not null and target_invoice_due_at<target_invoice_issued_at then
  raise exception 'Invoice due date must follow issue date' using errcode='23514';
 end if;
 update public.trade_orders set
   invoice_number=trim(target_invoice_number),
   invoice_amount=target_invoice_amount,
   invoice_issued_at=target_invoice_issued_at,
   invoice_due_at=target_invoice_due_at,
   invoice_status='issued',
   payment_status=case when payment_status='not_recorded' then 'pending' else payment_status end,
   updated_at=((extract(epoch from now())*1000)::bigint)
 where id=target_order_id;
 insert into public.trade_order_events(order_id,event_type,actor_id,metadata)
 values(target_order_id,'invoice_recorded',auth.uid(),jsonb_build_object(
   'invoice_number',trim(target_invoice_number),
   'invoice_amount',target_invoice_amount,
   'invoice_due_at',target_invoice_due_at
 ));
end $$;

revoke all on function public.record_trade_order_invoice(text,text,numeric,bigint,bigint) from public,anon;
grant execute on function public.record_trade_order_invoice(text,text,numeric,bigint,bigint) to authenticated;

create or replace function public.record_trade_order_payment(
  target_order_id text,
  target_payment_status text,
  target_amount_paid numeric,
  target_paid_at bigint default null,
  reference_metadata jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare o public.trade_orders%rowtype;
begin
 if auth.uid() is null or ctx->>'role'<>'platform_admin' then
  raise exception 'Platform administrator access required' using errcode='42501';
 end if;
 if target_payment_status not in ('not_recorded','pending','partially_paid','paid','overdue','disputed','refunded') then
  raise exception 'Invalid payment status' using errcode='23514';
 end if;
 if target_amount_paid is null or target_amount_paid<0 then
  raise exception 'Amount paid cannot be negative' using errcode='23514';
 end if;
 select * into o from public.trade_orders where id=target_order_id for update;
 if o.id is null then raise exception 'Order not found' using errcode='23514'; end if;
 update public.trade_orders set
   payment_status=target_payment_status,
   amount_paid=target_amount_paid,
   paid_at=case when target_payment_status='paid' then coalesce(target_paid_at,((extract(epoch from now())*1000)::bigint)) else target_paid_at end,
   invoice_status=case
     when target_payment_status='paid' then 'paid'
     when target_payment_status='partially_paid' then 'partially_paid'
     when target_payment_status='overdue' then 'overdue'
     else invoice_status
   end,
   finance_metadata=coalesce(finance_metadata,'{}'::jsonb)||coalesce(reference_metadata,'{}'::jsonb),
   updated_at=((extract(epoch from now())*1000)::bigint)
 where id=target_order_id;
 insert into public.trade_order_events(order_id,event_type,actor_id,metadata)
 values(target_order_id,'payment_recorded',auth.uid(),jsonb_build_object(
   'payment_status',target_payment_status,
   'amount_paid',target_amount_paid,
   'paid_at',target_paid_at
 )||coalesce(reference_metadata,'{}'::jsonb));
end $$;

revoke all on function public.record_trade_order_payment(text,text,numeric,bigint,jsonb) from public,anon;
grant execute on function public.record_trade_order_payment(text,text,numeric,bigint,jsonb) to authenticated;

```

===== FILE: supabase/tests/marketplace_access.sql =====
```sql
-- Run after the marketplace access migration, as postgres. All fixtures roll back.
begin;

-- Complete trade fixtures; these defaults and all records are rolled back.
alter table public.products alter country_of_origin set default 'India', alter moq set default 1, alter moq_unit set default 'kg', alter packaging set default '["1kg pouch"]'::jsonb, alter shelf_life set default '12 months', alter storage_requirements set default 'Cool and dry';
alter table public.rfqs alter quantity set default 1, alter quantity_unit set default 'kg', alter destination_country set default 'India';
alter table public.trade_quotes alter quantity set default 1, alter quantity_unit set default 'kg', alter unit_price set default 1, alter total_amount set default 1, alter incoterm set default 'FOB', alter validity_ts set default (extract(epoch from now()+interval '30 days')*1000)::bigint;


create temporary table test_actors(label text,id uuid default gen_random_uuid());
insert into test_actors(label) values ('seller_a'),('seller_b'),('buyer_a'),('buyer_b'),('legacy_admin'),('pending'),('suspended'),('platform');
insert into auth.users(id,email) select id,'phase0-'||id||'@example.invalid' from test_actors;
insert into public.profiles(id,auth_user_id,name,email,role,status)
select id::text,id,'Phase 0 test','phase0-'||id||'@example.invalid','admin',
case label when 'pending' then 'pending' when 'suspended' then 'suspended' else 'active' end from test_actors;
insert into public.organizations(id,type,name,verification_status) values
('phase0_sa','seller','Test seller A','verified'),('phase0_sb','seller','Test seller B','unverified'),
('phase0_ba','buyer','Test buyer A','unverified'),('phase0_bb','buyer','Test buyer B','unverified');
insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
select id,case when label in ('seller_a','pending','suspended') then 'phase0_sa' when label='seller_b' then 'phase0_sb' when label='buyer_a' then 'phase0_ba' when label='buyer_b' then 'phase0_bb' end,
case when label='platform' then 'platform_admin' when label like 'buyer%' then 'buyer_admin' else 'seller_admin' end
from test_actors where label<>'legacy_admin';
insert into public.products(id,seller_org_id,name,category,status,verification_status) values
('phase0_pa','phase0_sa','Verified','Spices','active','verified'),
('phase0_draft','phase0_sa','Draft','Spices','draft','unverified'),
('phase0_pb','phase0_sb','Other seller','Spices','active','verified');
insert into public.trade_documents(id,organization_id,product_id,document_type,title,visibility,verification_status,expires_at) values
('phase0_doc','phase0_sa','phase0_pa','coa','Verified','buyers','verified',null),
('phase0_private','phase0_sa','phase0_pa','coa','Private','private','verified',null),
('phase0_expired','phase0_sa','phase0_pa','coa','Expired','buyers','verified',1);
insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values
('phase0_r','phase0_ba','phase0_sa','phase0_pa','open'),
('phase0_r2','phase0_bb','phase0_sb','phase0_pb','open'),
('phase0_rd','phase0_ba','phase0_sa','phase0_pa','draft'),
('phase0_ro','phase0_ba',null,null,'open');
insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values
('phase0_q','phase0_r','phase0_sa','sent'),('phase0_qd','phase0_r','phase0_sa','draft'),
('phase0_qb','phase0_ro','phase0_sb','sent');

create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.denied(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when insufficient_privilege or check_violation then return true; end $$;
grant select on test_actors to authenticated,anon;

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='buyer_a'),true);
set local role authenticated;
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=1), 'buyer sees only verified active products of verified sellers');
select pg_temp.assert_true(((select count(*) from public.trade_documents where id like 'phase0_%')=1), 'private and expired documents hidden');
select pg_temp.assert_true(((select count(*) from public.rfqs where id like 'phase0_%')=3), 'buyer sees own RFQs');
select pg_temp.assert_true(((select count(*) from public.trade_quotes where id like 'phase0_%')=2), 'buyer sees received quotes but no drafts');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.rfqs(id,buyer_org_id,status) values ('phase0_bad','phase0_bb','open')$q$)), 'cannot forge buyer');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.products(id,seller_org_id,name,category) values ('phase0_badp','phase0_sa','Bad','Spices')$q$)), 'buyer cannot create seller product');
insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values ('phase0_created','phase0_ba','phase0_sa','phase0_pa','open');
select pg_temp.assert_true(((select count(*) from public.rfqs where id='phase0_created')=1), 'own RFQ insert works');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=2), 'seller sees own drafts only');
select pg_temp.assert_true(((select count(*) from public.trade_documents where id like 'phase0_%')=3), 'seller sees own private evidence');
select pg_temp.assert_true(((select count(*) from public.rfqs where id='phase0_r2')=0), 'other targeted RFQ hidden');
select pg_temp.assert_true(((select count(*) from public.rfqs where id='phase0_rd')=0), 'buyer draft hidden');
select pg_temp.assert_true(((select count(*) from public.trade_quotes where id='phase0_qb')=0), 'competitor quote hidden on open RFQ');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.products(id,seller_org_id,name,category,verification_status) values ('phase0_fake','phase0_sa','Fake','Spices','verified')$q$)), 'seller cannot self verify');
select pg_temp.assert_true((pg_temp.denied($q$update public.organizations set verification_status='verified' where id='phase0_sa'$q$)), 'seller cannot approve organization');
select pg_temp.assert_true((pg_temp.denied($q$update public.products set seller_org_id='phase0_sb',status='draft',verification_status='pending' where id='phase0_pa'$q$)), 'seller cannot reassign product');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values ('phase0_badq','phase0_r2','phase0_sa','sent')$q$)), 'seller cannot quote another seller targeted RFQ');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values ('phase0_badq','phase0_r','phase0_sa','accepted')$q$)), 'seller cannot forge accepted quote');
insert into public.products(id,seller_org_id,name,category) values ('phase0_newp','phase0_sa','New','Spices');
select pg_temp.assert_true(((select count(*) from public.products where id='phase0_newp')=1), 'own product insert works');
insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values ('phase0_newq','phase0_created','phase0_sa','draft');
update public.trade_quotes set status='sent' where id='phase0_newq';
select pg_temp.assert_true(((select status from public.trade_quotes where id='phase0_newq')='sent'), 'seller can submit draft quote');
update public.trade_quotes set notes='tampered' where id='phase0_newq';
select pg_temp.assert_true(((select notes from public.trade_quotes where id='phase0_newq') is null), 'sent quote immutable for seller');
select pg_temp.assert_true((pg_temp.denied($q$insert into epistable_private.marketplace_access(auth_user_id,access_role) values (auth.uid(),'platform_admin')$q$)), 'membership privilege escalation blocked');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
set local role authenticated;
select pg_temp.assert_true((public.marketplace_context() is null), 'legacy_admin no context');
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=0), 'legacy_admin no product access');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='pending'),true);
set local role authenticated;
select pg_temp.assert_true((public.marketplace_context() is null), 'pending no context');
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=0), 'pending no product access');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='suspended'),true);
set local role authenticated;
select pg_temp.assert_true((public.marketplace_context() is null), 'suspended no context');
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=0), 'suspended no product access');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='buyer_b'),true);
set local role authenticated;
select pg_temp.assert_true(((select count(*) from public.rfqs where id='phase0_r')=0), 'buyer tenant isolation');
select pg_temp.assert_true(((select count(*) from public.trade_quotes where id='phase0_q')=0), 'buyer cannot read other quotes');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
set local role authenticated;
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=4), 'platform admin sees all products');
update public.products set status='active',verification_status='verified' where id='phase0_newp';
select pg_temp.assert_true(((select verification_status from public.products where id='phase0_newp')='verified'), 'platform admin verifies');
reset role;
set local role anon;
select pg_temp.assert_true((pg_temp.denied('select * from public.products')), 'anonymous table access denied');
select pg_temp.assert_true((pg_temp.denied('select public.marketplace_context()')), 'anonymous context denied');
reset role;


reset role;
update public.profiles set organization_id='phase0_sa',organization_role='platform_admin' where auth_user_id=(select id from test_actors where label='legacy_admin');
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
select set_config('request.jwt.claims','{"user_metadata":{"role":"platform_admin","organization_id":"phase0_sa"}}',true);
set local role authenticated;
select pg_temp.assert_true(public.marketplace_context() is null,'profile fields and editable metadata cannot grant marketplace access');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$update public.trade_documents set verification_status='verified' where id='phase0_private'$q$),'seller cannot verify evidence');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_documents(id,organization_id,product_id,document_type,title) values ('phase0_crossdoc','phase0_sa','phase0_pb','coa','Invalid')$q$),'cross organization product document link blocked');
update public.products set name='tampered' where id='phase0_pb';
delete from public.products where id='phase0_newp';
select pg_temp.assert_true((select count(*) from public.products where id='phase0_newp')=1,'seller cannot delete evidence');
reset role;
select pg_temp.assert_true((select name from public.products where id='phase0_pb')='Other seller','cross tenant update affects zero rows');
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select pg_temp.assert_true(public.marketplace_context() is null,'authenticated database role without user identity has no authority');
reset role;

rollback;

```

===== FILE: supabase/tests/marketplace_organisations.sql =====
```sql
-- Run after the marketplace access migration, as postgres. All fixtures roll back.
begin;

-- Complete trade fixtures; these defaults and all records are rolled back.
alter table public.products alter country_of_origin set default 'India', alter moq set default 1, alter moq_unit set default 'kg', alter packaging set default '["1kg pouch"]'::jsonb, alter shelf_life set default '12 months', alter storage_requirements set default 'Cool and dry';
alter table public.rfqs alter quantity set default 1, alter quantity_unit set default 'kg', alter destination_country set default 'India';
alter table public.trade_quotes alter quantity set default 1, alter quantity_unit set default 'kg', alter unit_price set default 1, alter total_amount set default 1, alter incoterm set default 'FOB', alter validity_ts set default (extract(epoch from now()+interval '30 days')*1000)::bigint;


create temporary table test_actors(label text,id uuid default gen_random_uuid());
insert into test_actors(label) values ('seller_a'),('seller_b'),('buyer_a'),('buyer_b'),('legacy_admin'),('pending'),('suspended'),('platform');
insert into auth.users(id,email) select id,'phase0-'||id||'@example.invalid' from test_actors;
insert into public.profiles(id,auth_user_id,name,email,role,status)
select id::text,id,'Phase 0 test','phase0-'||id||'@example.invalid','admin',
case label when 'pending' then 'pending' when 'suspended' then 'suspended' else 'active' end from test_actors;
insert into public.organizations(id,type,name,verification_status) values
('phase0_sa','seller','Test seller A','verified'),('phase0_sb','seller','Test seller B','unverified'),
('phase0_ba','buyer','Test buyer A','unverified'),('phase0_bb','buyer','Test buyer B','unverified');
insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
select id,case when label in ('seller_a','pending','suspended') then 'phase0_sa' when label='seller_b' then 'phase0_sb' when label='buyer_a' then 'phase0_ba' when label='buyer_b' then 'phase0_bb' end,
case when label='platform' then 'platform_admin' when label like 'buyer%' then 'buyer_admin' else 'seller_admin' end
from test_actors where label<>'legacy_admin';
insert into public.products(id,seller_org_id,name,category,status,verification_status) values
('phase0_pa','phase0_sa','Verified','Spices','active','verified'),
('phase0_draft','phase0_sa','Draft','Spices','draft','unverified'),
('phase0_pb','phase0_sb','Other seller','Spices','active','verified');
insert into public.trade_documents(id,organization_id,product_id,document_type,title,visibility,verification_status,expires_at) values
('phase0_doc','phase0_sa','phase0_pa','coa','Verified','buyers','verified',null),
('phase0_private','phase0_sa','phase0_pa','coa','Private','private','verified',null),
('phase0_expired','phase0_sa','phase0_pa','coa','Expired','buyers','verified',1);
insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values
('phase0_r','phase0_ba','phase0_sa','phase0_pa','open'),
('phase0_r2','phase0_bb','phase0_sb','phase0_pb','open'),
('phase0_rd','phase0_ba','phase0_sa','phase0_pa','draft'),
('phase0_ro','phase0_ba',null,null,'open');
insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values
('phase0_q','phase0_r','phase0_sa','sent'),('phase0_qd','phase0_r','phase0_sa','draft'),
('phase0_qb','phase0_ro','phase0_sb','sent');

create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.denied(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when insufficient_privilege or check_violation then return true; end $$;
grant select on test_actors to authenticated,anon;

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied('select public.marketplace_accounts()'),'legacy admin cannot list accounts');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access(auth.uid(),'phase0_sa','seller_admin')$q$),'legacy admin cannot self assign');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied('select public.marketplace_accounts()'),'seller cannot list accounts');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access(auth.uid(),'phase0_sb','seller_admin')$q$),'seller cannot move self');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
set local role authenticated;
select pg_temp.assert_true(jsonb_array_length(public.marketplace_accounts())>=8,'platform can list linked accounts');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access((select id from test_actors where label='legacy_admin'),'phase0_sa','buyer_admin')$q$),'mismatched org role blocked');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access((select id from test_actors where label='legacy_admin'),'phase0_sa','platform_admin')$q$),'cannot grant platform role');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access((select id from test_actors where label='pending'),'phase0_sa','seller_member')$q$),'pending account blocked');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access(auth.uid(),'phase0_sa','seller_admin')$q$),'platform assignment protected');
select public.assign_marketplace_access((select id from test_actors where label='legacy_admin'),'phase0_sa','seller_member');
reset role;
select pg_temp.assert_true((select role from public.profiles where auth_user_id=(select id from test_actors where label='legacy_admin'))='admin','legacy role unchanged');
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
set local role authenticated;
select pg_temp.assert_true(public.marketplace_context()->>'role'='seller_member','assigned member gets context');
select pg_temp.assert_true(pg_temp.denied($q$update public.organizations set name='Tampered',verification_status='pending' where id='phase0_sa'$q$) or (select name from public.organizations where id='phase0_sa')='Test seller A','member cannot edit org');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
set local role authenticated;
select public.assign_marketplace_access((select id from test_actors where label='legacy_admin'),'phase0_ba','buyer_admin');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
set local role authenticated;
select pg_temp.assert_true(public.marketplace_context()->>'org'='phase0_ba','reassignment replaces old org');
select pg_temp.assert_true((select count(*) from public.products where id='phase0_draft')=0,'old seller draft access revoked');
reset role;
set local role anon;
select pg_temp.assert_true(pg_temp.denied('select public.marketplace_accounts()'),'anonymous list denied');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access(null,null,null)$q$),'anonymous assignment denied');
reset role;
rollback;

```

===== FILE: supabase/tests/marketplace_trade_workflows.sql =====
```sql
-- Run after the marketplace access migration, as postgres. All fixtures roll back.
begin;

-- Complete trade fixtures; these defaults and all records are rolled back.
alter table public.products alter country_of_origin set default 'India', alter moq set default 1, alter moq_unit set default 'kg', alter packaging set default '["1kg pouch"]'::jsonb, alter shelf_life set default '12 months', alter storage_requirements set default 'Cool and dry';
alter table public.rfqs alter quantity set default 1, alter quantity_unit set default 'kg', alter destination_country set default 'India';
alter table public.trade_quotes alter quantity set default 1, alter quantity_unit set default 'kg', alter unit_price set default 1, alter total_amount set default 1, alter incoterm set default 'FOB', alter validity_ts set default (extract(epoch from now()+interval '30 days')*1000)::bigint;


create temporary table test_actors(label text,id uuid default gen_random_uuid());
insert into test_actors(label) values ('seller_a'),('seller_b'),('buyer_a'),('buyer_b'),('legacy_admin'),('pending'),('suspended'),('platform');
insert into auth.users(id,email) select id,'phase0-'||id||'@example.invalid' from test_actors;
insert into public.profiles(id,auth_user_id,name,email,role,status)
select id::text,id,'Phase 0 test','phase0-'||id||'@example.invalid','admin',
case label when 'pending' then 'pending' when 'suspended' then 'suspended' else 'active' end from test_actors;
insert into public.organizations(id,type,name,verification_status) values
('phase0_sa','seller','Test seller A','verified'),('phase0_sb','seller','Test seller B','unverified'),
('phase0_ba','buyer','Test buyer A','unverified'),('phase0_bb','buyer','Test buyer B','unverified');
insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
select id,case when label in ('seller_a','pending','suspended') then 'phase0_sa' when label='seller_b' then 'phase0_sb' when label='buyer_a' then 'phase0_ba' when label='buyer_b' then 'phase0_bb' end,
case when label='platform' then 'platform_admin' when label like 'buyer%' then 'buyer_admin' else 'seller_admin' end
from test_actors where label<>'legacy_admin';
insert into public.products(id,seller_org_id,name,category,status,verification_status) values
('phase0_pa','phase0_sa','Verified','Spices','active','verified'),
('phase0_draft','phase0_sa','Draft','Spices','draft','unverified'),
('phase0_pb','phase0_sb','Other seller','Spices','active','verified');
insert into public.trade_documents(id,organization_id,product_id,document_type,title,visibility,verification_status,expires_at) values
('phase0_doc','phase0_sa','phase0_pa','coa','Verified','buyers','verified',null),
('phase0_private','phase0_sa','phase0_pa','coa','Private','private','verified',null),
('phase0_expired','phase0_sa','phase0_pa','coa','Expired','buyers','verified',1);
insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values
('phase0_r','phase0_ba','phase0_sa','phase0_pa','open'),
('phase0_r2','phase0_bb','phase0_sb','phase0_pb','open'),
('phase0_rd','phase0_ba','phase0_sa','phase0_pa','draft'),
('phase0_ro','phase0_ba',null,null,'open');
insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values
('phase0_q','phase0_r','phase0_sa','sent'),('phase0_qd','phase0_r','phase0_sa','draft'),
('phase0_qb','phase0_ro','phase0_sb','sent');

create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.denied(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when insufficient_privilege or check_violation or unique_violation then return true; end $$;
grant select on test_actors to authenticated,anon;


reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$insert into public.products(id,seller_org_id,name,category,moq) values('phase0_negative','phase0_sa','Invalid','Spices',-1)$q$),'negative minimum order blocked');
select pg_temp.assert_true(pg_temp.denied($q$update public.products set country_of_origin=null,verification_status='pending',status='draft' where id='phase0_draft'$q$),'incomplete product submission blocked');
update public.products set verification_status='pending',review_note='I verified myself' where id='phase0_draft';
select pg_temp.assert_true((select review_note from public.products where id='phase0_draft') is null,'member cannot forge review reason');
select pg_temp.assert_true((select count(*) from public.marketplace_reviews where target_id='phase0_draft' and decision='pending')=1,'submission history recorded');
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('product','phase0_draft','verified','Self approval')$q$),'seller review RPC denied');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status,total_amount) values('phase0_badtotal','phase0_ro','phase0_sa','sent',900)$q$),'incorrect quote total blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status,total_amount) values('phase0_nulltotal','phase0_ro','phase0_sa','sent',null)$q$),'missing quote total blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status,validity_ts) values('phase0_oldquote','phase0_ro','phase0_sa','sent',1)$q$),'expired quote submission blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values('phase0_duplicate','phase0_r','phase0_sa','sent')$q$),'duplicate submitted seller quote blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_documents(id,organization_id,document_type,title,file_url) values('phase0_badurl','phase0_sa','coa','Unsafe','javascript:alert(1)')$q$),'unsafe evidence URL blocked');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='buyer_a'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$insert into public.rfqs(id,buyer_org_id,status,quantity) values('phase0_zero','phase0_ba','open',0)$q$),'zero RFQ quantity blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.rfqs(id,buyer_org_id,status,destination_country) values('phase0_missingdest','phase0_ba','open',null)$q$),'missing destination blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values('phase0_hiddenproduct','phase0_ba','phase0_sb','phase0_pb','open')$q$),'buyer cannot target hidden product');
select pg_temp.assert_true((select count(*) from public.marketplace_reviews where target_id='phase0_draft')=0,'buyer cannot read seller review history');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('product','phase0_draft','verified',' ')$q$),'review reason required');
select public.review_marketplace_record('product','phase0_draft','verified','Checked product specification and supporting evidence');
select pg_temp.assert_true((select status='active' and verification_status='verified' from public.products where id='phase0_draft'),'approval publishes product');
select pg_temp.assert_true((select count(*) from public.marketplace_reviews where target_id='phase0_draft' and decision='verified' and reason='Checked product specification and supporting evidence')=1,'approval history persisted');
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('product','phase0_draft','rejected','Stale decision')$q$),'stale review rejected');
select pg_temp.assert_true(pg_temp.denied($q$update public.marketplace_reviews set reason='Tampered' where target_id='phase0_draft'$q$),'review history immutable even for platform client');
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('document','phase0_expired','verified','Expired evidence')$q$),'expired document approval blocked');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
update public.products set name='Edited food',status='draft',verification_status='pending' where id='phase0_draft';
select pg_temp.assert_true((select review_note from public.products where id='phase0_draft') is null,'editing clears old review reason');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='buyer_a'),true);
set local role authenticated;
select pg_temp.assert_true((select count(*) from public.products where id='phase0_draft')=0,'edited product hidden until reviewed again');
reset role;
set local role anon;
select pg_temp.assert_true(pg_temp.denied('select * from public.marketplace_reviews'),'anonymous history denied');
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('product','phase0_draft','verified','Anonymous')$q$),'anonymous review denied');
reset role;
rollback;

```
