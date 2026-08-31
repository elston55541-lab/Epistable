-- Processed-food sourcing model for the Epistable food conversion.
-- Additive: preserves legacy stone tables while introducing supplier/facility -> product/SKU -> lot structures.

create table if not exists public.food_products (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  name text not null,
  sku text not null,
  category text not null,
  description text,
  origin_country text default 'India',
  origin_region text,
  ingredients jsonb not null default '[]'::jsonb,
  allergens text[] not null default '{}'::text[],
  claims text[] not null default '{}'::text[],
  certifications text[] not null default '{}'::text[],
  destination_markets text[] not null default '{}'::text[],
  packaging_options jsonb not null default '[]'::jsonb,
  private_label_capable boolean not null default false,
  moq_value numeric,
  moq_unit text default 'MT',
  shelf_life_days integer,
  storage_conditions text,
  specification_summary jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique(factory_id, sku)
);

create table if not exists public.food_lots (
  id text primary key,
  product_id text not null references public.food_products(id) on delete cascade,
  factory_id text not null references public.factories(id) on delete cascade,
  lot_number text not null,
  production_date bigint,
  expiry_date bigint,
  available_quantity numeric,
  quantity_unit text default 'MT',
  packaging_configuration text,
  status text not null default 'available'
    check (status in ('draft','available','reserved','sold','hold','expired')),
  evidence_readiness integer not null default 0 check (evidence_readiness between 0 and 100),
  market_readiness text[] not null default '{}'::text[],
  coa_evidence_id text references public.readiness_evidence(id) on delete set null,
  traceability_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique(product_id, lot_number)
);

create table if not exists public.buyer_sourcing_requests (
  id text primary key,
  buyer_id text references public.profiles(id) on delete set null,
  product_query text not null,
  category text,
  destination_market text,
  quantity numeric,
  quantity_unit text default 'MT',
  max_moq numeric,
  required_certifications text[] not null default '{}'::text[],
  required_claims text[] not null default '{}'::text[],
  private_label_required boolean not null default false,
  min_evidence_readiness integer not null default 0 check (min_evidence_readiness between 0 and 100),
  packaging_requirements text,
  allergen_requirements text[] not null default '{}'::text[],
  specification_requirements jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','open','matched','rfq_sent','closed','cancelled')),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists food_products_search_idx on public.food_products(category, active, private_label_capable);
create index if not exists food_products_factory_idx on public.food_products(factory_id);
create index if not exists food_lots_product_status_idx on public.food_lots(product_id, status, evidence_readiness);
create index if not exists food_lots_factory_idx on public.food_lots(factory_id);
create index if not exists buyer_sourcing_requests_buyer_status_idx on public.buyer_sourcing_requests(buyer_id, status);

alter table public.food_products enable row level security;
alter table public.food_lots enable row level security;
alter table public.buyer_sourcing_requests enable row level security;

create policy "food products public active read" on public.food_products
  for select using (active or public.is_owner() or public.same_factory(factory_id));

create policy "food products own factory write" on public.food_products
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "food lots available public read" on public.food_lots
  for select using (status = 'available' or public.is_owner() or public.same_factory(factory_id));

create policy "food lots own factory write" on public.food_lots
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "buyer sourcing requests own buyer" on public.buyer_sourcing_requests
  for all using (public.is_owner() or buyer_id = auth.uid()::text)
  with check (public.is_owner() or buyer_id = auth.uid()::text);
