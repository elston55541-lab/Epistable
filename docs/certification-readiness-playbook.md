# Epistable Certification Readiness Playbook

## Positioning

Epistable is an AI-powered quality, traceability, and certification-readiness platform for stone manufacturers.

The product should not claim to replace SGS, Bureau Veritas, DNV, TUV, or any formal certification body. The stronger position is:

> Epistable helps factories create, organize, and share the daily evidence needed for buyer QC, internal audits, export readiness, and certification preparation.

## Primary Customer

The first customer segment should be export-oriented stone factories that sell slabs to buyers who care about quality proof, consistency, and documentation.

Best early buyers:

- Factory owners who want more buyer trust and better conversion.
- Factory admins who coordinate inspectors, buyers, quotes, and documents.
- Export teams who need clean evidence for buyers before shipment.
- Quality managers who are tired of WhatsApp photos, Excel sheets, and paper logs.

## Core Promise

Every slab scan should become a reusable trust asset.

That means each inspection should produce:

- A public QR-backed certificate.
- Photo evidence.
- Grade, defects, measurements, and price context.
- Traceability fields such as source, batch, block, line, operator, shipment, and customer reference.
- Audit readiness fields such as calibration, checklist completion, root cause, corrective action, owner, and due date.
- Buyer actions such as inquiry, quote, reserve, and dispute.

## Demo Story

Use this flow for product demos:

1. Factory admin logs in.
2. Inspector creates a slab scan with photos, measurements, defects, traceability, and audit fields.
3. Epistable creates a certificate with readiness score and QR link.
4. Buyer opens the certificate, reviews evidence, and sends an inquiry.
5. Factory sends a quote from the inquiry.
6. Buyer accepts the quote.
7. Factory marks the slab reserved or sold.
8. Owner views readiness, sales, quality, and evidence summaries.

The demo should make one thing obvious: Epistable turns normal factory QC work into buyer-facing proof and audit-ready records.

## MVP Readiness Gates

Before selling seriously, the product should pass these gates:

- Auth: owner, factory admin, inspector, and buyer login work predictably.
- Certificate: every scan creates a public certificate that loads quickly and looks credible on mobile.
- Evidence: scans capture photos, measurements, defects, traceability, and audit readiness fields.
- Buyer workflow: buyer can browse inventory, view certificate, send inquiry, receive quote, accept quote, and see status.
- Factory workflow: factory admin can manage team, buyers, inquiries, quotes, inventory status, disputes, and evidence exports.
- Owner workflow: owner can see factories, users, billing, readiness, activity, and platform-level risk.
- AI review loop: factories can see AI reviewed scans, AI overrides, override reasons, and export a focused AI review dataset before model training.
- Reliability: login, reload, buyer add, user management, certificate, inquiry, quote, and accept flows are tested end to end.
- Performance: login and dashboard load should feel fast enough for repeated daily use.

## What To Avoid

- Do not call Epistable a certification authority.
- Do not overbuild ERP features before the scan-to-certificate-to-buyer loop is excellent.
- Do not make AI grading the only value proposition before enough real image data exists.
- Do not hide evidence behind internal dashboards; certificates and buyer workflows are the trust layer.

## Near-Term Product Priorities

1. Make the scan workflow faster and more reliable.
2. Make public certificates feel premium and trustworthy.
3. Make buyer inventory filtering and quote conversion smooth.
4. Make readiness summaries easy to copy, export, and explain.
5. Add QA coverage around the critical buyer and factory flows.

## AI Grading Path

AI image grading should be treated as a later confidence layer, not the first sales dependency.

The right path:

1. Collect consistent slab photos with labels: front, surface, edge, defect close-up.
2. Store human-approved grade, defect list, measurements, stone type, and supplier context.
3. Build an evaluation set before training anything.
4. Start with AI-assisted recommendations and human override.
5. Only later market automated grading confidence once the model has enough real factory data.

Current product signals to monitor:

- AI reviewed scan count.
- AI override count and override rate.
- Repeated override reasons.
- Photo count and photo evidence labels in the AI dataset export.
- Whether final inspector grades stay consistent across stone types, suppliers, and batches.

