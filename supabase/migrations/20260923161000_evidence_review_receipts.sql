-- Evidence integrity phase 2: version-bound, reviewer/session-bound review receipts.
-- Proposed only. This migration is reviewed and tested before any production deployment.

create table if not exists epistable_private.evidence_integrity_config (
  singleton boolean primary key default true check (singleton),
  review_receipt_ttl_seconds integer not null default 300
    check (review_receipt_ttl_seconds between 60 and 3600)
);
insert into epistable_private.evidence_integrity_config(singleton)
values(true) on conflict(singleton) do nothing;
alter table epistable_private.evidence_integrity_config enable row level security;
revoke all on epistable_private.evidence_integrity_config from public,anon,authenticated;
grant select,update on epistable_private.evidence_integrity_config to service_role;

create table if not exists epistable_private.marketplace_review_receipts (
  id uuid primary key default gen_random_uuid(),
  target_document_id text not null,
  reviewer_id uuid not null references auth.users(id),
  session_id text not null,
  purpose text not null check (purpose='document_review'),
  workflow_revision text not null,
  evidence_version integer not null check (evidence_version>0),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_decision text check (consumed_decision is null or consumed_decision in ('verified','rejected')),
  consumed_reason text,
  check (
    (consumed_at is null and consumed_decision is null and consumed_reason is null)
    or
    (consumed_at is not null and consumed_decision is not null and nullif(trim(consumed_reason),'') is not null)
  )
);
alter table epistable_private.marketplace_review_receipts enable row level security;
revoke all on epistable_private.marketplace_review_receipts from public,anon,authenticated;
grant select,insert,update on epistable_private.marketplace_review_receipts to service_role;
create index if not exists marketplace_review_receipts_target
  on epistable_private.marketplace_review_receipts(target_document_id,issued_at desc);
create index if not exists marketplace_review_receipts_reviewer
  on epistable_private.marketplace_review_receipts(reviewer_id,issued_at desc);

alter table public.trade_documents
  add column if not exists review_receipt_id uuid,
  add column if not exists reviewed_evidence_version integer,
  add column if not exists reviewed_content_sha256 text,
  add column if not exists review_workflow_revision text;

alter table public.trade_documents
  drop constraint if exists trade_documents_review_binding_check;
alter table public.trade_documents
  add constraint trade_documents_review_binding_check check (
    verification_status='pending'
    or (
      review_receipt_id is not null
      and reviewed_evidence_version is not null
      and reviewed_content_sha256 is not null
      and review_workflow_revision is not null
    )
  );

alter table public.marketplace_reviews
  add column if not exists receipt_id uuid,
  add column if not exists evidence_version integer,
  add column if not exists content_sha256 text,
  add column if not exists workflow_revision text;

alter table public.marketplace_reviews
  drop constraint if exists marketplace_reviews_document_binding_check;
alter table public.marketplace_reviews
  add constraint marketplace_reviews_document_binding_check check (
    target_kind<>'document'
    or decision='pending'
    or (
      receipt_id is not null
      and evidence_version is not null
      and content_sha256 is not null
      and workflow_revision is not null
    )
  );
create unique index if not exists marketplace_reviews_receipt_once
  on public.marketplace_reviews(receipt_id) where receipt_id is not null;

-- Keep marketplace_reviews as the one decision history. The trigger copies the
-- receipt/version/digest binding from the document mutation that it records.
create or replace function epistable_private.record_marketplace_review()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null then return new; end if;
 if tg_op='INSERT' or new.verification_status is distinct from old.verification_status then
  insert into public.marketplace_reviews(
    organization_id,target_kind,target_id,decision,reason,reviewer_id,snapshot,
    receipt_id,evidence_version,content_sha256,workflow_revision
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
    case when tg_table_name='trade_documents' then (to_jsonb(new)->>'review_receipt_id')::uuid else null end,
    case when tg_table_name='trade_documents' then (to_jsonb(new)->>'reviewed_evidence_version')::integer else null end,
    case when tg_table_name='trade_documents' then to_jsonb(new)->>'reviewed_content_sha256' else null end,
    case when tg_table_name='trade_documents' then to_jsonb(new)->>'review_workflow_revision' else null end
  );
 end if;
 return new;
