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
