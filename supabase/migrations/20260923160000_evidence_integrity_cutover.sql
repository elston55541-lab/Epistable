-- Evidence integrity cutover foundation.
-- This migration is designed for the clean-state cutover: protected evidence uploads
-- are operationally frozen before deployment and production trade_documents is empty.

alter table public.trade_documents
  add column if not exists evidence_sha256 text,
  add column if not exists evidence_version bigint not null default 1,
  add column if not exists supersedes_document_id text,
  add column if not exists delivery_status text not null default 'candidate',
  add column if not exists superseded_at timestamptz;

alter table public.trade_documents
  drop constraint if exists trade_documents_visibility_check;
alter table public.trade_documents
  add constraint trade_documents_visibility_check
  check (visibility in ('buyers','private'));

alter table public.trade_documents
  drop constraint if exists trade_documents_delivery_status_check;
alter table public.trade_documents
  add constraint trade_documents_delivery_status_check
  check (delivery_status in ('candidate','current','superseded','revoked'));

alter table public.trade_documents
  drop constraint if exists trade_documents_external_source_check;
alter table public.trade_documents
  add constraint trade_documents_external_source_check
  check (file_url is null);

alter table public.trade_documents
  drop constraint if exists trade_documents_sha256_check;
alter table public.trade_documents
  add constraint trade_documents_sha256_check
  check (evidence_sha256 is null or evidence_sha256 ~ '^[a-f0-9]{64}$');

alter table public.trade_documents
  drop constraint if exists trade_documents_supersedes_fkey;
alter table public.trade_documents
  add constraint trade_documents_supersedes_fkey
  foreign key (supersedes_document_id) references public.trade_documents(id) on delete restrict;

create unique index if not exists trade_documents_storage_path_unique
  on public.trade_documents(storage_path) where storage_path is not null;
create index if not exists trade_documents_supersedes_idx
  on public.trade_documents(supersedes_document_id);
create index if not exists trade_documents_delivery_idx
  on public.trade_documents(organization_id,delivery_status,verification_status);

alter table public.marketplace_reviews
  add column if not exists document_version bigint,
  add column if not exists evidence_sha256 text,
  add column if not exists review_receipt_id uuid;

create table if not exists epistable_private.evidence_settings (
  singleton boolean primary key default true check (singleton),
  review_receipt_ttl_seconds integer not null default 600
    check (review_receipt_ttl_seconds between 30 and 3600)
);
insert into epistable_private.evidence_settings(singleton)
values(true) on conflict(singleton) do nothing;

