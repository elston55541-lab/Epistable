# Epistable DeepSeek Code Bundle — Part 07: Supabase Traceability & Readiness
Snapshot: 31d78c0ee3bd70f7a934b44140549048a41e6a01


===== FILE: supabase/migrations/202605200007_activity_log_evidence_fields.sql =====
```sql
-- Extend activity logs for audit-ready evidence trails.
-- Existing app inserts continue to work because all fields are nullable or defaulted.

alter table public.activity_logs
  add column if not exists event_source text not null default 'app',
  add column if not exists severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  add column if not exists entity_version integer,
  add column if not exists evidence_hash text,
  add column if not exists snapshot jsonb not null default '{}'::jsonb;

create index if not exists activity_logs_action_ts_idx
  on public.activity_logs (action, ts desc);

create index if not exists activity_logs_severity_ts_idx
  on public.activity_logs (severity, ts desc);

comment on column public.activity_logs.event_source is
  'Source of the event such as app, migration, worker, import, or integration.';

comment on column public.activity_logs.severity is
  'Audit severity used to highlight warning or critical compliance events.';

comment on column public.activity_logs.entity_version is
  'Optional version number of the affected entity at the time of the event.';

comment on column public.activity_logs.evidence_hash is
  'Optional hash or checksum for exported evidence packets, certificates, or immutable snapshots.';

comment on column public.activity_logs.snapshot is
  'Optional JSON snapshot of key fields at the time of the event for later audit review.';


```

===== FILE: supabase/migrations/202605200008_evidence_packets.sql =====
```sql
-- Evidence packet foundation for buyer-audit-ready exports.
-- Current app exports can remain client-side; this table supports future saved/shared packets.

create table if not exists public.evidence_packets (
  id text primary key,
  factory_id text not null references public.factories(id),
  title text not null,
  packet_type text not null default 'audit' check (packet_type in ('audit', 'buyer', 'pilot', 'internal')),
  status text not null default 'draft' check (status in ('draft', 'shared', 'revoked', 'archived')),
  created_by text references public.profiles(id),
  created_by_name text not null default '',
  entity_refs jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  evidence_hash text,
  file_url text,
  public_token text,
  shared_at bigint,
  expires_at bigint,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists evidence_packets_factory_status_idx
  on public.evidence_packets (factory_id, status, created_at desc);

create index if not exists evidence_packets_type_idx
  on public.evidence_packets (packet_type, created_at desc);

create unique index if not exists evidence_packets_public_token_idx
  on public.evidence_packets (public_token)
  where public_token is not null;

alter table public.evidence_packets enable row level security;

drop policy if exists "evidence packets read own factory" on public.evidence_packets;
drop policy if exists "evidence packets manage own factory" on public.evidence_packets;

create policy "evidence packets read own factory" on public.evidence_packets
  for select using (
    public.is_owner()
    or public.same_factory(factory_id)
  );

create policy "evidence packets manage own factory" on public.evidence_packets
  for all using (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  )
  with check (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  );

comment on table public.evidence_packets is
  'Saved buyer, audit, pilot, and internal evidence packets assembled from inspections, certificates, quotes, and traceability records.';

comment on column public.evidence_packets.entity_refs is
  'JSON array of packet entities such as inspection ids, quote ids, supplier ids, batch ids, or certificate links.';

comment on column public.evidence_packets.summary is
  'JSON summary of readiness score, gaps, selected slabs, defects, CAPA status, and packet metadata.';

comment on column public.evidence_packets.evidence_hash is
  'Optional hash/checksum for the generated evidence packet artifact.';


```

===== FILE: supabase/migrations/202605200009_capa_actions.sql =====
```sql
-- CAPA foundation for corrective and preventive action tracking.
-- Existing embedded inspection CAPA notes remain valid; this table supports future workflow depth.

create table if not exists public.capa_actions (
  id text primary key,
  factory_id text not null references public.factories(id),
  inspection_id text references public.inspections(id),
  source_type text not null default 'inspection' check (source_type in ('inspection', 'supplier', 'audit', 'buyer', 'internal')),
  title text not null,
  issue text not null default '',
  root_cause text not null default '',
  corrective_action text not null default '',
  preventive_action text not null default '',
  owner_id text references public.profiles(id),
  owner_name text not null default '',
  due_at bigint,
  closed_at bigint,
  verified_at bigint,
  verified_by text references public.profiles(id),
  status text not null default 'open' check (status in ('open', 'in_progress', 'blocked', 'closed', 'verified', 'dismissed')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  evidence_refs jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists capa_actions_factory_status_idx
  on public.capa_actions (factory_id, status, due_at);

create index if not exists capa_actions_inspection_idx
  on public.capa_actions (inspection_id);

create index if not exists capa_actions_owner_idx
  on public.capa_actions (owner_id, status);

alter table public.capa_actions enable row level security;

drop policy if exists "capa actions read own factory" on public.capa_actions;
drop policy if exists "capa actions manage own factory" on public.capa_actions;

create policy "capa actions read own factory" on public.capa_actions
  for select using (
    public.is_owner()
    or public.same_factory(factory_id)
  );

create policy "capa actions manage own factory" on public.capa_actions
  for all using (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  )
  with check (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  );

comment on table public.capa_actions is
  'Corrective and preventive actions linked to inspections, suppliers, audits, buyer feedback, or internal quality reviews.';

comment on column public.capa_actions.evidence_refs is
  'JSON array of supporting evidence references such as inspection ids, photo slots, certificate links, or evidence packet ids.';


```

