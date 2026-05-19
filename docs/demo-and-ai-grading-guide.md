# Demo And AI Grading Guide

Use this guide to run a consistent sales demo and to position AI grading honestly.

## Demo Story

Epistable helps a stone factory turn inspection work into buyer trust.

The demo should show this chain:

1. Factory scans a slab.
2. Inspector captures evidence photos, measurements, defects, and notes.
3. AI suggests a grade.
4. Inspector confirms or overrides the grade.
5. The slab gets a public certificate and QR.
6. Buyer opens inventory, reviews certificate, and requests a quote.
7. Factory sends quote.
8. Buyer accepts or requests changes.
9. Factory tracks payment, dispatch, delivery, and sold status.

## Recommended Demo Data

Create one demo factory with:

- 8-12 scanned slabs
- At least 3 stone types
- At least 2 suppliers
- Mix of grades: Premium, Standard, Commercial, Rejected
- 2-3 slabs with visible defects
- 2 public buyer inquiries
- 2 quotes: one sent, one accepted
- 1 order moving through fulfillment

## Ideal Demo Factory

Use one clean fictional factory so every screen tells the same story.

- Factory: Jodhpur Export Stone Works
- Location: Rajasthan
- Plan: Pro
- Admin: factory admin
- Inspector: one day-shift inspector
- Buyer: one export buyer
- Suppliers: Aravalli Quarry Co., Desert Stone Supply, Makrana Select Blocks

## Demo Slab Mix

The sample inventory should include:

- 3 Premium export-ready slabs with complete traceability and no defects
- 3 Standard slabs with minor issues but good evidence
- 2 Commercial slabs with visible defects and corrective actions
- 1 Rejected slab with defect photos, root cause, and CAPA owner

At least five slabs should have:

- front photo
- surface close-up
- edge/corner photo
- source
- batch number
- production line
- operator
- calibration checked
- checklist complete

## Demo Batch Story

Create one batch that makes traceability obvious:

- Source: Aravalli Quarry Co.
- Batch: ARV-B-2405
- Block: BLK-17
- Line: Line 2
- Operator: R. Kumar
- Customer/export order: PO-DXB-1029
- Container/shipment: CONT-JDH-4421

Use this batch across three slabs so the audit packet and batch quality views have something meaningful to show.

## Demo Commercial Story

Use one buyer workflow:

1. Buyer opens a Premium slab certificate.
2. Buyer requests a quote for a specific area and delivery city.
3. Factory creates a quote.
4. Buyer accepts the quote.
5. Factory marks fulfillment as payment pending or dispatch scheduled.

This is the clearest way to show that Epistable is not just inspection software; it turns evidence into buyer movement.

## Buyer Value Proposition

For buyers:

- They can verify slab quality before committing.
- They can compare slabs faster.
- They can request quotes from a specific certified slab.
- They can track accepted quote/order status.
- They have evidence if a delivered slab does not match the certificate.

## Factory Value Proposition

For factories:

- Faster buyer trust through QR-backed certificates.
- Less back-and-forth around grade, defects, and measurements.
- Better supplier accountability through scorecards.
- More structured quote follow-up and order tracking.
- Stronger proof trail for disputes.

## How To Position AI Grading

Use this phrase:

> AI-assisted grading, confirmed by the inspector.

Do not position the model as a final autonomous grader yet. For MVP selling, the safest promise is:

- AI suggests grade and reasoning.
- Inspector confirms or overrides it.
- Evidence photos and measurements support the final certificate.
- The certificate is the commercial trust asset.

## Why Not Promise Fully Trained AI Yet

The product can sell before a custom stone-vision model exists because the immediate value is trust workflow:

- structured inspection,
- photo evidence,
- buyer certificate,
- quote conversion,
- dispute traceability,
- supplier analytics.

Custom image grading can become a premium capability after enough labeled slab data is collected.

## Future AI Training Data To Capture

Each scan should ideally retain:

- full slab photo,
- surface close-up,
- edge/corner photo,
- defect close-up when defects exist,
- stone type,
- supplier,
- AI suggested grade,
- final human-confirmed grade,
- override reason when the inspector changes the AI grade,
- measurements,
- defects,
- notes,
- buyer dispute outcome if any.

This creates the dataset needed for a future grading model.

## Current AI Review Capture

The scan workflow now stores the AI review record inside inspection measurements:

- suggested grade
- final inspector grade
- override reason
- review timestamp

Analytics should use this to monitor:

- reviewed scan count,
- AI/inspector alignment,
- override rate,
- repeated override reasons.

This is the right pre-training step. It creates an evaluation loop before investing in a custom vision model.

## AI Review Dataset Export

Factory analytics now includes an `Export AI Dataset` action in the AI Review Learning panel.

Use this export to review the human-in-the-loop grading dataset before any custom model work. It includes:

- slab ID and certificate URL,
- stone and supplier,
- defect tags,
- photo count and photo evidence labels,
- AI suggested grade,
- final inspector grade,
- override reason,
- review timestamp,
- key measurements and notes.

This export is not a model-training pipeline by itself. It is the dataset quality checkpoint: confirm that photo evidence is consistent, override reasons are useful, and final grades are reliable before spending money on image model training.

## Sales Demo Checklist

Before a demo:

- Run `docs/mvp-qa-checklist.md`.
- Open one public slab certificate.
- Open one buyer inventory page.
- Open one quote page.
- Confirm login works for factory admin.
- Confirm no demo account uses a production customer email.
- Confirm there is at least one convincing photo-backed certificate.

## Demo Closing Question

Ask the factory owner:

> If every slab leaving your factory had this certificate, would it reduce buyer doubt or sales follow-up time?

If yes, the next step is a pilot with one factory, one admin, two inspectors, and a limited batch of real slabs.
