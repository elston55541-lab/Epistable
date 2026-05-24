-- Public, sanitized exporter-readiness profile.
-- This does not expose internal gaps or private evidence files.

create or replace function public.get_public_exporter_readiness(exporter_factory_id text)
returns table (
  factory_id text,
  factory_name text,
  factory_location text,
  profile jsonb,
  markets jsonb,
  evidence jsonb,
  last_reviewed_at bigint
)
language sql
security definer
set search_path = public
as $$
  with p as (
    select *
    from public.export_readiness_profiles
    where factory_id = exporter_factory_id
    order by updated_at desc
    limit 1
  ),
  f as (
    select id, name, location
    from public.factories
    where id = exporter_factory_id
  ),
  profile_markets as (
    select unnest(coalesce(nullif(p.destination_markets, '{}'::text[]), array['EU']::text[])) as market
    from p
  ),
  reqs as (
    select
      pm.market,
      r.id,
      r.requirement_name,
      r.requirement_type,
      r.is_mandatory,
      r.priority,
      r.evidence_type,
      r.evidence_lifecycle_type,
      r.certification_id
    from profile_markets pm
    join public.export_requirements r on r.active
      and r.sector = (select sector from p)
      and (r.product_type = 'any' or r.product_type = (select product_type from p) or (select product_type from p) = 'any')
      and (
        pm.market = any(coalesce(nullif(r.destination_markets, '{}'::text[]), array[r.destination_market]))
        or 'GLOBAL' = any(coalesce(nullif(r.destination_markets, '{}'::text[]), array[r.destination_market]))
        or 'any' = any(coalesce(nullif(r.destination_markets, '{}'::text[]), array[r.destination_market]))
      )
  ),
  scored as (
    select
      reqs.market,
      reqs.id,
      reqs.requirement_name,
      reqs.requirement_type,
      reqs.is_mandatory,
      reqs.priority,
      coalesce(e.status, 'missing') as status,
      e.certificate_number,
      e.issued_at,
      e.expires_at,
      e.file_url,
      coalesce(b.name, '') as issuing_body,
      case coalesce(e.status, 'missing')
        when 'verified' then 100
        when 'submitted' then 75
        when 'uploaded' then 70
        when 'pending' then 45
        when 'expired' then 20
        when 'rejected' then 10
        when 'not_applicable' then null
        else 0
      end as status_score
    from reqs
    left join public.readiness_evidence e
      on e.requirement_id = reqs.id
      and e.profile_id = (select id from p)
    left join public.certification_bodies b on b.id = e.issuing_body_id
  ),
  market_scores as (
    select
      market,
      count(*) filter (where is_mandatory) as total_required,
      count(*) filter (where status in ('submitted','uploaded','verified')) as evidence_count,
      count(*) filter (where status = 'verified') as verified_count,
      coalesce(round(
        sum((priority * coalesce(status_score, 0))::numeric) filter (where is_mandatory and status <> 'not_applicable')
        / nullif(sum(priority) filter (where is_mandatory and status <> 'not_applicable'), 0)
      ), 0)::integer as readiness_score
    from scored
    group by market
  ),
  public_evidence as (
    select *
    from scored
    where status in ('submitted','uploaded','verified')
  )
  select
    f.id as factory_id,
    f.name as factory_name,
    coalesce(f.location, '') as factory_location,
    jsonb_build_object(
      'sector', p.sector,
      'productType', p.product_type,
      'exportStatus', p.export_status,
      'companySize', coalesce(p.company_size, ''),
      'currentCertifications', p.current_certifications
    ) as profile,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'market', market,
        'readinessScore', readiness_score,
        'totalRequired', total_required,
        'evidenceCount', evidence_count,
        'verifiedCount', verified_count
      ) order by readiness_score desc, market)
      from market_scores
    ), '[]'::jsonb) as markets,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'market', market,
        'requirementName', requirement_name,
        'requirementType', requirement_type,
        'status', status,
        'certificateNumber', certificate_number,
        'issuingBody', issuing_body,
        'issuedAt', issued_at,
        'expiresAt', expires_at,
        'hasFile', file_url is not null
      ) order by market, requirement_name)
      from public_evidence
    ), '[]'::jsonb) as evidence,
    p.last_reviewed_at
  from p
  join f on true;
$$;

grant execute on function public.get_public_exporter_readiness(text) to anon, authenticated;

comment on function public.get_public_exporter_readiness(text) is
  'Returns a buyer-safe readiness profile. It exposes market scores and submitted/verified evidence signals only, not internal missing gaps or private files.';
