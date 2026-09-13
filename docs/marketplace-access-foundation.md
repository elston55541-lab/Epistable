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
