-- Sector-safe production batch foundation for traceability.
-- Stone-specific source/block/shipment data can live in attributes until app workflows mature.

create table if not exists public.production_batches (
  id text primary key,
  factory_id text not null references public.factories(id),
  sector text not null default 'stone',
  batch_ref text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'shipped', 'archived')),
  supplier_id text references public.suppliers(id),
  supplier_name text not null default '',
  production_date bigint,
  customer_ref text not null default '',
  shipment_ref text not null default '',
  attributes jsonb not null default '{}'::jsonb,
  evidence_summary jsonb not null default '{}'::jsonb,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists production_batches_factory_status_idx
  on public.production_batches (factory_id, status, updated_at desc);

create index if not exists production_batches_ref_idx
  on public.production_batches (factory_id, batch_ref);

create index if not exists production_batches_supplier_idx
  on public.production_batches (supplier_id, updated_at desc);

alter table public.production_batches enable row level security;

drop policy if exists "production batches read own factory" on public.production_batches;
drop policy if exists "production batches manage own factory" on public.production_batches;

create policy "production batches read own factory" on public.production_batches
  for select using (
    public.is_owner()
    or public.same_factory(factory_id)
  );

create policy "production batches manage own factory" on public.production_batches
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

comment on table public.production_batches is
  'Sector-safe production or source batches used to group inspections, traceability evidence, customer/export references, and shipment context.';

comment on column public.production_batches.attributes is
  'Sector-specific batch attributes such as quarry source, block number, slab bundle, firing lot, textile lot, or metal heat number.';

comment on column public.production_batches.evidence_summary is
  'Computed or copied batch evidence summary such as scan count, readiness gaps, defect mix, and packet references.';

