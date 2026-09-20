# Epistable DeepSeek Code Bundle — Part 06: Supabase Trade & Compliance
Snapshot: 31d78c0ee3bd70f7a934b44140549048a41e6a01


===== FILE: supabase/migrations/202605100004_quote_decisions.sql =====
```sql
-- Buyer decisions on public quote links.

alter table public.quotes
  add column if not exists buyer_message text,
  add column if not exists buyer_decided_at bigint;

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'revision_requested', 'expired'));

drop function if exists public.get_public_quote(text);

create function public.get_public_quote(quote_id text)
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
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id,
    q.inquiry_id,
    q.slab_id,
    q.factory_id,
    q.factory_name,
    q.buyer_name,
    q.buyer_company,
    q.buyer_email,
    q.stone,
    q.grade,
    q.price_per_sq_ft,
    q.area_sq_ft,
    q.total_amount,
    q.validity_ts,
    q.notes,
    q.status,
    q.buyer_message,
    q.buyer_decided_at,
    q.created_at
  from public.quotes q
  where q.id = quote_id
  limit 1
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

  return query
    select *
    from public.get_public_quote(quote_id);
end;
$$;

grant execute on function public.get_public_quote(text) to anon, authenticated;
grant execute on function public.respond_to_quote(text, text, text) to anon, authenticated;

```

===== FILE: supabase/migrations/202605100005_quote_revisions.sql =====
```sql
-- Quote revision tracking.

alter table public.quotes
  add column if not exists parent_quote_id text references public.quotes(id) on delete set null,
  add column if not exists revision_number integer not null default 1;

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'revision_requested', 'revised', 'expired'));

create index if not exists quotes_parent_quote_idx
  on public.quotes (parent_quote_id, revision_number);

```

===== FILE: supabase/migrations/202605100006_quote_notifications.sql =====
```sql
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

```

===== FILE: supabase/migrations/202605150001_quote_fulfillment_status.sql =====
```sql
-- Quote fulfillment tracking after a buyer accepts a quote.

alter table public.quotes
  add column if not exists fulfillment_status text not null default 'not_started';

alter table public.quotes
  drop constraint if exists quotes_fulfillment_status_check;

alter table public.quotes
  add constraint quotes_fulfillment_status_check
  check (fulfillment_status in (
    'not_started',
    'payment_pending',
    'payment_received',
    'dispatch_scheduled',
    'dispatched',
    'delivered',
    'sold'
  ));

update public.quotes
set fulfillment_status = 'payment_pending'
where status = 'accepted'
  and fulfillment_status = 'not_started';

drop function if exists public.respond_to_quote(text, text, text);
drop function if exists public.get_public_quote(text);

create function public.get_public_quote(quote_id text)
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
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id,
    q.inquiry_id,
    q.slab_id,
    q.factory_id,
    q.factory_name,
    q.buyer_name,
    q.buyer_company,
    q.buyer_email,
    q.stone,
    q.grade,
    q.price_per_sq_ft,
    q.area_sq_ft,
    q.total_amount,
    q.validity_ts,
    q.notes,
    q.status,
    q.fulfillment_status,
    q.buyer_message,
    q.buyer_decided_at,
    q.created_at
  from public.quotes q
  where q.id = quote_id
  limit 1
$$;

create function public.respond_to_quote(
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
  next_status text;
begin
  if decision not in ('accepted', 'revision_requested') then
    raise exception 'Invalid quote decision';
  end if;

  next_status := decision;

  update public.quotes q
  set
    status = next_status,
    fulfillment_status = case when decision = 'accepted' then 'payment_pending' else 'not_started' end,
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

grant execute on function public.get_public_quote(text) to anon, authenticated;
grant execute on function public.respond_to_quote(text, text, text) to anon, authenticated;

```

===== FILE: supabase/migrations/202605150002_quote_fulfillment_notifications.sql =====
```sql
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

```

===== FILE: supabase/migrations/202605170001_inspection_query_indexes.sql =====
```sql
-- Speed up inspection reads used by factory dashboards, buyer inventory, and scan history.

create index if not exists inspections_factory_ts_idx
  on public.inspections (factory_id, ts desc);

create index if not exists inspections_user_ts_idx
  on public.inspections (user_id, ts desc);

create index if not exists inspections_factory_inventory_grade_ts_idx
  on public.inspections (factory_id, inventory_status, grade, ts desc);

create index if not exists inspections_supplier_ts_idx
  on public.inspections (supplier_id, ts desc)
  where supplier_id is not null;

```

