-- Track whether a verified slab is available to buyers.

alter table public.inspections
  add column if not exists inventory_status text not null default 'available';

alter table public.inspections
  drop constraint if exists inspections_inventory_status_check;

alter table public.inspections
  add constraint inspections_inventory_status_check
  check (inventory_status in ('available', 'reserved', 'sold'));

create or replace function public.get_public_slab_certificate(slab_id text)
returns table (
  id text,
  factory_id text,
  factory_name text,
  factory_location text,
  factory_contact_email text,
  inspector text,
  stone text,
  supplier text,
  grade text,
  reason text,
  price_per_sq_ft numeric,
  export_ready boolean,
  inventory_status text,
  measurements jsonb,
  defects jsonb,
  notes text,
  photo text,
  photos jsonb,
  ts bigint,
  date text,
  "time" text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    f.location as factory_location,
    f.contact_email as factory_contact_email,
    i.inspector,
    i.stone,
    i.supplier,
    i.grade,
    i.reason,
    i.price_per_sq_ft::numeric,
    i.export_ready,
    coalesce(i.inventory_status, 'available') as inventory_status,
    coalesce(to_jsonb(i.measurements), '{}'::jsonb) as measurements,
    coalesce(to_jsonb(i.defects), '[]'::jsonb) as defects,
    i.notes,
    i.photo,
    coalesce(to_jsonb(i.photos), '[]'::jsonb) as photos,
    i.ts,
    i.date,
    i."time"
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1
$$;

grant execute on function public.get_public_slab_certificate(text) to anon, authenticated;

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
    i.price_per_sq_ft,
    coalesce(i.inventory_status, 'available') as inventory_status
  into slab
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1;

  if slab.id is null then
    raise exception 'Slab not found';
  end if;

  if slab.inventory_status <> 'available' then
    raise exception 'This slab is not currently available';
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
