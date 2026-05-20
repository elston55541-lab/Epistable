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
- audit integrity state such as finalized, locked, and revision metadata.

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

Current stone workflows can continue using existing fields while future code gradually writes normalized data into the generic fields.

## Product Guidance

Keep the product sellable for stone factories now.

Make new foundation work sector-safe by default.

Avoid slowing sales and pilots with a full generic rewrite before the stone workflow is proven.
