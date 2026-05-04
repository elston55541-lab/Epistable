-- Public slab inquiry creation for certificate pages.
-- Keeps inquiries RLS closed while allowing anonymous QR viewers to submit interest for a real slab.

create or replace function public.create_public_slab_inquiry(
  slab_id text,
  buyer_name text,
  buyer_company text default '',
  buyer_email text default '',
  buyer_message text default ''
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  slab record;
  new_id text;
  clean_name text := nullif(trim(buyer_name), '');
  clean_email text := lower(nullif(trim(buyer_email), ''));
begin
  if clean_name is null then
    raise exception 'Buyer name is required';
  end if;

  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    i.stone,
    i.grade,
    i.price_per_sq_ft
  into slab
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1;

  if slab.id is null then
    raise exception 'Slab not found';
  end if;

  new_id := 'INQ-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into public.inquiries (
    id,
    slab_id,
    stone,
    grade,
    price_per_sq_ft,
    factory_id,
    factory_name,
    buyer_name,
    buyer_company,
    buyer_email,
    message,
    created_at,
    status
  ) values (
    new_id,
    slab.id,
    slab.stone,
    slab.grade,
    slab.price_per_sq_ft,
    slab.factory_id,
    slab.factory_name,
    clean_name,
    coalesce(nullif(trim(buyer_company), ''), ''),
    coalesce(clean_email, ''),
    coalesce(nullif(trim(buyer_message), ''), ''),
    (extract(epoch from now()) * 1000)::bigint,
    'new'
  );

  return new_id;
end;
$$;

grant execute on function public.create_public_slab_inquiry(text, text, text, text, text) to anon, authenticated;
