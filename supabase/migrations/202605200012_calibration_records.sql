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

