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
