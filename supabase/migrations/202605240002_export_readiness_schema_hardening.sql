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