===== FILE: supabase/migrations/202605200010_production_batches.sql =====
```sql
-- Sector-safe production batch foundation for traceability.
-- Stone-specific source/block/shipment data can live in attributes until app workflows mature.

create table if not exists public.production_batches (
  id text primary key,
  factory_id text not null references public.factories(id),
  sector text not null default 'stone',
  batch_ref text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'shipped', 'archived')),
  supplier_id text references public.suppliers(id),
  supplier_name text not null default '',
  production_date bigint,
  customer_ref text not null default '',
  shipment_ref text not null default '',
  attributes jsonb not null default '{}'::jsonb,
  evidence_summary jsonb not null default '{}'::jsonb,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists production_batches_factory_status_idx
  on public.production_batches (factory_id, status, updated_at desc);

create index if not exists production_batches_ref_idx
  on public.production_batches (factory_id, batch_ref);

create index if not exists production_batches_supplier_idx
  on public.production_batches (supplier_id, updated_at desc);

alter table public.production_batches enable row level security;

drop policy if exists "production batches read own factory" on public.production_batches;
drop policy if exists "production batches manage own factory" on public.production_batches;

create policy "production batches read own factory" on public.production_batches
  for select using (
    public.is_owner()
    or public.same_factory(factory_id)
  );

create policy "production batches manage own factory" on public.production_batches
  for all using (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  )
  with check (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  );

comment on table public.production_batches is
  'Sector-safe production or source batches used to group inspections, traceability evidence, customer/export references, and shipment context.';

comment on column public.production_batches.attributes is
  'Sector-specific batch attributes such as quarry source, block number, slab bundle, firing lot, textile lot, or metal heat number.';

comment on column public.production_batches.evidence_summary is
  'Computed or copied batch evidence summary such as scan count, readiness gaps, defect mix, and packet references.';


```

===== FILE: supabase/migrations/202605200011_batch_inspection_links.sql =====
```sql
-- Link inspections to production batches without changing existing inspection rows.

create table if not exists public.batch_inspection_links (
  id text primary key,
  factory_id text not null references public.factories(id),
  batch_id text not null references public.production_batches(id) on delete cascade,
  inspection_id text not null references public.inspections(id) on delete cascade,
  link_type text not null default 'member' check (link_type in ('member', 'sample', 'representative', 'exception')),
  notes text not null default '',
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique (batch_id, inspection_id)
);

create index if not exists batch_inspection_links_factory_idx
  on public.batch_inspection_links (factory_id, created_at desc);

create index if not exists batch_inspection_links_inspection_idx
  on public.batch_inspection_links (inspection_id);

alter table public.batch_inspection_links enable row level security;

drop policy if exists "batch inspection links read own factory" on public.batch_inspection_links;
drop policy if exists "batch inspection links manage own factory" on public.batch_inspection_links;

create policy "batch inspection links read own factory" on public.batch_inspection_links
  for select using (
    public.is_owner()
    or public.same_factory(factory_id)
  );

create policy "batch inspection links manage own factory" on public.batch_inspection_links
  for all using (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  )
  with check (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  );

comment on table public.batch_inspection_links is
  'Many-to-many links between production batches and inspection evidence records.';

comment on column public.batch_inspection_links.link_type is
  'How the inspection relates to the batch, for example member, sample, representative, or exception.';


```

===== FILE: supabase/migrations/202605200012_calibration_records.sql =====
```sql
-- Calibration evidence foundation for audit-readiness.

create table if not exists public.calibration_records (
  id text primary key,
  factory_id text not null references public.factories(id),
  equipment_id text not null,
  equipment_name text not null,
  equipment_type text not null default '',
  calibration_date bigint not null,
  next_due_at bigint,
  status text not null default 'valid' check (status in ('valid', 'due_soon', 'overdue', 'failed', 'retired')),
  performed_by text not null default '',
  certificate_ref text not null default '',
  evidence_refs jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists calibration_records_factory_status_idx
  on public.calibration_records (factory_id, status, next_due_at);

create index if not exists calibration_records_equipment_idx
  on public.calibration_records (factory_id, equipment_id, calibration_date desc);

alter table public.calibration_records enable row level security;

drop policy if exists "calibration records read own factory" on public.calibration_records;
drop policy if exists "calibration records manage own factory" on public.calibration_records;

create policy "calibration records read own factory" on public.calibration_records
  for select using (
    public.is_owner()
    or public.same_factory(factory_id)
  );

create policy "calibration records manage own factory" on public.calibration_records
  for all using (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  )
  with check (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  );

comment on table public.calibration_records is
  'Calibration evidence for equipment, gauges, scales, tools, or inspection devices used in quality workflows.';

comment on column public.calibration_records.evidence_refs is
  'JSON array of evidence references such as certificate files, activity logs, inspection ids, or evidence packet ids.';


```

===== FILE: supabase/migrations/202605230001_traceability_schema_hardening.sql =====
```sql
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

```

