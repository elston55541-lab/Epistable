-- Export readiness foundation.
-- Additive, parallel module: factories remain the exporter anchor for now.

create table if not exists public.export_readiness_profiles (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  sector text not null default 'stone',
  product_type text not null,
  destination_markets text[] not null default '{}'::text[],
  current_certifications text[] not null default '{}'::text[],
  company_size text,
  export_status text not null default 'planning'
    check (export_status in ('planning', 'first_export', 'active_exporter', 'expanding_markets')),
  readiness_stage text not null default 'draft'
    check (readiness_stage in ('draft', 'profile_complete', 'roadmap_ready', 'documents_in_progress', 'buyer_ready')),
  onboarding_inputs jsonb not null default '{}'::jsonb,
  onboarding_completed_at bigint,
  last_reviewed_at bigint,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.export_requirements (
  id text primary key,
  sector text not null,
  product_type text not null default 'any',
  destination_market text not null default 'any',
  requirement_type text not null
    check (requirement_type in ('registration', 'certification', 'standard', 'documentation', 'compliance', 'packaging', 'testing')),
  requirement_name text not null,
  description text not null,
  is_mandatory boolean not null default true,
  priority integer not null default 50 check (priority between 1 and 100),
  estimated_cost_min_inr integer,
  estimated_cost_max_inr integer,
  estimated_timeline_weeks_min integer,
  estimated_timeline_weeks_max integer,
  evidence_type text not null
    check (evidence_type in ('document_upload', 'certificate_number', 'lab_report', 'photo_evidence', 'checklist_confirmation', 'external_verification', 'factory_declaration')),
  evidence_instructions text,
  renewal_period_months integer,
  documents_required jsonb not null default '[]'::jsonb,
  evidence_examples jsonb not null default '[]'::jsonb,
  source_notes text,
  active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.certification_bodies (
  id text primary key,
  name text not null,
  body_type text not null default 'certification_body'
    check (body_type in ('certification_body', 'testing_lab', 'export_council', 'consultant', 'government_portal')),
  description text,
  accreditations jsonb not null default '[]'::jsonb,
  locations jsonb not null default '[]'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  website text,
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  featured_label text,
  commercial_disclosure text,
  response_sla_days integer,
  pricing_notes text,
  active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.certification_body_requirements (
  body_id text not null references public.certification_bodies(id) on delete cascade,
  requirement_id text not null references public.export_requirements(id) on delete cascade,
  scope_notes text,
  primary key (body_id, requirement_id)
);

create table if not exists public.certification_body_sectors (
  body_id text not null references public.certification_bodies(id) on delete cascade,
  sector text not null,
  product_types text[] not null default '{}'::text[],
  primary key (body_id, sector)
);

create table if not exists public.certification_body_markets (
  body_id text not null references public.certification_bodies(id) on delete cascade,
  destination_market text not null,
  scope_notes text,
  primary key (body_id, destination_market)
);

create table if not exists public.readiness_roadmaps (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  profile_id text not null references public.export_readiness_profiles(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'generated', 'in_progress', 'complete', 'archived')),
  generated_by text not null default 'manual'
    check (generated_by in ('manual', 'claude', 'imported')),
  model text,
  summary text,
  steps jsonb not null default '[]'::jsonb,
  gap_list jsonb not null default '[]'::jsonb,
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  generated_at bigint,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.readiness_evidence (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  profile_id text not null references public.export_readiness_profiles(id) on delete cascade,
  requirement_id text not null references public.export_requirements(id),
  roadmap_id text references public.readiness_roadmaps(id) on delete set null,
  evidence_type text not null
    check (evidence_type in ('document_upload', 'certificate_number', 'lab_report', 'photo_evidence', 'checklist_confirmation', 'external_verification', 'factory_declaration')),
  status text not null default 'missing'
    check (status in ('missing', 'pending', 'uploaded', 'submitted', 'verified', 'rejected', 'expired', 'not_applicable')),
  file_url text,
  certificate_number text,
  issuing_body_id text references public.certification_bodies(id) on delete set null,
  issued_at bigint,
  expires_at bigint,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.readiness_documents (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  profile_id text not null references public.export_readiness_profiles(id) on delete cascade,
  requirement_id text references public.export_requirements(id),
  evidence_id text references public.readiness_evidence(id) on delete set null,
  document_name text not null,
  document_type text not null default 'document',
  status text not null default 'needed'
    check (status in ('needed', 'uploaded', 'submitted', 'verified', 'rejected', 'expired', 'not_applicable')),
  file_url text,
  notes text,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists export_readiness_profiles_factory_idx on public.export_readiness_profiles(factory_id);
create index if not exists export_readiness_profiles_sector_product_idx on public.export_readiness_profiles(sector, product_type);
create index if not exists export_requirements_lookup_idx on public.export_requirements(sector, product_type, destination_market, active, priority);
create index if not exists export_requirements_type_idx on public.export_requirements(requirement_type, evidence_type);
create index if not exists certification_bodies_active_featured_idx on public.certification_bodies(active, is_featured, is_verified);
create index if not exists readiness_roadmaps_factory_profile_idx on public.readiness_roadmaps(factory_id, profile_id, status);
create index if not exists readiness_evidence_factory_profile_idx on public.readiness_evidence(factory_id, profile_id, status);
create index if not exists readiness_evidence_requirement_idx on public.readiness_evidence(requirement_id, status);
create index if not exists readiness_documents_factory_profile_idx on public.readiness_documents(factory_id, profile_id, status);

alter table public.export_readiness_profiles enable row level security;
alter table public.export_requirements enable row level security;
alter table public.certification_bodies enable row level security;
alter table public.certification_body_requirements enable row level security;
alter table public.certification_body_sectors enable row level security;
alter table public.certification_body_markets enable row level security;
alter table public.readiness_roadmaps enable row level security;
alter table public.readiness_evidence enable row level security;
alter table public.readiness_documents enable row level security;

create policy "export readiness profiles own factory" on public.export_readiness_profiles
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "export requirements read active" on public.export_requirements
  for select using (active or public.is_owner());

create policy "export requirements owner writes" on public.export_requirements
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "certification bodies read active" on public.certification_bodies
  for select using (active or public.is_owner());

create policy "certification bodies owner writes" on public.certification_bodies
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "certification body requirements read active" on public.certification_body_requirements
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.certification_bodies b
      where b.id = certification_body_requirements.body_id and b.active
    )
  );

create policy "certification body requirements owner writes" on public.certification_body_requirements
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "certification body sectors read active" on public.certification_body_sectors
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.certification_bodies b
      where b.id = certification_body_sectors.body_id and b.active
    )
  );

create policy "certification body sectors owner writes" on public.certification_body_sectors
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "certification body markets read active" on public.certification_body_markets
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.certification_bodies b
      where b.id = certification_body_markets.body_id and b.active
    )
  );

