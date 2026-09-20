# Epistable — DeepSeek Review Bundle

Source snapshot: `31d78c0ee3bd70f7a934b44140549048a41e6a01`

The repository is private, so this branch contains ten review-friendly Markdown bundles that can be downloaded/copied and uploaded to DeepSeek.

## Bundle parts

1. [DEEPSEEK_CODE_01_CORE.md](./DEEPSEEK_CODE_01_CORE.md) — root config, package metadata, legacy app, marketplace entry point
2. [DEEPSEEK_CODE_02_COMPONENTS_LIB_A.md](./DEEPSEEK_CODE_02_COMPONENTS_LIB_A.md) — components, hooks and core libraries
3. [DEEPSEEK_CODE_03_MARKETPLACE.md](./DEEPSEEK_CODE_03_MARKETPLACE.md) — Buyer/Seller/Admin marketplace implementation
4. [DEEPSEEK_CODE_04_TESTS_SCREENS_STYLES.md](./DEEPSEEK_CODE_04_TESTS_SCREENS_STYLES.md) — marketplace tests, screens and CSS
5. [DEEPSEEK_CODE_05_SUPABASE_FOUNDATION.md](./DEEPSEEK_CODE_05_SUPABASE_FOUNDATION.md) — Supabase config, Edge Functions and early schema/auth migrations
6. [DEEPSEEK_CODE_06_SUPABASE_TRADE_COMPLIANCE.md](./DEEPSEEK_CODE_06_SUPABASE_TRADE_COMPLIANCE.md) — quote, trade and compliance migrations
7. [DEEPSEEK_CODE_07_SUPABASE_TRACEABILITY.md](./DEEPSEEK_CODE_07_SUPABASE_TRACEABILITY.md) — traceability/export-readiness migrations
8. [DEEPSEEK_CODE_08_SUPABASE_MARKETPLACE.md](./DEEPSEEK_CODE_08_SUPABASE_MARKETPLACE.md) — processed-food marketplace, pilot readiness, RLS fix, finance-readiness and SQL tests
9. [DEEPSEEK_CODE_09_DOCS_A.md](./DEEPSEEK_CODE_09_DOCS_A.md) — architecture/product documentation
10. [DEEPSEEK_CODE_10_DOCS_B.md](./DEEPSEEK_CODE_10_DOCS_B.md) — security, QA, marketplace and traceability documentation

## Deliberately omitted from the bundle files

- Binary image assets
- `package-lock.json` (generated dependency lockfile; `package.json` is included)
- Runtime secrets/environment values

The underlying branch still contains the original repository files.

## Suggested DeepSeek prompt

Review all attached Epistable bundle parts as one codebase. Epistable is a verified cross-border processed-food trade platform intended to progress from Discovery -> Verification -> Transaction -> Finance, initially oriented toward emerging-market/BRICS trade corridors.

Please audit it as a senior product engineer/security architect. Focus on:
1. Functional correctness of Buyer, Seller and Admin workflows.
2. Supabase RLS/authentication and privilege-escalation risks.
3. RFQ -> quote -> negotiation -> accepted order lifecycle.
4. Certification/document evidence integrity and private storage access.
5. Marketplace onboarding and organisation verification.
6. Finance-readiness data model: PO, invoice, payment, milestones and event history.
7. Data consistency/race conditions and transactional integrity.
8. Security issues in legacy routes or Edge Functions that could affect the marketplace.
9. Scalability and schema/design weaknesses.
10. Missing tests and production-readiness gaps.

Do not redesign the UI unless a UI issue causes a functional/security problem. Separate findings into Critical, High, Medium and Low. For every issue, cite the exact file/function/policy and propose a concrete fix. Do not assume a vulnerability exists without tracing the relevant authorization and database path.
