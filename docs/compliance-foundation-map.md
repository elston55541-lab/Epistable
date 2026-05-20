# Compliance Foundation Map

This map explains how the buyer-audit-ready and compliance-ready foundations fit together.

Epistable should remain the operational evidence layer. It helps factories prepare, organize, and explain proof. It does not replace certification bodies.

## Core Flow

1. A factory performs inspections.
2. Inspections collect photos, measurements, defects, traceability, audit checks, and AI review context.
3. Inspections can be grouped into production batches.
4. Problems can become CAPA actions.
5. Calibration records prove equipment and tool-control readiness.
6. Evidence packets assemble certificates, inspections, batches, CAPA, quotes, and summaries for a buyer or audit discussion.
7. Activity logs preserve who changed or shared important evidence.

## Foundation Tables

| Table | Purpose |
| --- | --- |
| `compliance_templates` | Defines sector/workflow requirements, scoring, and report sections. |
| `production_batches` | Groups source, production, customer, shipment, and sector-specific traceability. |
| `batch_inspection_links` | Links inspections to batches as members, samples, representatives, or exceptions. |
| `capa_actions` | Tracks corrective/preventive actions with owner, due date, closure, and verification. |
| `calibration_records` | Tracks equipment calibration evidence and next due dates. |
| `evidence_packets` | Stores saved buyer, audit, pilot, or internal evidence packages. |
| `activity_logs` | Preserves operational events and future evidence snapshots/hashes. |

## What Stays In Existing Records

Current stone inspection workflows can keep using existing fields and nested `measurements` payloads while the app migrates gradually.

Do not force a generic rewrite before the pilot proves which fields factories actually use.

## What Moves Later

Move data into foundation tables when the product needs:

- recurring batch management,
- assigned CAPA ownership and due dates,
- calibration due-date tracking,
- saved evidence packets,
- template-driven scoring,
- audit event review.

## Sales Positioning

Say:

- buyer-audit-ready evidence,
- certification-readiness preparation,
- traceability and evidence automation,
- internal QC record,
- export evidence packet.

Do not say:

- ISO certified by Epistable,
- SGS-equivalent certificate,
- official compliance certification,
- third-party certification.

