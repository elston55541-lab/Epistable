# Marketplace portals and organisations

The current portals route using marketplace_context(), not legacy profile roles. Unassigned users receive an access explanation; /join is the Buyer/Seller onboarding entry point.

Platform Admin can manage organisations, review company/certification evidence and assign existing linked accounts. Explicit assignment validates roles and organisation types; self-serve approval must not overwrite existing conflicting membership or platform authority.

Seller Admin/Member work with product catalogue/images, evidence, RFQs, quotes/revisions and orders. Buyer Admin/Member discover and save products, use catalogue matching, issue RFQs, compare quotes, request changes, reject or accept offers, and track orders.

Organisation administrators edit company profiles. Company changes may require renewed review; seller verification is separate from seller-provided SKU facts. Ordinary products must not acquire a broad Product Verified badge.

Preserve the current Buyer mobile UI, bottom navigation and Trade GPT layout, and existing Seller/Admin visual structure. Do not rebuild navigation from historical phase descriptions.

Keep login, /legacy, /slab/*, /quote/* and /invite compatible. Invitation security and production organisation approval issues are tracked in security-audit-2026-09-21.md. Authenticated mobile/desktop and legacy print checks remain distinct from component tests.
