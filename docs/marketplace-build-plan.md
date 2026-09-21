# Marketplace build and release priorities

Baseline: main at 31d78c0ee3bd70f7a934b44140549048a41e6a01, reviewed 21 September 2026.

Epistable is verified food trade infrastructure: Discovery → Verification → Transaction → Finance. Launch with processed foods; keep geography/currency/category extensible. PRODUCT.md defines the current trust model and UI constraints.

## Immediate security and correctness

1. Close unauthenticated invite password resets and restrict legacy admin invitation scope (PR #232).
2. Repair organisation approval through a guarded private helper, preserving public RPC RLS and private table denial (PR #233).
3. Reconcile documentation with current workflows and distinguish source/deployment status.
4. Address verified-evidence file mutability and review legacy profile-write/public RPC risks in separate compatibility-focused changes.

## Implemented foundation

Current source includes company profiles and verification; catalogue and images; certification/private evidence; Buyer discovery/saved products/catalogue matching; RFQs; quotes/revisions/comparison/decisions; real orders and fulfilment; self-serve onboarding; finance-readiness fields and event history.

These features must not be described as wholly future phases. Their presence also does not prove that all production journeys work. The approval defect demonstrates why live state must be checked.

## Future scope

Destination-specific compliance rules, broader market/category support and regulated payment/finance/insurance integrations require explicit product work. Finance data foundations do not implement underwriting or lending.

## Release gates

Focused PRs should record unit/component tests, SQL role/tenant tests, production build, preview startup, authenticated desktop/mobile verification and relevant legacy public/print checks. Use controlled test accounts for real Auth flows.

Keep /legacy, /slab/*, /quote/* and /invite. Preserve current Buyer/Seller/Admin visual structure. Do not merge a draft while required checks remain unresolved. An approved source PR is not proof that Edge Functions or database migrations have been deployed.

See security-audit-2026-09-21.md for the concrete audit and remaining production uncertainty.
