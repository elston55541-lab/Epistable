# Marketplace access and trust boundary

## Authority

epistable_private.marketplace_access is the sole source of marketplace roles. context() checks auth.uid(), an active linked profile and matching organisation type. public.marketplace_context() is an invoker wrapper. Profile role/organisation fields and JWT metadata cannot confer marketplace authority.

Both marketplace_access and marketplace_applications are private, RLS-enabled and unavailable for direct browser writes. Their lack of browser policies is intentional default deny. Keep the schema outside the Data API's exposed schemas and never expose service-role credentials.

The original owner bootstrap was a one-time migration, not a continuing promotion rule. New legacy owner/admin invitations do not create platform_admin access.

## Role boundaries

| Role | Main scope |
| --- | --- |
| platform_admin | Platform review and explicit access administration |
| seller_admin | Own company profile, catalogue, evidence, RFQs, quotes and orders |
| seller_member | Own seller workflows; company-profile administration remains restricted |
| buyer_admin | Own company profile, discovery, sourcing, quote decisions and orders |
| buyer_member | Buyer sourcing and transaction workflows |
| Unassigned or suspended | No marketplace authority |
| Anonymous | No marketplace table/context access |

RLS controls row access independently of client routing. Ordinary users cannot reassign tenant ownership. Order-event access for authenticated clients is SELECT only.

## Discovery and evidence

Discovery uses active products from verified sellers. Ordinary products do not require individual verification; seller-provided product facts must remain distinct from verified company/certification evidence. High-risk claims can require manual review.

The trade-evidence bucket is private. Buyer access requires eligible verified, unexpired evidence with buyers/public visibility and a verified seller. “Public” document visibility does not make the bucket anonymously public. Clients request signed URLs after access checks.

## Onboarding

/join creates a pending organisation/application. The review RPC is intended to approve the organisation and grant the correct buyer_admin or seller_admin membership atomically. The deployed invoker/private-table privilege defect is documented in security-audit-2026-09-21.md. The proposed helper validates authority, application role/type and existing membership without opening private tables.

## Tests and operations

Run supabase/tests/marketplace_access.sql and marketplace_approval.sql against a matching schema, as postgres, with rollback fixtures and stop-on-error. SQL role tests do not prove browser/email delivery or full Auth integration.

The historical legacy schema cannot be assumed reconstructible from migration history alone. Do not reapply old migrations by hand. Keep deployment history aligned and distinguish proposed migrations from deployed state. Review legacy public SECURITY DEFINER endpoints individually; some support intentionally public compatibility routes.
