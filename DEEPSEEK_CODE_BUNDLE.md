# Epistable — DeepSeek Review Bundle

Source snapshot: `31d78c0ee3bd70f7a934b44140549048a41e6a01`

The repository is private, so this branch contains ten review-friendly Markdown bundles that can be downloaded/copied and uploaded to DeepSeek.

## Bundle parts

1. [DEEPSEEK_CODE_01_CORE.md](./DEEPSEEK_CODE_01_CORE.md) — root config, package metadata, legacy app, marketplace entry point
2. [DEEPSEEK_CODE_02_COMPONENTS_LIB_A.md](./DEEPSEEK_CODE_02_COMPONENTS_LIB_A.md) — components, hooks and core libraries
3. [DEEPSEEK_CODE_03_MARKETPLACE.md](./DEEPSEEK_CODE_03_MARKETPLACE.md) — Buyer/Seller/Admin marketplace implementation
4. [DEEPSEEK_CODE_04_TESTS_SCREENS_STYLES.md](./DEEPSEEK_CODE_04_TESTS_SCREENS_STYLES.md) — marketplace tests, screens and CSS
5. [DEEPSEEK_CODE_05_SUPABASE_FOUNDATION.md](./DEEPSEEK_CODE_05_SUPABASE_FOUNDATION.md) — Supabase config, Edge Functions and early schema/auth migrations
6. [DEEPSEEK_CODE_06_SUPABASE_TRADE_COMPLIANCE.md](./DEEPSEEK_CODE_06_SUPABASE_TRADE_COMPLIANCE.md) — quote, trade and compliance migrations
7. [DEEPSEEK_CODE_07_SUPABASE_TRACEABILITY.md](./DEEPSEEK_CODE_07_SUPABASE_TRACEABILITY.md) — traceability/export-readiness migrations
8. [DEEPSEEK_CODE_08_SUPABASE_MARKETPLACE.md](./DEEPSEEK_CODE_08_SUPABASE_MARKETPLACE.md) — processed-food marketplace, pilot readiness, RLS fix, finance-readiness and SQL tests
9. [DEEPSEEK_CODE_09_DOCS_A.md](./DEEPSEEK_CODE_09_DOCS_A.md) — architecture/product documentation
10. [DEEPSEEK_CODE_10_DOCS_B.md](./DEEPSEEK_CODE_10_DOCS_B.md) — security, QA, marketplace and traceability documentation

## Deliberately omitted from the bundle files

- Binary image assets
- `package-lock.json` (generated dependency lockfile; `package.json` is included)
- Runtime secrets/environment values

The underlying branch still contains the original repository files.

## Suggested DeepSeek prompt

Review all attached Epistable bundle parts as one codebase. Epistable is a verified cross-border processed-food trade platform intended to progress from Discovery -> Verification -> Transaction -> Finance, initially oriented toward emerging-market/BRICS trade corridors.

Please audit it as a senior product engineer/security architect. Focus on:
1. Functional correctness of Buyer, Seller and Admin workflows.
2. Supabase RLS/authentication and privilege-escalation risks.
3. RFQ -> quote -> negotiation -> accepted order lifecycle.
4. Certification/document evidence integrity and private storage access.
5. Marketplace onboarding and organisation verification.
6. Finance-readiness data model: PO, invoice, payment, milestones and event history.
7. Data consistency/race conditions and transactional integrity.
8. Security issues in legacy routes or Edge Functions that could affect the marketplace.
9. Scalability and schema/design weaknesses.
10. Missing tests and production-readiness gaps.

Do not redesign the UI unless a UI issue causes a functional/security problem. Separate findings into Critical, High, Medium and Low. For every issue, cite the exact file/function/policy and propose a concrete fix. Do not assume a vulnerability exists without tracing the relevant authorization and database path.


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


===== FILE: docs/PROCESSED_FOODS_BRICS_ARCHITECTURE.md =====

