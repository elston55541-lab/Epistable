-- Evidence integrity phase 1: immutable/versioned protected evidence foundation.
-- Proposed only. Deploy under the controlled write-freeze runbook after P0 rehearsal.
--
-- This is deliberately a clean-cutover migration. Production was measured at zero
-- trade_documents rows. If that precondition is no longer true, abort and classify
-- existing rows rather than silently manufacturing byte bindings.

do $$
begin
  if exists(select 1 from public.trade_documents limit 1) then
    raise exception 'Evidence clean-cutover precondition failed: trade_documents is not empty'
      using errcode='23514', detail='EVIDENCE_CLEAN_CUTOVER_ROWS_PRESENT';
  end if;
end $$;

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
  add column if not exists evidence_version bigint default 1,
  add column if not exists content_sha256 text,
  add column if not exists evidence_binding_id uuid references epistable_private.evidence_byte_bindings(id),
  add column if not exists supersedes_document_id text references public.trade_documents(id),
  add column if not exists superseded_at timestamptz,
  add column if not exists current_version boolean default true;

-- Because the clean-cutover guard guarantees zero rows, there is no nullable legacy
-- compatibility window. Re-running a partially applied migration while still frozen
-- converges these columns to the required shape.
alter table public.trade_documents
  alter column evidence_version type bigint using evidence_version::bigint,
  alter column evidence_version set not null,
  alter column content_sha256 set not null,
  alter column evidence_binding_id set not null,
  alter column current_version set not null;

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
-- Retire prior cleanup-discovery policy names as well. RLS policies are OR-combined,
-- so a stale permissive policy would silently widen the new operation-specific grant.
drop policy if exists trade_evidence_delete_select on storage.objects;

-- Ordinary seller upload remains INSERT-only. Cleanup deletion is not a replacement
-- mechanism. It is limited to unreferenced objects or objects referenced exclusively
-- by the explicit deletable states below. Future states do not inherit deletion.
drop policy if exists trade_evidence_delete on storage.objects;
drop policy if exists trade_evidence_delete_pending_cleanup on storage.objects;
create policy trade_evidence_delete_pending_cleanup
on storage.objects for delete to authenticated
using (
  bucket_id='trade-evidence'
  and (select epistable_private.context()->>'role') like 'seller_%'
  and (storage.foldername(name))[1]=(select epistable_private.context()->>'org')
  and coalesce((
    select bool_and(d.verification_status = any(array['pending','rejected']::text[]))
    from public.trade_documents d
    where d.storage_path=storage.objects.name
  ),true)
);

-- Hosted Storage delete_many needs SELECT to discover rows to delete. This SELECT is
-- operation-scoped so it cannot authorize object reads or signed-URL creation.
drop policy if exists trade_evidence_delete_discovery on storage.objects;
create policy trade_evidence_delete_discovery
on storage.objects for select to authenticated
using (
  bucket_id='trade-evidence'
  and storage.allow_only_operation('storage.object.delete_many')
  and (select epistable_private.context()->>'role') like 'seller_%'
  and (storage.foldername(name))[1]=(select epistable_private.context()->>'org')
  and coalesce((
    select bool_and(d.verification_status = any(array['pending','rejected']::text[]))
    from public.trade_documents d
    where d.storage_path=storage.objects.name
  ),true)
);

comment on table epistable_private.evidence_byte_bindings is
  'Server-established immutable Storage-byte binding. Browser roles have no table privileges.';
comment on policy trade_evidence_delete_pending_cleanup on storage.objects is
  'Seller cleanup only for unreferenced objects or objects referenced exclusively by pending/rejected documents. Verified, expired and superseded-approved evidence is retained.';
comment on policy trade_evidence_delete_discovery on storage.objects is
  'Operation-specific SELECT for delete_many cleanup only. Never a protected evidence read grant.';
