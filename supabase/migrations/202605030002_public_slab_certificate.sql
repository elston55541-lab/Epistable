-- Public one-slab certificate lookup for QR codes.
-- This keeps table RLS closed while allowing anonymous visitors to view a single scanned slab by ID.

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
