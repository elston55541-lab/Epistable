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