create table if not exists epistable_private.document_review_receipts (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references public.trade_documents(id) on delete restrict,
  document_version bigint not null,
  evidence_sha256 text not null,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  session_id text not null,
  purpose text not null default 'document_review' check (purpose='document_review'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  decision text check (decision in ('verified','rejected')),
  reason text,
  result_review_id uuid references public.marketplace_reviews(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table epistable_private.document_review_receipts enable row level security;
revoke all on epistable_private.document_review_receipts from public,anon,authenticated;
grant select,insert,update,delete on epistable_private.document_review_receipts to service_role;
create index if not exists document_review_receipts_lookup
  on epistable_private.document_review_receipts(document_id,reviewer_id,expires_at desc);

create or replace function epistable_private.guard_trade_document_integrity()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if old.storage_path is distinct from new.storage_path
     or old.evidence_sha256 is distinct from new.evidence_sha256
     or old.evidence_version is distinct from new.evidence_version then
    if old.verification_status='verified'
       or old.delivery_status in ('current','superseded','revoked') then
      raise exception 'Approved evidence bytes and version are immutable; create a replacement version'
        using errcode='23514';
    end if;
  end if;

  if new.supersedes_document_id is not null then
    if new.supersedes_document_id=new.id then
      raise exception 'Evidence cannot supersede itself' using errcode='23514';
    end if;
    if not exists(
      select 1 from public.trade_documents prior
      where prior.id=new.supersedes_document_id
        and prior.organization_id=new.organization_id
        and prior.verification_status='verified'
        and prior.delivery_status='current'
    ) then
      raise exception 'Replacement must point to the current approved evidence version'
        using errcode='23514';
    end if;
  end if;

  return new;
end
$$;
revoke all on function epistable_private.guard_trade_document_integrity() from public,anon,authenticated;

drop trigger if exists trade_document_integrity_guard on public.trade_documents;
create trigger trade_document_integrity_guard
before update on public.trade_documents
for each row execute function epistable_private.guard_trade_document_integrity();

-- Protected Storage: browser roles may upload fresh objects, but cannot read, sign,
-- update, copy, move or broadly select protected evidence.
drop policy if exists trade_evidence_select on storage.objects;
drop policy if exists trade_evidence_update on storage.objects;
drop policy if exists trade_evidence_delete on storage.objects;

drop policy if exists trade_evidence_insert on storage.objects;
create policy trade_evidence_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='trade-evidence'
  and (
    (select epistable_private.context()->>'role')='platform_admin'
    or (
      (select epistable_private.context()->>'role') like 'seller_%'
      and (storage.foldername(name))[1]=(select epistable_private.context()->>'org')
    )
  )
);

-- Cleanup is intentionally narrow. Approved/current/superseded/revoked objects
-- are retained and cannot be deleted from the browser.
create policy trade_evidence_delete
on storage.objects for delete to authenticated
using (
  bucket_id='trade-evidence'
  and (
    (select epistable_private.context()->>'role')='platform_admin'
    or (
      (select epistable_private.context()->>'role') like 'seller_%'
      and (storage.foldername(name))[1]=(select epistable_private.context()->>'org')
    )
  )
  and not exists (
    select 1 from public.trade_documents d
    where d.storage_path=storage.objects.name
      and (
        d.verification_status='verified'
        or d.delivery_status in ('current','superseded','revoked')
      )
  )
);

-- Hosted Storage delete_many needs SELECT to identify deleted rows. Scope SELECT
-- to that operation only; it must not authorize download or signed-URL minting.
create policy trade_evidence_delete_select
on storage.objects for select to authenticated
using (
  bucket_id='trade-evidence'
  and storage.allow_only_operation('storage.object.delete_many')
  and (
    (select epistable_private.context()->>'role')='platform_admin'
    or (
      (select epistable_private.context()->>'role') like 'seller_%'
      and (storage.foldername(name))[1]=(select epistable_private.context()->>'org')
    )
  )
  and not exists (
    select 1 from public.trade_documents d
    where d.storage_path=storage.objects.name
      and (
        d.verification_status='verified'
        or d.delivery_status in ('current','superseded','revoked')
      )
  )
);

create or replace function public.prepare_document_review(target_document_id text)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  ctx jsonb := epistable_private.context();
  doc public.trade_documents%rowtype;
  receipt_id uuid;
  session_id text := auth.jwt()->>'session_id';
  ttl_seconds integer;
begin
  if auth.uid() is null or ctx->>'role' is distinct from 'platform_admin' then
    raise exception 'Platform administrator required' using errcode='42501';
  end if;
  if nullif(session_id,'') is null then
    raise exception 'A live authenticated session is required for document review'
      using errcode='42501';
  end if;

  select * into doc from public.trade_documents
  where id=target_document_id and verification_status='pending';

  if doc.id is null
     or doc.storage_path is null
     or doc.evidence_sha256 is null
     or doc.evidence_sha256 !~ '^[a-f0-9]{64}$'
     or (doc.expires_at is not null and doc.expires_at<=extract(epoch from now())*1000) then
    raise exception 'Document is not ready for review. Refresh and check its evidence.'
      using errcode='23514';
  end if;

  select review_receipt_ttl_seconds into ttl_seconds
  from epistable_private.evidence_settings where singleton=true;

  insert into epistable_private.document_review_receipts(
    document_id,document_version,evidence_sha256,reviewer_id,session_id,expires_at
  )
  values(
    doc.id,doc.evidence_version,doc.evidence_sha256,auth.uid(),session_id,
    now()+make_interval(secs=>ttl_seconds)
  )
  returning id into receipt_id;

  return jsonb_build_object(
    'receipt_id',receipt_id,
    'document_id',doc.id,
    'document_version',doc.evidence_version,
    'evidence_sha256',doc.evidence_sha256,
    'expires_at',now()+make_interval(secs=>ttl_seconds)
  );
end
$$;
revoke all on function public.prepare_document_review(text) from public,anon;
grant execute on function public.prepare_document_review(text) to authenticated;

create or replace function epistable_private.record_marketplace_review()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  receipt_text text := nullif(current_setting('epistable.review_receipt_id',true),'');
begin
  if auth.uid() is null then return new; end if;
  if tg_op='INSERT' or new.verification_status is distinct from old.verification_status then
    insert into public.marketplace_reviews(
      organization_id,target_kind,target_id,decision,reason,reviewer_id,snapshot,
      document_version,evidence_sha256,review_receipt_id
    )
    values(
      case tg_table_name
        when 'organizations' then new.id
        when 'products' then to_jsonb(new)->>'seller_org_id'
        else to_jsonb(new)->>'organization_id'
      end,
      case tg_table_name
        when 'organizations' then 'organization'
        when 'products' then 'product'
        else 'document'
      end,
      new.id,new.verification_status,new.review_note,auth.uid(),to_jsonb(new),
      case when tg_table_name='trade_documents' then (to_jsonb(new)->>'evidence_version')::bigint end,
      case when tg_table_name='trade_documents' then to_jsonb(new)->>'evidence_sha256' end,
      case when tg_table_name='trade_documents' and receipt_text is not null then receipt_text::uuid end
    );
  end if;
  return new;
end
$$;
revoke all on function epistable_private.record_marketplace_review() from public,anon,authenticated;

drop function if exists public.review_marketplace_record(text,text,text,text);

create function public.review_marketplace_record(
  target_kind text,
  target_id text,
  decision text,
  reason text,
  review_receipt uuid default null
)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare
  changed integer;
  ctx jsonb := epistable_private.context();
  receipt epistable_private.document_review_receipts%rowtype;
  doc public.trade_documents%rowtype;
  review_id uuid;
  current_session text := auth.jwt()->>'session_id';
begin
  if auth.uid() is null or ctx->>'role' is distinct from 'platform_admin' then
    raise exception 'Platform administrator required' using errcode='42501';
  end if;
  if decision is null or decision not in ('verified','rejected')
     or nullif(trim(reason),'') is null or length(reason)>4000 then
    raise exception 'Choose approve or reject and give a review reason'
      using errcode='23514';
  end if;

  if target_kind='organization' then
    update public.organizations
      set verification_status=decision,review_note=trim(reason)
    where id=target_id
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
    where p.id=target_id
      and p.verification_status='pending'
      and (
        decision='rejected'
        or exists(
          select 1 from public.organizations o
          where o.id=p.seller_org_id and o.verification_status='verified'
        )
      );
    get diagnostics changed=row_count;

  elsif target_kind='document' then
    if review_receipt is null or nullif(current_session,'') is null then
      raise exception 'Preview the evidence and obtain a review receipt before deciding'
        using errcode='23514';
    end if;

    select * into receipt
    from epistable_private.document_review_receipts
    where id=review_receipt
    for update;

    if receipt.id is null
       or receipt.document_id<>target_id
       or receipt.reviewer_id<>auth.uid()
       or receipt.session_id<>current_session then
      raise exception 'Review receipt does not belong to this reviewer, session or document'
        using errcode='42501';
    end if;

    if receipt.consumed_at is not null then
      if receipt.decision=decision and receipt.reason=trim(reason) then
        return;
      end if;
      raise exception 'Review receipt has already been consumed' using errcode='23514';
    end if;

    if receipt.expires_at<=now() then
      raise exception 'Review receipt has expired; preview the evidence again'
        using errcode='23514';
    end if;

    select * into doc from public.trade_documents
    where id=target_id for update;

    if doc.id is null
       or doc.verification_status<>'pending'
       or doc.evidence_version<>receipt.document_version
       or doc.evidence_sha256 is distinct from receipt.evidence_sha256
       or doc.storage_path is null
       or doc.file_url is not null
       or (doc.expires_at is not null and doc.expires_at<=extract(epoch from now())*1000) then
      raise exception 'Record changed or is not ready for this review. Refresh and preview again.'
        using errcode='23514';
    end if;

    perform set_config('epistable.review_receipt_id',review_receipt::text,true);

    update public.trade_documents
      set verification_status=decision,
          review_note=trim(reason),
          delivery_status=case when decision='verified' then 'current' else 'candidate' end
    where id=target_id and verification_status='pending';
    get diagnostics changed=row_count;

    if changed=1 and decision='verified' and doc.supersedes_document_id is not null then
      update public.trade_documents
        set delivery_status='superseded',superseded_at=now()
      where id=doc.supersedes_document_id
        and verification_status='verified'
        and delivery_status='current';
      if not found then
        raise exception 'The evidence version being replaced is no longer current'
          using errcode='23514';
      end if;
    end if;

    if changed=1 then
      select id into review_id
      from public.marketplace_reviews
      where review_receipt_id=review_receipt
      order by created_at desc limit 1;

      update epistable_private.document_review_receipts
      set consumed_at=now(),decision=decision,reason=trim(reason),result_review_id=review_id
      where id=review_receipt and consumed_at is null;
      if not found then
        raise exception 'Review receipt was consumed concurrently' using errcode='23514';
      end if;
      perform set_config('epistable.review_receipt_id','',true);
    end if;

  else
    raise exception 'Unknown review target' using errcode='23514';
  end if;

  if changed<>1 then
    raise exception 'Record changed or is not ready for this review. Refresh and check its details.'
      using errcode='23514';
  end if;
end
$$;
revoke all on function public.review_marketplace_record(text,text,text,text,uuid) from public,anon;
grant execute on function public.review_marketplace_record(text,text,text,text,uuid) to authenticated;

create or replace function public.authorize_evidence_delivery(target_document_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  ctx jsonb := epistable_private.context();
  doc public.trade_documents%rowtype;
  seller_verified boolean;
begin
  if auth.uid() is null or ctx is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  select d.*,
         exists(
           select 1 from public.organizations o
           where o.id=d.organization_id and o.type='seller' and o.verification_status='verified'
         )
  into doc,seller_verified
  from public.trade_documents d
  where d.id=target_document_id;

  if doc.id is null or doc.storage_path is null or doc.file_url is not null then
    raise exception 'Evidence is unavailable' using errcode='42501';
  end if;

  if ctx->>'role'='platform_admin' then
    null;
  elsif ctx->>'role' like 'seller_%' and doc.organization_id=ctx->>'org' then
    null;
  elsif ctx->>'role' like 'buyer_%' then
    if doc.verification_status<>'verified'
       or doc.delivery_status<>'current'
       or doc.visibility<>'buyers'
       or (doc.expires_at is not null and doc.expires_at<=extract(epoch from now())*1000)
       or seller_verified is not true then
      raise exception 'Evidence is unavailable' using errcode='42501';
    end if;
  else
    raise exception 'Evidence is unavailable' using errcode='42501';
  end if;

  return jsonb_build_object(
    'document_id',doc.id,
    'storage_path',doc.storage_path,
    'file_name',coalesce(doc.file_name,'evidence'),
    'mime_type',coalesce(doc.mime_type,'application/octet-stream'),
    'file_size',doc.file_size,
    'evidence_sha256',doc.evidence_sha256,
    'evidence_version',doc.evidence_version
  );
end
$$;
revoke all on function public.authorize_evidence_delivery(text) from public,anon;
grant execute on function public.authorize_evidence_delivery(text) to authenticated;

-- Buyers may see only current approved protected evidence. Sellers/admins retain row
-- visibility for workflow/history, but bytes are delivered only through the proxy.
drop policy if exists marketplace_document_read on public.trade_documents;
create policy marketplace_document_read
on public.trade_documents for select to authenticated
using (
  (select epistable_private.context()->>'role')='platform_admin'
  or organization_id=(select epistable_private.context()->>'org')
  or (
    (select epistable_private.context()->>'role') like 'buyer_%'
    and visibility='buyers'
    and verification_status='verified'
    and delivery_status='current'
    and (expires_at is null or expires_at > extract(epoch from now())*1000)
    and exists(
      select 1 from public.organizations o
      where o.id=organization_id and o.type='seller' and o.verification_status='verified'
    )
    and (product_id is null or exists(select 1 from public.products p where p.id=product_id))
  )
);
