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
- final human-confirmed grade,
- measurements,
- defects,
- notes,
- buyer dispute outcome if any.

This creates the dataset needed for a future grading model.

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