===== FILE: supabase/migrations/202605200001_sector_foundation_fields.sql =====
```sql
-- Add lightweight sector-agnostic foundation fields.
-- Current stone workflows can keep using existing columns, while future sectors
-- can use template keys and JSONB attributes without core schema changes.

alter table public.factories
  add column if not exists sector text not null default 'stone';

alter table public.inspections
  add column if not exists template_key text not null default 'stone_qc_basic',
  add column if not exists attributes jsonb not null default '{}'::jsonb,
  add column if not exists compliance jsonb not null default '{}'::jsonb,
  add column if not exists ai_review jsonb not null default '{}'::jsonb,
  add column if not exists evidence_summary jsonb not null default '{}'::jsonb;

create index if not exists factories_sector_idx
  on public.factories (sector);

create index if not exists inspections_template_key_idx
  on public.inspections (template_key);

create index if not exists inspections_attributes_gin_idx
  on public.inspections using gin (attributes);

create index if not exists inspections_compliance_gin_idx
  on public.inspections using gin (compliance);

comment on column public.factories.sector is
  'Business sector for configurable workflows, for example stone, ceramics, textiles, or metal.';

comment on column public.inspections.template_key is
  'Inspection/compliance template key used to interpret sector-specific attributes.';

comment on column public.inspections.attributes is
  'Sector-specific inspection attributes. Avoid adding new sector-specific core columns when this can hold the data.';

comment on column public.inspections.compliance is
  'Template-driven compliance/readiness answers and computed requirement state.';

comment on column public.inspections.ai_review is
  'Normalized AI review metadata such as suggested grade, final grade, override reason, and reviewed timestamp.';

comment on column public.inspections.evidence_summary is
  'Normalized evidence coverage summary such as photo slots, traceability completeness, and audit readiness.';

```

===== FILE: supabase/migrations/202605200002_compliance_template_foundation.sql =====
```sql
-- Template foundation for sector-agnostic compliance and inspection readiness.
-- Application logic can gradually move from hardcoded stone checks to these templates.

create table if not exists public.compliance_templates (
  id text primary key,
  sector text not null,
  name text not null,
  description text,
  version integer not null default 1,
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  requirements jsonb not null default '[]'::jsonb,
  scoring jsonb not null default '{}'::jsonb,
  report_sections jsonb not null default '[]'::jsonb,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists compliance_templates_sector_status_idx
  on public.compliance_templates (sector, status);

insert into public.compliance_templates (
  id,
  sector,
  name,
  description,
  requirements,
  scoring,
  report_sections
) values (
  'stone_qc_basic',
  'stone',
  'Stone QC Basic',
  'Starter template for stone slab quality evidence, buyer-audit readiness, and certification-readiness preparation.',
  '[
    {"id":"photo_front","type":"photo","label":"Full slab photo","required":true},
    {"id":"photo_surface","type":"photo","label":"Surface close-up photo","required":true},
    {"id":"photo_edge","type":"photo","label":"Edge/corner photo","required":true},
    {"id":"trace_batch","type":"traceability","label":"Batch number","required":true},
    {"id":"trace_source","type":"traceability","label":"Source or supplier","required":true},
    {"id":"audit_calibration","type":"audit","label":"Calibration checked","required":true},
    {"id":"audit_checklist","type":"audit","label":"Inspection checklist complete","required":true},
    {"id":"capa_corrective_action","type":"capa","label":"Corrective action for defects","required_when":"defects_present"}
  ]'::jsonb,
  '{"photo":30,"traceability":30,"audit":25,"capa":15}'::jsonb,
  '[
    {"id":"certificate","label":"Slab certificate"},
    {"id":"traceability","label":"Traceability summary"},
    {"id":"defects","label":"Defect and CAPA summary"},
    {"id":"ai_review","label":"AI review summary"}
  ]'::jsonb
) on conflict (id) do update set
  sector=excluded.sector,
  name=excluded.name,
  description=excluded.description,
  requirements=excluded.requirements,
  scoring=excluded.scoring,
  report_sections=excluded.report_sections,
  updated_at=(extract(epoch from now()) * 1000)::bigint;

comment on table public.compliance_templates is
  'Configurable sector templates for inspection requirements, readiness scoring, and report sections.';

comment on column public.compliance_templates.requirements is
  'JSON array of required evidence, traceability, audit, and CAPA requirements interpreted by template-aware application code.';

```

===== FILE: supabase/migrations/202605200003_compliance_template_rls.sql =====
```sql
-- RLS for compliance templates.
-- Active templates are readable by authenticated users; owners can manage templates.

alter table public.compliance_templates enable row level security;

create policy "compliance templates read active" on public.compliance_templates
  for select using (
    status = 'active'
    or public.is_owner()
  );

create policy "compliance templates owner writes" on public.compliance_templates
  for all using (public.is_owner())
  with check (public.is_owner());

```

