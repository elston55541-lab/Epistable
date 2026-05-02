# Auth Hardening Rollout

This branch starts the move from client-side password checks to Supabase Auth + RLS.

## Why

The current app stores and checks owner, factory user, and buyer passwords in frontend-reachable code/tables. That is acceptable only for a throwaway demo. Production needs Supabase Auth to own credentials and Row Level Security to restrict data by role and factory.

## Safe rollout order

1. Apply `supabase/migrations/202605030001_auth_rls_hardening.sql` in a Supabase staging project first.
2. Create Supabase Auth users for the owner, factory users, and buyers.
3. Backfill `profiles.auth_user_id` with each Auth user's id.
4. Verify owner, factory, and buyer access in staging.
5. Switch the frontend login to `signInWithEmail()` from `src/lib/auth.js`.
6. Remove plaintext `password` columns from `users` and `buyers` only after all logins are migrated.
7. Deploy from the PR branch only after the staging smoke test passes.

## Environment variables

Set these in the deployment platform before cutover:

```text
VITE_SUPABASE_URL=https://gfmrzcfajuwxishfnbur.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_rymg6uYPUH3WMferT4UpNw_BaFSnSxS
```

The publishable anon key is still public by design. Security comes from Supabase Auth and RLS policies, not hiding the anon key.

## Current branch status

This branch adds the reusable client, auth, DB helpers, and RLS draft. The existing `src/App.jsx` has not been cut over yet because it is a large monolith and should be migrated in a separate reviewed step to avoid breaking the current demo flow.
