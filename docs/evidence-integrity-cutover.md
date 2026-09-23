# Evidence integrity cutover

Status: implementation branch only. Production controls remain unchanged until this work is deployed and the P0 suite passes.

## Locked contract

Protected marketplace evidence is delivered only through the authenticated evidence proxy. Browser-authenticated Buyer, Seller and Admin roles must not directly read protected Storage objects or mint shareable signed download URLs.

Approval binds to the exact evidence bytes, version, reviewer and authenticated session. Review history and current delivery eligibility are separate facts. Superseded approved evidence remains historical and retained; replacement does not rewrite or delete the predecessor approval.

Protected `trade_documents.visibility` supports only:

- `buyers`: eligible authenticated buyers may retrieve current approved evidence through the proxy.
- `private`: seller/platform workflow only.

`public` and external HTTPS `file_url` sources are not part of the protected-evidence contract.

## Permanent engineering principles

### Storage Mutation Verification Principle

Any destructive or state-changing Storage operation is considered successful only when the intended post-state is independently verified. HTTP 2xx or SDK success alone is not proof of mutation.

This is load-bearing on hosted Supabase. The DELETE spike returned SDK success with an empty result while the object still existed. A privileged post-state check exposed the false success.

Denial tests must likewise establish object existence through a privileged control check before interpreting masked `404/NoSuchKey` as authorization denial.

### Operation-specific Storage Principle

Every new protected-evidence Storage operation requires:

1. its own documented permission analysis;
2. the narrowest operation-scoped RLS grant available;
3. a hosted-platform spike before use;
4. independent post-state verification for mutations.

Do not inherit broad `SELECT` because another operation needs it.

Current measured behavior:

- fresh upload works with `INSERT` only;
- authenticated direct read is denied without read `SELECT`;
- signed download URL minting is denied without the required read permission;
- `remove([...])` requires `DELETE` plus `SELECT` scoped to `storage.object.delete_many` to actually delete and return deleted rows;
- that scoped SELECT does not justify general object-read or signing access.

Copy, move, update/upsert and any future Storage operation must be spiked separately before introduction.

## Replacement workflow

Approved evidence is immutable.

For approved A replaced by B:

1. upload B to a fresh immutable path;
2. create a new pending/candidate document B with `supersedes_document_id=A`;
3. retain A as current while B is pending;
4. preview B and create a version/digest/session-bound review receipt;
5. if B is approved, make B current and mark A superseded;
6. never delete A as part of replacement.

Browser-side deletion is cleanup only for genuinely deletable pending/failed/unbound evidence. It is not a replacement mechanism.

## Controlled cutover sequence

The clean-state cutover is valid only if evidence creation is frozen before the final clean-state check.

1. Block protected evidence creation at the authoritative write boundary.
2. Verify:
   - `trade_documents` contains no production evidence rows requiring migration;
   - `trade-evidence` contains no protected evidence objects;
   - no protected external `file_url` values exist.
3. If any check is non-zero, abort the clean cutover and use a migration/invalidation plan.
4. Deploy schema, Storage policies, review contract, proxy and frontend.
5. Keep writers blocked while P0 acceptance tests run.
6. During this window, **zero protected evidence uploads and zero protected evidence deliveries are expected fail-closed service state, not an incident**.
7. Re-enable evidence creation only after P0 passes and deployed configuration is verified.

If production operations require a separate operator to freeze/unfreeze evidence writes, schedule that window independently from engineering effort.

## Delivery response contract

Successful protected evidence responses must use controlled headers:

- validated `Content-Type`;
- `Content-Disposition: attachment` by default;
- `X-Content-Type-Options: nosniff`;
- `Cache-Control: private, no-store`.

In-browser PDF preview, if later added, is a separate opt-in capability with its own validation and tests. Attachment remains the default.

## Primary unresolved estimate risk

Retention and CASCADE migration policy is the primary remaining estimate risk. The product decision on what must be retained determines foreign-key topology, migration shape and potentially archival delivery behavior. It is intentionally not estimated until the retention contract is chosen.
