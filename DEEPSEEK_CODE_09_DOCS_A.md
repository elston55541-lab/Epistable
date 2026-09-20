# Epistable DeepSeek Code Bundle — Part 09: Documentation A
Snapshot: 31d78c0ee3bd70f7a934b44140549048a41e6a01


===== FILE: docs/PROCESSED_FOODS_BRICS_ARCHITECTURE.md =====
```markdown
# Epistable — Processed Foods Cross-Border Trade Architecture

## Product position

Epistable is the verified trade infrastructure connecting processed-food manufacturers with international buyers across emerging markets.

BRICS is the initial trade corridor, not the permanent boundary of the platform.

## Core marketplace

### Buyer organisations
Buyer Admin, Procurement Manager, and Team Member accounts operate under a buyer organisation.

Core capabilities:
- Discover processed-food manufacturers and products
- Search/filter by category, origin, certifications, MOQ, capacity and export market
- View verified supplier, product and compliance evidence
- Compare suppliers
- Submit RFQs
- Receive and compare quotes
- Progress accepted quotes toward orders
- Track transactions and supplier relationships

### Seller organisations
Seller Admin, Sales/Export Manager, Compliance/QA Manager, and Team Member accounts operate under a seller organisation.

Core capabilities:
- Company/factory profile
- Product/SKU catalogue
- MOQ, capacity, lead time, packaging, shelf life and markets served
- Certifications, test reports and compliance documentation
- Export-readiness evidence
- Receive/manage RFQs
- Issue quotes
- Track buyer opportunities and orders

### Epistable platform
Platform Owner, Admin, Verification/Compliance and Support roles govern the marketplace.

Core capabilities:
- Approve and verify seller organisations
- Review certifications and compliance evidence
- Manage buyers, sellers, categories and products
- Marketplace governance and disputes
- Monitor RFQs, quotes and transactions
- Trust/readiness scoring
- Marketplace analytics
- Suspend/remove access

## Core transaction flow

Seller organisation -> company/factory profile -> product catalogue -> compliance evidence -> Epistable verification -> buyer discovery -> RFQ -> seller quote -> comparison/negotiation -> accepted quote -> order/transaction -> fulfilment -> trust history.

## Processed-food data model

Product categories should support spices and seasonings, snacks, sauces and condiments, ready-to-eat/ready-to-cook, beverages, bakery/confectionery, frozen/processed produce, ingredients and other packaged processed foods.

Product records should be able to capture:
- Product name and category
- Ingredients/specification
- Country of origin
- MOQ
- Production capacity
- Unit/packaging formats
- Shelf life and storage requirements
- Lead time
- Target/export markets
- Certifications
- Test reports / COA where applicable
- Allergen and dietary attributes where applicable
- Buyer-specific/private documents

## Trust layer

Epistable should differentiate itself from a directory by making trust and transaction readiness first-class platform objects:
- Organisation verification
- Factory verification
- Certification/document verification
- Product evidence completeness
- Export-readiness indicators
- Verification status and expiry dates
- Transaction/reliability history

Do not present an algorithmic trust score as a regulatory certification. Clearly distinguish Epistable verification from official regulatory or certification-body approval.

## Geographic strategy

Phase 1: Indian processed-food sellers -> buyers across BRICS and other relevant international markets.

Phase 2: Sellers and buyers across BRICS markets.

Phase 3: Broader emerging-market cross-border processed-food trade.

Architecture must therefore store country/currency/market attributes generically and must not hard-code the platform to India or a fixed BRICS membership list.

## Finance layer — later phase

Build the marketplace and trade data first. Once transaction data exists, add optional financial infrastructure such as payment protection, trade credit, invoice financing, purchase-order financing, insurance and logistics integrations through appropriately regulated partners. Epistable should not represent itself as a lender unless it becomes appropriately authorised.

### Finance-readiness data captured now

The transaction layer should already build the evidence base that regulated finance partners may later use. Accepted orders therefore preserve:

- Agreed order value, currency, quantity and Incoterm
- Purchase-order reference, issue date, value and payment terms when supplied
- Invoice reference, amount, issue/due dates and invoice status when supplied
- Payment status, amount paid and payment timestamp when verified
- Operational milestone timestamps from confirmation through production, inspection, dispatch, delivery and completion
- An append-only order-event history for transaction provenance and future underwriting/audit integrations

These fields are infrastructure, not a lending decision or credit score. Finance eligibility and underwriting remain the responsibility of appropriately regulated finance partners.

## Product principle

Epistable is not another B2B listing portal. The product should progressively connect four layers:

Discovery -> Verification -> Transaction -> Finance

Every major product decision should reinforce this progression.
```