===== FILE: supabase/migrations/202605240001_export_readiness_foundation.sql =====
```sql
-- Export readiness foundation.
-- Additive, parallel module: factories remain the exporter anchor for now.

create table if not exists public.export_readiness_profiles (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  sector text not null default 'stone',
  product_type text not null,
  destination_markets text[] not null default '{}'::text[],
  current_certifications text[] not null default '{}'::text[],
  company_size text,
  export_status text not null default 'planning'
    check (export_status in ('planning', 'first_export', 'active_exporter', 'expanding_markets')),
  readiness_stage text not null default 'draft'
    check (readiness_stage in ('draft', 'profile_complete', 'roadmap_ready', 'documents_in_progress', 'buyer_ready')),
  onboarding_inputs jsonb not null default '{}'::jsonb,
  onboarding_completed_at bigint,
  last_reviewed_at bigint,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.export_requirements (
  id text primary key,
  sector text not null,
  product_type text not null default 'any',
  destination_market text not null default 'any',
  requirement_type text not null
    check (requirement_type in ('registration', 'certification', 'standard', 'documentation', 'compliance', 'packaging', 'testing')),
  requirement_name text not null,
  description text not null,
  is_mandatory boolean not null default true,
  priority integer not null default 50 check (priority between 1 and 100),
  estimated_cost_min_inr integer,
  estimated_cost_max_inr integer,
  estimated_timeline_weeks_min integer,
  estimated_timeline_weeks_max integer,
  evidence_type text not null
    check (evidence_type in ('document_upload', 'certificate_number', 'lab_report', 'photo_evidence', 'checklist_confirmation', 'external_verification', 'factory_declaration')),
  evidence_instructions text,
  renewal_period_months integer,
  documents_required jsonb not null default '[]'::jsonb,
  evidence_examples jsonb not null default '[]'::jsonb,
  source_notes text,
  active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.certification_bodies (
  id text primary key,
  name text not null,
  body_type text not null default 'certification_body'
    check (body_type in ('certification_body', 'testing_lab', 'export_council', 'consultant', 'government_portal')),
  description text,
  accreditations jsonb not null default '[]'::jsonb,
  locations jsonb not null default '[]'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  website text,
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  featured_label text,
  commercial_disclosure text,
  response_sla_days integer,
  pricing_notes text,
  active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.certification_body_requirements (
  body_id text not null references public.certification_bodies(id) on delete cascade,
  requirement_id text not null references public.export_requirements(id) on delete cascade,
  scope_notes text,
  primary key (body_id, requirement_id)
);

create table if not exists public.certification_body_sectors (
  body_id text not null references public.certification_bodies(id) on delete cascade,
  sector text not null,
  product_types text[] not null default '{}'::text[],
  primary key (body_id, sector)
);

create table if not exists public.certification_body_markets (
  body_id text not null references public.certification_bodies(id) on delete cascade,
  destination_market text not null,
  scope_notes text,
  primary key (body_id, destination_market)
);

create table if not exists public.readiness_roadmaps (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  profile_id text not null references public.export_readiness_profiles(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'generated', 'in_progress', 'complete', 'archived')),
  generated_by text not null default 'manual'
    check (generated_by in ('manual', 'claude', 'imported')),
  model text,
  summary text,
  steps jsonb not null default '[]'::jsonb,
  gap_list jsonb not null default '[]'::jsonb,
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  generated_at bigint,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.readiness_evidence (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  profile_id text not null references public.export_readiness_profiles(id) on delete cascade,
  requirement_id text not null references public.export_requirements(id),
  roadmap_id text references public.readiness_roadmaps(id) on delete set null,
  evidence_type text not null
    check (evidence_type in ('document_upload', 'certificate_number', 'lab_report', 'photo_evidence', 'checklist_confirmation', 'external_verification', 'factory_declaration')),
  status text not null default 'missing'
    check (status in ('missing', 'pending', 'uploaded', 'submitted', 'verified', 'rejected', 'expired', 'not_applicable')),
  file_url text,
  certificate_number text,
  issuing_body_id text references public.certification_bodies(id) on delete set null,
  issued_at bigint,
  expires_at bigint,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.readiness_documents (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  profile_id text not null references public.export_readiness_profiles(id) on delete cascade,
  requirement_id text references public.export_requirements(id),
  evidence_id text references public.readiness_evidence(id) on delete set null,
  document_name text not null,
  document_type text not null default 'document',
  status text not null default 'needed'
    check (status in ('needed', 'uploaded', 'submitted', 'verified', 'rejected', 'expired', 'not_applicable')),
  file_url text,
  notes text,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists export_readiness_profiles_factory_idx on public.export_readiness_profiles(factory_id);
create index if not exists export_readiness_profiles_sector_product_idx on public.export_readiness_profiles(sector, product_type);
create index if not exists export_requirements_lookup_idx on public.export_requirements(sector, product_type, destination_market, active, priority);
create index if not exists export_requirements_type_idx on public.export_requirements(requirement_type, evidence_type);
create index if not exists certification_bodies_active_featured_idx on public.certification_bodies(active, is_featured, is_verified);
create index if not exists readiness_roadmaps_factory_profile_idx on public.readiness_roadmaps(factory_id, profile_id, status);
create index if not exists readiness_evidence_factory_profile_idx on public.readiness_evidence(factory_id, profile_id, status);
create index if not exists readiness_evidence_requirement_idx on public.readiness_evidence(requirement_id, status);
create index if not exists readiness_documents_factory_profile_idx on public.readiness_documents(factory_id, profile_id, status);

alter table public.export_readiness_profiles enable row level security;
alter table public.export_requirements enable row level security;
alter table public.certification_bodies enable row level security;
alter table public.certification_body_requirements enable row level security;
alter table public.certification_body_sectors enable row level security;
alter table public.certification_body_markets enable row level security;
alter table public.readiness_roadmaps enable row level security;
alter table public.readiness_evidence enable row level security;
alter table public.readiness_documents enable row level security;

create policy "export readiness profiles own factory" on public.export_readiness_profiles
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "export requirements read active" on public.export_requirements
  for select using (active or public.is_owner());

create policy "export requirements owner writes" on public.export_requirements
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "certification bodies read active" on public.certification_bodies
  for select using (active or public.is_owner());

create policy "certification bodies owner writes" on public.certification_bodies
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "certification body requirements read active" on public.certification_body_requirements
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.certification_bodies b
      where b.id = certification_body_requirements.body_id and b.active
    )
  );

create policy "certification body requirements owner writes" on public.certification_body_requirements
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "certification body sectors read active" on public.certification_body_sectors
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.certification_bodies b
      where b.id = certification_body_sectors.body_id and b.active
    )
  );

create policy "certification body sectors owner writes" on public.certification_body_sectors
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "certification body markets read active" on public.certification_body_markets
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.certification_bodies b
      where b.id = certification_body_markets.body_id and b.active
    )
  );

create policy "certification body markets owner writes" on public.certification_body_markets
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "readiness roadmaps own factory" on public.readiness_roadmaps
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "readiness evidence own factory" on public.readiness_evidence
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "readiness documents own factory" on public.readiness_documents
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

insert into public.export_requirements (
  id, sector, product_type, destination_market, requirement_type, requirement_name,
  description, is_mandatory, priority, estimated_cost_min_inr, estimated_cost_max_inr,
  estimated_timeline_weeks_min, estimated_timeline_weeks_max, evidence_type,
  evidence_instructions, renewal_period_months, documents_required, evidence_examples, source_notes
) values
  (
    'stone_any_any_iec',
    'stone', 'any', 'any', 'registration', 'Importer Exporter Code (IEC)',
    'DGFT registration required for Indian businesses to import or export goods.',
    true, 95, 500, 2000, 1, 2, 'certificate_number',
    'Enter IEC number and upload the DGFT IEC certificate or acknowledgement.',
    null,
    '["IEC certificate","PAN/GST details","bank details used for IEC"]'::jsonb,
    '["IEC number","DGFT certificate PDF"]'::jsonb,
    'Exporter should verify latest DGFT process before application.'
  ),
  (
    'stone_any_any_iso_9001',
    'stone', 'any', 'any', 'certification', 'ISO 9001 Quality Management System',
    'Quality management system certification commonly requested by international buyers and larger procurement teams.',
    false, 80, 120000, 300000, 8, 16, 'certificate_number',
    'Upload ISO 9001 certificate, certificate number, issuing body, issue date, and expiry date.',
    36,
    '["ISO 9001 certificate","audit report or scope statement","quality manual or process evidence"]'::jsonb,
    '["valid certificate","scope covering stone processing/export operations"]'::jsonb,
    'Scope, accreditation, and expiry must be checked with the issuing body.'
  ),
  (
    'stone_granite_us_astm',
    'stone', 'granite', 'US', 'testing', 'ASTM Dimensional Stone Test Evidence',
    'US buyers often request ASTM-based material test evidence for dimensional stone performance and suitability.',
    true, 85, 25000, 90000, 2, 6, 'lab_report',
    'Upload relevant ASTM lab reports for the stone type and buyer specification.',
    null,
    '["ASTM lab test report","sample identification","test method references"]'::jsonb,
    '["compressive strength report","absorption/density report","abrasion or flexural test where requested"]'::jsonb,
    'Exact ASTM methods depend on buyer specification and product application.'
  ),
  (
    'stone_marble_us_astm',
    'stone', 'marble', 'US', 'testing', 'ASTM Dimensional Stone Test Evidence',
    'US buyers often request ASTM-based material test evidence for marble performance and suitability.',
    true, 85, 25000, 90000, 2, 6, 'lab_report',
    'Upload relevant ASTM lab reports for marble and the buyer specification.',
    null,
    '["ASTM lab test report","sample identification","test method references"]'::jsonb,
    '["absorption/density report","flexural strength report","abrasion report where requested"]'::jsonb,
    'Exact ASTM methods depend on buyer specification and product application.'
  ),
  (
    'stone_any_eu_en_ce_evidence',
    'stone', 'any', 'EU', 'standard', 'EN / CE Evidence for Construction Stone',
    'EU construction buyers may require EN standard evidence and CE-related documentation depending on product use and harmonised requirements.',
    true, 90, 40000, 150000, 4, 10, 'lab_report',
    'Upload EN test reports, declaration/performance documentation where applicable, and any buyer-specific compliance pack.',
    null,
    '["EN lab reports","Declaration of Performance if applicable","product technical data sheet"]'::jsonb,
    '["EN test report","DoP or technical declaration","traceable sample reference"]'::jsonb,
    'Applicability depends on product category, use case, and current EU rules; verify with an accredited advisor or notified body where needed.'
  ),
  (
    'stone_any_eu_responsible_sourcing',
    'stone', 'any', 'EU', 'compliance', 'Responsible Sourcing and Due Diligence Evidence',
    'EU buyers increasingly ask for origin, social, environmental, and ethical sourcing evidence for stone supply chains.',
    true, 75, 10000, 120000, 2, 12, 'external_verification',
    'Upload quarry/source details, supplier declarations, social audit evidence, and traceability records.',
    12,
    '["supplier declaration","quarry/source record","social audit or due diligence evidence","traceability sheet"]'::jsonb,
    '["source map","audit report","signed supplier declaration","batch traceability export"]'::jsonb,
    'Specific due diligence expectations vary by buyer and jurisdiction.'
  ),
  (
    'stone_any_any_silica_environment',
    'stone', 'any', 'any', 'compliance', 'Silica Dust and Environmental Compliance',
    'Factories should maintain worker safety, dust-control, water/waste, and environmental compliance evidence for buyer audits.',
    true, 70, 10000, 200000, 2, 16, 'document_upload',
    'Upload relevant safety/environment registrations, monitoring records, SOPs, PPE evidence, and corrective actions.',
    12,
    '["dust-control SOP","PPE records","environmental consent or local compliance evidence","water/waste records"]'::jsonb,
    '["PPE checklist","dust extraction maintenance log","water recycling or waste record"]'::jsonb,
    'Local legal requirements and buyer audit criteria should be verified for each factory.'
  ),
  (
    'stone_any_any_origin_gsp',
    'stone', 'any', 'any', 'documentation', 'Certificate of Origin / Preferential Origin Documents',
    'Export shipments usually need origin documentation; some markets may require preferential origin or GSP-related documents where applicable.',
    true, 65, 1000, 10000, 1, 3, 'document_upload',
    'Upload sample Certificate of Origin, chamber/export council documentation, or shipment-specific origin documents.',
    null,
    '["Certificate of Origin","invoice","packing list","shipping bill references"]'::jsonb,
    '["CoO PDF","shipment document pack"]'::jsonb,
    'Exact document route depends on shipment, destination, and scheme eligibility.'
  ),
  (
    'stone_any_any_packaging_labeling',
    'stone', 'any', 'any', 'packaging', 'Export Packaging and Labelling Requirements',
    'Stone exports need buyer-appropriate packing, labelling, handling marks, and wood-packaging compliance where relevant.',
    true, 60, 5000, 60000, 1, 4, 'photo_evidence',
    'Upload packaging photos, crate labels, packing list, and fumigation or ISPM-15 evidence where wooden packaging is used.',
    null,
    '["packing list","crate label photo","packaging photos","fumigation/ISPM-15 evidence if applicable"]'::jsonb,
    '["label photo","crate photo","packing list","fumigation certificate"]'::jsonb,
    'Destination and buyer packaging requirements should be checked before shipment.'
  )
on conflict (id) do update set
  sector=excluded.sector,
  product_type=excluded.product_type,
  destination_market=excluded.destination_market,
  requirement_type=excluded.requirement_type,
  requirement_name=excluded.requirement_name,
  description=excluded.description,
  is_mandatory=excluded.is_mandatory,
  priority=excluded.priority,
  estimated_cost_min_inr=excluded.estimated_cost_min_inr,
  estimated_cost_max_inr=excluded.estimated_cost_max_inr,
  estimated_timeline_weeks_min=excluded.estimated_timeline_weeks_min,
  estimated_timeline_weeks_max=excluded.estimated_timeline_weeks_max,
  evidence_type=excluded.evidence_type,
  evidence_instructions=excluded.evidence_instructions,
  renewal_period_months=excluded.renewal_period_months,
  documents_required=excluded.documents_required,
  evidence_examples=excluded.evidence_examples,
  source_notes=excluded.source_notes,
  active=true,
  updated_at=(extract(epoch from now()) * 1000)::bigint;

insert into public.certification_bodies (
  id, name, body_type, description, accreditations, locations, contact, website,
  is_verified, is_featured, featured_label, commercial_disclosure, response_sla_days, pricing_notes
) values
  (
    'body_dgft',
    'DGFT',
    'government_portal',
    'Government portal for Importer Exporter Code and foreign trade services.',
    '[]'::jsonb,
    '[{"country":"India","mode":"online"}]'::jsonb,
    '{"channel":"online portal"}'::jsonb,
    'https://www.dgft.gov.in',
    true, false, null, 'Government portal; not a paid placement.', null, 'Government fees and consultant charges vary.'
  ),
  (
    'body_sgs',
    'SGS',
    'certification_body',
    'Global testing, inspection, and certification organisation. Verify current local scope and accreditation before engagement.',
    '[{"note":"Verify current accreditation and India scope before use."}]'::jsonb,
    '[{"country":"India"},{"country":"Global"}]'::jsonb,
    '{"channel":"website"}'::jsonb,
    'https://www.sgs.com',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current quotation and scope confirmation.'
  ),
  (
    'body_bureau_veritas',
    'Bureau Veritas',
    'certification_body',
    'Global testing, inspection, and certification organisation. Verify current local scope and accreditation before engagement.',
    '[{"note":"Verify current accreditation and India scope before use."}]'::jsonb,
    '[{"country":"India"},{"country":"Global"}]'::jsonb,
    '{"channel":"website"}'::jsonb,
    'https://www.bureauveritas.com',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current quotation and scope confirmation.'
  ),
  (
    'body_intertek',
    'Intertek',
    'certification_body',
    'Global testing, inspection, and certification organisation. Verify current local scope and accreditation before engagement.',
    '[{"note":"Verify current accreditation and India scope before use."}]'::jsonb,
    '[{"country":"India"},{"country":"Global"}]'::jsonb,
    '{"channel":"website"}'::jsonb,
    'https://www.intertek.com',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current quotation and scope confirmation.'
  ),
  (
    'body_tuv_nord',
    'TUV NORD',
    'certification_body',
    'Testing, inspection, and certification organisation. Verify current local scope and accreditation before engagement.',
    '[{"note":"Verify current accreditation and India scope before use."}]'::jsonb,
    '[{"country":"India"},{"country":"Global"}]'::jsonb,
    '{"channel":"website"}'::jsonb,
    'https://www.tuv-nord.com',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current quotation and scope confirmation.'
  ),
  (
    'body_cdos_jaipur',
    'CDOS Jaipur',
    'testing_lab',
    'Stone-sector testing and development organisation in Jaipur. Verify current test scope and accreditation status before use.',
    '[{"note":"Verify current test scope and accreditation status before use."}]'::jsonb,
    '[{"city":"Jaipur","state":"Rajasthan","country":"India"}]'::jsonb,
    '{"channel":"website / direct inquiry"}'::jsonb,
    null,
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current test quotation and sample requirements.'
  ),
  (
    'body_capexil',
    'CAPEXIL',
    'export_council',
    'Export promotion council relevant to stone and mineral product exporters. Verify membership and documentation routes directly.',
    '[]'::jsonb,
    '[{"country":"India"}]'::jsonb,
    '{"channel":"website / direct inquiry"}'::jsonb,
    'https://capexil.org',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Membership and document fees vary.'
  )
on conflict (id) do update set
  name=excluded.name,
  body_type=excluded.body_type,
  description=excluded.description,
  accreditations=excluded.accreditations,
  locations=excluded.locations,
  contact=excluded.contact,
  website=excluded.website,
  is_verified=excluded.is_verified,
  is_featured=excluded.is_featured,
  featured_label=excluded.featured_label,
  commercial_disclosure=excluded.commercial_disclosure,
  response_sla_days=excluded.response_sla_days,
  pricing_notes=excluded.pricing_notes,
  active=true,
  updated_at=(extract(epoch from now()) * 1000)::bigint;

insert into public.certification_body_sectors (body_id, sector, product_types) values
  ('body_dgft', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_sgs', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_bureau_veritas', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_intertek', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_tuv_nord', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_cdos_jaipur', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_capexil', 'stone', '{"granite","marble","sandstone"}'::text[])
on conflict (body_id, sector) do update set product_types=excluded.product_types;

insert into public.certification_body_markets (body_id, destination_market, scope_notes) values
  ('body_dgft', 'any', 'IEC and exporter registration route for Indian exporters.'),
  ('body_sgs', 'EU', 'Potential testing/certification support; verify current scope.'),
  ('body_sgs', 'US', 'Potential testing/certification support; verify current scope.'),
  ('body_bureau_veritas', 'EU', 'Potential testing/certification support; verify current scope.'),
  ('body_bureau_veritas', 'US', 'Potential testing/certification support; verify current scope.'),
  ('body_intertek', 'EU', 'Potential testing/certification support; verify current scope.'),
  ('body_intertek', 'US', 'Potential testing/certification support; verify current scope.'),
  ('body_tuv_nord', 'EU', 'Potential testing/certification support; verify current scope.'),
  ('body_cdos_jaipur', 'any', 'Stone testing support; verify current scope and accepted standards.'),
  ('body_capexil', 'any', 'Export promotion, membership, and document guidance; verify route directly.')
on conflict (body_id, destination_market) do update set scope_notes=excluded.scope_notes;

insert into public.certification_body_requirements (body_id, requirement_id, scope_notes) values
  ('body_dgft', 'stone_any_any_iec', 'Official IEC route.'),
  ('body_sgs', 'stone_any_any_iso_9001', 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_bureau_veritas', 'stone_any_any_iso_9001', 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_intertek', 'stone_any_any_iso_9001', 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_tuv_nord', 'stone_any_any_iso_9001', 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_cdos_jaipur', 'stone_granite_us_astm', 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_cdos_jaipur', 'stone_marble_us_astm', 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_cdos_jaipur', 'stone_any_eu_en_ce_evidence', 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_sgs', 'stone_any_eu_en_ce_evidence', 'Potential EU evidence support; verify scope.'),
  ('body_bureau_veritas', 'stone_any_eu_en_ce_evidence', 'Potential EU evidence support; verify scope.'),
  ('body_intertek', 'stone_any_eu_en_ce_evidence', 'Potential EU evidence support; verify scope.'),
  ('body_capexil', 'stone_any_any_origin_gsp', 'Potential origin/export documentation guidance; verify route.')
on conflict (body_id, requirement_id) do update set scope_notes=excluded.scope_notes;

comment on table public.export_readiness_profiles is
  'Exporter readiness profile anchored to factories. Captures product, target markets, certifications, and onboarding status.';

comment on table public.export_requirements is
  'Market-aware, category-aware export readiness requirements. UI and AI roadmap generation should read from this table instead of hardcoding certification logic.';

comment on column public.export_requirements.evidence_type is
  'Defines how readiness is proven: document, certificate number, lab report, photo, checklist, external verification, or declaration.';

comment on table public.certification_bodies is
  'Directory of certification bodies, labs, councils, portals, and advisors. Paid placement must be separated using is_featured and commercial_disclosure.';

comment on table public.readiness_evidence is
  'Evidence attached to export requirements, including files, certificate numbers, issuing bodies, validity dates, and verification status.';

comment on table public.readiness_roadmaps is
  'Generated or manual export-readiness roadmap linked to an exporter profile.';

```