create policy "certification body markets owner writes" on public.certification_body_markets
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "readiness roadmaps own factory" on public.readiness_roadmaps
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "readiness evidence own factory" on public.readiness_evidence
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "readiness documents own factory" on public.readiness_documents
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

insert into public.export_requirements (
  id, sector, product_type, destination_market, requirement_type, requirement_name,
  description, is_mandatory, priority, estimated_cost_min_inr, estimated_cost_max_inr,
  estimated_timeline_weeks_min, estimated_timeline_weeks_max, evidence_type,
  evidence_instructions, renewal_period_months, documents_required, evidence_examples, source_notes
) values
  (
    'stone_any_any_iec',
    'stone', 'any', 'any', 'registration', 'Importer Exporter Code (IEC)',
    'DGFT registration required for Indian businesses to import or export goods.',
    true, 95, 500, 2000, 1, 2, 'certificate_number',
    'Enter IEC number and upload the DGFT IEC certificate or acknowledgement.',
    null,
    '["IEC certificate","PAN/GST details","bank details used for IEC"]'::jsonb,
    '["IEC number","DGFT certificate PDF"]'::jsonb,
    'Exporter should verify latest DGFT process before application.'
  ),
  (
    'stone_any_any_iso_9001',
    'stone', 'any', 'any', 'certification', 'ISO 9001 Quality Management System',
    'Quality management system certification commonly requested by international buyers and larger procurement teams.',
    false, 80, 120000, 300000, 8, 16, 'certificate_number',
    'Upload ISO 9001 certificate, certificate number, issuing body, issue date, and expiry date.',
    36,
    '["ISO 9001 certificate","audit report or scope statement","quality manual or process evidence"]'::jsonb,
    '["valid certificate","scope covering stone processing/export operations"]'::jsonb,
    'Scope, accreditation, and expiry must be checked with the issuing body.'
  ),
  (
    'stone_granite_us_astm',
    'stone', 'granite', 'US', 'testing', 'ASTM Dimensional Stone Test Evidence',
    'US buyers often request ASTM-based material test evidence for dimensional stone performance and suitability.',
    true, 85, 25000, 90000, 2, 6, 'lab_report',
    'Upload relevant ASTM lab reports for the stone type and buyer specification.',
    null,
    '["ASTM lab test report","sample identification","test method references"]'::jsonb,
    '["compressive strength report","absorption/density report","abrasion or flexural test where requested"]'::jsonb,
    'Exact ASTM methods depend on buyer specification and product application.'
  ),
  (
    'stone_marble_us_astm',
    'stone', 'marble', 'US', 'testing', 'ASTM Dimensional Stone Test Evidence',
    'US buyers often request ASTM-based material test evidence for marble performance and suitability.',
    true, 85, 25000, 90000, 2, 6, 'lab_report',
    'Upload relevant ASTM lab reports for marble and the buyer specification.',
    null,
    '["ASTM lab test report","sample identification","test method references"]'::jsonb,
    '["absorption/density report","flexural strength report","abrasion report where requested"]'::jsonb,
    'Exact ASTM methods depend on buyer specification and product application.'
  ),
  (
    'stone_any_eu_en_ce_evidence',
    'stone', 'any', 'EU', 'standard', 'EN / CE Evidence for Construction Stone',
    'EU construction buyers may require EN standard evidence and CE-related documentation depending on product use and harmonised requirements.',
    true, 90, 40000, 150000, 4, 10, 'lab_report',
    'Upload EN test reports, declaration/performance documentation where applicable, and any buyer-specific compliance pack.',
    null,
    '["EN lab reports","Declaration of Performance if applicable","product technical data sheet"]'::jsonb,
    '["EN test report","DoP or technical declaration","traceable sample reference"]'::jsonb,
    'Applicability depends on product category, use case, and current EU rules; verify with an accredited advisor or notified body where needed.'
  ),
  (
    'stone_any_eu_responsible_sourcing',
    'stone', 'any', 'EU', 'compliance', 'Responsible Sourcing and Due Diligence Evidence',
    'EU buyers increasingly ask for origin, social, environmental, and ethical sourcing evidence for stone supply chains.',
    true, 75, 10000, 120000, 2, 12, 'external_verification',
    'Upload quarry/source details, supplier declarations, social audit evidence, and traceability records.',
    12,
    '["supplier declaration","quarry/source record","social audit or due diligence evidence","traceability sheet"]'::jsonb,
    '["source map","audit report","signed supplier declaration","batch traceability export"]'::jsonb,
    'Specific due diligence expectations vary by buyer and jurisdiction.'
  ),
  (
    'stone_any_any_silica_environment',
    'stone', 'any', 'any', 'compliance', 'Silica Dust and Environmental Compliance',
    'Factories should maintain worker safety, dust-control, water/waste, and environmental compliance evidence for buyer audits.',
    true, 70, 10000, 200000, 2, 16, 'document_upload',
    'Upload relevant safety/environment registrations, monitoring records, SOPs, PPE evidence, and corrective actions.',
    12,
    '["dust-control SOP","PPE records","environmental consent or local compliance evidence","water/waste records"]'::jsonb,
    '["PPE checklist","dust extraction maintenance log","water recycling or waste record"]'::jsonb,
    'Local legal requirements and buyer audit criteria should be verified for each factory.'
  ),
  (
    'stone_any_any_origin_gsp',
    'stone', 'any', 'any', 'documentation', 'Certificate of Origin / Preferential Origin Documents',
    'Export shipments usually need origin documentation; some markets may require preferential origin or GSP-related documents where applicable.',
    true, 65, 1000, 10000, 1, 3, 'document_upload',
    'Upload sample Certificate of Origin, chamber/export council documentation, or shipment-specific origin documents.',
    null,
    '["Certificate of Origin","invoice","packing list","shipping bill references"]'::jsonb,
    '["CoO PDF","shipment document pack"]'::jsonb,
    'Exact document route depends on shipment, destination, and scheme eligibility.'
  ),
  (
    'stone_any_any_packaging_labeling',
    'stone', 'any', 'any', 'packaging', 'Export Packaging and Labelling Requirements',
    'Stone exports need buyer-appropriate packing, labelling, handling marks, and wood-packaging compliance where relevant.',
    true, 60, 5000, 60000, 1, 4, 'photo_evidence',
    'Upload packaging photos, crate labels, packing list, and fumigation or ISPM-15 evidence where wooden packaging is used.',
    null,
    '["packing list","crate label photo","packaging photos","fumigation/ISPM-15 evidence if applicable"]'::jsonb,
    '["label photo","crate photo","packing list","fumigation certificate"]'::jsonb,
    'Destination and buyer packaging requirements should be checked before shipment.'
  )
