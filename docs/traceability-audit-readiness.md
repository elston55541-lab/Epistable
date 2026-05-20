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

The `capa_actions` foundation is the first step toward that richer workflow: it can track issue, root cause, corrective action, preventive action, owner, due date, closure, verification, and supporting evidence without changing current inspections.

The `production_batches` foundation is the traceability companion: it groups source, supplier, production, customer, shipment, and sector-specific attributes while keeping the core schema reusable outside stone.

Batch-to-inspection links keep traceability flexible: a packet can show every slab in a batch, a sample set, representative records, or exceptions without duplicating inspection data.

## Operating rhythm

For factories, the practical workflow should stay simple:

1. Scan every slab with required photo evidence.
2. Add source, batch, block, line, operator, shipment, and order references whenever available.
3. Mark calibration and checklist completion during inspection.
4. Add root cause and corrective action notes when defects are recorded.
5. Use History filters to find missing traceability, audit-ready slabs, and open CAPA gaps.
6. Export the audit packet before buyer reviews, management reviews, or audit preparation.
7. Export the CSV when the reviewer needs spreadsheet analysis.

The public certificate should be positioned as an evidence record, not a third-party certification. It helps buyers and auditors inspect the factory's proof trail quickly.

Audit events should preserve enough context to explain who changed what, when it happened, which entity version was affected, and which evidence snapshot or packet was shared. The current activity log foundation can grow into that trail without changing the inspection workflow.

Saved evidence packets should become the durable record of what was shared for a buyer review, pilot review, internal review, or audit-readiness discussion. The packet is the shareable package; the inspection records remain the source evidence.

## Starter compliance templates

These are not formal legal templates. They are practical record shapes Epistable should support for factory operations and buyer communication.

### ISO-style QC record

- Inspection ID and QR certificate link
- Factory, inspector, date, and time
- Stone type, grade, supplier, and batch
- Measurements and photo evidence
- Defects and severity
- Calibration checked
- Inspection checklist complete
- Root cause and corrective action when defects exist
- Responsible person and due date

### Buyer inspection record

- Slab ID and certificate link
- Grade and price per sq ft
- Photos, defects, and notes
- Dimensions and polish/sound/edge checks
- Export-ready status
- Supplier/source and batch if available
- Quote or order reference if commercial discussion has started

### Export batch evidence checklist

- Quarry/source
- Supplier
- Batch/block number
- Production line and operator
- Customer/export order reference
- Container or shipment reference
- Slab certificate register
- Batch quality summary
- Defect summary
- Corrective actions for problem slabs

### Supplier quality scorecard

- Total slabs inspected
- Premium rate
- Rejection rate
- Top defect types
- Traceability coverage
- Repeat issue notes
- Recent CAPA actions