===== FILE: supabase/migrations/202605240002_export_readiness_schema_hardening.sql =====
```sql
-- Export readiness schema hardening.
-- Adds reusable certification specs, multi-market requirements, roadmap history,
-- and renewal hooks without rewriting the previous foundation migration.

create table if not exists public.certifications (
  id text primary key,
  code text not null unique,
  name text not null,
  description text,
  evidence_type text not null
    check (evidence_type in (
      'government_registration',
      'management_system_cert',
      'product_test_report',
      'responsible_sourcing_audit',
      'shipment_document',
      'operational_record',
      'training_record',
      'policy_document'
    )),
  renewal_period_months integer,
  scope_description text,
  issuing_authority_type text not null default 'external'
    check (issuing_authority_type in ('government', 'accredited_body', 'lab', 'export_council', 'self', 'external')),
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table public.certifications enable row level security;

create policy "certifications read active" on public.certifications
  for select using (active or public.is_owner());

create policy "certifications owner writes" on public.certifications
  for all using (public.is_owner())
  with check (public.is_owner());

alter table public.export_requirements
  add column if not exists certification_id text references public.certifications(id),
  add column if not exists destination_markets text[] not null default '{}'::text[],
  add column if not exists evidence_lifecycle_type text,
  add column if not exists product_category text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.readiness_evidence
  add column if not exists evidence_lifecycle_type text,
  add column if not exists verification_reason text,
  add column if not exists next_check_at bigint;

alter table public.readiness_roadmaps
  add column if not exists model_version text,
  add column if not exists input_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists output jsonb not null default '{}'::jsonb,
  add column if not exists is_current boolean not null default true,
  add column if not exists superseded_by text references public.readiness_roadmaps(id) on delete set null,
  add column if not exists generation_cost_usd numeric(8,4),
  add column if not exists generation_duration_ms integer;

alter table public.certification_bodies
  add column if not exists slug text,
  add column if not exists legal_name text,
  add column if not exists accreditation_number text,
  add column if not exists accreditation_authority text,
  add column if not exists hq_country text,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive', 'pending_review')),
  add column if not exists featured_until bigint;

update public.certification_bodies
set slug = lower(regexp_replace(id, '^body_', ''))
where slug is null;

create unique index if not exists certifications_code_uidx on public.certifications(code);
create unique index if not exists certification_bodies_slug_uidx on public.certification_bodies(slug) where slug is not null;
create index if not exists certifications_active_type_idx on public.certifications(active, evidence_type);
create index if not exists export_requirements_certification_idx on public.export_requirements(certification_id, active);
create index if not exists export_requirements_destination_markets_gin_idx on public.export_requirements using gin(destination_markets);
create index if not exists readiness_evidence_next_check_idx on public.readiness_evidence(factory_id, next_check_at, status);
create index if not exists readiness_roadmaps_current_profile_idx on public.readiness_roadmaps(profile_id, is_current) where is_current = true;

insert into public.certifications (
  id, code, name, description, evidence_type, renewal_period_months,
  scope_description, issuing_authority_type, metadata
) values
  (
    'cert_iec',
    'iec',
    'Importer Exporter Code (IEC)',
    'DGFT-issued registration required for Indian import/export activity.',
    'government_registration',
    null,
    'Exporter registration for India.',
    'government',
    '{"authority":"DGFT","country":"India"}'::jsonb
  ),
  (
    'cert_iso_9001',
    'iso_9001',
    'ISO 9001 Quality Management System',
    'Quality management system certification used by buyers to assess process maturity.',
    'management_system_cert',
    36,
    'Factory or company quality management system scope.',
    'accredited_body',
    '{"standard_family":"ISO"}'::jsonb
  ),
  (
    'cert_astm_stone',
    'astm_stone_test_report',
    'ASTM Dimensional Stone Test Report',
    'Product test evidence for dimensional stone supplied to ASTM-oriented buyers.',
    'product_test_report',
    null,
    'Material/sample test report for stone type and buyer specification.',
    'lab',
    '{"market_family":"US","sector":"stone"}'::jsonb
  ),
  (
    'cert_en_ce_stone',
    'en_ce_stone_evidence',
    'EN / CE Evidence for Construction Stone',
    'EN standard evidence and CE-related documentation where applicable for construction stone products.',
    'product_test_report',
    null,
    'Product technical evidence, test reports, and declaration/performance documentation where applicable.',
    'lab',
    '{"market_family":"EU","sector":"stone"}'::jsonb
  ),
  (
    'cert_responsible_sourcing',
    'responsible_sourcing_due_diligence',
    'Responsible Sourcing and Due Diligence Evidence',
    'Social, origin, and ethical sourcing evidence requested by many international buyers.',
    'responsible_sourcing_audit',
    12,
    'Supply-chain, quarry/source, social-audit, or buyer due-diligence evidence.',
    'external',
    '{"themes":["origin","social","ethical sourcing"]}'::jsonb
  ),
  (
    'cert_silica_environment',
    'silica_environmental_compliance',
    'Silica Dust and Environmental Compliance Evidence',
    'Operational evidence for worker safety, dust control, water/waste, and environmental compliance.',
    'operational_record',
    12,
    'Factory operational records and local compliance evidence.',
    'self',
    '{"themes":["worker safety","environment","operations"]}'::jsonb
  ),
  (
    'cert_origin_gsp',
    'certificate_of_origin_gsp',
    'Certificate of Origin / Preferential Origin Documents',
    'Shipment or exporter documentation proving origin and, where applicable, preferential origin eligibility.',
    'shipment_document',
    null,
    'Per-shipment origin documentation.',
    'export_council',
    '{"themes":["shipment documentation","origin"]}'::jsonb
  ),
  (
    'cert_packaging_labeling',
    'export_packaging_labeling',
    'Export Packaging and Labelling Evidence',
    'Packing, labelling, handling, and wood-packaging evidence for export shipments.',
    'shipment_document',
    null,
    'Packaging photos, packing list, crate labels, and fumigation/ISPM evidence where applicable.',
    'self',
    '{"themes":["packaging","shipment readiness"]}'::jsonb
  )
on conflict (id) do update set
  code=excluded.code,
  name=excluded.name,
  description=excluded.description,
  evidence_type=excluded.evidence_type,
  renewal_period_months=excluded.renewal_period_months,
  scope_description=excluded.scope_description,
  issuing_authority_type=excluded.issuing_authority_type,
  metadata=excluded.metadata,
  active=true,
  updated_at=(extract(epoch from now()) * 1000)::bigint;

update public.export_requirements
set
  certification_id = case id
    when 'stone_any_any_iec' then 'cert_iec'
    when 'stone_any_any_iso_9001' then 'cert_iso_9001'
    when 'stone_granite_us_astm' then 'cert_astm_stone'
    when 'stone_marble_us_astm' then 'cert_astm_stone'
    when 'stone_any_eu_en_ce_evidence' then 'cert_en_ce_stone'
    when 'stone_any_eu_responsible_sourcing' then 'cert_responsible_sourcing'
    when 'stone_any_any_silica_environment' then 'cert_silica_environment'
    when 'stone_any_any_origin_gsp' then 'cert_origin_gsp'
    when 'stone_any_any_packaging_labeling' then 'cert_packaging_labeling'
    else certification_id
  end,
  destination_markets = case
    when destination_market is null or destination_market = 'any' then '{"GLOBAL"}'::text[]
    else array[destination_market]
  end,
  evidence_lifecycle_type = case id
    when 'stone_any_any_iec' then 'government_registration'
    when 'stone_any_any_iso_9001' then 'management_system_cert'
    when 'stone_granite_us_astm' then 'product_test_report'
    when 'stone_marble_us_astm' then 'product_test_report'
    when 'stone_any_eu_en_ce_evidence' then 'product_test_report'
    when 'stone_any_eu_responsible_sourcing' then 'responsible_sourcing_audit'
    when 'stone_any_any_silica_environment' then 'operational_record'
    when 'stone_any_any_origin_gsp' then 'shipment_document'
    when 'stone_any_any_packaging_labeling' then 'shipment_document'
    else evidence_lifecycle_type
  end,
  product_category = case
    when sector = 'stone' then 'dimensional_stone'
    else product_category
  end
where certification_id is null
   or destination_markets = '{}'::text[]
   or evidence_lifecycle_type is null
   or product_category is null;

update public.readiness_evidence e
set
  evidence_lifecycle_type = coalesce(e.evidence_lifecycle_type, r.evidence_lifecycle_type),
  next_check_at = coalesce(
    e.next_check_at,
    case
      when e.expires_at is not null and e.issued_at is not null
        then greatest(e.issued_at, e.expires_at - 60 * 86400000)
      when e.expires_at is not null
        then e.expires_at - 60 * 86400000
      else null
    end
  )
from public.export_requirements r
where r.id = e.requirement_id;

create table if not exists public.certification_body_certifications (
  body_id text not null references public.certification_bodies(id) on delete cascade,
  certification_id text not null references public.certifications(id) on delete cascade,
  is_primary boolean not null default false,
  scope_notes text,
  primary key (body_id, certification_id)
);

alter table public.certification_body_certifications enable row level security;

create policy "certification body certifications read active" on public.certification_body_certifications
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.certification_bodies b
      where b.id = certification_body_certifications.body_id
        and b.active
        and b.status = 'active'
    )
  );

create policy "certification body certifications owner writes" on public.certification_body_certifications
  for all using (public.is_owner())
  with check (public.is_owner());

insert into public.certification_body_certifications (body_id, certification_id, is_primary, scope_notes) values
  ('body_dgft', 'cert_iec', true, 'Official IEC route.'),
  ('body_sgs', 'cert_iso_9001', true, 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_bureau_veritas', 'cert_iso_9001', true, 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_intertek', 'cert_iso_9001', true, 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_tuv_nord', 'cert_iso_9001', true, 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_cdos_jaipur', 'cert_astm_stone', true, 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_cdos_jaipur', 'cert_en_ce_stone', true, 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_sgs', 'cert_en_ce_stone', false, 'Potential EU evidence support; verify scope.'),
  ('body_bureau_veritas', 'cert_en_ce_stone', false, 'Potential EU evidence support; verify scope.'),
  ('body_intertek', 'cert_en_ce_stone', false, 'Potential EU evidence support; verify scope.'),
  ('body_capexil', 'cert_origin_gsp', true, 'Potential origin/export documentation guidance; verify route.')
on conflict (body_id, certification_id) do update set
  is_primary=excluded.is_primary,
  scope_notes=excluded.scope_notes;

create or replace view public.export_requirement_catalog
with (security_invoker = true) as
select
  r.*,
  c.code as certification_code,
  c.name as certification_name,
  c.evidence_type as certification_evidence_type,
  c.renewal_period_months as certification_renewal_period_months,
  c.issuing_authority_type
from public.export_requirements r
left join public.certifications c on c.id = r.certification_id
where r.active;

comment on table public.certifications is
  'Reusable master records for certifications, registrations, lab reports, shipment documents, and operational compliance evidence.';

comment on column public.export_requirements.certification_id is
  'Reusable certification/specification referenced by this applicability rule.';

comment on column public.export_requirements.destination_markets is
  'Markets where this requirement applies. GLOBAL means market-independent.';

comment on column public.export_requirements.evidence_lifecycle_type is
  'Lifecycle category used by UI, AI roadmaps, renewal reminders, and verification workflows.';

comment on column public.readiness_evidence.next_check_at is
  'Future reminder/check timestamp, usually before expires_at, for renewal workflows.';

comment on table public.certification_body_certifications is
  'Normalized mapping from certification bodies/labs/portals to reusable certification specs.';

comment on view public.export_requirement_catalog is
  'Joined active export requirements with reusable certification metadata for UI and AI roadmap generation.';

```