===== FILE: docs/auth-hardening.md =====
```markdown
# Auth Hardening Rollout

Epistable has moved from client-side password checks to Supabase Auth + RLS-backed profile records.

## Why

Production credentials must be owned by Supabase Auth, while application access is controlled by `profiles.role`, `profiles.factory_id`, and Row Level Security.

## Safe rollout order

1. Apply migrations in a Supabase staging project first.
2. Create Supabase Auth users for owner, factory users, and buyers.
3. Ensure each profile has the correct `auth_user_id`, `role`, `factory_id`, and `status`.
4. Verify owner, factory admin, inspector, and buyer access in staging.
5. Confirm public RPCs expose only certificate/quote fields intended for anonymous buyers.
6. Confirm no plaintext password columns or password values are used by the frontend.
7. Deploy only after the MVP QA checklist passes.

## Environment variables

Set these in the deployment platform before cutover:

```text
VITE_SUPABASE_URL=https://gfmrzcfajuwxishfnbur.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_rymg6uYPUH3WMferT4UpNw_BaFSnSxS
```

The publishable anon key is still public by design. Security comes from Supabase Auth and RLS policies, not hiding the anon key.

## Current app status

Login uses Supabase Auth + `profiles`, and profile creation no longer stores plaintext passwords. New profiles still need a matching Supabase Auth user before they can sign in.

```

===== FILE: docs/certification-readiness-playbook.md =====
```markdown
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

Use `docs/factory-pilot-plan.md` to structure the first serious factory pilot and measure whether the product is ready to sell beyond demos.

Use `docs/sector-agnostic-data-model.md` when adding schema, compliance, or inspection fields so the platform can support future sectors without a core rewrite.

Use `docs/compliance-foundation-map.md` to understand how templates, batches, CAPA, calibration records, evidence packets, and activity logs fit together.

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


```

===== FILE: docs/cloudflare-build-repair.md =====
```markdown
# Cloudflare dependency-install repair

The supplied deployment log for c008c2f identifies the fatal error as npm 10.8.2 rejecting package-lock.json because esbuild 0.28.2 and its platform packages were absent. The earlier npm 11.9.0 clean install and GitHub checks accepted that lockfile, so those checks did not reproduce the host's installer.

Reproduced with `npx --yes npm@10.8.2 ci --dry-run --ignore-scripts --no-audit --no-fund`. Repaired with `npx --yes npm@10.8.2 install --package-lock-only --ignore-scripts --no-audit --no-fund`. The repair adds missing package entries; it changes no existing package versions. CI now installs npm 10.8.2 before the clean install, tests and production build.

There is also a runtime configuration mismatch: Cloudflare selects Node 18.20.8 despite the committed .node-version containing 24. The dependency engine warnings in the log require a newer Node runtime. Set NODE_VERSION to 24 in the Epistable Pages project's Preview and Production build variables, or remove the conflicting override so the repository file is honoured. This is a hosting setting, not an Auth/Supabase change. Cloudflare documents this setting at https://developers.cloudflare.com/pages/configuration/build-image/.

The dashboard was inaccessible behind Cloudflare security verification, so no hosting settings were changed by this repair. Frontend release still requires a passing Cloudflare preview and authenticated desktop/mobile verification before merging.

```