```markdown
# Epistable — Processed Foods Cross-Border Trade Architecture

## Product position

Epistable is the verified trade infrastructure connecting processed-food manufacturers with international buyers across emerging markets.

BRICS is the initial trade corridor, not the permanent boundary of the platform.

## Core marketplace

### Buyer organisations
Buyer Admin, Procurement Manager, and Team Member accounts operate under a buyer organisation.

Core capabilities:
- Discover processed-food manufacturers and products
- Search/filter by category, origin, certifications, MOQ, capacity and export market
- View verified supplier, product and compliance evidence
- Compare suppliers
- Submit RFQs
- Receive and compare quotes
- Progress accepted quotes toward orders
- Track transactions and supplier relationships

### Seller organisations
Seller Admin, Sales/Export Manager, Compliance/QA Manager, and Team Member accounts operate under a seller organisation.

Core capabilities:
- Company/factory profile
- Product/SKU catalogue
- MOQ, capacity, lead time, packaging, shelf life and markets served
- Certifications, test reports and compliance documentation
- Export-readiness evidence
- Receive/manage RFQs
- Issue quotes
- Track buyer opportunities and orders

### Epistable platform
Platform Owner, Admin, Verification/Compliance and Support roles govern the marketplace.

Core capabilities:
- Approve and verify seller organisations
- Review certifications and compliance evidence
- Manage buyers, sellers, categories and products
- Marketplace governance and disputes
- Monitor RFQs, quotes and transactions
- Trust/readiness scoring
- Marketplace analytics
- Suspend/remove access

## Core transaction flow

Seller organisation -> company/factory profile -> product catalogue -> compliance evidence -> Epistable verification -> buyer discovery -> RFQ -> seller quote -> comparison/negotiation -> accepted quote -> order/transaction -> fulfilment -> trust history.

## Processed-food data model

Product categories should support spices and seasonings, snacks, sauces and condiments, ready-to-eat/ready-to-cook, beverages, bakery/confectionery, frozen/processed produce, ingredients and other packaged processed foods.

Product records should be able to capture:
- Product name and category
- Ingredients/specification
- Country of origin
- MOQ
- Production capacity
- Unit/packaging formats
- Shelf life and storage requirements
- Lead time
- Target/export markets
- Certifications
- Test reports / COA where applicable
- Allergen and dietary attributes where applicable
- Buyer-specific/private documents

## Trust layer

Epistable should differentiate itself from a directory by making trust and transaction readiness first-class platform objects:
- Organisation verification
- Factory verification
- Certification/document verification
- Product evidence completeness
- Export-readiness indicators
- Verification status and expiry dates
- Transaction/reliability history

Do not present an algorithmic trust score as a regulatory certification. Clearly distinguish Epistable verification from official regulatory or certification-body approval.

## Geographic strategy

Phase 1: Indian processed-food sellers -> buyers across BRICS and other relevant international markets.

Phase 2: Sellers and buyers across BRICS markets.

Phase 3: Broader emerging-market cross-border processed-food trade.

Architecture must therefore store country/currency/market attributes generically and must not hard-code the platform to India or a fixed BRICS membership list.

## Finance layer — later phase

Build the marketplace and trade data first. Once transaction data exists, add optional financial infrastructure such as payment protection, trade credit, invoice financing, purchase-order financing, insurance and logistics integrations through appropriately regulated partners. Epistable should not represent itself as a lender unless it becomes appropriately authorised.

### Finance-readiness data captured now

The transaction layer should already build the evidence base that regulated finance partners may later use. Accepted orders therefore preserve:

- Agreed order value, currency, quantity and Incoterm
- Purchase-order reference, issue date, value and payment terms when supplied
- Invoice reference, amount, issue/due dates and invoice status when supplied
- Payment status, amount paid and payment timestamp when verified
- Operational milestone timestamps from confirmation through production, inspection, dispatch, delivery and completion
- An append-only order-event history for transaction provenance and future underwriting/audit integrations

These fields are infrastructure, not a lending decision or credit score. Finance eligibility and underwriting remain the responsibility of appropriately regulated finance partners.

## Product principle

Epistable is not another B2B listing portal. The product should progressively connect four layers:

Discovery -> Verification -> Transaction -> Finance

Every major product decision should reinforce this progression.
```


