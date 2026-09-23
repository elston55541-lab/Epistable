-- Evidence integrity phase 2: version-bound, reviewer/session-bound review receipts.
-- Proposed only. Review and test before production deployment.

create table if not exists epistable_private.evidence_integrity_config (
  singleton boolean primary key default true check (singleton),
  review_receipt_ttl_seconds integer not null default 300
    check (review_receipt_ttl_seconds between 60 and 3600),
  workflow_revision text not null default 'evidence-review-v1'
    check (length(workflow_revision) between 1 and 100)
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
  session_id uuid not null,
  purpose text not null check (purpose='document_review'),
  workflow_revision text not null,
  evidence_binding_id uuid not null references epistable_private.evidence_byte_bindings(id),
  evidence_version integer not null check (evidence_version>0),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_decision text check (consumed_decision is null or consumed_decision in ('verified','rejected')),
  consumed_reason text,
  check (expires_at>issued_at),
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
  add column if not exists review_receipt_id uuid references epistable_private.marketplace_review_receipts(id),
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
  add column if not exists receipt_id uuid references epistable_private.marketplace_review_receipts(id),
  add column if not exists evidence_binding_id uuid references epistable_private.evidence_byte_bindings(id),
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
      and evidence_binding_id is not null
      and evidence_version is not null
      and content_sha256 is not null
      and workflow_revision is not null
    )
  );
create unique index if not exists marketplace_reviews_receipt_once
  on public.marketplace_reviews(receipt_id) where receipt_id is not null;

-- Keep marketplace_reviews as the one decision history. The trigger copies the
-- receipt/version/binding tuple from the document mutation it records.
create or replace function epistable_private.record_marketplace_review()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null then return new; end if;
 if tg_op='INSERT' or new.verification_status is distinct from old.verification_status then
  insert into public.marketplace_reviews(
    organization_id,target_kind,target_id,decision,reason,reviewer_id,snapshot,
    receipt_id,evidence_binding_id,evidence_version,content_sha256,workflow_revision
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
    case when tg_table_name='trade_documents' then (to_jsonb(new)->>'evidence_binding_id')::uuid else null end,
    case when tg_table_name='trade_documents' then (to_jsonb(new)->>'reviewed_evidence_version')::integer else null end,
    case when tg_table_name='trade_documents' then to_jsonb(new)->>'reviewed_content_sha256' else null end,
    case when tg_table_name='trade_documents' then to_jsonb(new)->>'review_workflow_revision' else null end
  );
 end if;
 return new;
end $$;
revoke all on function epistable_private.record_marketplace_review() from public,anon,authenticated;

-- Privileged receipt access stays in the non-exposed private schema. The helper is
-- callable by authenticated users only through checks that independently establish
-- platform-admin authority and a live Supabase Auth session.
create or replace function epistable_private.prepare_marketplace_document_review_internal(target_id text)
returns table(
  receipt_id uuid,
  document_id text,
  evidence_binding_id uuid,
  evidence_version integer,
  content_sha256 text,
  expires_at timestamptz,
  workflow_revision text
)
language plpgsql security definer set search_path=''
as $$
declare
  ctx jsonb := epistable_private.context();
  uid uuid := auth.uid();
  sid_text text := auth.jwt()->>'session_id';
  sid uuid;
  doc public.trade_documents%rowtype;
  binding epistable_private.evidence_byte_bindings%rowtype;
  ttl_seconds integer;
  current_revision text;
  rid uuid;
  expiry timestamptz;