on conflict (id) do update set
  sector=excluded.sector,
  product_type=excluded.product_type,
  destination_market=excluded.destination_market,
  requirement_type=excluded.requirement_type,
  requirement_name=excluded.requirement_name,
  description=excluded.description,
  is_mandatory=excluded.is_mandatory,
  priority=excluded.priority,
  estimated_cost_min_inr=excluded.estimated_cost_min_inr,
  estimated_cost_max_inr=excluded.estimated_cost_max_inr,
  estimated_timeline_weeks_min=excluded.estimated_timeline_weeks_min,
  estimated_timeline_weeks_max=excluded.estimated_timeline_weeks_max,
  evidence_type=excluded.evidence_type,
  evidence_instructions=excluded.evidence_instructions,
  renewal_period_months=excluded.renewal_period_months,
  documents_required=excluded.documents_required,
  evidence_examples=excluded.evidence_examples,
  source_notes=excluded.source_notes,
  active=true,
  updated_at=(extract(epoch from now()) * 1000)::bigint;

insert into public.certification_bodies (
  id, name, body_type, description, accreditations, locations, contact, website,
  is_verified, is_featured, featured_label, commercial_disclosure, response_sla_days, pricing_notes
) values
  (
    'body_dgft',
    'DGFT',
    'government_portal',
    'Government portal for Importer Exporter Code and foreign trade services.',
    '[]'::jsonb,
    '[{"country":"India","mode":"online"}]'::jsonb,
    '{"channel":"online portal"}'::jsonb,
    'https://www.dgft.gov.in',
    true, false, null, 'Government portal; not a paid placement.', null, 'Government fees and consultant charges vary.'
  ),
  (
    'body_sgs',
    'SGS',
    'certification_body',
    'Global testing, inspection, and certification organisation. Verify current local scope and accreditation before engagement.',
    '[{"note":"Verify current accreditation and India scope before use."}]'::jsonb,
    '[{"country":"India"},{"country":"Global"}]'::jsonb,
    '{"channel":"website"}'::jsonb,
    'https://www.sgs.com',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current quotation and scope confirmation.'
  ),
  (
    'body_bureau_veritas',
    'Bureau Veritas',
    'certification_body',
    'Global testing, inspection, and certification organisation. Verify current local scope and accreditation before engagement.',
    '[{"note":"Verify current accreditation and India scope before use."}]'::jsonb,
    '[{"country":"India"},{"country":"Global"}]'::jsonb,
    '{"channel":"website"}'::jsonb,
    'https://www.bureauveritas.com',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current quotation and scope confirmation.'
  ),
  (
    'body_intertek',
    'Intertek',
    'certification_body',
    'Global testing, inspection, and certification organisation. Verify current local scope and accreditation before engagement.',
    '[{"note":"Verify current accreditation and India scope before use."}]'::jsonb,
    '[{"country":"India"},{"country":"Global"}]'::jsonb,
    '{"channel":"website"}'::jsonb,
    'https://www.intertek.com',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current quotation and scope confirmation.'
  ),
  (
    'body_tuv_nord',
    'TUV NORD',
    'certification_body',
    'Testing, inspection, and certification organisation. Verify current local scope and accreditation before engagement.',
    '[{"note":"Verify current accreditation and India scope before use."}]'::jsonb,
    '[{"country":"India"},{"country":"Global"}]'::jsonb,
    '{"channel":"website"}'::jsonb,
    'https://www.tuv-nord.com',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current quotation and scope confirmation.'
  ),
  (
    'body_cdos_jaipur',
    'CDOS Jaipur',
    'testing_lab',
    'Stone-sector testing and development organisation in Jaipur. Verify current test scope and accreditation status before use.',
    '[{"note":"Verify current test scope and accreditation status before use."}]'::jsonb,
    '[{"city":"Jaipur","state":"Rajasthan","country":"India"}]'::jsonb,
    '{"channel":"website / direct inquiry"}'::jsonb,
    null,
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current test quotation and sample requirements.'
  ),
  (
    'body_capexil',
    'CAPEXIL',
    'export_council',
    'Export promotion council relevant to stone and mineral product exporters. Verify membership and documentation routes directly.',
    '[]'::jsonb,
    '[{"country":"India"}]'::jsonb,
    '{"channel":"website / direct inquiry"}'::jsonb,
    'https://capexil.org',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Membership and document fees vary.'
  )