===== FILE: supabase/migrations/202605240005_revert_out_of_scope_readiness.sql =====
```sql
-- Reversal of out-of-scope migrations 202605240003 and 202605240004.
-- These objects were created in PRs that violated the original Export Readiness
-- brief scope. They can be reintroduced later in dedicated, scoped PRs.

-- 202605240004_exporter_profile_leads.sql
drop function if exists public.create_public_exporter_profile_lead(
  text,
  text,
  text,
  text,
  text[],
  text
);

drop policy if exists "exporter profile leads own factory read" on public.exporter_profile_leads;
drop policy if exists "exporter profile leads own factory update" on public.exporter_profile_leads;
drop policy if exists "exporter profile leads owner delete" on public.exporter_profile_leads;

alter table if exists public.exporter_profile_leads disable row level security;

drop index if exists public.exporter_profile_leads_factory_status_idx;
drop table if exists public.exporter_profile_leads;

-- 202605240003_public_exporter_readiness.sql
drop function if exists public.get_public_exporter_readiness(text);

```

===== FILE: supabase/migrations/202605240006_factory_evidence_storage.sql =====
```sql
-- Factory Evidence storage bucket for Export Readiness uploads.
-- File path convention: {factory_id}/{requirement_id}/{timestamp}-{sanitized_filename}
-- Bucket is private. Reads happen via short-lived signed URLs generated by the app.

-- ── Bucket ────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'factory_evidence',
  'factory_evidence',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── Policies on storage.objects (scoped by bucket_id) ─────────────────────

drop policy if exists "factory_evidence read" on storage.objects;
drop policy if exists "factory_evidence insert" on storage.objects;
drop policy if exists "factory_evidence update" on storage.objects;
drop policy if exists "factory_evidence delete" on storage.objects;

create policy "factory_evidence read"
  on storage.objects for select
  using (
    bucket_id = 'factory_evidence'
    and (
      public.is_owner()
      or public.same_factory((storage.foldername(name))[1])
    )
  );

create policy "factory_evidence insert"
  on storage.objects for insert
  with check (
    bucket_id = 'factory_evidence'
    and (
      public.is_owner()
      or (
        public.current_profile_role() in ('admin', 'manager')
        and public.same_factory((storage.foldername(name))[1])
      )
    )
  );

create policy "factory_evidence update"
  on storage.objects for update
  using (
    bucket_id = 'factory_evidence'
    and (
      public.is_owner()
      or (
        public.current_profile_role() in ('admin', 'manager')
        and public.same_factory((storage.foldername(name))[1])
      )
    )
  )
  with check (
    bucket_id = 'factory_evidence'
    and (
      public.is_owner()
      or (
        public.current_profile_role() in ('admin', 'manager')
        and public.same_factory((storage.foldername(name))[1])
      )
    )
  );

create policy "factory_evidence delete"
  on storage.objects for delete
  using (
    bucket_id = 'factory_evidence'
    and (
      public.is_owner()
      or (
        public.current_profile_role() in ('admin', 'manager')
        and public.same_factory((storage.foldername(name))[1])
      )
    )
  );

comment on policy "factory_evidence read" on storage.objects is
  'Factory members read their own factory evidence files. Platform owner reads all.';
comment on policy "factory_evidence insert" on storage.objects is
  'Admin and manager roles in the same factory can upload. Owner can upload anywhere.';

```
