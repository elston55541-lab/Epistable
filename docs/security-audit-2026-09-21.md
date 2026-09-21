# Security and correctness audit — 21 September 2026

## Scope and baseline

- Source: elston55541-lab/Epistable main, commit 31d78c0ee3bd70f7a934b44140549048a41e6a01.
- Production: Supabase project gfmrzcfajuwxishfnbur, reported ACTIVE_HEALTHY, PostgreSQL 17.
- Read deployed Edge Function source/configuration, relevant RPC definitions, table privileges, RLS flags, Storage policies/bucket settings, finance columns and security advisors.
- The project brief supersedes stale stone/factory product assumptions. UI layouts and compatibility routes were not edited.

## Findings

| Priority | Finding | Evidence and status |
| --- | --- | --- |
| Critical | Unauthenticated account password reset through accept-invite | Deployed v2 has verify_jwt=false, no caller authentication, selects active/pending/inactive profiles by submitted email and calls admin.updateUserById with submitted password. Confirmed by source inspection, without attempting takeover. Proposed fix: PR #232. |
| Critical functional | Organisation review fails on private table writes | Deployed public.review_marketplace_record is SECURITY INVOKER. authenticated lacks INSERT on marketplace_access and UPDATE on marketplace_applications. Proposed guarded private helper: PR #233. |
| High | Legacy admin invitation privilege escalation / missing factory scope | Deployed admin-invite v1 accepts owner from active admins and does not compare factory scope. PR #232 adds role/scope checks, including existing invitation records. |
| High follow-up | Verified evidence bytes can change independently of document review | Deployed trade_evidence_update/delete policies permit sellers to change their own path without excluding paths referenced by verified documents. Insert policy also permits reusing such a path. This creates a file-integrity risk despite private/signed access. Confirmed policy configuration; no real files were overwritten. Requires a separate immutable/versioned-file or atomic review-invalidation design and Storage API integration tests. |
| Follow-up | Legacy profile policies and exposed definer RPCs need compatibility review | Advisors report publicly executable legacy definer functions; several are intentional public slab/quote APIs. Do not revoke wholesale. Factory profile-write policies also deserve a dedicated identity/scope review. These findings are not all proven exploits. |
| Follow-up | Leaked-password protection is disabled | Reported by Supabase security advisor. Review Auth settings before wider launch. |

## Confirmed security foundations

- marketplace_access and marketplace_applications remain private, RLS-enabled and without browser write grants.
- Deployed context() derives authority from marketplace_access, active profile status and matching organisation type. It does not derive authority from editable profile roles or JWT metadata.
- Core organisations, products, documents, RFQs, quotes, orders and order events have RLS enabled.
- trade-evidence is a private bucket. Buyer Storage policy checks verified/unexpired evidence, visibility and verified seller eligibility. Frontend source requests signed URLs.
- Authenticated clients have only SELECT on trade_order_events.
- Trade decision/revision/order/PO/invoice/payment RPCs and finance-readiness columns exist in production. Their presence is not an end-to-end workflow certification.

## Proposed changes

[PR #232](https://github.com/elston55541-lab/Epistable/pull/232) removes administrative password changes from invite acceptance, validates the caller and linked pending profile, uses the caller-authenticated Auth endpoint, and restricts legacy invitation role/factory scope. Legitimate password setup now requires an invitation-email session. It adds 19 handler tests to CI.

[PR #233](https://github.com/elston55541-lab/Epistable/pull/233) keeps the public review RPC as SECURITY INVOKER and delegates only private application/access writes to an explicitly guarded private helper. It validates role/type, active profile and existing membership. A conflicting grant cannot be overwritten. It adds SQL approval/isolation regressions.

Documentation changes reconcile PRODUCT.md, AGENTS.md, marketplace guides and architecture roles/trust terminology.

## Verification performed

- 19 new invite handler regression tests passed. These execute real handler code with SDK/runtime dependencies mocked; no emails were sent or real passwords changed.
- 27 existing frontend tests passed.
- npm run build passed. Vite CJS, React-plugin test-runner deprecations and large-chunk warnings remain.
- Vite dev startup reported ready. Authenticated browser rendering/console and stable preview connectivity were not verified.
- Existing marketplace_access.sql passed against deployed state with all fixtures rolled back; includes tenant isolation and profile/JWT spoofing.
- The proposed approval migration and new marketplace_approval.sql assertions passed together inside one BEGIN/ROLLBACK transaction against the deployed database. Checks cover Buyer/Seller onboarding, rejection, spoofed authority, private-table privileges, role mismatch, conflicting platform membership, repeated review, anonymous denial and cross-tenant access.
- Read-back confirmed the private helper does not exist after rollback and the production public review function remains an invoker.
- No permanent production schema, function, user, role or evidence change was made.

## Remaining release gates

Both fix PRs are drafts, not deployed fixes. The production vulnerabilities described above remain until reviewed changes are deployed.

Use controlled test identities to verify real invitation email delivery, link/session handling, own-account password setup, safe unauthorized rejection, /join through organisation approval into the correct portal, and cross-tenant denial. Verify actual Buyer/Seller/Admin screens on desktop/mobile and legacy slab/quote/print compatibility. No authenticated browser credentials were used in this audit.

An Edge Function source merge alone does not deploy it. Apply the approval migration and deploy both Edge Functions/configuration and frontend through the normal release process, then verify deployed versions and rerun tests. Do not claim production remediation from rolled-back SQL tests or mocked Auth tests.

Full migration replay, complete RLS/RPC audit, file-byte integrity, order/finance concurrency, external-host evidence security, expired signed-link behaviour and real money/partner integrations remain unverified or out of this audit's scope.

Advisor references: [definer-function exposure](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
