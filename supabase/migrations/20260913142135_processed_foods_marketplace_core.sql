create table if not exists public.organizations (
  id text primary key,
  type text not null check (type in ('buyer','seller')),
  name text not null,
  country text,
  city text,
  website text,
  description text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create table if not exists public.products (
  id text primary key,
  seller_org_id text not null references public.organizations(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  ingredients text,
  country_of_origin text,
  moq numeric,
  moq_unit text,
  capacity numeric,
  capacity_unit text,
  packaging jsonb not null default '[]'::jsonb,
  shelf_life text,
  storage_requirements text,
  lead_time_days integer,
  export_markets jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  allergens jsonb not null default '[]'::jsonb,
  dietary_attributes jsonb not null default '[]'::jsonb,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  status text not null default 'draft' check (status in ('draft','active','inactive')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create table if not exists public.trade_documents (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  product_id text references public.products(id) on delete cascade,
  document_type text not null,
  title text not null,
  issuer text,
  reference_number text,
  issued_at bigint,
  expires_at bigint,
  file_url text,
  visibility text not null default 'buyers' check (visibility in ('public','buyers','private')),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','expired')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create table if not exists public.rfqs (
  id text primary key,
  buyer_org_id text not null references public.organizations(id),
  seller_org_id text references public.organizations(id),
  product_id text references public.products(id),
  product_category text,
  quantity numeric,
  quantity_unit text,
  destination_country text,
  destination_city text,
  required_by bigint,
  requirements text,
  status text not null default 'open' check (status in ('draft','open','quoted','negotiating','accepted','closed','cancelled')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create table if not exists public.trade_quotes (
  id text primary key,
  rfq_id text not null references public.rfqs(id) on delete cascade,
  seller_org_id text not null references public.organizations(id),
  currency text not null default 'USD',
  unit_price numeric,
  quantity numeric,
  quantity_unit text,
  total_amount numeric,
  incoterm text,
  lead_time_days integer,
  validity_ts bigint,
  notes text,
  status text not null default 'sent' check (status in ('draft','sent','accepted','revision_requested','revised','expired','rejected')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

alter table public.profiles add column if not exists organization_id text references public.organizations(id);
alter table public.profiles add column if not exists organization_role text;

alter table public.organizations enable row level security;
alter table public.products enable row level security;
alter table public.trade_documents enable row level security;
alter table public.rfqs enable row level security;
alter table public.trade_quotes enable row level security;

create index if not exists products_seller_org_idx on public.products(seller_org_id);
create index if not exists products_category_idx on public.products(category);
create index if not exists rfqs_buyer_org_idx on public.rfqs(buyer_org_id);
create index if not exists rfqs_seller_org_idx on public.rfqs(seller_org_id);
create index if not exists trade_quotes_rfq_idx on public.trade_quotes(rfq_id);
