-- Hardening for traceability, evidence packets, and calibration readiness.
-- Additive migration: do not rewrite previous migration history.

-- Batch references should be unique inside a factory. This prevents retry-created
-- duplicate lots from splitting traceability evidence across ghost batches.
create unique index if not exists production_batches_factory_batch_ref_uidx
  on public.production_batches (factory_id, batch_ref);

-- Link rows carry factory_id for RLS, but that value must match both referenced
-- records. Enforce it in a trigger so a privileged user cannot create a
-- cross-factory link by supplying their own factory_id on the link row.
create or replace function public.enforce_batch_inspection_link_factory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  batch_factory text;
  inspection_factory text;
begin
  select factory_id into batch_factory
  from public.production_batches
  where id = new.batch_id;

  select factory_id into inspection_factory
  from public.inspections
  where id = new.inspection_id;

  if batch_factory is null then
    raise exception 'Batch % does not exist', new.batch_id;
  end if;

  if inspection_factory is null then
    raise exception 'Inspection % does not exist', new.inspection_id;
  end if;

  if new.factory_id is distinct from batch_factory then
    raise exception 'Link factory_id % does not match batch factory_id %', new.factory_id, batch_factory;
  end if;

  if new.factory_id is distinct from inspection_factory then
    raise exception 'Link factory_id % does not match inspection factory_id %', new.factory_id, inspection_factory;
  end if;

  return new;
end;
$$;

drop trigger if exists batch_inspection_links_factory_guard on public.batch_inspection_links;
create trigger batch_inspection_links_factory_guard
  before insert or update of factory_id, batch_id, inspection_id
  on public.batch_inspection_links
  for each row
  execute function public.enforce_batch_inspection_link_factory();

-- Shared evidence packet tokens should be consumed through this function/view so
-- expiry is always evaluated at read time, not only when a row is edited.
create or replace function public.revoke_expired_evidence_packets()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.evidence_packets
  set status = 'revoked',
      public_token = null,
      updated_at = (extract(epoch from now()) * 1000)::bigint
  where status = 'shared'
    and expires_at is not null
    and expires_at <= (extract(epoch from now()) * 1000)::bigint;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace view public.live_evidence_packets
with (security_invoker = true) as
select *
from public.evidence_packets
where status = 'shared'
  and public_token is not null
  and (
    expires_at is null
    or expires_at > (extract(epoch from now()) * 1000)::bigint
  );

create or replace function public.get_live_evidence_packet(token text)
returns setof public.evidence_packets
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.live_evidence_packets
  where public_token = token
  limit 1;
$$;

-- Calibration has time-dependent status. Preserve the human-entered status but
-- expose an objective effective status for dashboards and audit reports.
create or replace function public.calibration_effective_status(
  input_status text,
  next_due_at bigint
)
returns text
language sql
stable
as $$
  select case
    when input_status in ('failed', 'retired') then input_status
    when next_due_at is not null
      and next_due_at <= (extract(epoch from now()) * 1000)::bigint then 'overdue'
    when next_due_at is not null
      and next_due_at <= ((extract(epoch from now()) * 1000)::bigint + 7 * 86400000) then 'due_soon'
    else input_status
  end;
$$;

create or replace view public.calibration_records_with_effective_status
with (security_invoker = true) as
select
  c.*,
  public.calibration_effective_status(c.status, c.next_due_at) as effective_status
from public.calibration_records c;

comment on index public.production_batches_factory_batch_ref_uidx is
  'Prevents duplicate batch references inside a factory, preserving deterministic traceability.';

comment on function public.enforce_batch_inspection_link_factory() is
  'Ensures batch_inspection_links.factory_id matches both the referenced batch and inspection factory.';

comment on function public.revoke_expired_evidence_packets() is
  'Revokes shared evidence packets whose expires_at has passed. Can be called manually or by a scheduler.';

comment on view public.live_evidence_packets is
  'Evidence packets whose public token is currently live after expiry evaluation.';

comment on view public.calibration_records_with_effective_status is
  'Calibration records with time-aware effective_status for audit-readiness dashboards.';