on conflict (id) do update set
  name=excluded.name,
  body_type=excluded.body_type,
  description=excluded.description,
  accreditations=excluded.accreditations,
  locations=excluded.locations,
  contact=excluded.contact,
  website=excluded.website,
  is_verified=excluded.is_verified,
  is_featured=excluded.is_featured,
  featured_label=excluded.featured_label,
  commercial_disclosure=excluded.commercial_disclosure,
  response_sla_days=excluded.response_sla_days,
  pricing_notes=excluded.pricing_notes,
  active=true,
  updated_at=(extract(epoch from now()) * 1000)::bigint;

insert into public.certification_body_sectors (body_id, sector, product_types) values
  ('body_dgft', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_sgs', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_bureau_veritas', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_intertek', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_tuv_nord', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_cdos_jaipur', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_capexil', 'stone', '{"granite","marble","sandstone"}'::text[])
on conflict (body_id, sector) do update set product_types=excluded.product_types;

insert into public.certification_body_markets (body_id, destination_market, scope_notes) values
  ('body_dgft', 'any', 'IEC and exporter registration route for Indian exporters.'),
  ('body_sgs', 'EU', 'Potential testing/certification support; verify current scope.'),
  ('body_sgs', 'US', 'Potential testing/certification support; verify current scope.'),
  ('body_bureau_veritas', 'EU', 'Potential testing/certification support; verify current scope.'),
  ('body_bureau_veritas', 'US', 'Potential testing/certification support; verify current scope.'),
  ('body_intertek', 'EU', 'Potential testing/certification support; verify current scope.'),
  ('body_intertek', 'US', 'Potential testing/certification support; verify current scope.'),
  ('body_tuv_nord', 'EU', 'Potential testing/certification support; verify current scope.'),
  ('body_cdos_jaipur', 'any', 'Stone testing support; verify current scope and accepted standards.'),
  ('body_capexil', 'any', 'Export promotion, membership, and document guidance; verify route directly.')
