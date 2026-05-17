# Auth Hardening Rollout

Epistable has moved from client-side password checks to Supabase Auth + RLS-backed profile records.

## Why

Production credentials must be owned by Supabase Auth, while application access is controlled by `profiles.role`, `profiles.factory_id`, and Row Level Security.

## Safe rollout order

1. Apply migrations in a Supabase staging project first.
2. Create Supabase Auth users for owner, factory users, and buyers.
3. Ensure each profile has the correct `auth_user_id`, `role`, `factory_id`, and `status`.
4. Verify owner, factory admin, inspector, and buyer access in staging.
5. Confirm public RPCs expose only certificate/quote fields intended for anonymous buyers.
6. Confirm no plaintext password columns or password values are used by the frontend.
7. Deploy only after the MVP QA checklist passes.

## Environment variables

Set these in the deployment platform before cutover:

```text
VITE_SUPABASE_URL=https://gfmrzcfajuwxishfnbur.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_rymg6uYPUH3WMferT4UpNw_BaFSnSxS
```

The publishable anon key is still public by design. Security comes from Supabase Auth and RLS policies, not hiding the anon key.

## Current app status

Login uses Supabase Auth + `profiles`, and profile creation no longer stores plaintext passwords. New profiles still need a matching Supabase Auth user before they can sign in.
