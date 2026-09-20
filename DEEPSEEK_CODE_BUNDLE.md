

===== FILE: docs/marketplace-portals.md =====

```markdown
# Portal and organisation foundation

The marketplace now resolves authority from marketplace_context(), never from legacy profile roles or editable metadata. Users without assigned marketplace access see a refresh/sign-out screen and a link to their existing workspace. Existing auth functions are reused without changes.

Admin can create buyer/seller organisations and assign an active linked account as organisation administrator or member. Assignment replaces that account's previous organisation membership. The RPC rejects non-platform callers, pending/suspended targets, role/type mismatch, and any attempt to grant or overwrite platform administrator authority. It sends no emails and changes no passwords or legacy roles.

Organisation administrators can edit their company's profile. Saving sets verification to pending; buyer discovery then hides that seller's products until review. Members can read the company profile. Country remains unconstrained to a particular trade bloc so expansion does not require rewriting the form.

Navigation works through role-scoped hash URLs, with an expandable phone menu, Escape/focus handling, persistent sign-out, and a skip link. Forms have native labels and submit behaviour. Fetch errors are shown with retry rather than fabricated empty metrics. Resource reads remain subject to database RLS.

Applied migration: 20260913161333_marketplace_organisation_management.sql. The organisation SQL suite has 16 assertions and passed before/after deployment, with fixtures rolled back. No additional security advisor findings beyond the prior baseline. The private membership table intentionally has RLS without browser policies.

Validation: component tests cover all three role menus at 375px/1280px, keyboard interaction, unauthorised legacy role, explicit buyer/seller fetch scope, loading failures/retries, failed saves, and Enter login. npm run build passes. Real authenticated visual/mobile and legacy print checks remain release gates; no claim of end-to-end browser validation is made from component mocks.

Remaining workflow phases are in marketplace-build-plan.md. Product/RFQ/quote lists in this phase are read-only. Admin account assignment lists existing linked accounts only; onboarding a new Auth identity continues through the existing invitation process until it receives a dedicated security review.

```


===== FILE: docs/marketplace-role-direction.md =====

```markdown
# Marketplace role direction

The primary product has three views: Epistable Admin, Seller Organisation and Buyer Organisation. There is no separate Factory Owner marketplace view. Processors, manufacturers, exporters and trading companies participate as seller organisations; ownership is not a platform privilege.

Epistable Admin uses the existing platform_admin authority. Seller and buyer organisations retain their existing admin/member permissions. Existing account display names and legacy roles are not authority and do not grant marketplace access. The historical Epistable Owner label is displayed as Epistable Admin inside the platform portal without changing the account record.

The root route opens the marketplace and resolves the assigned view after sign-in. Accounts without marketplace access receive an assignment explanation and a clearly labelled legacy factory workspace link. Existing factory accounts must be deliberately assigned to an organisation before using a marketplace portal; this change does not migrate or promote them automatically.

The legacy factory workspace remains at /legacy for existing users, labelled separately with a return link to the marketplace. Public /slab/ and /quote/ routes and /invite acceptance remain functional. Legacy operations, authentication, RLS and persisted data are unchanged. Retirement requires a separate explicit decision.

```


===== FILE: docs/marketplace-trade-workflows.md =====

