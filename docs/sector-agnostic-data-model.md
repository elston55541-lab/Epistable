# Sector-Agnostic Data Model Rules

Epistable should keep stone as the first wedge while the platform foundation stays usable for other manufacturing sectors.

## Standing Rule

Do not add new sector-specific core database columns unless there is a strong product reason.

Prefer:

- `factories.sector`
- `inspections.template_key`
- `inspections.attributes`
- `inspections.compliance`
- `inspections.ai_review`
- `inspections.evidence_summary`
- `compliance_templates.requirements`
- `compliance_templates.scoring`
- `compliance_templates.report_sections`
- compliance template lifecycle metadata such as effective dates, retired dates, replacement links, and authoring metadata
- inspection finalization, locking, and revision metadata for audit integrity

## What Belongs In Core Columns

Core columns should describe universal inspection concepts:

- organization/factory ownership,
- inspector/user,
- timestamps,
- status,
- grade/outcome,
- public certificate link identity,
- buyer/commercial workflow state,
- generic evidence and readiness fields,
- saved evidence packets assembled from source records,
- corrective and preventive action records linked to source evidence,
- audit integrity state such as finalized, locked, and revision metadata.
- audit event metadata such as source, severity, entity version, evidence hash, and snapshot.

## What Belongs In JSONB Attributes

Sector-specific inspection details belong in JSONB:

- stone thickness,
- polish level,
- quarry source,
- block number,
- ceramic firing batch,
- textile GSM,
- metal hardness,
- packaging seal checks.

The UI may still show sector-specific labels, but core schema should not need a new column for every sector.

## What Belongs In Templates

Compliance/readiness requirements should move toward `compliance_templates`:

- required photo slots,
- required traceability fields,
- required audit checks,
- CAPA trigger rules,
- readiness scoring weights,
- report sections.

Adding a new sector should mean adding a new template row and UI copy, not rewriting core app logic.

## Current Migration Path

The first foundation migrations add:

- `factories.sector`
- inspection template and JSONB foundation fields,
- `compliance_templates`
- starter `stone_qc_basic` template.
- inspection finalization, locking, and revision metadata for future audit trail enforcement.
- backfill from existing stone inspection records into generic JSONB fields.
- compliance template lifecycle metadata for future template versioning and rollout control.
- activity log evidence fields for richer audit trails without changing current app behavior.
- evidence packet records for future saved/shared audit, buyer, pilot, and internal exports.
- CAPA action records for future owner, due date, closure, verification, and evidence workflows.

Use `docs/supabase-migration-runbook.md` when applying these migrations manually in Supabase.

Current stone workflows can continue using existing fields while future code gradually writes normalized data into the generic fields.

Use `docs/compliance-template-authoring.md` before adding or activating a new sector template.

## Product Guidance

Keep the product sellable for stone factories now.

Make new foundation work sector-safe by default.

Avoid slowing sales and pilots with a full generic rewrite before the stone workflow is proven.