begin
  if uid is null or ctx->>'role' is distinct from 'platform_admin' then
    raise exception 'Platform administrator required'
      using errcode='42501', detail='EVIDENCE_REVIEW_PLATFORM_ADMIN_REQUIRED';
  end if;
  begin
    sid := nullif(sid_text,'')::uuid;
  exception when invalid_text_representation then
    sid := null;
  end;
  if sid is null or not exists(
    select 1 from auth.sessions s where s.id=sid and s.user_id=uid
  ) then
    raise exception 'A current authenticated review session is required'
      using errcode='42501', detail='EVIDENCE_REVIEW_SESSION_INACTIVE';
  end if;

  select * into doc
  from public.trade_documents d
  where d.id=target_id;

  if doc.id is null then
    raise exception 'Document not found'
      using errcode='23514', detail='EVIDENCE_REVIEW_DOCUMENT_NOT_FOUND';
  end if;
  if doc.verification_status<>'pending' then
    raise exception 'Document is not pending review'
      using errcode='23514', detail='EVIDENCE_REVIEW_DOCUMENT_NOT_PENDING';
  end if;
  if doc.storage_path is null or doc.file_url is not null then
    raise exception 'Document is not backed by protected Storage evidence'
      using errcode='23514', detail='EVIDENCE_REVIEW_STORAGE_BINDING_REQUIRED';
  end if;

  select * into binding
  from epistable_private.evidence_byte_bindings b
  where b.id=doc.evidence_binding_id
    and b.organization_id=doc.organization_id
    and b.storage_path=doc.storage_path
    and b.content_sha256=doc.content_sha256;

  if binding.id is null then
    raise exception 'Evidence bytes are not server-bound to this document version'
      using errcode='23514', detail='EVIDENCE_REVIEW_BYTE_BINDING_MISMATCH';
  end if;
  if doc.expires_at is not null and doc.expires_at<=extract(epoch from now())*1000 then
    raise exception 'Document has expired'
      using errcode='23514', detail='EVIDENCE_REVIEW_DOCUMENT_EXPIRED';
  end if;

  select review_receipt_ttl_seconds,workflow_revision
  into ttl_seconds,current_revision
  from epistable_private.evidence_integrity_config
  where singleton=true;

  if ttl_seconds is null or current_revision is null then
    raise exception 'Evidence review configuration is unavailable'
      using errcode='55000', detail='EVIDENCE_REVIEW_CONFIG_UNAVAILABLE';
  end if;

  expiry := now() + make_interval(secs=>ttl_seconds);

  insert into epistable_private.marketplace_review_receipts(
    target_document_id,reviewer_id,session_id,purpose,workflow_revision,
    evidence_binding_id,evidence_version,content_sha256,storage_path,expires_at
  )
  values(
    doc.id,uid,sid,'document_review',current_revision,
    doc.evidence_binding_id,doc.evidence_version,doc.content_sha256,doc.storage_path,expiry
  )
  returning id into rid;

  return query
  select rid,doc.id,doc.evidence_binding_id,doc.evidence_version,
         doc.content_sha256,expiry,current_revision;
end $$;
revoke all on function epistable_private.prepare_marketplace_document_review_internal(text) from public,anon;
grant execute on function epistable_private.prepare_marketplace_document_review_internal(text) to authenticated;

create or replace function public.prepare_marketplace_document_review(target_id text)
returns table(
  receipt_id uuid,
  document_id text,
  evidence_binding_id uuid,
  evidence_version integer,
  content_sha256 text,
  expires_at timestamptz,
  workflow_revision text
)
language sql security invoker set search_path=''
as $$
  select * from epistable_private.prepare_marketplace_document_review_internal(target_id);
$$;
revoke all on function public.prepare_marketplace_document_review(text) from public,anon;
grant execute on function public.prepare_marketplace_document_review(text) to authenticated;

-- Preserve the existing generic RPC for organization/product review. Documents fail
-- closed here so there is no receiptless compatibility path.
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
  raise exception 'Document review requires a version-bound review receipt'
    using errcode='23514', detail='EVIDENCE_REVIEW_RECEIPT_REQUIRED';
 else
  raise exception 'Unknown review target' using errcode='23514';
 end if;

 if changed<>1 then
  raise exception 'Record changed or is not ready for this review. Refresh and check its details.'
    using errcode='23514';
 end if;
end $$;
revoke all on function public.review_marketplace_record(text,text,text,text) from public,anon;
grant execute on function public.review_marketplace_record(text,text,text,text) to authenticated;

create or replace function epistable_private.review_marketplace_document_internal(
  target_id text,
  decision text,
  reason text,
  review_receipt uuid
)
returns void language plpgsql security definer set search_path=''
as $$
declare
  ctx jsonb := epistable_private.context();
  uid uuid := auth.uid();
  sid_text text := auth.jwt()->>'session_id';
  sid uuid;
  normalized_reason text := trim(reason);
  current_revision text;
  r epistable_private.marketplace_review_receipts%rowtype;
  existing_receipt epistable_private.marketplace_review_receipts%rowtype;
  doc public.trade_documents%rowtype;
  binding epistable_private.evidence_byte_bindings%rowtype;
  changed integer;