```markdown
# Processed-food trade workflows

This phase extends the organisation/portal foundation with working seller catalogue and evidence forms, buyer discovery/RFQs, seller quote responses, and Epistable review.

## Behaviour

- Sellers save named drafts or submit complete products with origin, minimum order/unit, packaging, shelf life and storage. Additional fields include ingredients, allergens, certifications claimed, dietary attributes, monthly capacity, lead time and export markets. Editing returns a verified product to draft/review and clears its old review reason.
- Buyers search verified products and suppliers, filter categories, read product details, and create targeted or open RFQs. Requests include quantity/unit, destination, optional required date and requirements. Drafts can be resumed; submitted requests are immutable to ordinary buyer updates under existing RLS.
- Sellers respond to open RFQs with a draft or sent quote, including three-letter currency, price, quantity, Incoterm, validity, lead time and named-place/payment notes. Decimal totals are calculated without binary floating-point rounding. Database constraints verify totals and ensure one non-draft quote per seller/RFQ. The organisation must be verified to send; sent terms remain immutable to the seller.
- Evidence records link to existing HTTPS documents, with issuer, reference, issue/expiry dates, optional product association and marketplace visibility. Sellers can edit/resubmit evidence. This phase does not upload files or secure an external file host; the form states that source-file access belongs to its host. A private Storage upload flow remains a follow-up.
- Admin reviews organisations, submitted products and documents, sees supporting evidence and records an approval/rejection reason. Product approval requires a verified seller and publishes the product. Expired or missing-source documents cannot be approved. Review decisions are appended with actor, time and record snapshot. Browser clients, including platform admins, cannot edit or delete history. History is restricted to platform admins and the owning organisation.

## Database and compatibility

Applied migration: 20260913163014_marketplace_trade_workflows.sql. This adds marketplace validation, review notes, an RLS-protected history table and guarded invoker review RPC. No legacy RLS policies, Auth functions, public slab/quote routes, or legacy components are modified. No real users, organisations, products, requests, quotes or evidence were seeded. Auth count remains 11; test fixtures roll back.

All three SQL suites were rerun against the deployed migration: 39 access assertions, 16 organisation assertions and 24 workflow assertions passed. Fixture defaults are set only inside each test transaction to supply complete terms under the stricter schema. The latest security advisor result remains the previous baseline: one intentionally default-deny private table, 13 legacy definer functions, and the existing password-protection setting. No new advisor findings.

## Validation and release

19 component/domain tests pass, including role navigation at 375/1280px, form payloads, failed writes, precise totals and review reason requirements. Production build passes. Production npm audit reports zero vulnerabilities; legacy build-tool advisories remain outside this feature's scope. The Vite 5 CJS warning and React-plugin deprecation warnings under Vitest's newer Vite remain non-fatal.

The foundation's GitHub Actions test-and-build check passed on commit 971f77295fcc2a3ef806247467ac0acb3e052bb3. Cloudflare preview failed on that commit and its predecessor, while database-only PR previews succeeded. Cloudflare's log page was blocked by its security-verification screen, so the exact cause is not yet known. A Node 24 runtime file and npm CI check now make the required runtime explicit; this did not by itself resolve the Cloudflare failure. See the Cloudflare check's linked deployment log before making another deployment change.

Real authenticated desktop/mobile visual tests, the release preview and legacy print checks remain required before merging. The browser cannot access this local development server, and no authenticated marketplace browser session is available; component tests are not a substitute for those gates.

## Next phase

Transaction acceptance and fulfilment, quote revisions, protected file uploads, destination-specific compliance rules and future financing remain planned. No quote acceptance, payment or finance execution is implied by these screens. Categories are data values and country fields are open; the launch taxonomy can expand without introducing factory/slab assumptions.

```


===== FILE: docs/mvp-qa-checklist.md =====

