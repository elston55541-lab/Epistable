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

