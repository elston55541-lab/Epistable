-- Template foundation for sector-agnostic compliance and inspection readiness.
-- Application logic can gradually move from hardcoded stone checks to these templates.

create table if not exists public.compliance_templates (
  id text primary key,
  sector text not null,
  name text not null,
  description text,
  version integer not null default 1,
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  requirements jsonb not null default '[]'::jsonb,
  scoring jsonb not null default '{}'::jsonb,
  report_sections jsonb not null default '[]'::jsonb,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists compliance_templates_sector_status_idx
  on public.compliance_templates (sector, status);

insert into public.compliance_templates (
  id,
  sector,
  name,
  description,
  requirements,
  scoring,
  report_sections
) values (
  'stone_qc_basic',
  'stone',
  'Stone QC Basic',
  'Starter template for stone slab quality evidence, buyer-audit readiness, and certification-readiness preparation.',
  '[
    {"id":"photo_front","type":"photo","label":"Full slab photo","required":true},
    {"id":"photo_surface","type":"photo","label":"Surface close-up photo","required":true},
    {"id":"photo_edge","type":"photo","label":"Edge/corner photo","required":true},
    {"id":"trace_batch","type":"traceability","label":"Batch number","required":true},
    {"id":"trace_source","type":"traceability","label":"Source or supplier","required":true},
    {"id":"audit_calibration","type":"audit","label":"Calibration checked","required":true},
    {"id":"audit_checklist","type":"audit","label":"Inspection checklist complete","required":true},
    {"id":"capa_corrective_action","type":"capa","label":"Corrective action for defects","required_when":"defects_present"}
  ]'::jsonb,
  '{"photo":30,"traceability":30,"audit":25,"capa":15}'::jsonb,
  '[
    {"id":"certificate","label":"Slab certificate"},
    {"id":"traceability","label":"Traceability summary"},
    {"id":"defects","label":"Defect and CAPA summary"},
    {"id":"ai_review","label":"AI review summary"}
  ]'::jsonb
) on conflict (id) do update set
  sector=excluded.sector,
  name=excluded.name,
  description=excluded.description,
  requirements=excluded.requirements,
  scoring=excluded.scoring,
  report_sections=excluded.report_sections,
  updated_at=(extract(epoch from now()) * 1000)::bigint;

comment on table public.compliance_templates is
  'Configurable sector templates for inspection requirements, readiness scoring, and report sections.';

comment on column public.compliance_templates.requirements is
  'JSON array of required evidence, traceability, audit, and CAPA requirements interpreted by template-aware application code.';
