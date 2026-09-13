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