===== FILE: docs/marketplace-access-foundation.md =====

```markdown
# Marketplace access foundation — Phase 0

Applied to Supabase project gfmrzcfajuwxishfnbur on 2026-09-13.
Production migration: 20260913154327_marketplace_access_foundation.
Schema baseline: 20260913142135_processed_foods_marketplace_core (PR #216).

## Authority and existing auth

Existing Supabase logins, profiles, legacy roles and legacy RLS policies are preserved.
Marketplace authority comes ONLY from epistable_private.marketplace_access, joined to an active profile.
The one existing active owner with a linked Auth user was bootstrapped once.
A later legacy owner/admin invitation does not grant marketplace authority.
Profile organization_id/organization_role and editable JWT metadata are NOT authoritative.

The private access table has RLS enabled and no browser table privileges or policies.
Its RLS-without-policy advisor is intentional default deny, not a broken marketplace table.
Only postgres or the trusted service backend can assign access.
Never expose the service key in the client. Assignment must verify platform-admin authority server-side.
The private context helper is read-only, checks auth.uid(), uses a fixed empty search_path, and has no PUBLIC/anon execution grant.
Keep epistable_private out of PostgREST's exposed schemas.
public.marketplace_context() is SECURITY INVOKER and accepts no identity argument.

## Role matrix

| Role | Organisation | Catalogue/documents | RFQs | Quotes |
| --- | --- | --- | --- | --- |
| platform_admin | Read/create/update all | Review all | Govern all | Govern all |
| seller_admin | Read/edit own, changes require review | Own CRUD excluding delete; no self-verification | Read submitted targeted RFQs and open untargeted RFQs | Create draft/sent against eligible open RFQ; submit own drafts |
| seller_member | Read own | Same catalogue/document authoring | Same seller inbox | Same quote authoring |
| buyer_admin | Read/edit own | Discover active verified products from verified sellers; permitted unexpired verified evidence | Create own drafts/open requests; edit drafts | Read non-draft quotes received by own organisation |
| buyer_member | Read own | Same discovery | Same sourcing | Same received quotes |
| Unassigned/pending/suspended | None | None | None | None |
| Anonymous | No marketplace table or context access | None | None | None |

Delete is denied to every browser role to preserve evidence; use lifecycle status changes.
Platform-admin delete also remains denied.
Organisation creation and access assignment are admin-provisioned in Phase 0.
Organisation membership is one organisation per Auth user today; the private table can be extended to a composite membership key when multi-organisation switching is introduced.

## Data integrity

Member updates cannot change IDs, created_at, owning organisations or quote/RFQ linkage.
Edited verified products must return to draft/inactive and pending/unverified.
Edited documents must return to pending.
Organisation edits require pending/unverified status, hiding its catalogue from discovery until re-reviewed.
Product sellers must be seller organisations.
RFQ buyers must be buyer organisations; targeted products must match the target seller.
Document product links must belong to the document organisation.
Members cannot alter submitted quotes or submitted RFQs. Buyer acceptance, negotiation, revisions and atomic order creation require dedicated transition APIs in later phases.
No marketplace transaction/order table is introduced here.

The evidence visibility values public/buyers do not enable anonymous access in this launch.
Private evidence is visible only to its organisation and platform admins.
Expired evidence is hidden from buyers.
This migration adds no upload bucket; private storage and signed URLs belong to the document workflow phase.

## Frontend integration required in Phase 1

Use marketplace_context() to choose the portal and scope queries.
Do not use the current admin-without-organization fallback as an authorization decision.
The existing UI is still a shell and does not consume the new context yet.
Unassigned users receive no marketplace data even if the old shell displays an Admin or Seller label.
No accounts were automatically linked to invented organisations.

## Verification performed

39 SQL assertions passed before and after deployment with SET LOCAL ROLE authenticated/anon.
Tests use temporary Auth/profile fixtures within a transaction and always ROLLBACK.
Tests cover tenant isolation, discovery eligibility, document privacy/expiry, own RFQ/product/quote creation,
draft-to-sent submission, immutable submitted quotes, self-verification, membership escalation,
editable metadata/profile spoofing, pending/suspended accounts, missing identity, and anon denial.
Run supabase/tests/marketplace_access.sql as postgres against a matching schema with psql ON_ERROR_STOP enabled.

Existing profile-content and legacy-policy fingerprints matched before and after.
Auth user count remained 11, organisation count remained 0; test fixtures were not retained.
npm run build passed (existing Vite CJS deprecation warning).
Frontend bundle unchanged: 824.27 kB, 207.94 kB gzip.
Five public marketplace RLS-without-policy findings are resolved.
Existing legacy SECURITY DEFINER advisories and password-protection finding remain outside this PR.

Authenticated desktop/mobile role checks and public print regression checks are NOT claimed.
No frontend or public route code changed. Draft PRs must not be merged until required release checks pass.

## Existing security follow-up

The legacy admin-invite source accepts owner as a requested role from any active legacy admin and does not enforce factory scope server-side.
This needs a dedicated legacy auth hardening fix; the marketplace allowlist prevents new legacy roles from inheriting marketplace access.
Do not expand legacy profile-policy trust into marketplace authorization.
The old public SECURITY DEFINER endpoints must be reviewed individually; do not revoke them wholesale.

## Operations

Production already contains this migration. Do not reapply its SQL by hand.
Use the recorded production migration version for history alignment.
The complete historical legacy schema cannot currently be rebuilt from migration history alone; this PR records the marketplace portion only.
To disable marketplace client access in an incident, revoke the five marketplace table grants from authenticated.
This fails closed and leaves legacy policies intact. Keep the access records and evidence for investigation.

```


