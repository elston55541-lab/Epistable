-- Public slab dispute creation for certificate pages.
-- Keeps disputes RLS closed while allowing anonymous QR viewers to report a problem with a real slab.

create or replace function public.create_public_slab_dispute(
  slab_id text,
  buyer_name text,
  buyer_company text default '',
  dispute_category text default 'other',
  dispute_details text default ''
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
  clean_details text := nullif(trim(dispute_details), '');
  clean_category text := coalesce(nullif(trim(dispute_category), ''), 'other');
begin
  if clean_name is null then
    raise exception 'Buyer name is required';
  end if;

  if clean_details is null then
    raise exception 'Dispute details are required';
  end if;

  if clean_category not in ('wrong_grade', 'defect_missed', 'measurement', 'other') then
    clean_category := 'other';
  end if;

  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    i.stone,
    i.grade
  into slab
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1;

  if slab.id is null then
    raise exception 'Slab not found';
  end if;

  new_id := 'DSP-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into public.disputes (
    id,
    slab_id,
    stone,
    grade,
    category,
    details,
    factory_id,
    factory_name,
    buyer_name,
    buyer_company,
    created_at,
    status
  ) values (
    new_id,
    slab.id,
    slab.stone,
    slab.grade,
    clean_category,
    clean_details,
    slab.factory_id,
    slab.factory_name,
    clean_name,
    coalesce(nullif(trim(buyer_company), ''), ''),
    (extract(epoch from now()) * 1000)::bigint,
    'open'
  );

  return new_id;
end;
$$;

grant execute on function public.create_public_slab_dispute(text, text, text, text, text) to anon, authenticated;