begin
  if uid is null or ctx->>'role' is distinct from 'platform_admin' then
    raise exception 'Platform administrator required'
      using errcode='42501', detail='EVIDENCE_REVIEW_PLATFORM_ADMIN_REQUIRED';
  end if;
  if decision is null or decision not in ('verified','rejected')
     or nullif(normalized_reason,'') is null or length(reason)>4000 then
    raise exception 'Choose approve or reject and give a review reason'
      using errcode='23514', detail='EVIDENCE_REVIEW_DECISION_INVALID';
  end if;
  if review_receipt is null then
    raise exception 'A review receipt is required'
      using errcode='23514', detail='EVIDENCE_REVIEW_RECEIPT_REQUIRED';
  end if;

  begin
    sid := nullif(sid_text,'')::uuid;
  exception when invalid_text_representation then
    sid := null;
  end;
  if sid is null or not exists(
    select 1 from auth.sessions s where s.id=sid and s.user_id=uid
  ) then
    raise exception 'The review session is no longer active'
      using errcode='42501', detail='EVIDENCE_REVIEW_SESSION_INACTIVE';
  end if;

  select workflow_revision into current_revision
  from epistable_private.evidence_integrity_config
  where singleton=true;
  if current_revision is null then
    raise exception 'Evidence review configuration is unavailable'
      using errcode='55000', detail='EVIDENCE_REVIEW_CONFIG_UNAVAILABLE';
  end if;

  -- Atomic winner election. A competing transaction cannot also change consumed_at
  -- from NULL. Any later failure in this transaction rolls this consumption back.
  update epistable_private.marketplace_review_receipts
  set consumed_at=now(),consumed_decision=decision,consumed_reason=normalized_reason
  where id=review_receipt
    and consumed_at is null
    and target_document_id=target_id
    and reviewer_id=uid
    and session_id=sid
    and purpose='document_review'
    and workflow_revision=current_revision
    and expires_at>now()
  returning * into r;

  if r.id is null then
    select * into existing_receipt
    from epistable_private.marketplace_review_receipts
    where id=review_receipt;

    if existing_receipt.id is null then
      raise exception 'Review receipt does not exist'
        using errcode='23514', detail='EVIDENCE_REVIEW_RECEIPT_NOT_FOUND';
    elsif existing_receipt.target_document_id is distinct from target_id then
      raise exception 'Review receipt belongs to a different document'
        using errcode='42501', detail='EVIDENCE_REVIEW_TARGET_MISMATCH';
    elsif existing_receipt.reviewer_id is distinct from uid then
      raise exception 'Review receipt belongs to a different reviewer'
        using errcode='42501', detail='EVIDENCE_REVIEW_REVIEWER_MISMATCH';
    elsif existing_receipt.session_id is distinct from sid then
      raise exception 'Review receipt belongs to a different session'
        using errcode='42501', detail='EVIDENCE_REVIEW_SESSION_MISMATCH';
    elsif existing_receipt.purpose is distinct from 'document_review' then
      raise exception 'Review receipt has the wrong purpose'
        using errcode='42501', detail='EVIDENCE_REVIEW_PURPOSE_MISMATCH';
    elsif existing_receipt.workflow_revision is distinct from current_revision then
      raise exception 'The review workflow changed; preview the evidence again'
        using errcode='23514', detail='EVIDENCE_REVIEW_WORKFLOW_REVISION_MISMATCH';
    elsif existing_receipt.expires_at<=now() then
      raise exception 'Review receipt has expired'
        using errcode='23514', detail='EVIDENCE_REVIEW_RECEIPT_EXPIRED';
    elsif existing_receipt.consumed_at is not null then
      if existing_receipt.consumed_decision=decision
         and existing_receipt.consumed_reason=normalized_reason
         and exists(
           select 1 from public.marketplace_reviews mr
           where mr.receipt_id=existing_receipt.id
             and mr.target_kind='document'
             and mr.target_id=target_id
             and mr.decision=decision
             and mr.reason=normalized_reason
         ) then
        return;
      end if;
      raise exception 'Review receipt has already been consumed by a different operation'
        using errcode='23514', detail='EVIDENCE_REVIEW_RECEIPT_ALREADY_CONSUMED';
    else
      raise exception 'Review receipt could not be consumed'
        using errcode='40001', detail='EVIDENCE_REVIEW_RECEIPT_CONSUME_RACE';
    end if;
  end if;

  select * into doc
  from public.trade_documents d
  where d.id=target_id
  for update;

  if doc.id is null then
    raise exception 'Document not found'
      using errcode='23514', detail='EVIDENCE_REVIEW_DOCUMENT_NOT_FOUND';
  elsif doc.verification_status<>'pending' then
    raise exception 'Document is no longer pending review'
      using errcode='23514', detail='EVIDENCE_REVIEW_DOCUMENT_NOT_PENDING';
  elsif doc.evidence_binding_id is distinct from r.evidence_binding_id then
    raise exception 'Evidence binding changed after preview'
      using errcode='23514', detail='EVIDENCE_REVIEW_BINDING_MISMATCH';
  elsif doc.evidence_version is distinct from r.evidence_version then
    raise exception 'Evidence version changed after preview'
      using errcode='23514', detail='EVIDENCE_REVIEW_VERSION_MISMATCH';
  elsif doc.content_sha256 is distinct from r.content_sha256 then
    raise exception 'Evidence digest changed after preview'
      using errcode='23514', detail='EVIDENCE_REVIEW_DIGEST_MISMATCH';
  elsif doc.storage_path is distinct from r.storage_path then
    raise exception 'Evidence path changed after preview'
      using errcode='23514', detail='EVIDENCE_REVIEW_STORAGE_PATH_MISMATCH';
  end if;

  select * into binding
  from epistable_private.evidence_byte_bindings b
  where b.id=r.evidence_binding_id
    and b.organization_id=doc.organization_id
    and b.storage_path=r.storage_path
    and b.content_sha256=r.content_sha256;

  if binding.id is null then
    raise exception 'Evidence byte binding is no longer valid'
      using errcode='23514', detail='EVIDENCE_REVIEW_BYTE_BINDING_MISMATCH';
  end if;
  if decision='verified' and doc.expires_at is not null
     and doc.expires_at<=extract(epoch from now())*1000 then
    raise exception 'Expired evidence cannot be approved'
      using errcode='23514', detail='EVIDENCE_REVIEW_DOCUMENT_EXPIRED';
  end if;

  update public.trade_documents
  set verification_status=decision,
      review_note=normalized_reason,
      review_receipt_id=r.id,
      reviewed_evidence_version=r.evidence_version,
      reviewed_content_sha256=r.content_sha256,
      review_workflow_revision=r.workflow_revision
  where id=target_id
    and verification_status='pending'
    and evidence_binding_id=r.evidence_binding_id
    and evidence_version=r.evidence_version
    and content_sha256=r.content_sha256
    and storage_path=r.storage_path;
  get diagnostics changed=row_count;

  if changed<>1 then
    raise exception 'Document changed or is not ready for this review. Preview it again.'
      using errcode='40001', detail='EVIDENCE_REVIEW_DOCUMENT_COMPARE_AND_SET_FAILED';
  end if;

  -- record_marketplace_review fires from the document update in this same transaction.
  -- If history insertion fails, both the decision and receipt consumption roll back.
end $$;
revoke all on function epistable_private.review_marketplace_document_internal(text,text,text,uuid) from public,anon;
grant execute on function epistable_private.review_marketplace_document_internal(text,text,text,uuid) to authenticated;

create or replace function public.review_marketplace_document(
  target_id text,
  decision text,
  reason text,
  review_receipt uuid
)
returns void language sql security invoker set search_path=''
as $$
  select epistable_private.review_marketplace_document_internal(
    target_id,decision,reason,review_receipt
  );
$$;
revoke all on function public.review_marketplace_document(text,text,text,uuid) from public,anon;
grant execute on function public.review_marketplace_document(text,text,text,uuid) to authenticated;

comment on table epistable_private.marketplace_review_receipts is
  'Short-lived single-use document-review capability bound to reviewer, active session, purpose, workflow revision, byte-binding identity, version, digest and Storage path.';
comment on function public.prepare_marketplace_document_review(text) is
  'Issues a review receipt only for pending protected evidence with a matching server-established byte binding.';
comment on function public.review_marketplace_document(text,text,text,uuid) is
  'Consumes one version-bound receipt atomically. Identical committed retry is idempotent; incompatible retry is rejected.';
