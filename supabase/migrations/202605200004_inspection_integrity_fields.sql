-- Lightweight inspection integrity fields for future audit controls.
-- Current workflows remain unchanged until application code starts using these fields.

alter table public.inspections
  add column if not exists finalized_at bigint,
  add column if not exists finalized_by text,
  add column if not exists locked_at bigint,
  add column if not exists locked_by text,
  add column if not exists revision integer not null default 1,
  add column if not exists revision_note text;

create index if not exists inspections_finalized_at_idx
  on public.inspections (finalized_at desc)
  where finalized_at is not null;

create index if not exists inspections_locked_at_idx
  on public.inspections (locked_at desc)
  where locked_at is not null;

comment on column public.inspections.finalized_at is
  'Timestamp when an inspection was marked final for buyer/audit evidence.';

comment on column public.inspections.locked_at is
  'Timestamp when an inspection was locked against silent edits.';

comment on column public.inspections.revision is
  'Revision counter for future edited-record and audit trail workflows.';

comment on column public.inspections.revision_note is
  'Human-readable reason for the latest inspection revision.';
