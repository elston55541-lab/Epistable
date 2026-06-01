# Codex Working Rules — Epistable

Read this before every task. These rules apply to every PR unless the task brief explicitly overrides a specific rule.

## Project

Epistable is an industrial quality and buyer-audit-readiness platform for stone factories (expanding to other manufacturing sectors). React + Vite frontend, Supabase backend (Postgres + Auth + Storage + RLS), Anthropic Claude API for AI grading and chatbot. Production app with paying pilot factories — every change ships to real users.

## Hard rules (non-negotiable)

1. **Never touch the database without an explicit brief.** No new migrations, no RLS changes, no column changes, no policy changes unless the task brief specifically says so. The `supabase/` directory is off-limits by default.

2. **Never rebrand.** The product name is "Epistable". Do not rename to "SilakAI" or anything else unless the task brief specifically says so.

3. **Never break backwards compatibility on shared imports.** `src/lib/domain.js` exports `C` and `src/components/ui.jsx` exports `T`. Every legacy key on these objects (`C.primaryD`, `C.teal`, `C.blue2`, `C.blue2Bg`, `C.blue2Border`, `C.shadow`, `T.body`, `T.label`, `T.hint`, `T.control`, `T.title`, `T.pill`) must keep resolving. `src/App.jsx` uses them in hundreds of places. If you change the underlying token system, add aliases — do not remove keys.

4. **Verify scope before editing.** If the brief asks you to refactor a component, first confirm the component lives where the brief says it does. If reality differs from the brief (e.g., a component is in `App.jsx` instead of `components/`), stop and report back — do not silently relocate.

5. **Stay inside the brief's scope.** If you discover related issues outside the stated scope (other emojis, other inline styles, other duplicated logic), note them in the PR description but do not fix them in this PR. Each PR has a single purpose.

6. **Ask before destructive operations.** Force-push, hard reset, file deletion outside the modified set, dependency downgrades, or anything that could lose work — stop and ask first.

## PR scope contract (hardest rule)

Every brief includes a "What this PR does NOT do" section or an equivalent OUT-of-scope list. **Treat every item in that list as forbidden for this PR.** Not "out of scope but defensible to add" — forbidden.

If you discover something that seems missing or related, add it to the PR description under "Suggested follow-up PRs" and stop. The architect chose what's in scope deliberately; expanding scope without permission is a contract violation, not initiative.

The same rule applies to file structure: if a brief says to create `src/screens/Foo.jsx`, do not add the function to `src/App.jsx` instead, even if the existing codebase pattern would suggest otherwise. Brief overrides convention.

If a brief and the existing codebase conflict, stop and ask. Do not silently pick.

The same rule applies to schema: if a brief specifies column names, status enum values, or table names, use exactly those. Do not substitute "improved" names. If the specified shape is impossible against the existing schema, stop and report — do not silently use a different shape.

## Design system (post-PR-1 state)

### Tokens are the source of truth

All visual primitives come from `src/lib/tokens.js`:

- **TYPE** — 5-step scale: `caption` (11), `label` (12), `body` (14), `heading` (18), `display` (24). Do not introduce new size steps.
- **WEIGHT** — 3 levels only: `regular` (400), `medium` (600), `bold` (700). Do not use 500, 800, or 900.
- **SPACE** — 8px grid: 4, 8, 12, 16, 20, 24, 32. Do not use 7, 9, 10, 11, 13, 14, 22, 34, etc.
- **RADIUS** — `sm` (6), `md` (10), `lg` (14), `pill` (999).
- **SHADOW** — `card`, `raised`, `modal`.
- **COLOR** — refined navy primary + warm earth accent. Do not introduce teal or bright blue. Semantic colors (`green`, `red`, `amber`, `blue`, `purple`) exist for status — use them for status, not chrome.
- **FONT_STACK** — Inter + Segoe UI + system fallbacks. Never use the bare `"sans-serif"` keyword anywhere.

When writing or modifying any styled element:
- ✅ `style={{ fontSize: TYPE.label.size, fontWeight: WEIGHT.medium, padding: SPACE.md }}`
- ❌ `style={{ fontSize: 13, fontWeight: 800, padding: "11px 13px" }}`

When you find legacy inline styles in a file you're already modifying for another reason, migrate them to tokens. When the file is not in your task's scope, leave them alone (PR 2 sweeps them deliberately).

### Components

- **`<Icon name="..." size=.../>`** from `src/components/Icon.jsx` — wraps lucide-react. Use for every chrome icon (navigation, buttons, KPI tiles, status indicators).
- **`<Pill tone="..." size="..."/>`** from `src/components/Pill.jsx` — single source for all status pills. 7 tones: `neutral`, `primary`, `accent`, `success`, `warning`, `danger`, `info`. Do not write inline pill styles (`borderRadius: 20, padding: "3px 10px"`-style spans).
- **`fmtMoney(n)`** from `src/lib/domain.js` — always use this for currency. Do not concatenate `₹` or `Rs ` manually.

