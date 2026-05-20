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

