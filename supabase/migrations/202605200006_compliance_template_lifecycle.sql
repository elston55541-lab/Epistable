-- Add lifecycle metadata for sector-agnostic compliance templates.
-- This keeps future template changes auditable without changing current app behavior.

alter table public.compliance_templates
  add column if not exists effective_from bigint,
  add column if not exists retired_at bigint,
  add column if not exists supersedes_template_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists compliance_templates_lifecycle_idx
  on public.compliance_templates (sector, status, effective_from, retired_at);

comment on column public.compliance_templates.effective_from is
  'Unix epoch milliseconds when this template version becomes valid for new inspections.';

comment on column public.compliance_templates.retired_at is
  'Unix epoch milliseconds when this template should stop being used for new inspections.';

comment on column public.compliance_templates.supersedes_template_id is
  'Optional template id that this template replaces or supersedes.';

comment on column public.compliance_templates.metadata is
  'Template authoring metadata such as source standard, owner, rollout notes, or sector-specific display hints.';