```markdown
# Epistable MVP QA Checklist

Use this checklist before a release, after large product changes, or before a customer demo.

## Test Setup

- App URL: preview or production URL being tested
- Factory admin: `admin@jodhpurfactory.com`
- Test password: `TempAdmin123!`
- Known test slab: `SLB-MNUI5BS0WVH`
- Known test quote: `QTE-QA-MP9GZ4JI`
- Browser: run once on desktop width and once on mobile width

## 1. Authentication

- Open the app and sign in as the factory admin.
- Confirm login lands on the factory dashboard.
- Reload the page.
- Confirm the session is restored and does not log out unexpectedly.
- Sign out.
- Confirm the login page appears again.

Pass condition: login, reload, and logout work without hanging or losing session incorrectly.

## 2. Factory Dashboard

- Sign in as factory admin.
- Confirm Home loads without full-page blocking after login.
- Confirm setup checklist, next actions, KPIs, and sales signals render.
- Open each admin tab: Sales, Quotes, Team, Suppliers, Buyers, Inquiries, Disputes, Alerts.
- Refresh the browser on one admin tab.

Pass condition: each tab opens, data refreshes, and any failure shows a visible retry/error state.

## 3. Scan To Certificate

- Open Scan.
- Select stone type and supplier mode.
- Add or confirm evidence photos if available.
- Enter measurements.
- Add defects or mark no defect.
- Run AI grading.
- Save the slab.
- Open History.
- Open the saved slab details.
- Open QR/certificate.

Pass condition: saved slab appears in History, has grade/details/photos, and certificate opens publicly.

## 4. Public Slab Certificate

- Open `/slab/SLB-MNUI5BS0WVH`.
- Confirm the certificate loads without requiring login.
- Confirm the page shows grade, price, factory, measurements, defects, photo evidence, inventory status, and verification checklist.
- Use Copy Summary.
- Use Print / Save PDF.
- Submit an inquiry with name plus email or phone.
- Submit a dispute/mismatch report with required details.

Pass condition: certificate is buyer-readable, shareable, printable, and public forms create records or show clear errors.

## 5. Buyer Inventory

- From factory dashboard, open Public Inventory Preview.
- Confirm Premium and Standard slabs appear.
- Test filters: grade, stone, supplier, export, status, max price, search.
- Save a slab to shortlist.
- Copy shortlist.
- Open a slab certificate from inventory.
- Request a quote from an available slab.

Pass condition: buyers can find slabs, shortlist them, inspect certificates, and request quotes.

## 6. Inquiries To Quote

- Return to factory admin.
- Open Inquiries.
- Confirm the buyer request appears.
- Open the inquiry.
- Set priority or follow-up if needed.
- Create quote with area, rate, validity, and notes.
- Confirm inquiry/slab moves to reserved where expected.

Pass condition: an inquiry can become a quote without manual database edits.

## 7. Buyer Quote Response

- Open the public quote link or `/quote/QTE-QA-MP9GZ4JI`.
- Confirm quote details, buyer checklist, total, validity, and slab certificate link.
- Copy quote summary.
- Accept quote or request changes using a test quote.
- Confirm the page shows a clear success/error state.

Pass condition: buyer can respond from a public quote page and the factory can see the updated status.

## 8. Order Tracking

- In factory admin, open Quotes or Sales.
- Confirm accepted quotes show next fulfillment action.
- Move fulfillment through payment pending, payment received, dispatch scheduled, dispatched, delivered, sold.
- Confirm buyer quote/order page reflects the status.

Pass condition: quote acceptance can become a tracked order and eventually a sold slab.

## 9. Access Management

- As owner or factory admin, create a test user profile.
- Confirm invite instructions are visible.
- Edit role/status.
- Suspend and restore access.
- Confirm suspended users cannot proceed normally.

Pass condition: admins can manage user access without database edits.

## 10. Mobile Smoke Test

- Open login on mobile width.
- Sign in.
- Check Home, Scan, History, Buyer Inventory, Certificate, and Quote page.
- Confirm no text overlaps, controls are tappable, and fixed bars do not hide primary actions.

Pass condition: the core MVP path is usable on mobile.

## Release Gate

Do not release if any of these fail:

- Login or session restore is broken.
- New slab cannot be saved.
- Public certificate cannot load.
- Buyer quote request cannot be created.
- Factory cannot create or update a quote.
- Accepted quote cannot be tracked.
- Any critical user flow hangs without a visible error or retry option.

## Release Confidence Rule

Before a sales demo or pilot handoff, run the full critical path twice:

1. Factory admin login.
2. Create or open a verified slab.
3. Open the public certificate.
4. Submit buyer inquiry.
5. Create quote.
6. Open public quote.
7. Accept quote.
8. Confirm factory sales status updates.

If the same step fails twice, stop feature work and fix that step first.

```


===== FILE: docs/sector-agnostic-data-model.md =====

```markdown
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
- production or source batch identity,
- buyer/commercial workflow state,
- generic evidence and readiness fields,
- saved evidence packets assembled from source records,
- corrective and preventive action records linked to source evidence,
- calibration records for equipment and tool-control evidence,
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
- production batch records for sector-safe traceability grouping.
- batch-to-inspection links for flexible packet and traceability evidence.
- calibration records for future equipment, due-date, certificate, and evidence workflows.

Use `docs/supabase-migration-runbook.md` when applying these migrations manually in Supabase.

Current stone workflows can continue using existing fields while future code gradually writes normalized data into the generic fields.

Use `docs/compliance-template-authoring.md` before adding or activating a new sector template.

Use `docs/compliance-foundation-map.md` when deciding whether a new feature belongs in inspections, batches, CAPA, calibration, evidence packets, activity logs, or template configuration.

## Product Guidance

Keep the product sellable for stone factories now.

Make new foundation work sector-safe by default.

Avoid slowing sales and pilots with a full generic rewrite before the stone workflow is proven.

```


===== FILE: docs/security-release-checklist.md =====