on conflict (body_id, destination_market) do update set scope_notes=excluded.scope_notes;

insert into public.certification_body_requirements (body_id, requirement_id, scope_notes) values
  ('body_dgft', 'stone_any_any_iec', 'Official IEC route.'),
  ('body_sgs', 'stone_any_any_iso_9001', 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_bureau_veritas', 'stone_any_any_iso_9001', 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_intertek', 'stone_any_any_iso_9001', 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_tuv_nord', 'stone_any_any_iso_9001', 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_cdos_jaipur', 'stone_granite_us_astm', 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_cdos_jaipur', 'stone_marble_us_astm', 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_cdos_jaipur', 'stone_any_eu_en_ce_evidence', 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_sgs', 'stone_any_eu_en_ce_evidence', 'Potential EU evidence support; verify scope.'),
  ('body_bureau_veritas', 'stone_any_eu_en_ce_evidence', 'Potential EU evidence support; verify scope.'),
  ('body_intertek', 'stone_any_eu_en_ce_evidence', 'Potential EU evidence support; verify scope.'),
  ('body_capexil', 'stone_any_any_origin_gsp', 'Potential origin/export documentation guidance; verify route.')
on conflict (body_id, requirement_id) do update set scope_notes=excluded.scope_notes;

comment on table public.export_readiness_profiles is
  'Exporter readiness profile anchored to factories. Captures product, target markets, certifications, and onboarding status.';

comment on table public.export_requirements is
  'Market-aware, category-aware export readiness requirements. UI and AI roadmap generation should read from this table instead of hardcoding certification logic.';

comment on column public.export_requirements.evidence_type is
  'Defines how readiness is proven: document, certificate number, lab report, photo, checklist, external verification, or declaration.';

comment on table public.certification_bodies is
  'Directory of certification bodies, labs, councils, portals, and advisors. Paid placement must be separated using is_featured and commercial_disclosure.';

comment on table public.readiness_evidence is
  'Evidence attached to export requirements, including files, certificate numbers, issuing bodies, validity dates, and verification status.';

comment on table public.readiness_roadmaps is
  'Generated or manual export-readiness roadmap linked to an exporter profile.';
