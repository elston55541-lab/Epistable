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