===== FILE: docs/compliance-foundation-map.md =====
```markdown
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


```

===== FILE: docs/compliance-template-authoring.md =====
```markdown
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


```

===== FILE: docs/demo-and-ai-grading-guide.md =====
```markdown
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
- stone, supplier, source, and batch,
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

```

===== FILE: docs/factory-pilot-plan.md =====
```markdown
# Epistable Factory Pilot Plan

## Goal

Run a focused factory pilot that proves Epistable can turn daily slab inspection into buyer-ready proof and audit-ready evidence.

The pilot should validate workflow value before investing heavily in custom AI model training.

## Pilot Scope

Target one export-oriented factory for 2 to 4 weeks.

Minimum pilot dataset:

- 100 slab inspections.
- 20 public slab certificates shared internally or with buyers.
- 10 buyer inquiries or quote conversations created from certificates or buyer inventory.
- 5 batch/source records with traceability fields completed.
- 3 CAPA records for rejected/problem slabs.
- 1 audit evidence packet exported and reviewed with the factory owner or quality manager.
- 1 pilot report exported from Analytics and reviewed with decision makers.
- 1 readiness gap report exported or copied and used for follow-up.
- 1 AI review dataset export reviewed for photo consistency and override quality.

## Success Metrics

Measure:

- Time needed to create a slab inspection record.
- Percentage of scans with full photo evidence.
- Percentage of scans with source/batch traceability.
- Percentage of scans with audit checklist completion.
- Buyer response to certificate links and quote workflow.
- Number of WhatsApp/manual follow-ups replaced by certificate links.
- AI override rate and common override reasons.
- Number of readiness gaps found and closed.
- Factory owner confidence in audit packet and readiness summary.

## Demo Narrative

Before Epistable:

- photos are scattered across WhatsApp,
- grades sit in memory or spreadsheets,
- buyer proof is recreated manually,
- audit evidence is gathered reactively.

After Epistable:

- every scan creates a certificate,
- every certificate carries evidence,
- every batch has traceability,
- every rejected slab can become CAPA,
- every factory can export an audit packet, pilot report, and readiness gap report.

## Pilot Exit Criteria

The pilot is successful when:

- factory staff can complete scans without hand-holding,
- certificates are credible enough to share with buyers,
- readiness summaries identify real gaps,
- readiness gap reports help staff close missing evidence,
- export packets reduce audit/documentation effort,
- AI review data is consistent enough to justify deeper model work.

## What Not To Promise

Do not promise third-party certification.

Do not promise fully automated AI grading yet.

Do not promise ERP replacement.

Promise evidence automation, traceability, buyer trust, and certification readiness.

```

