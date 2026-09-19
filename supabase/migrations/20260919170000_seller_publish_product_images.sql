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
