# Processed-food trade workflows

## Catalogue and trust

Sellers maintain company profiles, products and images with origin, MOQ, capacity, lead time, packaging, shelf life, storage, ingredients, allergens, claimed certifications and export markets. Product details are seller-provided. Verify the seller and certification/evidence separately; high-risk health/regulatory claims may require manual review before publication.

Buyers discover active listings from verified sellers, save products and use Trade GPT-style catalogue matching. Do not imply catalogue matching is regulatory clearance or an underwriting decision.

## RFQ to order

Buyers create targeted/open RFQs with quantity/unit, destination, requirements and deadlines. Sellers provide currency, quantities, pricing, totals, Incoterms, validity and lead time. Quote comparison supports acceptance, change requests and rejection; revisions use controlled RPCs.

Acceptance creates a real trade_orders record. The lifecycle is confirmed → production → inspection → ready_to_dispatch → dispatched → delivered → completed. The backend also supports cancellation under its transition rules. These states record workflow progress; they do not mean Epistable operates logistics.

## Evidence

Private files upload to the trade-evidence bucket. Evidence records track issuer/reference, dates, review status, optional product linkage and visibility. Buyer download requires controlled/signed access to eligible verified evidence.

The September audit identifies a follow-up integrity risk in mutable Storage paths for verified documents. Private storage alone does not make verified file contents immutable.

## Finance readiness

The backend records PO reference/value/date, payment terms, invoice reference/amount/dates/status, payment status/amount paid, milestones and append-only trade_order_events. Regulated partners will supply future payment/finance/insurance integrations. No current lending or money-movement capability is implied.

## Verification

Current source includes these workflows; production inspection confirms the trade RPCs, finance columns, private bucket and RLS-enabled core tables. Full end-to-end financial/order and authenticated UI journeys were not validated in this audit. See security-audit-2026-09-21.md for exact tests and outstanding release gates.
