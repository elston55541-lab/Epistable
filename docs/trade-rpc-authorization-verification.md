# Trade RPC authorization repair — review evidence

Baseline: main `31d78c0ee3bd70f7a934b44140549048a41e6a01`; Supabase project `gfmrzcfajuwxishfnbur`.
Tests-first commit: `2ccbb37c0c6f72efd31b9f89308a1cfac95556a7`.

## Scope

One migration repairs four marketplace order/finance functions, the legacy fulfilment guard, the buyer-notification guard, and browser execution of the factory-notification helper.

- Marketplace mutations require authenticated, non-NULL marketplace context and a complete allowed predicate evaluated with IS NOT TRUE.
- Preserve the current tiers: seller members/admins may update own order status; buyer admins record own POs; seller admins record own invoices; platform admins record payments and retain existing override permissions.
- Legacy buyer notifications and fulfilment require an active authenticated profile and NULL-safe existing owner/same-factory permission. This preserves the existing scope; it does not certify that scope as the final product policy.
- Revoke PUBLIC/anon/authenticated execution of the factory notification helper. Its owner and existing service_role grant remain. The public quote-decision definer can still call it after the transition.
- Validate decision, reject notes above 4,000 characters, and require notifications to match the persisted quote status and note. This length limit is a deliberate compatibility change: an oversized anonymous decision now rolls back with an error rather than producing an unbounded notification.
- Restrict the two legacy guarded entry points to authenticated callers. Use 42501 for in-body authorization errors.

No source change to respond_to_quote, get_public_quote or get_public_slab_certificate. No UI, route, table-grant or finance-product changes. Public-link read/action authority, disclosure fields and certificate publication remain separate product decisions.

## Red-to-green results

| Run | Total | Passed | Failed |
| --- | ---: | ---: | ---: |
| Tests against unchanged deployed definitions | 85 | 39 | 46 |
| Identical tests with candidate migration | 85 | 85 | 0 |

Two baseline failures are error-contract differences: legacy cross-factory calls already failed, but returned P0001 rather than 42501. The other 44 failures allowed operations or state changes that the tests expect to deny, including synthetic malformed-context cases and new notification contract checks. These numbers must not be described as 46 separate exploits.

Unlike the earlier expression-only audit, these runs invoked the actual RPCs against ephemeral, valid fixtures. All case effects were rolled back using subtransactions, and the outer transaction rolled back fixtures and candidate function/ACL changes. Notifications were database rows only; the inspected tables have no non-internal triggers, and no email-sending API was invoked.

## Matrix covered

- Every marketplace RPC: permitted role, platform override where applicable, insufficient-role denial, active correctly privileged other tenant, no access row, pending profile, suspension, deleted membership, reassigned membership, anonymous execution.
- Seller downgrade: own status update remains allowed; invoice mutation is denied.
- Malformed context: empty object, null role and missing organisation. A case-local replacement of context() simulates these future-contract failures; each replacement is rolled back.
- Closed order with removed access cannot be reopened.
- Successful marketplace writes produce exactly one event; same-status calls may update note/timestamp but create no transition event.
- Negative cases require the expected SQLSTATE/message and unchanged order/event/legacy-quote/notification snapshots.
- Legacy positive, anonymous, missing factory context, inactive-profile and other-factory cases.
- Direct notification helper execution is denied even to browser sessions holding platform_admin or legacy owner roles.
- Anonymous public quote acceptance still succeeds and produces the expected factory notification through the internal call.
- Oversized notes roll back quote decision and notification; invalid/mismatched notification parameters are rejected.

## Test harness and reproduction

File: `supabase/tests/trade_rpc_authorization.sql`.

Run as postgres on an isolated database with the complete application schema, using psql with `-X -v ON_ERROR_STOP=1`. The repository does not currently reconstruct the complete historical legacy schema, so a fresh migration replay is not claimed.

The suite defaults to strict failure: any failed case raises. For the pre-fix evidence run only, `set local epistable.tests.observe_failures='on';` was inserted immediately after the outer BEGIN to return all failures in one report. That observational setting is not a passing gate.

For green verification, insert the candidate migration immediately after the suite's outer BEGIN (with a short lock timeout), leaving its final ROLLBACK intact. This tests candidate DDL and fixtures atomically without deploying them. Do not run the migration alone against production merely to reproduce the evidence.

The test runner uses role switching rather than real browser tokens. Each case snapshots as postgres, runs the RPC as anon/authenticated, captures errors, resets role, verifies state/events, then rolls back the case. Do not infer HTTP gateway, email-delivery or browser validation from this suite.

## Additional verification and limitations

- Existing frontend suite: 27 passed. Production build passed with existing tooling deprecation and large-bundle warnings. The local working tree also contains earlier invitation work; this PR itself changes only the migration, SQL tests and this evidence document.
- Post-run read-back: zero guard fixture users/orders; original context() restored; production payment guard and anonymous notification-helper grant still unchanged.
- Security advisors were reread on unchanged production. Existing definer-exposure and password-protection findings remain; advisor output is not a candidate-deployment certification.
- No permanent production change, merge or deployment occurred. Existing production vulnerabilities remain until the reviewed migration is deployed.
- Frontend/browser, external integrations, concurrency races and public-link policy decisions remain unverified or outside this patch.
- Current discovered notification-helper caller is respond_to_quote only; no repository client, deployed Edge Function or cron.job caller was found. External service-key clients and dynamically constructed calls cannot be excluded.

Advisor reference: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