end $$;
revoke all on function epistable_private.record_marketplace_review() from public,anon,authenticated;

-- Preparing a document review receipt is intentionally SECURITY DEFINER because the
-- trusted byte binding lives in epistable_private. Authority is checked before access.
create or replace function public.prepare_marketplace_document_review(target_id text)
returns table(
  receipt_id uuid,
  document_id text,
  evidence_version integer,
  content_sha256 text,
  expires_at timestamptz,
  workflow_revision text
)
language plpgsql security definer set search_path=''
as $$
declare
  ctx jsonb := epistable_private.context();
  sid text := auth.jwt()->>'session_id';
  doc public.trade_documents%rowtype;
  binding epistable_private.evidence_byte_bindings%rowtype;
  ttl_seconds integer;
  rid uuid;
  expiry timestamptz;
begin
  if auth.uid() is null or ctx->>'role' is distinct from 'platform_admin' then
    raise exception 'Platform administrator required' using errcode='42501';
  end if;
  if nullif(sid,'') is null then
    raise exception 'An authenticated review session is required' using errcode='42501';
  end if;

  select * into doc
  from public.trade_documents d
  where d.id=target_id
  for update;

  if doc.id is null or doc.verification_status<>'pending' or doc.storage_path is null then
    raise exception 'Document is not ready for review' using errcode='23514';
  end if;
  if doc.file_url is not null then
    raise exception 'External evidence is not supported by the protected evidence review contract' using errcode='23514';
  end if;

  select * into binding
  from epistable_private.evidence_byte_bindings b
  where b.id=doc.evidence_binding_id
    and b.organization_id=doc.organization_id
    and b.storage_path=doc.storage_path
    and b.content_sha256=doc.content_sha256;

  if binding.id is null then
    raise exception 'Evidence bytes are not server-bound to this document version' using errcode='23514';
  end if;
  if doc.expires_at is not null and doc.expires_at<=extract(epoch from now())*1000 then
    raise exception 'Document has expired' using errcode='23514';
  end if;

  select review_receipt_ttl_seconds into ttl_seconds
  from epistable_private.evidence_integrity_config
  where singleton=true;
  expiry := now() + make_interval(secs=>ttl_seconds);

  insert into epistable_private.marketplace_review_receipts(
    target_document_id,reviewer_id,session_id,purpose,workflow_revision,
    evidence_version,content_sha256,storage_path,expires_at
  )
  values(
    doc.id,auth.uid(),sid,'document_review','evidence-review-v1',
    doc.evidence_version,doc.content_sha256,doc.storage_path,expiry
  )
  returning id into rid;

  return query
  select rid,doc.id,doc.evidence_version,doc.content_sha256,expiry,'evidence-review-v1'::text;
end $$;
revoke all on function public.prepare_marketplace_document_review(text) from public,anon;
grant execute on function public.prepare_marketplace_document_review(text) to authenticated;

-- The existing four-argument RPC remains the organization/product path. Documents
-- fail closed and require the receipt-bearing overload below.
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
   and (decision='rejected' or exists(
     select 1 from public.organizations o
     where o.id=p.seller_org_id and o.verification_status='verified'
   ));
  get diagnostics changed=row_count;
 elsif target_kind='document' then
  raise exception 'Document review requires a version-bound review receipt' using errcode='23514';
 else
  raise exception 'Unknown review target' using errcode='23514';
 end if;

 if changed<>1 then
  raise exception 'Record changed or is not ready for this review. Refresh and check its details.' using errcode='23514';
 end if;
end $$;
revoke all on function public.review_marketplace_record(text,text,text,text) from public,anon;
grant execute on function public.review_marketplace_record(text,text,text,text) to authenticated;

create or replace function public.review_marketplace_record(
  target_kind text,
  target_id text,
  decision text,
  reason text,
  review_receipt uuid
)
returns void language plpgsql security definer set search_path=''
as $$
declare
  ctx jsonb := epistable_private.context();
  sid text := auth.jwt()->>'session_id';
  r epistable_private.marketplace_review_receipts%rowtype;
  doc public.trade_documents%rowtype;
  binding epistable_private.evidence_byte_bindings%rowtype;
  changed integer;