===== FILE: supabase/migrations/202605200004_inspection_integrity_fields.sql =====
```sql
-- Lightweight inspection integrity fields for future audit controls.
-- Current workflows remain unchanged until application code starts using these fields.

alter table public.inspections
  add column if not exists finalized_at bigint,
  add column if not exists finalized_by text,
  add column if not exists locked_at bigint,
  add column if not exists locked_by text,
  add column if not exists revision integer not null default 1,
  add column if not exists revision_note text;

create index if not exists inspections_finalized_at_idx
  on public.inspections (finalized_at desc)
  where finalized_at is not null;

create index if not exists inspections_locked_at_idx
  on public.inspections (locked_at desc)
  where locked_at is not null;

comment on column public.inspections.finalized_at is
  'Timestamp when an inspection was marked final for buyer/audit evidence.';

comment on column public.inspections.locked_at is
  'Timestamp when an inspection was locked against silent edits.';

comment on column public.inspections.revision is
  'Revision counter for future edited-record and audit trail workflows.';

comment on column public.inspections.revision_note is
  'Human-readable reason for the latest inspection revision.';

```

===== FILE: supabase/migrations/202605200005_backfill_generic_inspection_fields.sql =====
```sql
-- Backfill generic inspection fields from existing stone inspection data.
-- Run after 202605200001_sector_foundation_fields.sql.

update public.inspections
set
  template_key = coalesce(nullif(template_key, ''), 'stone_qc_basic'),
  attributes = coalesce(attributes, '{}'::jsonb)
    || jsonb_build_object(
      'stone', stone,
      'supplier', supplier,
      'grade', grade,
      'price_per_sq_ft', price_per_sq_ft,
      'export_ready', export_ready,
      'measurements', coalesce(measurements, '{}'::jsonb),
      'defects', coalesce(defects, '[]'::jsonb)
    ),
  compliance = coalesce(compliance, '{}'::jsonb)
    || jsonb_build_object(
      'calibration_checked', (lower(coalesce(measurements->'audit'->>'calibrationChecked', 'false')) = 'true'),
      'checklist_complete', (lower(coalesce(measurements->'audit'->>'checklistComplete', 'false')) = 'true'),
      'root_cause', measurements->'audit'->>'rootCause',
      'corrective_action', measurements->'audit'->>'correctiveAction',
      'action_owner', measurements->'audit'->>'actionOwner',
      'action_due', measurements->'audit'->>'actionDue'
    ),
  ai_review = coalesce(ai_review, '{}'::jsonb)
    || coalesce(measurements->'aiReview', '{}'::jsonb),
  evidence_summary = coalesce(evidence_summary, '{}'::jsonb)
    || jsonb_build_object(
      'photo_count', case
        when jsonb_typeof(photos) = 'array' then jsonb_array_length(photos)
        when photo is not null then 1
        else 0
      end,
      'traceability_fields', (
        select count(*)
        from jsonb_each_text(coalesce(measurements->'traceability', '{}'::jsonb)) as t(key, value)
        where nullif(value, '') is not null
      ),
      'audit_fields', (
        select count(*)
        from jsonb_each_text(coalesce(measurements->'audit', '{}'::jsonb)) as a(key, value)
        where nullif(value, '') is not null
      )
    )
where template_key = 'stone_qc_basic'
  or attributes = '{}'::jsonb
  or compliance = '{}'::jsonb
  or ai_review = '{}'::jsonb
  or evidence_summary = '{}'::jsonb;

```

===== FILE: supabase/migrations/202605200006_compliance_template_lifecycle.sql =====
```sql
-- Add lifecycle metadata for sector-agnostic compliance templates.
-- This keeps future template changes auditable without changing current app behavior.

alter table public.compliance_templates
  add column if not exists effective_from bigint,
  add column if not exists retired_at bigint,
  add column if not exists supersedes_template_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists compliance_templates_lifecycle_idx
  on public.compliance_templates (sector, status, effective_from, retired_at);

comment on column public.compliance_templates.effective_from is
  'Unix epoch milliseconds when this template version becomes valid for new inspections.';

comment on column public.compliance_templates.retired_at is
  'Unix epoch milliseconds when this template should stop being used for new inspections.';

comment on column public.compliance_templates.supersedes_template_id is
  'Optional template id that this template replaces or supersedes.';

comment on column public.compliance_templates.metadata is
  'Template authoring metadata such as source standard, owner, rollout notes, or sector-specific display hints.';


```
