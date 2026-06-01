-- Reversal of out-of-scope migrations 202605240003 and 202605240004.
-- These objects were created in PRs that violated the original Export Readiness
-- brief scope. They can be reintroduced later in dedicated, scoped PRs.

-- 202605240004_exporter_profile_leads.sql
drop function if exists public.create_public_exporter_profile_lead(
  text,
  text,
  text,
  text,
  text[],
  text
);

drop policy if exists "exporter profile leads own factory read" on public.exporter_profile_leads;
drop policy if exists "exporter profile leads own factory update" on public.exporter_profile_leads;
drop policy if exists "exporter profile leads owner delete" on public.exporter_profile_leads;

alter table if exists public.exporter_profile_leads disable row level security;

drop index if exists public.exporter_profile_leads_factory_status_idx;
drop table if exists public.exporter_profile_leads;

-- 202605240003_public_exporter_readiness.sql
drop function if exists public.get_public_exporter_readiness(text);