begin
  if auth.uid() is null or ctx->>'role' is distinct from 'platform_admin' then
    raise exception 'Platform administrator required' using errcode='42501';
  end if;
  if target_kind<>'document' then
    raise exception 'Receipt-bearing review is only valid for documents' using errcode='23514';
  end if;
  if decision is null or decision not in ('verified','rejected') or nullif(trim(reason),'') is null or length(reason)>4000 then
    raise exception 'Choose approve or reject and give a review reason' using errcode='23514';
  end if;
  if review_receipt is null or nullif(sid,'') is null then
    raise exception 'A current review receipt and authenticated session are required' using errcode='42501';
  end if;

  select * into r
  from epistable_private.marketplace_review_receipts
  where id=review_receipt
  for update;

  if r.id is null
     or r.target_document_id is distinct from target_id
     or r.reviewer_id is distinct from auth.uid()
     or r.session_id is distinct from sid
     or r.purpose is distinct from 'document_review'
     or r.workflow_revision is distinct from 'evidence-review-v1' then
    raise exception 'Review receipt is not valid for this reviewer, session, purpose or document' using errcode='42501';
  end if;

  if r.consumed_at is not null then
    if r.consumed_decision=decision
       and r.consumed_reason=trim(reason)
       and exists(
         select 1 from public.marketplace_reviews mr
         where mr.receipt_id=r.id
           and mr.target_kind='document'
           and mr.target_id=target_id
           and mr.decision=decision
       ) then
      return;
    end if;
    raise exception 'Review receipt has already been consumed by a different operation' using errcode='23514';
  end if;

  if r.expires_at<=now() then
    raise exception 'Review receipt has expired' using errcode='23514';
  end if;

  select * into doc
  from public.trade_documents d
  where d.id=target_id
  for update;

  if doc.id is null
     or doc.verification_status<>'pending'
     or doc.evidence_version is distinct from r.evidence_version
     or doc.content_sha256 is distinct from r.content_sha256
     or doc.storage_path is distinct from r.storage_path then
    raise exception 'Document version changed after review preview' using errcode='23514';
  end if;

  select * into binding
  from epistable_private.evidence_byte_bindings b
  where b.id=doc.evidence_binding_id
    and b.organization_id=doc.organization_id
    and b.storage_path=doc.storage_path
    and b.content_sha256=doc.content_sha256;

  if binding.id is null then
    raise exception 'Evidence byte binding is no longer valid' using errcode='23514';
  end if;
  if decision='verified' and doc.expires_at is not null
     and doc.expires_at<=extract(epoch from now())*1000 then
    raise exception 'Expired evidence cannot be approved' using errcode='23514';
  end if;

  update public.trade_documents
  set verification_status=decision,
      review_note=trim(reason),
      review_receipt_id=r.id,
      reviewed_evidence_version=r.evidence_version,
      reviewed_content_sha256=r.content_sha256,
      review_workflow_revision=r.workflow_revision
  where id=target_id
    and verification_status='pending'
    and evidence_version=r.evidence_version
    and content_sha256=r.content_sha256
    and storage_path=r.storage_path;
  get diagnostics changed=row_count;

  if changed<>1 then
    raise exception 'Document changed or is not ready for this review. Refresh and preview it again.' using errcode='23514';
  end if;

  update epistable_private.marketplace_review_receipts
  set consumed_at=now(),consumed_decision=decision,consumed_reason=trim(reason)
  where id=r.id and consumed_at is null;

  -- record_marketplace_review fires from the document update in this same transaction.
  -- Any history failure rolls back both the decision and receipt consumption.
end $$;
revoke all on function public.review_marketplace_record(text,text,text,text,uuid) from public,anon;
grant execute on function public.review_marketplace_record(text,text,text,text,uuid) to authenticated;

comment on table epistable_private.marketplace_review_receipts is
  'Short-lived, single-use, purpose/reviewer/session/version/digest-bound document review capability.';
comment on function public.prepare_marketplace_document_review(text) is
  'Issues a short-lived review receipt only for a pending document with a matching server-established byte binding.';
