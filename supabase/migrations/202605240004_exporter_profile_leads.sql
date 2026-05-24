-- Buyer lead capture from the public exporter readiness profile.

create table if not exists public.exporter_profile_leads (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  buyer_name text not null default '',
  buyer_email text not null default '',
  buyer_company text not null default '',
  requested_markets text[] not null default '{}'::text[],
  message text not null default '',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'packet_sent', 'closed')),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists exporter_profile_leads_factory_status_idx
  on public.exporter_profile_leads(factory_id, status, created_at desc);

alter table public.exporter_profile_leads enable row level security;

create policy "exporter profile leads own factory read" on public.exporter_profile_leads
  for select using (public.is_owner() or public.same_factory(factory_id));

create policy "exporter profile leads own factory update" on public.exporter_profile_leads
  for update using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "exporter profile leads owner delete" on public.exporter_profile_leads
  for delete using (public.is_owner());

create or replace function public.create_public_exporter_profile_lead(
  target_factory_id text,
  buyer_name text,
  buyer_email text,
  buyer_company text,
  requested_markets text[],
  message text
)
returns public.exporter_profile_leads
language plpgsql
security definer
set search_path = public
as $$
declare
  lead_row public.exporter_profile_leads;
begin
  if target_factory_id is null or trim(target_factory_id) = '' then
    raise exception 'Factory is required';
  end if;
  if buyer_email is null or trim(buyer_email) = '' then
    raise exception 'Buyer email is required';
  end if;

  insert into public.exporter_profile_leads (
    id, factory_id, buyer_name, buyer_email, buyer_company, requested_markets, message
  )
  values (
    'EPL-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
    target_factory_id,
    coalesce(trim(buyer_name), ''),
    lower(trim(buyer_email)),
    coalesce(trim(buyer_company), ''),
    coalesce(requested_markets, '{}'::text[]),
    coalesce(trim(message), '')
  )
  returning * into lead_row;

  return lead_row;
end;
$$;

grant execute on function public.create_public_exporter_profile_lead(text, text, text, text, text[], text) to anon, authenticated;

comment on table public.exporter_profile_leads is
  'Buyer requests from public exporter readiness profiles. Used to request full evidence packets without exposing private files publicly.';
