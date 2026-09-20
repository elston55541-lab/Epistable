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