===== FILE: docs/marketplace-access-foundation.md =====
```markdown
# Marketplace access foundation — Phase 0

Applied to Supabase project gfmrzcfajuwxishfnbur on 2026-09-13.
Production migration: 20260913154327_marketplace_access_foundation.
Schema baseline: 20260913142135_processed_foods_marketplace_core (PR #216).

## Authority and existing auth

Existing Supabase logins, profiles, legacy roles and legacy RLS policies are preserved.
Marketplace authority comes ONLY from epistable_private.marketplace_access, joined to an active profile.
The one existing active owner with a linked Auth user was bootstrapped once.
A later legacy owner/admin invitation does not grant marketplace authority.
Profile organization_id/organization_role and editable JWT metadata are NOT authoritative.

The private access table has RLS enabled and no browser table privileges or policies.
Its RLS-without-policy advisor is intentional default deny, not a broken marketplace table.
Only postgres or the trusted service backend can assign access.
Never expose the service key in the client. Assignment must verify platform-admin authority server-side.
The private context helper is read-only, checks auth.uid(), uses a fixed empty search_path, and has no PUBLIC/anon execution grant.
Keep epistable_private out of PostgREST's exposed schemas.
public.marketplace_context() is SECURITY INVOKER and accepts no identity argument.

## Role matrix

| Role | Organisation | Catalogue/documents | RFQs | Quotes |
| --- | --- | --- | --- | --- |
| platform_admin | Read/create/update all | Review all | Govern all | Govern all |
| seller_admin | Read/edit own, changes require review | Own CRUD excluding delete; no self-verification | Read submitted targeted RFQs and open untargeted RFQs | Create draft/sent against eligible open RFQ; submit own drafts |
| seller_member | Read own | Same catalogue/document authoring | Same seller inbox | Same quote authoring |
| buyer_admin | Read/edit own | Discover active verified products from verified sellers; permitted unexpired verified evidence | Create own drafts/open requests; edit drafts | Read non-draft quotes received by own organisation |
| buyer_member | Read own | Same discovery | Same sourcing | Same received quotes |
| Unassigned/pending/suspended | None | None | None | None |
| Anonymous | No marketplace table or context access | None | None | None |

Delete is denied to every browser role to preserve evidence; use lifecycle status changes.
Platform-admin delete also remains denied.
Organisation creation and access assignment are admin-provisioned in Phase 0.
Organisation membership is one organisation per Auth user today; the private table can be extended to a composite membership key when multi-organisation switching is introduced.

## Data integrity

Member updates cannot change IDs, created_at, owning organisations or quote/RFQ linkage.
Edited verified products must return to draft/inactive and pending/unverified.
Edited documents must return to pending.
Organisation edits require pending/unverified status, hiding its catalogue from discovery until re-reviewed.
Product sellers must be seller organisations.
RFQ buyers must be buyer organisations; targeted products must match the target seller.
Document product links must belong to the document organisation.
Members cannot alter submitted quotes or submitted RFQs. Buyer acceptance, negotiation, revisions and atomic order creation require dedicated transition APIs in later phases.
No marketplace transaction/order table is introduced here.

The evidence visibility values public/buyers do not enable anonymous access in this launch.
Private evidence is visible only to its organisation and platform admins.
Expired evidence is hidden from buyers.
This migration adds no upload bucket; private storage and signed URLs belong to the document workflow phase.

## Frontend integration required in Phase 1

Use marketplace_context() to choose the portal and scope queries.
Do not use the current admin-without-organization fallback as an authorization decision.
The existing UI is still a shell and does not consume the new context yet.
Unassigned users receive no marketplace data even if the old shell displays an Admin or Seller label.
No accounts were automatically linked to invented organisations.

## Verification performed

39 SQL assertions passed before and after deployment with SET LOCAL ROLE authenticated/anon.
Tests use temporary Auth/profile fixtures within a transaction and always ROLLBACK.
Tests cover tenant isolation, discovery eligibility, document privacy/expiry, own RFQ/product/quote creation,
draft-to-sent submission, immutable submitted quotes, self-verification, membership escalation,
editable metadata/profile spoofing, pending/suspended accounts, missing identity, and anon denial.
Run supabase/tests/marketplace_access.sql as postgres against a matching schema with psql ON_ERROR_STOP enabled.

Existing profile-content and legacy-policy fingerprints matched before and after.
Auth user count remained 11, organisation count remained 0; test fixtures were not retained.
npm run build passed (existing Vite CJS deprecation warning).
Frontend bundle unchanged: 824.27 kB, 207.94 kB gzip.
Five public marketplace RLS-without-policy findings are resolved.
Existing legacy SECURITY DEFINER advisories and password-protection finding remain outside this PR.

Authenticated desktop/mobile role checks and public print regression checks are NOT claimed.
No frontend or public route code changed. Draft PRs must not be merged until required release checks pass.

## Existing security follow-up

The legacy admin-invite source accepts owner as a requested role from any active legacy admin and does not enforce factory scope server-side.
This needs a dedicated legacy auth hardening fix; the marketplace allowlist prevents new legacy roles from inheriting marketplace access.
Do not expand legacy profile-policy trust into marketplace authorization.
The old public SECURITY DEFINER endpoints must be reviewed individually; do not revoke them wholesale.

## Operations

Production already contains this migration. Do not reapply its SQL by hand.
Use the recorded production migration version for history alignment.
The complete historical legacy schema cannot currently be rebuilt from migration history alone; this PR records the marketplace portion only.
To disable marketplace client access in an incident, revoke the five marketplace table grants from authenticated.
This fails closed and leaves legacy policies intact. Keep the access records and evidence for investigation.

```

