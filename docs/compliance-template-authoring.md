# Compliance Template Authoring

Use this guide when adding a new sector, inspection workflow, or buyer-audit readiness checklist.

The goal is to add new compliance behavior through `compliance_templates` and JSONB inspection fields, not through new core columns or sector-specific application rewrites.

## Template Identity

Every template should have a stable key:

- `stone_qc_basic`
- `ceramics_qc_basic`
- `generic_manufacturing_qc_basic`

Use lowercase words separated by underscores. Do not rename a template key after inspections have started using it.

When requirements change, create a new template key or versioned template row and link it with `supersedes_template_id`. Existing inspections should remain interpretable under the template they originally used.

## Required Shape

Each template should define:

- `sector`: broad business category such as `stone`, `ceramics`, `textiles`, or `metal`.
- `name`: human-readable workflow name.
- `description`: what the template prepares evidence for.
- `requirements`: required evidence, traceability, audit, and CAPA items.
- `scoring`: weights or scoring rules for readiness.
- `report_sections`: sections that should appear in buyer, audit, or pilot exports.
- `status`: use `active` only when the workflow is ready for users.
- `effective_from`: when this template version should become valid for new inspections.
- `retired_at`: when this template should stop being assigned to new inspections.
- `supersedes_template_id`: the older template key this one replaces, when applicable.
- `metadata`: authoring notes, standard references, rollout notes, and display hints.

## Requirement Categories

Prefer reusable categories:

- `photo_evidence`
- `traceability`
- `measurement`
- `audit_check`
- `capa`
- `ai_review`
- `commercial`

Avoid encoding a full industry rule in the category name. Put sector-specific detail inside the requirement label, field key, or metadata.

## Requirement Example

```json
{
  "key": "front_photo",
  "category": "photo_evidence",
  "label": "Front photo",
  "required": true,
  "source": "photos.front"
}
```

## Scoring Example

```json
{
  "weights": {
    "photo_evidence": 30,
    "traceability": 30,
    "audit_check": 20,
    "capa": 20
  },
  "pass_threshold": 80
}
```

Keep weights simple. Readiness scoring should explain missing proof, not pretend to be a formal certification result.

## Report Sections Example

```json
[
  "summary",
  "inspection_evidence",
  "traceability",
  "photo_evidence",
  "capa",
  "buyer_notes"
]
```

## Copy Rules

Use:

- buyer-audit-ready evidence
- certification-readiness preparation
- internal QC record
- traceability record
- evidence packet

Avoid:

- ISO certified by Epistable
- SGS-equivalent certificate
- official compliance certification
- third-party certification

Epistable organizes operational evidence. It should not claim to replace certification bodies.

## Release Checklist

Before marking a template `active`:

- Add the template through a migration.
- Confirm RLS allows authenticated reads.
- Confirm the app can still load if the template is absent.
- Confirm public reports say the record is evidence, not third-party certification.
- Add demo data only if it does not imply unsupported sectors are production-ready.

