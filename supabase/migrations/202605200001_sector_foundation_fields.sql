-- Add lightweight sector-agnostic foundation fields.
-- Current stone workflows can keep using existing columns, while future sectors
-- can use template keys and JSONB attributes without core schema changes.

alter table public.factories
  add column if not exists sector text not null default 'stone';

alter table public.inspections
  add column if not exists template_key text not null default 'stone_qc_basic',
  add column if not exists attributes jsonb not null default '{}'::jsonb,
  add column if not exists compliance jsonb not null default '{}'::jsonb,
  add column if not exists ai_review jsonb not null default '{}'::jsonb,
  add column if not exists evidence_summary jsonb not null default '{}'::jsonb;

create index if not exists factories_sector_idx
  on public.factories (sector);

create index if not exists inspections_template_key_idx
  on public.inspections (template_key);

create index if not exists inspections_attributes_gin_idx
  on public.inspections using gin (attributes);

create index if not exists inspections_compliance_gin_idx
  on public.inspections using gin (compliance);

comment on column public.factories.sector is
  'Business sector for configurable workflows, for example stone, ceramics, textiles, or metal.';

comment on column public.inspections.template_key is
  'Inspection/compliance template key used to interpret sector-specific attributes.';

comment on column public.inspections.attributes is
  'Sector-specific inspection attributes. Avoid adding new sector-specific core columns when this can hold the data.';

comment on column public.inspections.compliance is
  'Template-driven compliance/readiness answers and computed requirement state.';

comment on column public.inspections.ai_review is
  'Normalized AI review metadata such as suggested grade, final grade, override reason, and reviewed timestamp.';

comment on column public.inspections.evidence_summary is
  'Normalized evidence coverage summary such as photo slots, traceability completeness, and audit readiness.';