### Emoji policy

- **Chrome emoji are forbidden.** Navigation, KPI icons, status indicators, button labels, empty-state illustrations, ChatBot avatar — use `<Icon>` instead.
- **Data emoji are allowed where already encoded as data.** `GRADES[].emoji` is a data field and may render in places where the grade is presented as data, not chrome. Discuss before adding new data emoji.
- **Decorative emoji in select labels are chrome.** `💀 Dull`, `💨 Hollow`, `❌ Damaged`, `🔔 Clear` are chrome dressed as labels — replace with text or `<Icon>`.

## Sacred surfaces (do not restructure)

These have been deliberately designed and need extra care:

- **`src/components/SlabCertificate.jsx`** — public buyer/auditor-facing certificate. Best-designed surface in the app. Has print styles that must keep working. Refine styles via tokens; never restructure JSX or change the print stylesheet without a brief that specifically targets it.
- **`FacSuppliers` scorecard layout** (in `App.jsx`) — strongest operator UX. Token-migrate freely, but do not restructure.
- **`FacScan` multi-step flow** (in `App.jsx`) — 4-step gated form (Stone → Measurements → Defects → Grade). The gating logic and step progress UI are correct; do not refactor the flow itself.
- **`FacQuotesPage` fulfillment segmented progress** — cleanest workflow component in the app. Leave the segmented bar alone.

## Forbidden zones (do not touch without an explicit brief)

- `supabase/` — all migrations and SQL
- `src/lib/auth.js`, `src/lib/supabase.js`, `src/lib/supabaseSafe.js` — auth and DB plumbing
- `docs/` — documentation files
- HTML export templates in `FacAnalytics` (`downloadAuditPacket`, `downloadAuditCsv`, `downloadPilotReport`, `downloadGapReport`, `downloadAiReviewCsv`) — these are the printable audit artifacts; they have their own design pass coming
- The Anthropic Claude API prompts (grading prompt, chatbot system prompt) — these are tuned; treat as configuration, not code

## Scope discipline

- **One purpose per PR.** "Refactor X" and "while I'm in there, fix Y" is two PRs.
- **No layout restructures inside a styling PR.** Token migration preserves JSX shape exactly. Restructuring is a separate PR with its own brief.
- **No new dependencies without a brief.** `package.json` changes need to be in the brief.
- **No new routes, screens, or features without a brief.** Even if a screen is broken and you could fix it in a side-quest — don't.

## Currency, dates, numbers

- Currency: `fmtMoney(n)` from `domain.js`. Outputs `₹` symbol, Indian locale separators. Compact mode (`fmtMoney(n, { compact: true })`) for values ≥ 1 lakh.
- Dates: `fmtD(ts)` and `fmtT(ts)` from `domain.js`. Already locale-aware (en-IN).
- Numbers in KPI tiles: always pass through `.toLocaleString("en-IN")` so 10000 renders as 10,000.

## Verification before declaring done

For every PR, run and report:

1. `npm run build` — succeeds with no new warnings.
2. `npm run dev` — app launches, no console errors on initial load.
3. **Visual identity check** — open the login page and one screen as each role (owner, factory admin, factory inspector, buyer). Confirm no unintended visual regressions vs. the pre-PR state. Screenshot if possible.
4. **Public surfaces still work** — open `/slab/<known-id>` and `/quote/<known-id>` if relevant to the change. Print preview on the certificate still renders cleanly.
5. **Legacy imports resolve** — `grep -r "C\." src/App.jsx | head -20` and `grep -r "T\." src/App.jsx | head -20` — no broken references.

If any verification step fails, do not declare done. Diagnose and fix, or stop and report what you found.

## When to stop and ask

Stop and ask the user (do not proceed) when:

- Reality differs from the brief in a way that changes scope.
- A "small" fix turns out to require restructuring a sacred surface.
- You'd need to touch a forbidden zone to complete the task.
- A test fails for a reason that suggests the underlying behavior is wrong (not the test).
- The brief contradicts existing code conventions in this file.
- You'd need to remove a legacy alias to clean things up.

Default to asking. The user is the architect; you are the implementer. Surfacing a question is never the wrong call.

## Commit and PR conventions

- Commit messages: conventional commits format. `design(...)`, `fix(...)`, `feat(...)`, `refactor(...)`, `docs(...)`.
- One concept per commit. If you do tokens + sweep + bugfix, that's three commits.
- PR description must include: what changed, what did NOT change, verification steps run, anything noticed but deliberately not fixed (note for future PR).
- Never amend a published commit. Never force-push to `main`.

## Open this file's contract

If anything in this file becomes wrong over time, propose the change in a PR rather than silently ignoring the rule. Rules that get ignored are worse than rules that get updated.
