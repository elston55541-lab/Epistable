-- Notify buyers when factories update accepted quote fulfillment stages.

create or replace function public.update_quote_fulfillment(
  quote_id text,
  next_fulfillment_status text
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
  q public.quotes;
  stage_label text;
  stage_message text;
begin
  if next_fulfillment_status not in (
    'payment_pending',
    'payment_received',
    'dispatch_scheduled',
    'dispatched',
    'delivered',
    'sold'
  ) then
    raise exception 'Invalid fulfillment status';
  end if;

  select * into q
  from public.quotes
  where quotes.id = quote_id;

  if not found then
    raise exception 'Quote not found';
  end if;

  if not (public.is_owner() or public.same_factory(q.factory_id)) then
    raise exception 'Not allowed';
  end if;

  if q.status <> 'accepted' then
    raise exception 'Only accepted quotes can enter fulfillment';
  end if;

  stage_label := case next_fulfillment_status
    when 'payment_pending' then 'Payment pending'
    when 'payment_received' then 'Payment received'
    when 'dispatch_scheduled' then 'Dispatch scheduled'
    when 'dispatched' then 'Dispatched'
    when 'delivered' then 'Delivered'
    when 'sold' then 'Sold'
    else 'Quote updated'
  end;

  stage_message := concat(
    coalesce(q.factory_name, 'Factory'),
    ' updated quote ',
    q.id,
    ' for ',
    coalesce(q.stone, 'your slab'),
    ': ',
    stage_label,
    '.'
  );

  update public.quotes
  set
    fulfillment_status = next_fulfillment_status,
    updated_at = (extract(epoch from now()) * 1000)::bigint
  where quotes.id = quote_id;

  insert into public.notifications (id, user_id, title, msg, icon, ts, read)
  select
    'N-' || upper(substr(md5(random()::text || clock_timestamp()::text || p.id), 1, 12)),
    p.id,
    concat('Quote update: ', stage_label),
    stage_message,
    case
      when next_fulfillment_status = 'payment_received' then 'Paid'
      when next_fulfillment_status in ('dispatch_scheduled', 'dispatched') then 'Ship'
      when next_fulfillment_status in ('delivered', 'sold') then 'Done'
      else 'Quote'
    end,
    (extract(epoch from now()) * 1000)::bigint,
    false
  from public.profiles p
  where p.factory_id = q.factory_id
    and lower(p.email) = lower(q.buyer_email)
    and p.role = 'buyer'
    and p.status = 'active';

  return query
    select *
    from public.get_public_quote(quote_id);
end;
$$;

grant execute on function public.update_quote_fulfillment(text, text) to authenticated;
