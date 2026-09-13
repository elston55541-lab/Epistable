# Portal and organisation foundation

The marketplace now resolves authority from marketplace_context(), never from legacy profile roles or editable metadata. Users without assigned marketplace access see a refresh/sign-out screen and a link to their existing workspace. Existing auth functions are reused without changes.

Admin can create buyer/seller organisations and assign an active linked account as organisation administrator or member. Assignment replaces that account's previous organisation membership. The RPC rejects non-platform callers, pending/suspended targets, role/type mismatch, and any attempt to grant or overwrite platform administrator authority. It sends no emails and changes no passwords or legacy roles.

Organisation administrators can edit their company's profile. Saving sets verification to pending; buyer discovery then hides that seller's products until review. Members can read the company profile. Country remains unconstrained to a particular trade bloc so expansion does not require rewriting the form.

Navigation works through role-scoped hash URLs, with an expandable phone menu, Escape/focus handling, persistent sign-out, and a skip link. Forms have native labels and submit behaviour. Fetch errors are shown with retry rather than fabricated empty metrics. Resource reads remain subject to database RLS.

Applied migration: 20260913161333_marketplace_organisation_management.sql. The organisation SQL suite has 16 assertions and passed before/after deployment, with fixtures rolled back. No additional security advisor findings beyond the prior baseline. The private membership table intentionally has RLS without browser policies.

Validation: component tests cover all three role menus at 375px/1280px, keyboard interaction, unauthorised legacy role, explicit buyer/seller fetch scope, loading failures/retries, failed saves, and Enter login. npm run build passes. Real authenticated visual/mobile and legacy print checks remain release gates; no claim of end-to-end browser validation is made from component mocks.

Remaining workflow phases are in marketplace-build-plan.md. Product/RFQ/quote lists in this phase are read-only. Admin account assignment lists existing linked accounts only; onboarding a new Auth identity continues through the existing invitation process until it receives a dedicated security review.
