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
