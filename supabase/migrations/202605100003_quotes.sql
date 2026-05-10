-- Quotes/proforma records generated from buyer inquiries.

create table if not exists public.quotes (
  id text primary key,
  inquiry_id text references public.inquiries(id) on delete set null,
  slab_id text references public.inspections(id) on delete set null,
  factory_id text references public.factories(id) on delete cascade,
  factory_name text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  stone text,
  grade text,
  price_per_sq_ft numeric,
  area_sq_ft numeric,
  total_amount numeric,
  validity_ts bigint,
  notes text,
  status text not null default 'sent',
  created_at bigint not null,
  updated_at bigint
);

alter table public.quotes enable row level security;

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'expired'));

drop policy if exists "quotes own factory" on public.quotes;

create policy "quotes own factory" on public.quotes
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create index if not exists quotes_factory_created_idx
  on public.quotes (factory_id, created_at desc);

create or replace function public.get_public_quote(quote_id text)
returns table (
  id text,
  inquiry_id text,
  slab_id text,
  factory_id text,
  factory_name text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  stone text,
  grade text,
  price_per_sq_ft numeric,
  area_sq_ft numeric,
  total_amount numeric,
  validity_ts bigint,
  notes text,
  status text,
  created_at bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id,
    q.inquiry_id,
    q.slab_id,
    q.factory_id,
    q.factory_name,
    q.buyer_name,
    q.buyer_company,
    q.buyer_email,
    q.stone,
    q.grade,
    q.price_per_sq_ft,
    q.area_sq_ft,
    q.total_amount,
    q.validity_ts,
    q.notes,
    q.status,
    q.created_at
  from public.quotes q
  where q.id = quote_id
  limit 1
$$;

grant execute on function public.get_public_quote(text) to anon, authenticated;