```markdown
# Security Release Checklist

Use this before giving access to a real factory or buyer.

## Supabase Auth

- Every real user has a Supabase Auth account.
- Every real user has exactly one matching `profiles` row.
- `profiles.auth_user_id` is populated for all active owner, admin, manager, inspector, and buyer users.
- Suspended users have `profiles.status = 'suspended'`.
- No production user is using a temporary demo password.
- Password reset and invite acceptance have been smoke-tested for one factory admin and one buyer.

## RLS And Access Boundaries

- RLS is enabled on customer data tables: `profiles`, `factories`, `inspections`, `suppliers`, `inquiries`, `disputes`, `notifications`, `activity_logs`, and `quotes`.
- Owner can see all factories and users.
- Factory admin/manager can see only their own factory data.
- Inspector can scan and see their relevant factory data, but cannot manage buyer/admin access.
- Buyer can see only their buyer experience and public certificate/quote views.
- Public anonymous access is limited to approved RPCs:
  - `get_public_slab_certificate`
  - `create_public_slab_inquiry`
  - `create_public_slab_dispute`
  - `get_public_quote`
  - `respond_to_quote`
- Public RPCs return only buyer-safe fields.

## Secrets And Client Safety

- No service-role key is present in frontend code, docs intended for deployment, or browser-visible environment variables.
- `VITE_SUPABASE_ANON_KEY` is treated as public. Security depends on RLS, not hiding this key.
- Supabase Edge Functions use service-role keys only from server-side environment variables.
- Demo credentials in docs are not used for production accounts.
- Browser localStorage caches only profile/session convenience data, not passwords or service keys.

## Public Buyer Links

- A slab certificate URL can be opened without login.
- A quote URL can be opened without login.
- Public forms create only inquiry/dispute/quote-response records, not arbitrary table writes.
- Public forms show errors and do not hang on failure.
- Sold/reserved slabs are clearly labeled so buyers do not assume they are available.

## Operational Controls

- Main branch requires PR review or at least passing checks before production deploy.
- Production deploy can be rolled back from the hosting provider.
- Supabase migrations are applied intentionally and recorded in the repo.
- Before a customer demo, run `docs/mvp-qa-checklist.md`.

## Blockers Before Selling

Do not sell if any of these are true:

- Users can read another factory's private data.
- Buyers can see non-public factory admin screens.
- Public RPCs expose private notes, internal activity logs, or user management data.
- Any active production account still depends on a shared demo password.
- Invite/login/reset flows are not understandable to a non-technical user.

```


===== FILE: docs/supabase-migration-runbook.md =====

```markdown
# Supabase Migration Runbook

Use this when applying SQL migrations manually from the Supabase dashboard.

## Before Running SQL

1. Open the Supabase project.
2. Go to SQL Editor.
3. Open the migration file from `supabase/migrations`.
4. Read the header comment.
5. Confirm the migration is additive or otherwise expected.

## Safe Migration Order

Run migrations in filename order.

For the sector/compliance foundation, apply:

1. `202605200001_sector_foundation_fields.sql`
2. `202605200002_compliance_template_foundation.sql`
3. `202605200003_compliance_template_rls.sql`
4. `202605200004_inspection_integrity_fields.sql`
5. `202605200005_backfill_generic_inspection_fields.sql`
6. `202605200006_compliance_template_lifecycle.sql`
7. `202605200007_activity_log_evidence_fields.sql`
8. `202605200008_evidence_packets.sql`
9. `202605200009_capa_actions.sql`
10. `202605200010_production_batches.sql`
11. `202605200011_batch_inspection_links.sql`
12. `202605200012_calibration_records.sql`

## After Running SQL

Confirm:

- SQL Editor returns success.
- No app login flow regressed.
- Factory admin dashboard loads.
- Analytics page loads.
- Existing slab certificates still load.

## Important Notes

These migrations are additive foundation work.

They should not change current stone workflows until application code starts reading or writing the new fields.

Use `docs/compliance-template-authoring.md` before adding a new `compliance_templates` migration.

If a migration fails, stop and fix that migration before applying later files.

Do not skip RLS migrations for new tables.

```


===== FILE: docs/traceability-audit-readiness.md =====

```markdown
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

Calibration records provide the tool-control evidence behind inspection measurements. They should support equipment identity, calibration date, next due date, certificate reference, and evidence attachments.

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

```


# End of bundle

Snapshot source: 31d78c0ee3bd70f7a934b44140549048a41e6a01
