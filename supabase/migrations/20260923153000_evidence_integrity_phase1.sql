-- Evidence integrity phase 1: immutable/versioned protected evidence foundation.
-- Proposed only. Deploy under the controlled write-freeze runbook after P0 rehearsal.
-- Production currently has zero trade_documents rows, so version/digest invariants are
-- introduced without a nullable legacy window.

create table if not exists epistable_private.evidence_byte_bindings (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id),
  storage_path text not null unique,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  storage_version text,
  uploader_id uuid not null references auth.users(id),
  bound_at timestamptz not null default now()
);
alter table epistable_private.evidence_byte_bindings enable row level security;
revoke all on epistable_private.evidence_byte_bindings from public,anon,authenticated;
grant select,insert on epistable_private.evidence_byte_bindings to service_role;

alter table public.trade_documents
  add column if not exists evidence_version integer not null default 1,
  add column if not exists content_sha256 text not null,
  add column if not exists evidence_binding_id uuid not null references epistable_private.evidence_byte_bindings(id),
  add column if not exists supersedes_document_id text references public.trade_documents(id),
  add column if not exists superseded_at bigint,
  add column if not exists current_version boolean not null default true;

alter table public.trade_documents
  drop constraint if exists trade_documents_visibility_check;
alter table public.trade_documents
  add constraint trade_documents_visibility_check
  check (visibility in ('buyers','private'));

alter table public.trade_documents
  drop constraint if exists trade_documents_content_sha256_check;
alter table public.trade_documents
  add constraint trade_documents_content_sha256_check
  check (content_sha256 ~ '^[0-9a-f]{64}$');

alter table public.trade_documents
  drop constraint if exists trade_documents_evidence_version_check;
alter table public.trade_documents
  add constraint trade_documents_evidence_version_check
  check (evidence_version > 0);

create unique index if not exists trade_documents_binding_once
  on public.trade_documents(evidence_binding_id);

-- Browser actors must not read/sign protected evidence directly after cutover.
drop policy if exists trade_evidence_select on storage.objects;
drop policy if exists trade_evidence_update on storage.objects;

-- Ordinary seller upload remains INSERT-only. The existing INSERT policy is retained.
-- Cleanup deletion is intentionally narrow and is never the replacement mechanism for
-- approved/superseded evidence. It is limited to unreferenced uploads or evidence whose
-- only referencing document rows are explicitly pending/rejected.
drop policy if exists trade_evidence_delete on storage.objects;
drop policy if exists trade_evidence_delete_pending_cleanup on storage.objects;
create policy trade_evidence_delete_pending_cleanup
on storage.objects for delete to authenticated
using (
  bucket_id='trade-evidence'
  and (select epistable_private.context()->>'role') like 'seller_%'
  and (storage.foldername(name))[1]=(select epistable_private.context()->>'org')
  and not exists (
    select 1
    from public.trade_documents d
    where d.storage_path=storage.objects.name
      and d.verification_status not in ('pending','rejected')
  )
);

-- Hosted Storage delete_many needs SELECT to discover the rows to delete. Keep that
-- SELECT scoped to the delete operation so it cannot authorize reads or signed URLs.
drop policy if exists trade_evidence_delete_discovery on storage.objects;
create policy trade_evidence_delete_discovery
on storage.objects for select to authenticated
using (
  bucket_id='trade-evidence'
  and storage.allow_only_operation('storage.object.delete_many')
  and (select epistable_private.context()->>'role') like 'seller_%'
  and (storage.foldername(name))[1]=(select epistable_private.context()->>'org')
  and not exists (
    select 1
    from public.trade_documents d
    where d.storage_path=storage.objects.name
      and d.verification_status not in ('pending','rejected')
  )
);

comment on table epistable_private.evidence_byte_bindings is
  'Server-established binding between immutable Storage bytes and their SHA-256 digest. Browser roles have no access.';
comment on policy trade_evidence_delete_pending_cleanup on storage.objects is
  'Seller cleanup only for unreferenced uploads or pending/rejected evidence. Never replacement deletion for approved/superseded evidence.';
comment on policy trade_evidence_delete_discovery on storage.objects is
  'Operation-specific SELECT for delete_many cleanup only. Never a protected evidence read grant.';
