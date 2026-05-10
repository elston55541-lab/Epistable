-- Buyer decisions on public quote links.

alter table public.quotes
  add column if not exists buyer_message text,
  add column if not exists buyer_decided_at bigint;

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'revision_requested', 'expired'));

drop function if exists public.get_public_quote(text);

create function public.get_public_quote(quote_id text)
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
  buyer_message text,
  buyer_decided_at bigint,
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
    q.buyer_message,
    q.buyer_decided_at,
    q.created_at
  from public.quotes q
  where q.id = quote_id
  limit 1
$$;

create or replace function public.respond_to_quote(
  quote_id text,
  decision text,
  message text default null
)
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
  buyer_message text,
  buyer_decided_at bigint,
  created_at bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  if decision not in ('accepted', 'revision_requested') then
    raise exception 'Invalid quote decision';
  end if;

  next_status := decision;

  update public.quotes q
  set
    status = next_status,
    buyer_message = nullif(trim(message), ''),
    buyer_decided_at = (extract(epoch from now()) * 1000)::bigint,
    updated_at = (extract(epoch from now()) * 1000)::bigint
  where q.id = quote_id
    and q.status = 'sent'
    and (q.validity_ts is null or q.validity_ts >= (extract(epoch from now()) * 1000)::bigint);

  if not found then
    raise exception 'Quote is not available for decision';
  end if;

  return query
    select *
    from public.get_public_quote(quote_id);
end;
$$;

grant execute on function public.get_public_quote(text) to anon, authenticated;
grant execute on function public.respond_to_quote(text, text, text) to anon, authenticated;