===== FILE: docs/marketplace-trade-workflows.md =====

```markdown
# Processed-food trade workflows

This phase extends the organisation/portal foundation with working seller catalogue and evidence forms, buyer discovery/RFQs, seller quote responses, and Epistable review.

## Behaviour

- Sellers save named drafts or submit complete products with origin, minimum order/unit, packaging, shelf life and storage. Additional fields include ingredients, allergens, certifications claimed, dietary attributes, monthly capacity, lead time and export markets. Editing returns a verified product to draft/review and clears its old review reason.
- Buyers search verified products and suppliers, filter categories, read product details, and create targeted or open RFQs. Requests include quantity/unit, destination, optional required date and requirements. Drafts can be resumed; submitted requests are immutable to ordinary buyer updates under existing RLS.
- Sellers respond to open RFQs with a draft or sent quote, including three-letter currency, price, quantity, Incoterm, validity, lead time and named-place/payment notes. Decimal totals are calculated without binary floating-point rounding. Database constraints verify totals and ensure one non-draft quote per seller/RFQ. The organisation must be verified to send; sent terms remain immutable to the seller.
- Evidence records link to existing HTTPS documents, with issuer, reference, issue/expiry dates, optional product association and marketplace visibility. Sellers can edit/resubmit evidence. This phase does not upload files or secure an external file host; the form states that source-file access belongs to its host. A private Storage upload flow remains a follow-up.
- Admin reviews organisations, submitted products and documents, sees supporting evidence and records an approval/rejection reason. Product approval requires a verified seller and publishes the product. Expired or missing-source documents cannot be approved. Review decisions are appended with actor, time and record snapshot. Browser clients, including platform admins, cannot edit or delete history. History is restricted to platform admins and the owning organisation.

## Database and compatibility

Applied migration: 20260913163014_marketplace_trade_workflows.sql. This adds marketplace validation, review notes, an RLS-protected history table and guarded invoker review RPC. No legacy RLS policies, Auth functions, public slab/quote routes, or legacy components are modified. No real users, organisations, products, requests, quotes or evidence were seeded. Auth count remains 11; test fixtures roll back.

All three SQL suites were rerun against the deployed migration: 39 access assertions, 16 organisation assertions and 24 workflow assertions passed. Fixture defaults are set only inside each test transaction to supply complete terms under the stricter schema. The latest security advisor result remains the previous baseline: one intentionally default-deny private table, 13 legacy definer functions, and the existing password-protection setting. No new advisor findings.

## Validation and release

19 component/domain tests pass, including role navigation at 375/1280px, form payloads, failed writes, precise totals and review reason requirements. Production build passes. Production npm audit reports zero vulnerabilities; legacy build-tool advisories remain outside this feature's scope. The Vite 5 CJS warning and React-plugin deprecation warnings under Vitest's newer Vite remain non-fatal.

The foundation's GitHub Actions test-and-build check passed on commit 971f77295fcc2a3ef806247467ac0acb3e052bb3. Cloudflare preview failed on that commit and its predecessor, while database-only PR previews succeeded. Cloudflare's log page was blocked by its security-verification screen, so the exact cause is not yet known. A Node 24 runtime file and npm CI check now make the required runtime explicit; this did not by itself resolve the Cloudflare failure. See the Cloudflare check's linked deployment log before making another deployment change.

Real authenticated desktop/mobile visual tests, the release preview and legacy print checks remain required before merging. The browser cannot access this local development server, and no authenticated marketplace browser session is available; component tests are not a substitute for those gates.

## Next phase

Transaction acceptance and fulfilment, quote revisions, protected file uploads, destination-specific compliance rules and future financing remain planned. No quote acceptance, payment or finance execution is implied by these screens. Categories are data values and country fields are open; the launch taxonomy can expand without introducing factory/slab assumptions.

```