===== FILE: docs/marketplace-build-plan.md =====
```markdown
# Epistable marketplace build plan

Direction: verified cross-border Food & Agri trade, launching with Processed Foods. Marketplace authority is separate from legacy factory roles. Existing Supabase Auth and public slab/quote experiences remain supported.

## Audit baseline — 13 September 2026

Main at a2ec5be0dfa9fb821d6288b481c3fedcb7200a56. React/Vite frontend with a large legacy App.jsx and a separate marketplace entry point. The initial marketplace was mostly read-only, inferred Admin access from legacy profile roles, had nonfunctional workflow buttons, and removed navigation below 640px. Existing marketplace tables had RLS enabled without policies, so ordinary authenticated users could not use them. Their original migration was missing from source control.

The deployed pages.dev app, a public slab certificate and an existing expired public quote loaded. The custom pages.epistable.com hostname returned 502 during the audit. No authenticated browser session was available. Existing legacy RLS/RPC advisories and invitation-role escalation need a separate compatibility-focused security review. Shared tokens, authentication modules, and sacred legacy components should remain intact.

## Phases and exit criteria

1. **Access foundation** (#216, #217). Recover schema history, explicit platform/organisation authority, tenant RLS, relationship guards, and negative SQL tests. Applied to Supabase; 39 rollback assertions passed.
2. **Portal and organisation foundation**. Server-authoritative portal routing, usable phone navigation, accessible forms, loading/error/retry states, organisation creation/profile completion, and Admin assignment of existing accounts. No invitation emails or password changes. Automated component and SQL tests plus production build.
3. **Seller catalogue and evidence**. Processed-food fields, drafts and review submission, documents with controlled visibility, validation on client and database. Sellers cannot self-verify or retain a verified badge after editing.
4. **Buyer discovery and RFQs**. Verified supplier/product filtering, meaningful product details, targeted or open RFQs, quantities, destinations, deadlines, and draft/submitted lifecycle.
5. **Seller quote response**. Currency, quantities, unit prices, totals, Incoterms, validity, lead time, and immutable submitted terms. Participant-only access and validation.
6. **Verification and transactions**. Admin review with reasons/evidence, immutable decision history, explicit approval/rejection, quote acceptance with one winner per RFQ, transaction snapshot and fulfilment tracking. No money movement implied by acceptance.
7. **Expansion and finance readiness**. Extensible category/country/corridor references, document requirements by destination and product, multi-user organisation operations, provider-neutral finance integration only after a defined provider and eligibility policy.

## Release checks

Run npm test and npm run build. SQL tests run as postgres with ephemeral fixtures inside BEGIN/ROLLBACK. Verify real Admin, Buyer and Seller flows on desktop and phone; check public slab, quote and print compatibility. Do not merge until required checks are recorded as passed. Component tests at viewport widths cover behaviour, not browser layout or real authenticated end-to-end operation. Keep pending browser checks explicit; do not mark them passed from mocks.

## Implementation checkpoint

Portal foundation is PR #218. Product/RFQ/quote/review implementation is the subsequent trade-workflows PR, stacked on that branch. The organisation and trade-workflow migrations have been applied and verified with rollback-only fixtures. The frontend remains unmerged pending Cloudflare preview recovery and real authenticated desktop/mobile checks. See marketplace-trade-workflows.md for implemented behaviour and exact limits.

```
