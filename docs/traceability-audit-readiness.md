# Traceability and audit readiness

Epistable is moving beyond slab grading into a quality, traceability, and certification-readiness workflow for stone manufacturers.

This first implementation keeps the product lightweight:

- Inspectors can record quarry/source, batch, block, production line, operator, shipment, and customer references during a scan.
- Inspectors can mark calibration/checklist completion and add CAPA-style notes when defects are found.
- Factory users can review those fields from slab history.
- Buyers and auditors can see the same traceability and audit-readiness evidence on the public slab certificate.

No database migration is required for this version. The data is stored inside the existing inspection `measurements` JSON payload, which keeps the rollout low-risk while validating whether factories actually use these fields.

## Why this matters

Traceability and audit evidence are daily workflows. Certification audits are periodic, but the proof needed for them is created during normal production.

This feature helps Epistable become the operational evidence layer for:

- buyer quality programs,
- export documentation,
- ISO-style inspection records,
- batch-level quality history,
- supplier and production-line accountability,
- future CAPA and compliance reporting.

## Future upgrades

Once usage is proven, these fields can graduate into dedicated tables:

- `batches`
- `audit_events`
- `capa_actions`
- `calibration_logs`
- `production_lines`
- `shipments`

That would support richer reporting without changing the current MVP flow.

## Operating rhythm

For factories, the practical workflow should stay simple:

1. Scan every slab with required photo evidence.
2. Add source, batch, block, line, operator, shipment, and order references whenever available.
3. Mark calibration and checklist completion during inspection.
4. Add root cause and corrective action notes when defects are recorded.
5. Use History filters to find missing traceability, audit-ready slabs, and open CAPA gaps.
6. Export the audit evidence CSV before buyer reviews, management reviews, or audit preparation.

The public certificate should be positioned as an evidence record, not a third-party certification. It helps buyers and auditors inspect the factory's proof trail quickly.
