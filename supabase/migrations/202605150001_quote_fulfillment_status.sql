-- Quote fulfillment tracking after a buyer accepts a quote.

alter table public.quotes
  add column if not exists fulfillment_status text not null default 'not_started';

alter table public.quotes
  drop constraint if exists quotes_fulfillment_status_check;

alter table public.quotes
  add constraint quotes_fulfillment_status_check
  check (fulfillment_status in (
    'not_started',
    'payment_pending',
    'payment_received',
    'dispatch_scheduled',
    'dispatched',
    'delivered',
    'sold'
  ));

update public.quotes
set fulfillment_status = 'payment_pending'
where status = 'accepted'
  and fulfillment_status = 'not_started';

drop function if exists public.respond_to_quote(text, text, text);
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
  fulfillment_status text,
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
    q.fulfillment_status,
    q.buyer_message,
    q.buyer_decided_at,
    q.created_at
  from public.quotes q
  where q.id = quote_id
  limit 1
$$;

create function public.respond_to_quote(
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
  fulfillment_status text,
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
    fulfillment_status = case when decision = 'accepted' then 'payment_pending' else 'not_started' end,
    buyer_message = nullif(trim(message), ''),
    buyer_decided_at = (extract(epoch from now()) * 1000)::bigint,
    updated_at = (extract(epoch from now()) * 1000)::bigint
  where q.id = quote_id
    and q.status = 'sent'
    and (q.validity_ts is null or q.validity_ts >= (extract(epoch from now()) * 1000)::bigint);

  if not found then
    raise exception 'Quote is not available for decision';
  end if;

  perform public.notify_factory_quote_decision(quote_id, decision, message);

  return query
    select *
    from public.get_public_quote(quote_id);
end;
$$;

grant execute on function public.get_public_quote(text) to anon, authenticated;
grant execute on function public.respond_to_quote(text, text, text) to anon, authenticated;
