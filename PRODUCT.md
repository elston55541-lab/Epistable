# Epistable — Verified Food Trade Infrastructure

Epistable is a B2B cross-border food trade platform, launching with processed foods and an initial India → BRICS / emerging-markets orientation. Geography, country, currency and category data must remain extensible.

## Product direction

Discovery → Verification → Transaction → Finance

Buyers discover credible manufacturers, review seller and compliance evidence, issue RFQs, compare and negotiate quotes, create real orders from accepted quotes, and track fulfilment. Epistable is not merely a supplier directory.

## Roles and authority

Platform Admin; Seller Admin / Seller Member; Buyer Admin / Buyer Member.
Marketplace authority comes only from `epistable_private.marketplace_access`, with active-profile checks and RLS. Editable profile fields and JWT metadata never grant marketplace authority. Legacy owner/factory roles do not imply marketplace access.

## Trust model

Verify the seller/company, not every ordinary SKU before publication. Ingredients, allergens, MOQ, capacity, packaging, shelf life and other product details are seller-provided. Seller verification and certification/evidence verification must be displayed separately. High-risk health/regulatory claims may require manual review.

Do not introduce a broad “Product Verified” badge or imply that Epistable physically inspected or tested every product. Private evidence remains private; eligible verified documents use controlled signed access.

## Current implementation baseline

The source includes seller profiles, processed-food catalogue and images, buyer discovery/saved products/catalogue matching, RFQs, quotes and revisions, comparison and decisions, accepted-quote order creation, order tracking, private evidence upload, and self-serve onboarding at /join.

Order progression: confirmed → production → inspection → ready_to_dispatch → dispatched → delivered → completed. The backend also has a cancelled state with controlled transitions.

Finance-readiness fields capture purchase orders, payment terms, invoices, payment status/amounts and milestone timestamps. Append-only trade_order_events preserve transaction provenance. These are data foundations; regulated partners will provide future underwriting, payment, finance and insurance services.

Epistable is not a certification body, lender or logistics operator. No money movement or financing decision is implied by quote acceptance.

## UI and compatibility

Preserve the current Buyer mobile UI, bottom navigation, Trade GPT layout, Seller/Admin structure and login design unless explicitly asked to redesign them. Keep /legacy, /slab/*, /quote/* and /invite until explicitly retired. Preserve shared design-token aliases and legacy print surfaces.

Use clear, credible language, accessible controls and evidence-first procurement workflows.

## Release status

Implemented source is not proof of production correctness. See [the September 2026 audit](docs/security-audit-2026-09-21.md) for confirmed production defects, proposed fixes and verification limits.