===== FILE: docs/marketplace-portals.md =====

```markdown
# Portal and organisation foundation

The marketplace now resolves authority from marketplace_context(), never from legacy profile roles or editable metadata. Users without assigned marketplace access see a refresh/sign-out screen and a link to their existing workspace. Existing auth functions are reused without changes.

Admin can create buyer/seller organisations and assign an active linked account as organisation administrator or member. Assignment replaces that account's previous organisation membership. The RPC rejects non-platform callers, pending/suspended targets, role/type mismatch, and any attempt to grant or overwrite platform administrator authority. It sends no emails and changes no passwords or legacy roles.

Organisation administrators can edit their company's profile. Saving sets verification to pending; buyer discovery then hides that seller's products until review. Members can read the company profile. Country remains unconstrained to a particular trade bloc so expansion does not require rewriting the form.

Navigation works through role-scoped hash URLs, with an expandable phone menu, Escape/focus handling, persistent sign-out, and a skip link. Forms have native labels and submit behaviour. Fetch errors are shown with retry rather than fabricated empty metrics. Resource reads remain subject to database RLS.

Applied migration: 20260913161333_marketplace_organisation_management.sql. The organisation SQL suite has 16 assertions and passed before/after deployment, with fixtures rolled back. No additional security advisor findings beyond the prior baseline. The private membership table intentionally has RLS without browser policies.

Validation: component tests cover all three role menus at 375px/1280px, keyboard interaction, unauthorised legacy role, explicit buyer/seller fetch scope, loading failures/retries, failed saves, and Enter login. npm run build passes. Real authenticated visual/mobile and legacy print checks remain release gates; no claim of end-to-end browser validation is made from component mocks.

Remaining workflow phases are in marketplace-build-plan.md. Product/RFQ/quote lists in this phase are read-only. Admin account assignment lists existing linked accounts only; onboarding a new Auth identity continues through the existing invitation process until it receives a dedicated security review.

```
