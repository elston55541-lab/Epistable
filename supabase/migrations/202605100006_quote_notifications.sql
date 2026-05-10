-- Notifications for quote decisions and revised quotes.

create or replace function public.notify_factory_quote_decision(
  quote_id text,
  decision text,
  buyer_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.quotes;
  notification_title text;
  notification_msg text;
begin
  select * into q
  from public.quotes
  where id = quote_id;

  if not found then
    return;
  end if;

  notification_title := case
    when decision = 'accepted' then 'Quote accepted'
    when decision = 'revision_requested' then 'Quote changes requested'
    else 'Quote updated'
  end;

  notification_msg := concat(
    coalesce(q.buyer_company, q.buyer_name, 'Buyer'),
    case
      when decision = 'accepted' then ' accepted '
      when decision = 'revision_requested' then ' requested changes to '
      else ' updated '
    end,
    'quote ',
    q.id,
    ' for ',
    coalesce(q.stone, 'a slab'),
    '.',
    case when nullif(trim(buyer_note), '') is not null then concat(' Note: ', trim(buyer_note)) else '' end
  );

  insert into public.notifications (id, user_id, title, msg, icon, ts, read)
  select
    'N-' || upper(substr(md5(random()::text || clock_timestamp()::text || p.id), 1, 12)),
    p.id,
    notification_title,
    notification_msg,
    case when decision = 'accepted' then 'Won' else 'Edit' end,
    (extract(epoch from now()) * 1000)::bigint,
    false
  from public.profiles p
  where p.factory_id = q.factory_id
    and p.role in ('admin', 'manager')
    and p.status = 'active';
end;
$$;

create or replace function public.notify_buyer_revised_quote(quote_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.quotes;
begin
  select * into q
  from public.quotes
  where id = quote_id;

  if not found then
    return;
  end if;

  if not (public.is_owner() or public.same_factory(q.factory_id)) then
    raise exception 'Not allowed';
  end if;

  insert into public.notifications (id, user_id, title, msg, icon, ts, read)
  select
    'N-' || upper(substr(md5(random()::text || clock_timestamp()::text || p.id), 1, 12)),
    p.id,
    'Revised quote sent',
    concat(coalesce(q.factory_name, 'Factory'), ' sent a revised quote ', q.id, ' for ', coalesce(q.stone, 'your slab'), '.'),
    'Quote',
    (extract(epoch from now()) * 1000)::bigint,
    false
  from public.profiles p
  where p.factory_id = q.factory_id
    and lower(p.email) = lower(q.buyer_email)
    and p.role = 'buyer'
    and p.status = 'active';
end;
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

  perform public.notify_factory_quote_decision(quote_id, decision, message);

  return query
    select *
    from public.get_public_quote(quote_id);
end;
$$;

revoke execute on function public.notify_factory_quote_decision(text, text, text) from public;
grant execute on function public.notify_buyer_revised_quote(text) to authenticated;
grant execute on function public.respond_to_quote(text, text, text) to anon, authenticated;
