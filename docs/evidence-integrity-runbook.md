# Evidence integrity implementation runbook

Status: proposed implementation branch. Production ledger remains 7.5 until deployment and P0 verification.

## Permanent rules

**Storage Mutation Verification Principle.** A destructive or state-changing Storage operation is successful only when the intended post-state is independently verified. HTTP 2xx or SDK success alone is insufficient.

**Operation-specific Storage Principle.** Every new Storage operation for protected evidence requires its own permission scope and hosted-platform spike. Do not inherit broad SELECT from an existing role.

## Cutover precondition

The clean cutover is valid only while production has no protected marketplace evidence. Before deployment:

1. Block protected evidence creation at the authoritative write layer.
2. While writes remain blocked, verify:
   - trade_documents row count is zero, or classify every row before proceeding;
   - no trade_documents.storage_path exists;
   - no protected file_url exists;
   - the trade-evidence bucket contains no objects.
3. If any condition fails, stop the clean cutover and use the migration path.
4. Keep writes blocked while schema, Storage policy, proxy, frontend and review changes deploy.
5. Run the complete P0 suite.
6. Re-enable protected evidence creation only after P0 is green.

During steps 1-5, zero protected evidence uploads/deliveries is expected fail-closed service state, not an incident. Do not restore direct Storage read access as an operational workaround.

The write freeze may require operator scheduling. That calendar dependency is separate from the 15-21 engineering-day estimate.

## Replacement and cleanup state machine

Uploading B does not delete approved A. A remains current while B is pending unless A is explicitly revoked. When B is approved, B becomes current and A becomes historical/superseded.

| Evidence state | Seller cleanup DELETE | Retained? |
| --- | --- | --- |
| Unreferenced fresh upload | Allowed | No |
| pending | Allowed | Not audit history yet |
| rejected | Allowed | Review history row remains; object may be cleaned |
| verified/current | Denied | Yes |
| verified/superseded | Denied | Yes |
| expired after approval | Denied | Yes |
| future/unknown state | Denied by default | Until explicitly designed |

The SQL therefore uses an explicit allowlist (`pending`, `rejected`) rather than allowing every state except a denylist. If a future `legacy_unbound` or `failed` state is introduced, deletion does not automatically widen; the state must be deliberately added with its own acceptance tests.

## Delivery contract

Protected evidence is delivered only through an authenticated server-side proxy. Browser-authenticated buyer, seller and admin roles cannot read protected objects directly or mint signed download URLs.

Default response is Content-Disposition: attachment with validated Content-Type and X-Content-Type-Options: nosniff. Browser preview is a separate opt-in feature.

## Measured Storage behaviour

Hosted spike results:
- fresh upload succeeds with INSERT-only;
- direct read and signed-URL minting are denied without ordinary SELECT;
- DELETE + DELETE policy but no SELECT can return a false-success empty result while leaving the object present;
- adding SELECT scoped to storage.object.delete_many makes cleanup deletion real without granting ordinary read/sign capability.

Every denial/destructive test must include a privileged existence/post-state check. On hosted Storage, masked not-found and genuine absence are otherwise indistinguishable to the caller.

Copy, move, upsert, update or any future protected-evidence Storage operation must be separately spiked before use.


## Review receipt contract

Document review uses a short-lived capability rather than the generic four-argument review path.

- The receipt is bound to the authenticated reviewer, active Supabase Auth session, document id, private byte-binding id, evidence version, SHA-256 digest, Storage path, purpose and workflow revision.
- The receipt is issued only when the document's public metadata matches a server-established private byte binding.
- Organization and product reviews continue through the existing four-argument `review_marketplace_record` RPC.
- Document calls to that generic RPC fail closed. Document decisions use a distinct `review_marketplace_document` RPC, avoiding PostgREST overload resolution entirely.
- Receipt consumption and the document status change occur in one transaction. The existing `record_marketplace_review` trigger remains the canonical decision-history writer and copies the receipt/version/digest into `marketplace_reviews`.
- An identical retry of an already consumed receipt is idempotent only if the matching review-history row exists. An incompatible retry is rejected.
- Receipt TTL is a configurable parameter; the initial migration stores it in `epistable_private.evidence_integrity_config`, rather than treating the chosen number as locked product policy.

A browser-supplied digest is not trusted. A server-side evidence binding must independently hash the stored object and create the private `evidence_byte_bindings` record before a review receipt can be issued.


## Receipt privilege boundary

The private byte-binding, receipt and configuration tables grant no direct privileges to browser-authenticated roles. They have RLS enabled with no browser policies. Service role is the only direct table actor.

Public RPCs remain SECURITY INVOKER. Privileged table access lives in SECURITY DEFINER helpers under `epistable_private`; each helper independently verifies `auth.uid()`, platform-admin authority and that the JWT `session_id` still maps to `auth.sessions(id,user_id)`.

The `session_id` binding intentionally survives access-token refresh within the same Supabase session but fails after sign-out/sign-in or session revocation. If the product later introduces per-document reviewer assignment, that assignment identifier should become an additional receipt binding; it should not replace the session binding.

## Receipt errors and workflow revision

`workflow_revision` is stored in `epistable_private.evidence_integrity_config` and copied into the receipt at issuance. Consumption compares the receipt to the current revision. A revision change invalidates outstanding receipts with the explicit error detail `EVIDENCE_REVIEW_WORKFLOW_REVISION_MISMATCH`.

Receipt expiry is stored as `expires_at` at issuance. Later TTL configuration changes do not alter live receipts. The configured TTL is constrained to 60-3600 seconds.
