-- Evidence integrity phase 1: immutable/versioned protected evidence foundation.
-- Proposed only. Deploy under the controlled write-freeze runbook after P0 rehearsal.

alter table public.trade_documents
  add column if not exists evidence_version integer not null default 1,
  add column if not exists content_sha256 text,
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
  check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$');

create unique index if not exists trade_documents_current_version_idx
  on public.trade_documents(organization_id, document_type, coalesce(product_id,''), id)
  where current_version;

-- Browser actors must not read/sign protected evidence directly after cutover.
drop policy if exists trade_evidence_select on storage.objects;
drop policy if exists trade_evidence_update on storage.objects;

-- Ordinary seller upload remains INSERT-only. The existing INSERT policy is retained.
-- Cleanup deletion is intentionally narrow. It is not the replacement mechanism for
-- approved evidence; superseded approved bytes remain retained.
drop policy if exists trade_evidence_delete on storage.objects;
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
      and d.verification_status='verified'
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
      and d.verification_status='verified'
  )
);

comment on policy trade_evidence_delete_discovery on storage.objects is
  'Operation-specific SELECT for pending/unbound seller cleanup only. Never a protected evidence read grant.';
