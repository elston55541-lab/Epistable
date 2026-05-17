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
