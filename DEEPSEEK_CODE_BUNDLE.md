# Epistable — DeepSeek Source Bundle

Repository: elston55541-lab/Epistable
Source branch: main
Snapshot commit: 31d78c0ee3bd70f7a934b44140549048a41e6a01

This bundle contains the Epistable text source code, Supabase functions and migrations, tests, configuration, and relevant project documentation.

Omitted only:
- Binary assets/images
- package-lock.json (generated dependency lockfile)
- Runtime secrets/environment values

Each source file begins with a FILE marker.



===== FILE: .github/workflows/marketplace-checks.yml =====

```yaml
name: Marketplace checks
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  test-and-build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .node-version
          cache: npm
      # Match the npm version in the Cloudflare failure log, not only Node 24 bundled npm.
      - run: npm install --global npm@10.8.2
      - run: npm ci
      - run: npm test
      - run: npm run build

```


===== FILE: .gitignore =====

```text
node_modules/
dist/
.env
.env.local
supabase/.temp/

```


===== FILE: .node-version =====

```text
24

```


===== FILE: AGENTS.md =====

```markdown
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

```


===== FILE: PRODUCT.md =====

```markdown
# Product

## Register

product

## Users

Epistable serves stone factories, Indian exporters, factory operators, owners, and international buyers. Buyers use the portal to inspect available inventory, compare evidence, request quotes, and judge whether a supplier looks serious enough to engage.

## Product Purpose

Epistable helps factories turn operational quality records into buyer-ready evidence: inspection photos, traceability, certificates, quotes, audit records, and export-readiness documents. The product should make a supplier feel more credible without implying Epistable is a certification body.

## Brand Personality

Calm, credible, industrial. The interface should feel like a serious procurement and compliance tool, not a playful startup dashboard.

## Anti-references

Avoid generic admin dashboards, loud AI gradients, cluttered KPI walls, decorative emojis, and language that says or implies "Epistable certified." Avoid hiding the actual inventory behind a buyer dashboard.

## Design Principles

1. Put the working object first: inventory, evidence, quotes, and documents should be immediately visible.
2. Reduce training burden: each role sees only the workflows they need.
3. Trust comes from evidence: show source, status, photos, certificates, validity, and traceability.
4. Keep the UI familiar: procurement users should recognize navigation, filters, cards, and quote actions instantly.
5. Preserve neutrality: Epistable organizes readiness and evidence, accredited bodies issue certifications.

## Accessibility & Inclusion

Use legible type, clear contrast, standard controls, keyboard-accessible actions, and responsive layouts that work on mobile for factory teams and buyers.

```


===== FILE: index.html =====

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="description" content="Epistable AI - Quality, quantified" />
    <meta name="theme-color" content="#0057a8" />
    <meta name="color-scheme" content="light" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Epistable" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <title>Epistable AI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```


===== FILE: package.json =====

```json
{
  "name": "epistable",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "lucide-react": "^1.16.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@testing-library/react": "16.3.0",
    "@testing-library/user-event": "14.6.1",
    "@vitejs/plugin-react": "^4.0.0",
    "jsdom": "26.1.0",
    "vite": "^5.0.0",
    "vitest": "4.1.11"
  }
}

```


===== FILE: public/_redirects =====

```text
/* /index.html 200

```


===== FILE: public/manifest.webmanifest =====

```json
{
  "name": "Epistable AI",
  "short_name": "Epistable",
  "description": "Verified cross-border processed-food trade: supplier discovery, compliance evidence, RFQs and quotes.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f0f2f5",
  "theme_color": "#0057a8",
  "categories": ["business", "productivity"],
  "icons": [
    {
      "src": "/icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}

```


===== FILE: public/sw.js =====

```javascript
const CACHE_NAME = "epistable-shell-v1";
const SHELL_ASSETS = ["/", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/") || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request).then(response => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }))
  );
});

```


===== FILE: vite.config.js =====

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
  },
})

```


===== FILE: vitest.config.mjs =====

```text
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],test:{environment:'jsdom',setupFiles:['./src/marketplace/test-setup.js'],include:['src/**/*.test.{js,jsx}']}});

```


===== FILE: src/registerServiceWorker.js =====

```javascript
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability should never block the core app.
    });
  });
}

```


===== FILE: src/App.jsx =====

```jsx
﻿import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "./lib/supabase";
import { acceptInviteWithPassword, friendlyAuthError, getSessionProfile, signInWithEmail, signOut } from "./lib/auth";
import { maybeOne, requireData, rows } from "./lib/supabaseSafe";
import { C, STONES, DEFECTS, GRADES, PLANS, genId, fmtT, fmtD, curMon, calcBill, gradeConf, slabQrUrl, fmtMoney } from "./lib/domain";
import { useBP } from "./hooks/useBP";
import { Avi, BillPill, Btn, Card, DisputeStatusPill, Inp, InqPill, KpiGrid, Loader, Modal, PBar, Sel, StatPill, T } from "./components/ui";
import { SlabCertificate } from "./components/SlabCertificate";
import { QualityReport } from "./components/QualityReport";
import { Icon } from "./components/Icon";
import { Pill } from "./components/Pill";
import { FONT_STACK, SPACE, TYPE, WEIGHT } from "./lib/tokens";
import { mapRequirement, requirementApplies } from "./lib/readiness";
import { SellerDocuments } from "./screens/SellerDocuments";

// â”€â”€ DB (Supabase) â”€â”€
const INSP_LIST_SELECT = "id,user_id,factory_id,factory_name,inspector,stone,supplier,supplier_id,grade,reason,price_per_sq_ft,export_ready,inventory_status,measurements,defects,notes,photo,ts,date,time";
const BUYER_INSP_LIST_SELECT = "id,user_id,factory_id,factory_name,inspector,stone,supplier,supplier_id,grade,price_per_sq_ft,export_ready,inventory_status,measurements,ts,date,time";
const mapInquiry = d => ({
  ...d,
  factoryId:d.factory_id,
  factoryName:d.factory_name,
  buyerName:d.buyer_name,
  buyerCompany:d.buyer_company,
  buyerEmail:d.buyer_email,
  slabId:d.slab_id,
  pricePerSqFt:d.price_per_sq_ft,
  factoryNotes:d.factory_notes||"",
  followUpAt:d.follow_up_at||null,
  priority:d.priority||"warm",
});
const mapQuote = d => ({
  ...d,
  inquiryId:d.inquiry_id,
  slabId:d.slab_id,
  factoryId:d.factory_id,
  factoryName:d.factory_name,
  buyerName:d.buyer_name,
  buyerCompany:d.buyer_company,
  buyerEmail:d.buyer_email,
  pricePerSqFt:d.price_per_sq_ft,
  areaSqFt:d.area_sq_ft,
  totalAmount:d.total_amount,
  validityTs:d.validity_ts,
  buyerMessage:d.buyer_message,
  buyerDecidedAt:d.buyer_decided_at,
  parentQuoteId:d.parent_quote_id,
  revisionNumber:d.revision_number||1,
  fulfillmentStatus:d.fulfillment_status||"not_started",
});

const QUOTE_FULFILLMENT = [
  {id:"not_started",label:"Not started",buyer:"Waiting for buyer response",factory:"Starts after buyer accepts",color:C.textDim,bg:C.surface,border:C.border},
  {id:"payment_pending",label:"Payment pending",buyer:"Factory is waiting for payment confirmation",factory:"Confirm advance/payment with buyer",color:C.amber,bg:C.amberBg,border:C.amberBorder},
  {id:"payment_received",label:"Payment received",buyer:"Payment received. Factory is preparing dispatch",factory:"Payment received. Prepare dispatch",color:C.green,bg:C.greenBg,border:C.greenBorder},
  {id:"dispatch_scheduled",label:"Dispatch scheduled",buyer:"Dispatch has been scheduled",factory:"Dispatch date/vehicle is scheduled",color:C.primary,bg:C.primaryBg,border:C.primaryBorder},
  {id:"dispatched",label:"Dispatched",buyer:"Slab has been dispatched",factory:"Slab has left the factory",color:C.blue2,bg:C.blue2Bg,border:C.blue2Border},
  {id:"delivered",label:"Delivered",buyer:"Slab delivered. Awaiting final closure",factory:"Delivered. Ready to close as sold",color:C.purple,bg:C.purpleBg,border:C.purpleBorder},
  {id:"sold",label:"Sold",buyer:"Order closed as sold",factory:"Closed as sold",color:C.green,bg:C.greenBg,border:C.greenBorder},
];
const fulfillmentConf = status => QUOTE_FULFILLMENT.find(x=>x.id===status)||QUOTE_FULFILLMENT[0];
const activeFulfillment = q => q.fulfillmentStatus||q.fulfillment_status||(q.status==="accepted"?"payment_pending":"not_started");
const TEXT = {
  pageTitle: {...T.title,marginBottom:18,fontWeight:700},
  pageHeader: {...T.title,fontWeight:700},
  heroTitle: {fontSize:20,lineHeight:1.2,fontWeight:700,letterSpacing:0},
  panelTitle: {fontSize:14,lineHeight:1.55,fontWeight:700,letterSpacing:0},
  itemTitle: {fontSize:13,lineHeight:1.55,fontWeight:600,letterSpacing:0},
  meta: {...T.hint,color:C.textDim},
  tinyMeta: {fontSize:12,lineHeight:1.55,color:C.textDim,letterSpacing:0},
  emptyTitle: {fontSize:15,lineHeight:1.55,fontWeight:700,letterSpacing:0},
};

function AdvancedDisclosure({children}) {
  const [open,setOpen]=useState(false);
  return (
    <>
      <button
        type="button"
        onClick={()=>setOpen(o=>!o)}
        style={{background:"transparent",border:"none",color:C.textMid,fontSize:TYPE.label.size,fontWeight:WEIGHT.medium,cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:SPACE.xs,fontFamily:FONT_STACK}}
      >
        <Icon name={open?"remove":"add"} size={12}/>
        {open?"Hide advanced":"Show advanced"}
      </button>
      {open&&<div style={{marginTop:SPACE.md}}>{children}</div>}
    </>
  );
}

const CHROME_ICON = {
  "\u{1F3ED}": "factory",
  "\u{1F464}": "user",
  "\u{1F465}": "users",
  "\u{1F4B3}": "billing",
  "\u{1F50D}": "search",
  "\u{1F6A8}": "alert",
  "\u{23F8}": "pause",
  "\u{25B6}": "play",
  "\u{1F916}": "bot",
  "\u{1FAA8}": "package",
  "\u{1F4E6}": "package",
  "\u{1F4C5}": "date",
  "\u{1F4C6}": "date",
  "\u{1F3C6}": "verified",
  "\u{1F514}": "bell",
  "\u{1F4E9}": "mail",
  "\u{1F4DE}": "phone",
  "\u{1F91D}": "users",
  "\u{1F6E1}\uFE0F": "verified",
  "\u{1F532}": "qr",
  "\u{1F4A1}": "alert",
  "\u{1F4F8}": "camera",
  "\u{26A0}\uFE0F": "alert",
  "\u{1F30D}": "location",
  "\u20B9": "currency",
  Quote: "message",
  Sold: "check",
  Now: "alert",
};

function ChromeIcon({icon,size=18,color="currentColor",style}) {
  const name=CHROME_ICON[icon]||icon;
  if(typeof name==="string")return <Icon name={name} size={size} color={color} style={style}/>;
  return name||null;
}

function GuidanceCard({title,subtitle,items=[],actionLabel,onAction,style={}}) {
  return (
    <Card style={{padding:20,...style}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:16}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:3}}>{title}</div>
          {subtitle&&<div style={TEXT.tinyMeta}>{subtitle}</div>}
        </div>
        {actionLabel&&<Btn size="sm" variant="ghost" onClick={onAction}>{actionLabel}</Btn>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14}}>
        {items.map((item,i)=>(
          <div key={`${item.label}-${i}`} style={{background:item.bg||C.surface,border:`1px solid ${item.border||C.border}`,borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:12,fontWeight:600,color:item.color||C.primary,marginBottom:4}}>{item.label}</div>
            <div style={{fontSize:12,lineHeight:1.65,color:C.textMid}}>{item.detail}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmptyState({title,body,actionLabel,onAction,secondaryLabel,onSecondary,style={}}) {
  return (
    <Card style={{padding:"34px 22px",textAlign:"center",...style}}>
      <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:7}}>{title}</div>
      {body&&<div style={{fontSize:13,lineHeight:1.65,color:C.textDim,maxWidth:420,margin:"0 auto 16px"}}>{body}</div>}
      <div style={{display:"flex",gap:11,justifyContent:"center",flexWrap:"wrap"}}>
        {actionLabel&&<Btn size="sm" onClick={onAction}>{actionLabel}</Btn>}
        {secondaryLabel&&<Btn size="sm" variant="secondary" onClick={onSecondary}>{secondaryLabel}</Btn>}
      </div>
    </Card>
  );
}

function ErrorNotice({title="Something went wrong",message,onRetry,style={}}) {
  if(!message)return null;
  return (
    <div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,color:C.red,marginBottom:16,...style}}>
      <div style={{minWidth:0}}>
        <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{title}</div>
        <div style={{fontSize:12,lineHeight:1.65,color:C.textMid}}>{message}</div>
      </div>
      {onRetry&&<Btn size="sm" variant="secondary" onClick={onRetry} style={{flexShrink:0,borderColor:C.redBorder,color:C.red}}>Retry</Btn>}
    </div>
  );
}

function SetupChecklist({title,subtitle,items=[],style={}}) {
  const done=items.filter(i=>i.done).length;
  if(!items.length)return null;
  return (
    <Card style={{padding:20,...style}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:16}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:3}}>{title}</div>
          {subtitle&&<div style={TEXT.tinyMeta}>{subtitle}</div>}
        </div>
        <span style={{background:done===items.length?C.greenBg:C.primaryBg,border:`1px solid ${done===items.length?C.greenBorder:C.primaryBorder}`,borderRadius:20,padding:"4px 9px",fontSize:12,fontWeight:600,color:done===items.length?C.green:C.primary,whiteSpace:"nowrap"}}>{done}/{items.length}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {items.map(item=>(
          <button key={item.label} onClick={item.onClick} disabled={!item.onClick} style={{display:"flex",alignItems:"center",gap:14,background:item.done?C.greenBg:C.white,border:`1px solid ${item.done?C.greenBorder:C.border}`,borderRadius:10,padding:"14px 16px",cursor:item.onClick?"pointer":"default",fontFamily:FONT_STACK,textAlign:"left"}}>
            <span style={{width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:item.done?C.green:C.surface,color:item.done?C.white:C.textDim,fontSize:12,fontWeight:600,flexShrink:0}}>{item.done?"âœ“":"â€¢"}</span>
            <span style={{flex:1,minWidth:0}}>
              <span style={{display:"block",fontSize:12,fontWeight:600,color:C.text}}>{item.label}</span>
              <span style={{display:"block",fontSize:12,lineHeight:1.65,color:C.textDim,marginTop:2}}>{item.detail}</span>
            </span>
            {item.onClick&&!item.done&&<span style={{fontSize:12,fontWeight:600,color:C.primary,flexShrink:0}}>Open</span>}
          </button>
        ))}
      </div>
    </Card>
  );
}

const DB = {
  // Factories
  async createFac(d) {
    const id=genId("FAC");
    const f={id,...d,created_at:Date.now(),status:"active",scans_total:0,billing_status:"pending",current_month_scans:0,current_month:curMon()};
    requireData(await supabase.from("factories").insert(f));
    return f;
  },
  async getFac(id) {
    return maybeOne(await supabase.from("factories").select().eq("id",id).maybeSingle());
  },
  async getFacByName(name) {
    if(!name)return null;
    return maybeOne(await supabase.from("factories").select().ilike("name",name.trim()).maybeSingle());
  },
  async updFac(id,u) {
    return requireData(await supabase.from("factories").update(u).eq("id",id).select().single());
  },
  async allFacs() {
    return rows(await supabase.from("factories").select().order("created_at",{ascending:false}));
  },

  // Users
  async createUser(d) {
  const id=genId("USR");
  const u={
    id,
    auth_user_id:d.authUserId||null,
    name:d.name,
    email:d.email.toLowerCase(),
    role:d.role,
    factory_id:d.factoryId,
    factory_name:d.factoryName,
    avatar:d.avatar,
    status:d.status||"pending",
    scans_total:0,
    last_active:null,
    created_at:Date.now()
  };
  requireData(await supabase.from("profiles").insert(u));
  return u;
},
  async getUser(id) {
    return maybeOne(await supabase.from("profiles").select().eq("id",id).maybeSingle());
  },
  async getUserByEmail(email) {
  return maybeOne(await supabase.from("profiles").select().eq("email",email.toLowerCase()).neq("role","buyer").maybeSingle());
  },
  async updUser(id,u) {
    return requireData(await supabase.from("profiles").update(u).eq("id",id).select().single());
  },
  async facUsers(fid) {
    return rows(await supabase.from("profiles").select().eq("factory_id",fid).order("created_at",{ascending:false}));
  },
  async allUsers() {
    return rows(await supabase.from("profiles").select().order("created_at",{ascending:false}));
  },

  // Buyers
 async createBuyer(d) {
  const id=genId("BUY");
 const b={
    id,
    auth_user_id:d.authUserId||null,
    name:d.name,
    email:d.email.toLowerCase(),
    role:"buyer",
    company:d.company||"",
    factory_id:d.factoryId,
    factory_name:d.factoryName,
    status:d.status||"pending",
    last_active:null,
    created_at:Date.now()
  };
  requireData(await supabase.from("profiles").insert(b));
  return b;
  },
  async getBuyerByEmail(email) {
  return maybeOne(await supabase.from("profiles").select().eq("email",email.toLowerCase()).eq("role","buyer").maybeSingle());
  },
  async updBuyer(id,u) {
    requireData(await supabase.from("profiles").update(u).eq("id",id));
  },
  async facBuyers(fid) {
    return rows(await supabase.from("profiles").select().eq("factory_id",fid).eq("role","buyer"));
  },

  // Inspections
  async saveInsp(insp) {
    requireData(await supabase.from("inspections").insert({
      id:insp.id, user_id:insp.userId, factory_id:insp.factoryId,
      factory_name:insp.factoryName, inspector:insp.inspector,
      stone:insp.stone, supplier:insp.supplier, supplier_id:insp.supplierId,
      grade:insp.grade, reason:insp.reason, price_per_sq_ft:insp.pricePerSqFt,
      export_ready:insp.exportReady, inventory_status:insp.inventoryStatus||"available", measurements:insp.measurements,
      defects:insp.defects, notes:insp.notes, photo:insp.photo,
      photos:insp.photos, ts:insp.ts, date:insp.date, time:insp.time
    }));
    const fac=await DB.getFac(insp.factoryId);
    if(fac){
      const m=curMon();
      const ms=fac.current_month===m?(fac.current_month_scans||0)+1:1;
      await DB.updFac(insp.factoryId,{scans_total:(fac.scans_total||0)+1,current_month_scans:ms,current_month:m,last_active:Date.now()});
    }
    const usr=await DB.getUser(insp.userId); if(usr) await DB.updUser(insp.userId,{scans_total:(usr.scans_total||0)+1,last_active:Date.now()});
  },
  async getInsp(id) {
    const data=await maybeOne(await supabase.from("inspections").select().eq("id",id).maybeSingle());
    if(!data)return null;
    return {...data,userId:data.user_id,factoryId:data.factory_id,factoryName:data.factory_name,supplierId:data.supplier_id,pricePerSqFt:data.price_per_sq_ft,exportReady:data.export_ready,inventoryStatus:data.inventory_status||"available"};
  },
  async userInsps(uid) {
    const data=await rows(await supabase.from("inspections").select(INSP_LIST_SELECT).eq("user_id",uid).order("ts",{ascending:false}).limit(200));
    return (data||[]).map(d=>({...d,userId:d.user_id,factoryId:d.factory_id,factoryName:d.factory_name,supplierId:d.supplier_id,pricePerSqFt:d.price_per_sq_ft,exportReady:d.export_ready,inventoryStatus:d.inventory_status||"available"}));
  },
  async facInsps(fid) {
    const data=await rows(await supabase.from("inspections").select(INSP_LIST_SELECT).eq("factory_id",fid).order("ts",{ascending:false}).limit(300));
    return (data||[]).map(d=>({...d,userId:d.user_id,factoryId:d.factory_id,factoryName:d.factory_name,supplierId:d.supplier_id,pricePerSqFt:d.price_per_sq_ft,exportReady:d.export_ready,inventoryStatus:d.inventory_status||"available"}));
  },
  async facBuyerInsps(fid) {
    const data=await rows(await supabase.from("inspections").select(BUYER_INSP_LIST_SELECT).eq("factory_id",fid).in("grade",["Premium","Standard"]).order("ts",{ascending:false}).limit(300));
    return (data||[]).map(d=>({...d,userId:d.user_id,factoryId:d.factory_id,factoryName:d.factory_name,supplierId:d.supplier_id,pricePerSqFt:d.price_per_sq_ft,exportReady:d.export_ready,inventoryStatus:d.inventory_status||"available"}));
  },
  async facBuyerPhotos(fid,ids) {
    if(!ids?.length)return [];
    return rows(await supabase.from("inspections").select("id,photo").eq("factory_id",fid).in("id",ids).not("photo","is",null));
  },
  async facStoneOptions(fid) {
    const data=await rows(await supabase.from("inspections").select("stone,grade").eq("factory_id",fid).in("grade",["Premium","Standard"]).not("stone","is",null).order("stone",{ascending:true}).limit(1000));
    return Array.from(new Set((data||[]).map(d=>d.stone).filter(Boolean))).sort();
  },
  async allInsps() {
    const data=await rows(await supabase.from("inspections").select("id,factory_id,grade,ts").order("ts",{ascending:false}).limit(1000));
    return (data||[]).map(d=>({...d,userId:d.user_id,factoryId:d.factory_id,factoryName:d.factory_name,supplierId:d.supplier_id,pricePerSqFt:d.price_per_sq_ft,exportReady:d.export_ready}));
  },
  async updInspStatus(id,status) {
    return requireData(await supabase.from("inspections").update({inventory_status:status}).eq("id",id).select().single());
  },

  // Suppliers
  async createSupplier(d) {
    const id=genId("SUP");
    const s={id,...d,created_at:Date.now(),status:"active",factory_id:d.factoryId};
    requireData(await supabase.from("suppliers").insert(s));
    return s;
  },
  async updSupplier(id,u) {
    requireData(await supabase.from("suppliers").update(u).eq("id",id));
  },
  async facSuppliers(fid) {
    return rows(await supabase.from("suppliers").select().eq("factory_id",fid));
  },
  async supplierInsps(sid) {
    const data=await rows(await supabase.from("inspections").select().eq("supplier_id",sid).order("ts",{ascending:false}));
    return (data||[]).map(d=>({...d,userId:d.user_id,factoryId:d.factory_id,factoryName:d.factory_name,supplierId:d.supplier_id,pricePerSqFt:d.price_per_sq_ft,exportReady:d.export_ready}));
  },
  async linkInspectionsToSupplier(ids,supplier) {
    if(!ids.length)return [];
    const data=await rows(await supabase.from("inspections").update({supplier_id:supplier.id,supplier:supplier.name}).in("id",ids).select());
    return (data||[]).map(d=>({...d,userId:d.user_id,factoryId:d.factory_id,factoryName:d.factory_name,supplierId:d.supplier_id,pricePerSqFt:d.price_per_sq_ft,exportReady:d.export_ready}));
  },

  // Disputes
  async createDispute(d) {
    const id=genId("DSP");
    const disp={
      id,
      created_at:Date.now(),
      status:"open",
      factory_id:d.factoryId,
      factory_name:d.factoryName,
      buyer_name:d.buyerName,
      buyer_company:d.buyerCompany,
      slab_id:d.slabId,
      stone:d.stone,
      category:d.category,
      details:d.details,
      response:d.response||null
    };
    requireData(await supabase.from("disputes").insert(disp));
    return disp;
  },
  async updDispute(id,u) {
    requireData(await supabase.from("disputes").update(u).eq("id",id));
  },
  async facDisputes(fid) {
    const data=await rows(await supabase.from("disputes").select().eq("factory_id",fid).order("created_at",{ascending:false}));
    return (data||[]).map(d=>({...d,factoryId:d.factory_id,factoryName:d.factory_name,buyerName:d.buyer_name,buyerCompany:d.buyer_company,slabId:d.slab_id}));
  },
  async allDisputes() {
    const data=await rows(await supabase.from("disputes").select().order("created_at",{ascending:false}));
    return (data||[]).map(d=>({...d,factoryId:d.factory_id,factoryName:d.factory_name,buyerName:d.buyer_name,buyerCompany:d.buyer_company,slabId:d.slab_id}));
  },

  // Inquiries
  async createInquiry(d) {
    const id=genId("INQ");
    const inq={
      id,
      created_at:Date.now(),
      status:"new",
      factory_id:d.factoryId,
      factory_name:d.factoryName,
      buyer_name:d.buyerName,
      buyer_company:d.buyerCompany,
      buyer_email:d.buyerEmail,
      slab_id:d.slabId,
      stone:d.stone,
      grade:d.grade,
      price_per_sq_ft:d.pricePerSqFt,
      message:d.message||"",
      priority:d.priority||"warm",
      factory_notes:d.factoryNotes||"",
      follow_up_at:d.followUpAt||null
    };
    requireData(await supabase.from("inquiries").insert(inq));
    return inq;
  },
  async updInquiry(id,u) {
    requireData(await supabase.from("inquiries").update(u).eq("id",id));
  },
  async facInquiries(fid) {
    const data=await rows(await supabase.from("inquiries").select().eq("factory_id",fid).order("created_at",{ascending:false}));
    return (data||[]).map(mapInquiry);
  },
  async buyerInquiries(email,fid) {
    if(!email)return [];
    const data=await rows(await supabase.from("inquiries").select().eq("buyer_email",email.toLowerCase()).eq("factory_id",fid).order("created_at",{ascending:false}).limit(20));
    return (data||[]).map(mapInquiry);
  },
  async allInquiries() {
    const data=await rows(await supabase.from("inquiries").select().order("created_at",{ascending:false}));
    return (data||[]).map(mapInquiry);
  },

  // Quotes
  async createQuote(d) {
    const id=genId("QTE");
    const row={
      id,
      inquiry_id:d.inquiryId,
      slab_id:d.slabId,
      factory_id:d.factoryId,
      factory_name:d.factoryName,
      buyer_name:d.buyerName,
      buyer_company:d.buyerCompany,
      buyer_email:d.buyerEmail,
      stone:d.stone,
      grade:d.grade,
      price_per_sq_ft:d.pricePerSqFt,
      area_sq_ft:d.areaSqFt,
      total_amount:d.totalAmount,
      validity_ts:d.validityTs,
      parent_quote_id:d.parentQuoteId||null,
      revision_number:d.revisionNumber||1,
      notes:d.notes,
      status:d.status||"sent",
      fulfillment_status:d.fulfillmentStatus||"not_started",
      created_at:Date.now(),
      updated_at:Date.now()
    };
    requireData(await supabase.from("quotes").insert(row));
    return mapQuote(row);
  },
  async facQuotes(fid) {
    const data=await rows(await supabase.from("quotes").select().eq("factory_id",fid).order("created_at",{ascending:false}));
    return (data||[]).map(mapQuote);
  },
  async buyerQuotes(email,fid) {
    if(!email)return [];
    const data=await rows(await supabase.from("quotes").select().eq("buyer_email",email.toLowerCase()).eq("factory_id",fid).order("created_at",{ascending:false}).limit(30));
    return (data||[]).map(mapQuote);
  },
  async updQuote(id,u) {
    requireData(await supabase.from("quotes").update({...u,updated_at:Date.now()}).eq("id",id));
  },
  async updateQuoteFulfillment(id,status) {
    const data=await rows(await supabase.rpc("update_quote_fulfillment",{quote_id:id,next_fulfillment_status:status}));
    return data[0]?mapQuote(data[0]):null;
  },
  async notifyBuyerRevisedQuote(id) {
    requireData(await supabase.rpc("notify_buyer_revised_quote",{quote_id:id}));
  },

  // Export readiness
  async getExportReadinessProfile(factoryId) {
    const data=await rows(await supabase.from("export_readiness_profiles").select().eq("factory_id",factoryId).order("updated_at",{ascending:false}).limit(1));
    return data[0]||null;
  },
  async saveExportReadinessProfile(existing,d) {
    const now=Date.now();
    const payload={
      factory_id:d.factoryId,
      sector:d.sector||"stone",
      product_type:d.productType||"any",
      destination_markets:d.destinationMarkets||[],
      current_certifications:d.currentCertifications||[],
      company_size:d.companySize||"",
      export_status:d.exportStatus||"planning",
      readiness_stage:"profile_complete",
      onboarding_inputs:d.onboardingInputs||{},
      onboarding_completed_at:existing?.onboarding_completed_at||now,
      last_reviewed_at:now,
      updated_at:now,
    };
    if(existing?.id) {
      return requireData(await supabase.from("export_readiness_profiles").update(payload).eq("id",existing.id).select().single());
    }
    return requireData(await supabase.from("export_readiness_profiles").insert({...payload,id:genId("ERP"),created_by:d.userId||null,created_at:now}).select().single());
  },
  async exportRequirements(params) {
    let data=[];
    try {
      data=await rows(await supabase.from("export_requirement_catalog").select("*"));
    } catch(e) {
      console.warn("Export requirement catalog unavailable, falling back to base table",e);
      data=await rows(await supabase.from("export_requirements").select("*").eq("active",true));
    }
    return (data||[]).map(mapRequirement).filter(r=>requirementApplies(r,params)).sort((a,b)=>(b.priority||0)-(a.priority||0));
  },
  async readinessEvidence(profileId) {
    if(!profileId)return [];
    return rows(await supabase.from("readiness_evidence").select("*").eq("profile_id",profileId));
  },
  async setReadinessEvidence(d) {
    const now=Date.now();
    const existing=await rows(await supabase.from("readiness_evidence").select("id").eq("profile_id",d.profileId).eq("requirement_id",d.requirementId).limit(1));
    const payload={
      factory_id:d.factoryId,
      profile_id:d.profileId,
      requirement_id:d.requirementId,
      evidence_type:d.evidenceType||"document_upload",
      evidence_lifecycle_type:d.evidenceLifecycleType||null,
      status:d.status,
      file_url:d.fileUrl||null,
      certificate_number:d.certificateNumber||null,
      issuing_body_id:d.issuingBodyId||null,
      issued_at:d.issuedAt||null,
      expires_at:d.expiresAt||null,
      next_check_at:d.nextCheckAt||null,
      notes:d.notes||"",
      metadata:{updatedFrom:"export_readiness_assessment",...(d.metadata||{})},
      updated_at:now,
    };
    if(existing[0]?.id)return requireData(await supabase.from("readiness_evidence").update(payload).eq("id",existing[0].id).select().single());
    return requireData(await supabase.from("readiness_evidence").insert({...payload,id:genId("EV"),created_by:d.userId||null,created_at:now}).select().single());
  },
  async readinessBodies(requirementIds=[]) {
    if(!requirementIds.length)return {};
    try {
      const links=await rows(await supabase.from("certification_body_requirements").select("body_id,requirement_id,scope_notes").in("requirement_id",requirementIds));
      const bodyIds=[...new Set(links.map(l=>l.body_id).filter(Boolean))];
      if(!bodyIds.length)return {};
      const bodies=await rows(await supabase.from("certification_bodies").select("id,name,body_type,website,is_verified,is_featured,commercial_disclosure").in("id",bodyIds));
      const bodyMap=Object.fromEntries(bodies.map(b=>[b.id,b]));
      return links.reduce((acc,l)=>{
        const b=bodyMap[l.body_id];
        if(!b)return acc;
        acc[l.requirement_id]=[...(acc[l.requirement_id]||[]),{...b,scope_notes:l.scope_notes||""}];
        return acc;
      },{});
    } catch(e) {
      console.warn("Readiness bodies skipped",e);
      return {};
    }
  },
  async factoryUsageStats(factoryId) {
    const cutoff=Date.now() - 90 * 86400000;
    const [insps,suppliers]=await Promise.all([
      rows(await supabase.from("inspections").select("id,ts,measurements").eq("factory_id",factoryId).gte("ts",cutoff)),
      rows(await supabase.from("suppliers").select("id").eq("factory_id",factoryId)),
    ]);
    return {
      inspectionsLast90Days:insps.length,
      registeredSuppliers:suppliers.length,
      inspectionsWithBatchNo:insps.filter(i=>i.measurements?.traceability?.batchNo).length,
    };
  },
  async evidenceFileUrl(pathOrUrl) {
    if(!pathOrUrl)return null;
    if(/^https?:\/\//i.test(pathOrUrl))return pathOrUrl;
    try {
      const {data,error}=await supabase.storage.from("factory_evidence").createSignedUrl(pathOrUrl,3600);
      if(error){console.warn("Failed to sign evidence URL",error);return null;}
      return data?.signedUrl||null;
    } catch(e) {
      console.warn("Failed to sign evidence URL",e);
      return null;
    }
  },

  // Notifications
  async addNotif(uid,n) {
    requireData(await supabase.from("notifications").insert({id:genId("N"),user_id:uid,...n,ts:Date.now(),read:false}));
  },
  async getNotifs(uid) {
    return rows(await supabase.from("notifications").select().eq("user_id",uid).order("ts",{ascending:false}).limit(50));
  },
  async readAll(uid) {
    requireData(await supabase.from("notifications").update({read:true}).eq("user_id",uid));
  },

  // Activity
  async addActivity(a) {
    const row={id:genId("ACT"),ts:Date.now(),...a};
    try {
      requireData(await supabase.from("activity_logs").insert(row));
      return row;
    } catch(e) {
      console.warn("Activity log skipped",e);
      return null;
    }
  },
  async allActivity() {
    try {
      return rows(await supabase.from("activity_logs").select().order("ts",{ascending:false}).limit(30));
    } catch(e) {
      console.warn("Activity log load skipped",e);
      return [];
    }
  },
  async facActivity(fid) {
    try {
      return rows(await supabase.from("activity_logs").select().eq("factory_id",fid).order("ts",{ascending:false}).limit(30));
    } catch(e) {
      console.warn("Activity log load skipped",e);
      return [];
    }
  },
};

async function resolveBuyerFactoryId(buyer) {
  const direct=buyer?.factory_id||buyer?.factoryId;
  if(direct&&typeof direct==="string")return direct;
  if(buyer?.email) {
    const linked=await DB.getBuyerByEmail(buyer.email);
    if(linked?.factory_id)return linked.factory_id;
  }
  const fac=await DB.getFacByName(buyer?.factory_name||buyer?.factoryName);
  return fac?.id||"";
}

function activityForProfile(action,actor,target,details={}) {
  return {
    action,
    actor_id:actor?.id||null,
    actor_name:actor?.name||"Epistable Owner",
    factory_id:target.factory_id||details.factory_id||null,
    factory_name:target.factory_name||details.factory_name||"",
    target_type:"profile",
    target_id:target.id,
    target_name:target.name||target.email||target.id,
    details
  };
}

function SlabQRModal({slab,onClose}) {
  const g=gradeConf(slab.grade);
  return (
    <Modal title="Slab QR Code" onClose={onClose}>
      <div style={{textAlign:"center",paddingBottom:8}}>
        <div style={{background:C.surface,borderRadius:14,padding:20,display:"inline-block",marginBottom:18,border:`1px solid ${C.border}`}}>
          <img src={slabQrUrl(slab.id)} alt="QR" style={{width:180,height:180,display:"block"}}/>
        </div>
        <div style={{fontSize:12,fontFamily:"monospace",color:C.textDim,marginBottom:16,letterSpacing:"1px"}}>{slab.id}</div>
        <div style={{background:g.bg,border:`1px solid ${g.border}`,borderRadius:10,padding:"10px 16px",display:"inline-flex",alignItems:"center",gap:14,marginBottom:16}}>
          <span style={{fontSize:18}}>{g.emoji}</span>
          <span style={{fontSize:14,fontWeight:700,color:g.color}}>{slab.grade} Â· {slab.stone}</span>
        </div>
        <div style={{fontSize:12,color:C.textMid,lineHeight:1.7,marginBottom:16}}>Buyers can scan this code to instantly view the full verified inspection record for this slab.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Btn variant="secondary" onClick={onClose}>Close</Btn>
          <Btn onClick={()=>{const a=document.createElement("a");a.href=slabQrUrl(slab.id)+"&download=1";a.download=`QR_${slab.id}.png`;a.click();}}>â¬‡ Download</Btn>
        </div>
      </div>
    </Modal>
  );
}

function ActivityList({items=[],compact=false}) {
  const [copied,setCopied]=useState(false);
  const labels={
    profile_created:"created access",
    profile_updated:"updated access",
    profile_suspended:"suspended access",
    profile_restored:"restored access"
  };
  const activityIcon={
    profile_created:"add",
    profile_updated:"refresh",
    profile_suspended:"pause",
    profile_restored:"play"
  };
  async function copyActivitySummary(){
    const visible=items.slice(0,compact?5:8);
    const text=[
      `Epistable activity summary - ${fmtD(Date.now())} ${fmtT(Date.now())}`,
      `Events shown: ${visible.length}`,
      "",
      ...(visible.length?visible.map(a=>`${fmtD(a.ts)} ${fmtT(a.ts)} | ${a.actor_name||"Someone"} ${labels[a.action]||a.action} | Target: ${a.target_name||a.target_id} | Factory: ${a.factory_name||"Platform"}`):["No activity yet"]),
    ].join("\n");
    try{
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(()=>setCopied(false),1400);
    }catch(e){
      window.prompt("Copy activity summary",text);
    }
  }
  return (
    <Card style={{marginTop:compact?12:14}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:14}}>
        <div style={{fontSize:14,fontWeight:700}}>Recent Activity</div>
        {items.length>0&&<Btn size="sm" variant="secondary" onClick={copyActivitySummary}>{copied?"Copied":"Copy"}</Btn>}
      </div>
      {items.length===0?<div style={{padding:"24px 16px",textAlign:"center",fontSize:13,color:C.textDim}}>No activity yet</div>:
      items.slice(0,compact?5:8).map((a,i)=>(
        <div key={a.id} style={{display:"flex",gap:14,padding:"14px 16px",borderBottom:i<Math.min(items.length,compact?5:8)-1?`1px solid ${C.border}`:"none"}}>
          <div style={{width:32,height:32,borderRadius:8,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}><Icon name={activityIcon[a.action]||"refresh"} size={15} color={C.primary}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:C.text}}>{a.actor_name||"Someone"} {labels[a.action]||a.action} for {a.target_name}</div>
            <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{a.factory_name||"Platform"} Â· {fmtD(a.ts)} Â· {fmtT(a.ts)}</div>
          </div>
        </div>
      ))}
    </Card>
  );
}

const INV_STATUS = {
  available:{label:"Available",color:C.green,bg:C.greenBg,border:C.greenBorder},
  reserved:{label:"Reserved",color:C.amber,bg:C.amberBg,border:C.amberBorder},
  sold:{label:"Sold",color:C.red,bg:C.redBg,border:C.redBorder},
};
const invConf=status=>INV_STATUS[status]||INV_STATUS.available;
function InventoryPill({status}) {
  const tone={available:"success",reserved:"warning",sold:"danger"}[status]||"neutral";
  return <Pill tone={tone} size="sm">{invConf(status).label}</Pill>;
}

function Shell({brandSub,navItems,page,onNav,onLogout,userName,userSub,children}) {
  const {isDesktop}=useBP();
  const [drawer,setDrawer]=useState(false);
  const Sidebar=(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary})`,padding:"22px 18px"}}>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:17,fontWeight:700,color:C.white}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>Quality, quantified</div>
        </div>
        {brandSub}
      </div>
      <nav style={{padding:"10px 8px",flex:1,overflowY:"auto"}}>
        {navItems.map(n=>{
          const active=page===n.id;
          return <button key={n.id} onClick={()=>{onNav(n.id);setDrawer(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"12px",background:active?C.primaryBg:"transparent",border:`1px solid ${active?C.primaryBorder:"transparent"}`,borderRadius:8,color:active?C.primary:C.textMid,fontSize:14,cursor:"pointer",marginBottom:2,textAlign:"left",fontWeight:active?700:400,fontFamily:FONT_STACK,WebkitTapHighlightColor:"transparent"}}>
            <span style={{display:"flex",alignItems:"center",flexShrink:0,opacity:active?1:0.55}}><ChromeIcon icon={n.icon} size={18}/></span>{n.label}
            {n.badge&&<Pill tone="danger" size="sm" style={{marginLeft:"auto"}}>{n.badge}</Pill>}
          </button>;
        })}
      </nav>
      <div style={{borderTop:`1px solid ${C.border}`,padding:"14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
          <Avi initials={(userName||"?").slice(0,2).toUpperCase()} size={36}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userName}</div><div style={{fontSize:12,color:C.textDim,textTransform:"capitalize"}}>{userSub}</div></div>
        </div>
        <Btn full variant="secondary" size="sm" onClick={onLogout}>Sign Out</Btn>
      </div>
    </div>
  );
  if(!isDesktop) return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:FONT_STACK,color:C.text,display:"flex",flexDirection:"column"}}>
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",position:"sticky",top:0,zIndex:100,flexShrink:0}}>
        <button onClick={()=>setDrawer(true)} style={{background:"none",border:"none",cursor:"pointer",padding:8,display:"flex",flexDirection:"column",gap:5,WebkitTapHighlightColor:"transparent"}}>
          <div style={{width:22,height:2,background:C.text,borderRadius:2}}/><div style={{width:16,height:2,background:C.text,borderRadius:2}}/><div style={{width:22,height:2,background:C.text,borderRadius:2}}/>
        </button>
        <div style={{fontSize:18,fontWeight:700,color:C.text}}>Epistable</div>
        <Avi initials={(userName||"?").slice(0,2).toUpperCase()} size={32}/>
      </div>
      {drawer&&(<div style={{position:"fixed",inset:0,zIndex:200,display:"flex"}}><div style={{width:260,background:C.white,height:"100%",overflowY:"auto",boxShadow:"4px 0 24px rgba(0,0,0,0.15)"}}>{Sidebar}</div><div style={{flex:1,background:"rgba(0,0,0,0.5)"}} onClick={()=>setDrawer(false)}/></div>)}
      <div style={{flex:1,overflowY:"auto",padding:"16px",paddingBottom:90}}>{children}</div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.white,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {navItems.slice(0,5).map(n=>{
          const active=page===n.id;
          return <button key={n.id} onClick={()=>onNav(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"8px 4px",background:"none",border:"none",cursor:"pointer",borderTop:`2px solid ${active?C.primary:"transparent"}`,WebkitTapHighlightColor:"transparent",position:"relative"}}>
            <span style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2,opacity:active?1:0.4}}><ChromeIcon icon={n.icon} size={20}/></span>
            <span style={{fontSize:12,fontWeight:active?700:400,color:active?C.primary:C.textDim}}>{n.label}</span>
            {n.badge&&<Pill tone="danger" size="sm" style={{position:"absolute",top:4,right:"calc(50% - 16px)",padding:"0 4px",fontSize:12}}>{n.badge}</Pill>}
          </button>;
        })}
      </div>
    </div>
  );
  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:FONT_STACK,color:C.text,display:"flex",fontSize:14}}>
      <div style={{width:220,background:C.white,borderRight:`1px solid ${C.border}`,flexShrink:0,display:"flex",flexDirection:"column",minHeight:"100vh"}}>{Sidebar}</div>
      <div style={{flex:1,display:"flex",flexDirection:"column",maxHeight:"100vh",overflow:"hidden"}}>
        <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,height:50,display:"flex",alignItems:"center",padding:"0 24px",flexShrink:0}}>
          <span style={{fontSize:14,fontWeight:600,color:C.text,display:"flex",alignItems:"center",gap:6}}><ChromeIcon icon={navItems.find(n=>n.id===page)?.icon} size={16}/> {navItems.find(n=>n.id===page)?.label}</span>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:24}}>{children}</div>
      </div>
    </div>
  );
}

function ChatBot({role,ctxData}) {
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([{role:"assistant",content:role==="owner"?"Hi! Ask me anything about factories, billing, disputes or inquiries.":"Hi! Ask anything about inspections, quality, suppliers or inquiries."}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef();
  const {isMobile}=useBP();
  useEffect(()=>{if(open&&bottomRef.current)bottomRef.current.scrollIntoView({behavior:"smooth"});},[msgs,open]);

  function buildCtx() {
    if(role==="owner") {
      const {facs,insps,users}=ctxData;
      const mon=curMon();
      const tb=facs.reduce((s,f)=>{const sc=f.current_month===mon?f.current_month_scans||0:0;return s+calcBill(f.plan||"Starter",sc).total;},0);
      const totalScans=facs.reduce((s,f)=>s+(f.scans_total||0),0)||insps.length;
      return `You are Epistable's owner assistant.\nPlatform: ${facs.length} factories, ${users.length} users, ${totalScans} inspections, ${fmtMoney(tb)} billed.\nAnswer concisely. Hindi if asked.`;
    }
    const {fac,insps,user}=ctxData;
    const mon=curMon();
    const sc=fac?.current_month===mon?fac?.current_month_scans||0:0;
    const b=fac?calcBill(fac.plan||"Starter",sc):{total:0,includedScans:100};
    const byG=g=>insps.filter(i=>i.grade===g).length;
    return `You are Epistable's assistant for ${user.name} at ${user.factory_name}.\nFactory: ${fac?.name}, Plan=${fac?.plan||"Starter"}\nBilling: ${sc}/${b.includedScans} scans, ${fmtMoney(b.total)} due\nInspections: Total=${insps.length}, Premium=${byG("Premium")}, Standard=${byG("Standard")}, Commercial=${byG("Commercial")}, Rejected=${byG("Rejected")}\nAnswer concisely. Hindi if asked.`;
  }

  async function send() {
    if(!input.trim()||loading)return;
    const txt=input.trim();setInput("");
    setMsgs(prev=>[...prev,{role:"user",content:txt}]);
    setLoading(true);
    try {
      const res=await fetch("https://epistable-ai.elston55541.workers.dev/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:buildCtx(),messages:[...msgs.slice(-8),{role:"user",content:txt}]})});
      const data=await res.json();
      setMsgs(prev=>[...prev,{role:"assistant",content:data.content?.[0]?.text||"Sorry, no response."}]);
    } catch(e) {
      setMsgs(prev=>[...prev,{role:"assistant",content:"Something went wrong. Try again."}]);
    }
    setLoading(false);
  }

  const sugg=role==="owner"?["Which factory has most rejections?","Any new buyer inquiries?","Open disputes?"]:["How many slabs today?","Any new inquiries?","Top supplier this month?"];
  return (
    <>
      <button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:isMobile?80:24,right:20,width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${C.primary},${C.teal})`,border:"none",boxShadow:"0 4px 20px rgba(0,87,168,0.4)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,zIndex:150,WebkitTapHighlightColor:"transparent"}}><Icon name="bot" size={24} color={C.white}/></button>
      {open&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:isMobile?"center":"flex-end",padding:isMobile?0:"0 20px 20px",background:isMobile?"rgba(0,0,0,0.4)":"transparent"}} onClick={isMobile?()=>setOpen(false):undefined}>
          <div style={{width:isMobile?"100%":380,height:isMobile?"85vh":520,background:C.white,borderRadius:isMobile?"20px 20px 0 0":"16px",boxShadow:"0 8px 40px rgba(0,0,0,0.2)",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:`linear-gradient(135deg,${C.primary},${C.teal})`,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}><Icon name="bot" size={18} color={C.white}/></div>
                <div><div style={{fontSize:15,fontWeight:700,color:C.white}}>Epistable Assistant</div><div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>Ask anything</div></div>
              </div>
              <button onClick={()=>setOpen(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",color:C.white,width:30,height:30,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}}>Ã—</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:14}}>
              {msgs.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"82%",padding:"10px 14px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?C.primary:C.surface,color:m.role==="user"?C.white:C.text,fontSize:13,lineHeight:1.55,border:m.role==="user"?"none":`1px solid ${C.border}`}}>{m.content}</div>
                </div>
              ))}
              {loading&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{padding:"10px 16px",borderRadius:"14px 14px 14px 4px",background:C.surface,border:`1px solid ${C.border}`,display:"flex",gap:4,alignItems:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.textDim,animation:`pulse 1s ease-in-out ${i*0.2}s infinite`}}/>)}</div></div>}
              <div ref={bottomRef}/>
            </div>
            {msgs.length<=1&&<div style={{padding:"0 16px 10px",display:"flex",gap:6,overflowX:"auto",flexShrink:0}}>{sugg.map(s=><button key={s} onClick={()=>setInput(s)} style={{padding:"6px 12px",background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:20,color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",fontFamily:FONT_STACK,WebkitTapHighlightColor:"transparent",flexShrink:0}}>{s}</button>)}</div>}
            <div style={{padding:"14px 16px",borderTop:`1px solid ${C.border}`,display:"flex",gap:14,flexShrink:0}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask anythingâ€¦" style={{flex:1,padding:"10px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:24,color:C.text,fontSize:14,outline:"none",fontFamily:FONT_STACK}}/>
              <button onClick={send} disabled={!input.trim()||loading} style={{width:42,height:42,borderRadius:"50%",background:input.trim()&&!loading?C.primary:C.border,border:"none",cursor:input.trim()&&!loading?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,WebkitTapHighlightColor:"transparent"}}>âž¤</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </>
  );
}

function Login({onOwner,onFactory,onBuyer}) {
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [showP,setShowP]=useState(false);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [focus,setFocus]=useState("");
  const {isDesktop}=useBP();

  async function submit() {
    const cleanEmail=email.trim().toLowerCase();
    if(!cleanEmail||!pass){setErr("Please enter email and password.");return;}
    setLoading(true);setErr("");
    try {
      const {profile}=await signInWithEmail(cleanEmail,pass);
      if(profile.role==="owner"){onOwner();return;}
      if(profile.role==="buyer"){
        DB.updBuyer(profile.id,{last_active:Date.now()}).catch(e=>console.warn("Could not update buyer activity",e));
        onBuyer(profile);return;
      }
      DB.updUser(profile.id,{last_active:Date.now()}).catch(e=>console.warn("Could not update user activity",e));
      onFactory(profile);return;
    } catch(e){setErr(friendlyAuthError(e,"login"));setLoading(false);}
  }

  const fieldStyle=name=>({
    width:"100%",padding:isDesktop?"15px 16px":"13px 14px",background:C.white,border:`1px solid ${C.border}`,
    borderRadius:6,color:C.text,fontSize:isDesktop?16:15,outline:"none",boxSizing:"border-box",fontFamily:FONT_STACK,
    boxShadow:focus===name?"0 0 0 3px rgba(0, 87, 168, 0.12)":"none"
  });
  const loginFields=(
    <>
      <div style={{display:"flex",flexDirection:"column",gap:15,marginBottom:20}}>
        <div>
          <label style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:7}}>Email</label>
          <input type="email" value={email} onChange={e=>{setEmail(e.target.value);if(err)setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()} onFocus={()=>setFocus("email")} onBlur={()=>setFocus("")} autoComplete="email" placeholder="you@example.com" style={fieldStyle("email")}/>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
            <label style={{fontSize:13,fontWeight:600,color:C.text}}>Password</label>
            <button type="button" onClick={()=>setShowP(p=>!p)} style={{background:"none",border:"none",padding:0,color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>{showP?"Hide":"Show"}</button>
          </div>
          <input type={showP?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);if(err)setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()} onFocus={()=>setFocus("password")} onBlur={()=>setFocus("")} autoComplete="current-password" placeholder="Enter password" style={fieldStyle("password")}/>
        </div>
      </div>
      <Btn full size="lg" onClick={submit} disabled={loading} style={{borderRadius:6,padding:isDesktop?"15px 20px":"13px 20px",fontWeight:700,fontSize:isDesktop?15:14}}>{loading?"Signing in...":"Log In"}</Btn>
    </>
  );
  if(isDesktop)return (
    <div style={{minHeight:"100vh",background:C.bg,display:"grid",gridTemplateColumns:"minmax(360px,40%) minmax(0,1fr)",fontFamily:FONT_STACK}}>
      <div style={{background:`linear-gradient(160deg,${C.primary},${C.primaryD} 60%,#001f3d)`,padding:"0 56px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",minHeight:"100vh",boxSizing:"border-box",textAlign:"center"}}>
        <div style={{marginBottom:58,width:"100%",maxWidth:360}}>
          <div style={{fontSize:34,fontWeight:700,color:C.white,lineHeight:1.1,marginBottom:14}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:18,fontWeight:500,color:"rgba(255,255,255,0.95)",letterSpacing:"1px",fontFamily:FONT_STACK,marginBottom:18}}>Quality, quantified</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
            <div style={{height:1,width:30,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.85)"}}>Grade slabs Â· Track quality Â· Build trust</div>
          </div>
        </div>
        {["AI-powered slab grading","Supplier scorecards","QR codes per slab","Buyer inquiry management","Per-scan billing","AI assistant"].map(text=>(
          <div key={text} style={{display:"flex",alignItems:"center",gap:14,marginTop:17,width:"100%",maxWidth:290,textAlign:"left"}}>
            <div style={{width:36,height:36,borderRadius:9,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.82)",flexShrink:0}}>âœ“</div>
            <span style={{fontSize:14,color:"rgba(255,255,255,0.85)",fontWeight:400}}>{text}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"40px"}}>
        <div style={{width:"100%",maxWidth:460}}>
          <div style={{marginBottom:30,textAlign:"center"}}><div style={{fontSize:30,fontWeight:600,color:C.text,marginBottom:8}}>Welcome back</div><div style={{fontSize:15,color:C.textDim}}>Sign in with your assigned credentials</div></div>
          {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"11px 14px",fontSize:13,color:C.red,marginBottom:16,fontWeight:500}}>{err}</div>}
          {loginFields}
          <div style={{marginTop:16,textAlign:"center",fontSize:12,color:C.textDim}}>Contact your administrator for credentials</div>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT_STACK,color:C.text,display:"flex",flexDirection:"column",boxSizing:"border-box"}}>
      <div style={{background:`linear-gradient(160deg,${C.primary},${C.primaryD} 62%,#001f3d)`,padding:"58px 24px 40px",color:C.white}}>
        <div style={{maxWidth:390,margin:"0 auto",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:700,lineHeight:1.15,marginBottom:14}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:15,fontWeight:500,color:"rgba(255,255,255,0.95)",letterSpacing:"1px",fontFamily:FONT_STACK,marginBottom:16}}>Quality, quantified</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
            <div style={{height:1,width:24,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            <div style={{fontSize:12,lineHeight:1.65,color:"rgba(255,255,255,0.85)"}}>Grade slabs Â· Track quality Â· Build trust</div>
          </div>
        </div>
      </div>

      <div style={{width:"100%",maxWidth:390,margin:"0 auto",padding:"24px 20px 28px",boxSizing:"border-box",flex:1}}>
        <div style={{marginBottom:18,textAlign:"center"}}>
          <div style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:5}}>Welcome back</div>
          <div style={{fontSize:14,color:C.textDim}}>Sign in with your assigned credentials</div>
        </div>
        <div style={{width:"100%",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,boxShadow:"0 8px 24px rgba(26,37,51,0.08)",padding:22,boxSizing:"border-box"}}>
          {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:6,padding:"13px 14px",fontSize:13,color:C.red,marginBottom:16,fontWeight:500}}>{err}</div>}
          {loginFields}
        </div>

        <div style={{width:"100%",marginTop:18,textAlign:"center"}}>
          <div style={{fontSize:12,color:C.textDim,marginBottom:18}}>Need access? Contact your factory administrator.</div>
          <div style={{fontSize:TYPE.caption.size,lineHeight:TYPE.caption.lineHeight,letterSpacing:TYPE.caption.letterSpacing,color:C.textDim}}>Trusted by stone factories across India</div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ OWNER â”€â”€
function InviteAccept({onAccepted}) {
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [mode,setMode]=useState("signup");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  async function submit(){
    const cleanEmail=email.trim().toLowerCase();
    if(!cleanEmail||!pass){setErr("Enter your invited email and password.");return;}
    if(pass.length<6){setErr("Password must be at least 6 characters.");return;}
    setLoading(true);setErr("");
    try {
      const {profile}=await acceptInviteWithPassword(cleanEmail,pass,mode);
      if(!profile)throw new Error("No pending invite found for this email.");
      onAccepted(profile);
    } catch(e) {
      setErr(friendlyAuthError(e,"invite"));
      setLoading(false);
    }
  }
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT_STACK,padding:24}}>
      <Card style={{width:"100%",maxWidth:430,padding:SPACE.xl}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:18}}><Icon name="verified" size={48} color={C.green}/></div>
        <div style={{fontSize:TYPE.display.size,lineHeight:TYPE.display.lineHeight,fontWeight:WEIGHT.bold,color:C.text,marginBottom:6,textAlign:"center"}}>Accept Epistable Invite</div>
        <div style={{fontSize:13,color:C.textDim,marginBottom:18}}>Use the same email your admin invited. If an email confirmation link fails, come back to this page and use the same email here.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
          <Btn variant={mode==="signup"?"primary":"secondary"} size="sm" onClick={()=>{setMode("signup");setErr("");}}>Create Login</Btn>
          <Btn variant={mode==="signin"?"primary":"secondary"} size="sm" onClick={()=>{setMode("signin");setErr("");}}>I Have Login</Btn>
        </div>
        {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:"14px 16px",fontSize:12,color:C.red,fontWeight:600,marginBottom:16}}>{err}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="Invited Email" value={email} onChange={v=>{setEmail(v);if(err)setErr("");}} type="email" required/>
          <Inp label="Password" value={pass} onChange={v=>{setPass(v);if(err)setErr("");}} type="password" required hint={mode==="signup"?"Choose at least 6 characters.":"Enter your existing password."}/>
          <Btn full onClick={submit} disabled={loading}>{loading?"Accepting...":"Accept Invite"}</Btn>
          <Btn full variant="secondary" onClick={()=>window.location.assign("/")}>Back to Login</Btn>
        </div>
      </Card>
    </div>
  );
}

function Owner({onLogout}) {
  const [page,setPage]=useState("overview");
  const [facs,setFacs]=useState([]);
  const [users,setUsers]=useState([]);
  const [insps,setInsps]=useState([]);
  const [activity,setActivity]=useState([]);
  const [selFac,setSelFac]=useState(null);
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    try {
      const [f,u,i,a]=await Promise.all([DB.allFacs(),DB.allUsers(),DB.allInsps(),DB.allActivity()]);
      setFacs(f);setUsers(u.filter(u=>u.role!=="owner"));setInsps(i);setActivity(a);
    } catch(e) {
      console.error("Owner load failed",e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{load();},[]);
  if(loading)return <Loader/>;

  const mon=curMon();
  const totalBill=facs.reduce((s,f)=>{const sc=f.current_month===mon?f.current_month_scans||0:0;return s+calcBill(f.plan||"Starter",sc).total;},0);
  const overdue=facs.filter(f=>f.billing_status==="overdue").length;

  const nav=[
    {id:"overview",label:"Overview",icon:"chart"},
    {id:"billing",label:"Billing",icon:"billing",badge:overdue||undefined},
    {id:"factories",label:"Factories",icon:"factory"},
    {id:"users",label:"Users",icon:"user"},
    {id:"disputes",label:"Disputes",icon:"alert"},
    {id:"inquiries",label:"Inquiries",icon:"mail"},
    {id:"settings",label:"Settings",icon:"settings"},
  ];
  const pages={
    overview:<OwnerOverview facs={facs} users={users} insps={insps} activity={activity} totalBill={totalBill} overdue={overdue} setPage={setPage} pickFac={f=>{setSelFac(f);setPage("fac");}}/>,
    billing:<OwnerBilling facs={facs} onRefresh={load}/>,
    factories:<OwnerFacs facs={facs} users={users} pickFac={f=>{setSelFac(f);setPage("fac");}} onRefresh={load}/>,
    fac:selFac?<OwnerFacDetail fac={selFac} onBack={()=>setPage("factories")} onRefresh={load}/>:null,
    users:<OwnerUsers users={users} facs={facs} onRefresh={load}/>,
    disputes:<OwnerDisputes/>,
    inquiries:<OwnerInquiries/>,
    settings:<OwnerSettings/>,
  };

  return (
    <>
      <Shell brandSub={<div style={{background:"rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 10px",fontSize:12,color:"rgba(255,255,255,0.8)",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:"#4ade80"}}>â—</span>{facs.length} factories Â· {users.length} users</div>}
        navItems={nav} page={page} onNav={p=>{setPage(p);if(p!=="fac")setSelFac(null);}} onLogout={onLogout} userName="Epistable Owner" userSub="Super Admin">
        {pages[page]||pages.overview}
      </Shell>
      <ChatBot role="owner" ctxData={{facs,insps,users}}/>
    </>
  );
}

function OwnerOverview({facs,users,insps,activity,totalBill,overdue,setPage,pickFac}) {
  const [readinessCopied,setReadinessCopied]=useState(false);
  const mon=curMon();
  const ms=facs.reduce((s,f)=>s+(f.current_month===mon?f.current_month_scans||0:0),0);
  const totalScans=facs.reduce((s,f)=>s+(f.scans_total||0),0)||insps.length;
  const traceKeys=["quarrySource","batchNo","blockNo","productionLine","operator","containerNo","customerRef"];
  function factoryReadiness(fac){
    const list=insps.filter(i=>i.factoryId===fac.id||i.factory_id===fac.id);
    const trace=list.reduce((s,i)=>s+traceKeys.filter(k=>!!i.measurements?.traceability?.[k]).length,0);
    const tracePct=list.length?Math.round(trace/(list.length*traceKeys.length)*100):0;
    const audit=list.length?Math.round(list.filter(i=>i.measurements?.audit?.calibrationChecked&&i.measurements?.audit?.checklistComplete).length/list.length*100):0;
    const capa=list.filter(i=>(i.defects||[]).length>0&&!i.measurements?.audit?.correctiveAction).length;
    const aiReviewed=list.filter(i=>i.measurements?.aiReview?.suggestedGrade).length;
    const aiOverrides=list.filter(i=>i.measurements?.aiReview?.suggestedGrade&&i.measurements?.aiReview?.finalGrade&&i.measurements.aiReview.suggestedGrade!==i.measurements.aiReview.finalGrade).length;
    const score=list.length?Math.round((tracePct+audit+(capa?Math.max(0,100-Math.min(capa*20,100)):100))/3):0;
    return {fac,list,tracePct,audit,capa,aiReviewed,aiOverrides,score};
  }
  const readiness=facs.map(factoryReadiness).sort((a,b)=>a.score-b.score);
  const trackedReadiness=readiness.filter(r=>r.list.length>0);
  const avgReadiness=trackedReadiness.length?Math.round(trackedReadiness.reduce((s,r)=>s+r.score,0)/trackedReadiness.length):0;
  const needsReadiness=readiness.filter(r=>r.list.length>0&&r.score<70);
  const openCapa=readiness.reduce((s,r)=>s+r.capa,0);
  const aiReviewedTotal=readiness.reduce((s,r)=>s+r.aiReviewed,0);
  const aiOverridesTotal=readiness.reduce((s,r)=>s+r.aiOverrides,0);
  const releaseReady=trackedReadiness.length>0&&avgReadiness>=70&&needsReadiness.length===0&&openCapa===0&&overdue===0;
  async function copyReadinessSummary(){
    const lines=[
      `Epistable platform readiness: ${avgReadiness}%`,
      `Demo readiness: ${releaseReady?"Ready":"Needs review"}`,
      `Tracked factories: ${trackedReadiness.length}/${facs.length}`,
      `Factories needing work: ${needsReadiness.length}`,
      `Open CAPA gaps: ${openCapa}`,
      `AI reviewed scans: ${aiReviewedTotal}`,
      `AI overrides: ${aiOverridesTotal}`,
      `Overdue billing accounts: ${overdue}`,
      "",
      ...readiness.filter(r=>r.list.length>0).slice(0,8).map(r=>`${r.fac.name}: ${r.score}% readiness | Trace ${r.tracePct}% | Audit ${r.audit}% | CAPA ${r.capa} | AI reviewed ${r.aiReviewed} | AI overrides ${r.aiOverrides} | Scans ${r.list.length}`),
    ];
    const text=lines.join("\n");
    try{await navigator.clipboard.writeText(text);setReadinessCopied(true);setTimeout(()=>setReadinessCopied(false),1400);}catch(e){window.prompt("Copy readiness summary",text);}
  }
  return (
    <div>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,borderRadius:14,padding:"20px",marginBottom:18,color:C.white}}>
        <div style={{...TEXT.heroTitle,marginBottom:4}}>Owner Console</div>
        <div style={{fontSize:13,lineHeight:1.65,color:"rgba(255,255,255,0.7)",marginBottom:18}}>Full platform visibility</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
          {[[fmtMoney(totalBill),"Billed This Month"],[totalScans,"Total Scans"],[facs.filter(f=>f.status==="active").length,"Active Factories"],[overdue,"Overdue"]].map(([v,l])=>(
            <div key={l} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"12px"}}><div style={{fontSize:20,fontWeight:700}}>{v}</div><div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>{l}</div></div>
          ))}
        </div>
      </div>
      <KpiGrid items={[{label:"Billed This Month",value:fmtMoney(totalBill),icon:"billing",color:C.green},{label:"Scans This Month",value:ms,icon:"search",color:C.primary},{label:"Factories",value:facs.length,icon:"factory",color:C.teal},{label:"Users",value:users.length,icon:"user",color:C.text}]}/>
      <Card style={{padding:20,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:16}}>
          <div>
            <div style={{fontSize:14,fontWeight:700}}>Platform readiness</div>
            <div style={TEXT.tinyMeta}>Traceability, audit checklist, and CAPA health across factories</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Btn size="sm" variant="secondary" onClick={copyReadinessSummary}>{readinessCopied?"Copied":"Copy"}</Btn>
            <div style={{fontSize:26,fontWeight:700,color:avgReadiness>=70?C.green:C.amber,lineHeight:1}}>{avgReadiness}%</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:14,marginBottom:16}}>
          {[["Needs Work",needsReadiness.length,needsReadiness.length?C.amber:C.green],["Tracked Factories",trackedReadiness.length,C.primary],["Open CAPA",openCapa,openCapa?C.red:C.green],["AI Reviews",aiReviewedTotal,C.primary],["AI Overrides",aiOverridesTotal,aiOverridesTotal?C.amber:C.green]].map(([label,value,color])=>(
            <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:"13px 14px",textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color,lineHeight:1}}>{value}</div>
              <div style={{fontSize:12,color:C.textDim,fontWeight:600,marginTop:5}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{background:releaseReady?C.greenBg:C.amberBg,border:`1px solid ${releaseReady?C.greenBorder:C.amberBorder}`,borderRadius:10,padding:"14px 16px",marginBottom:needsReadiness.length>0?12:0,display:"flex",justifyContent:"space-between",alignItems:"center",gap:14}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:releaseReady?C.green:C.amber}}>Demo readiness: {releaseReady?"Ready":"Needs review"}</div>
            <div style={{fontSize:12,color:C.textMid,lineHeight:1.65,marginTop:2}}>{releaseReady?"Tracked factories have clean readiness signals for a sales demo.":"Review low-readiness factories, CAPA gaps, or overdue accounts before a serious pilot demo."}</div>
          </div>
          <Btn size="sm" variant="secondary" onClick={()=>setPage(overdue?"billing":"factories")}>{overdue?"Billing":"Factories"}</Btn>
        </div>
        {needsReadiness.length>0&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
          {needsReadiness.slice(0,3).map(r=>(
            <button key={r.fac.id} onClick={()=>pickFac(r.fac)} style={{display:"flex",alignItems:"center",gap:14,background:C.white,border:`1px solid ${C.border}`,borderRadius:9,padding:"13px 14px",cursor:"pointer",fontFamily:FONT_STACK,textAlign:"left"}}>
              <span style={{fontSize:13,fontWeight:600,color:r.score<50?C.red:C.amber,width:42}}>{r.score}%</span>
              <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:12,fontWeight:600,color:C.text}}>{r.fac.name}</span><span style={{display:"block",fontSize:12,color:C.textDim}}>Trace {r.tracePct}% - audit {r.audit}% - CAPA {r.capa}</span></span>
              <span style={{fontSize:12,color:C.primary,fontWeight:600}}>Open</span>
            </button>
          ))}
        </div>}
      </Card>
      <Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={TEXT.panelTitle}>Factories</div>
          <Btn size="sm" variant="ghost" onClick={()=>setPage("factories")}>View All â†’</Btn>
        </div>
        {facs.length===0?<div style={{padding:32,textAlign:"center",color:C.textDim}}>No factories yet</div>:facs.map((f,i)=>{
          const sc=f.current_month===mon?f.current_month_scans||0:0;const b=calcBill(f.plan||"Starter",sc);
          return <div key={f.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderBottom:i<facs.length-1?`1px solid ${C.border}`:"none",cursor:"pointer"}} onClick={()=>pickFac(f)}>
            <div style={{width:38,height:38,borderRadius:10,background:C.primaryBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}><Icon name="factory" size={18} color={C.primary}/></div>
            <div style={{flex:1,minWidth:0}}><div style={{...TEXT.itemTitle,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div><div style={TEXT.tinyMeta}>{sc} scans Â· {fmtMoney(b.total)} due</div></div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
              <StatPill status={f.status}/><BillPill status={f.billing_status||"pending"}/>
            </div>
          </div>;
        })}
      </Card>
      <ActivityList items={activity}/>
    </div>
  );
}

function OwnerBilling({facs,onRefresh}) {
  const mon=curMon();
  const totalDue=facs.reduce((s,f)=>{const sc=f.current_month===mon?f.current_month_scans||0:0;return s+calcBill(f.plan||"Starter",sc).total;},0);
  async function markPaid(f){await DB.updFac(f.id,{billing_status:"paid"});onRefresh();}
  async function pauseF(f){await DB.updFac(f.id,{status:"paused"});onRefresh();}
  async function resumeF(f){await DB.updFac(f.id,{status:"active",billing_status:"paid"});onRefresh();}
  return (
    <div>
      <KpiGrid items={[{label:"Total Due",value:fmtMoney(totalDue),icon:"billing",color:C.green},{label:"Overdue",value:facs.filter(f=>f.billing_status==="overdue").length,icon:"alert",color:C.red},{label:"Active",value:facs.filter(f=>f.status==="active").length,icon:"factory",color:C.teal},{label:"Paused",value:facs.filter(f=>f.status==="paused").length,icon:"pause",color:C.amber}]}/>
      <Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,...TEXT.panelTitle}}>Invoices â€” {mon}</div>
        {facs.map((f,i)=>{
          const sc=f.current_month===mon?f.current_month_scans||0:0;const b=calcBill(f.plan||"Starter",sc);const paused=f.status==="paused";
          return <div key={f.id} style={{padding:20,borderBottom:i<facs.length-1?`1px solid ${C.border}`:"none",background:paused?C.redBg:C.white}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div><div style={TEXT.panelTitle}>{f.name}</div><div style={TEXT.tinyMeta}>{f.plan||"Starter"}{paused&&<span style={{color:C.red,fontWeight:700}}> Â· ðŸš« PAUSED</span>}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:700,color:C.green}}>{fmtMoney(b.total)}</div><BillPill status={f.billing_status||"pending"}/></div>
            </div>
            <PBar value={sc/b.includedScans*100} color={sc>b.includedScans?C.red:C.primary}/>
            <div style={{display:"flex",gap:14,marginTop:16}}>
              <Btn variant="ghost" size="sm" style={{flex:1}} onClick={()=>markPaid(f)}>âœ“ Mark Paid</Btn>
              {!paused?<Btn variant="secondary" size="sm" style={{flex:1,color:C.red,borderColor:C.redBorder}} onClick={()=>pauseF(f)}><Icon name="pause" size={14}/> Pause</Btn>
              :<Btn variant="secondary" size="sm" style={{flex:1,color:C.green,borderColor:C.greenBorder}} onClick={()=>resumeF(f)}><Icon name="play" size={14}/> Resume</Btn>}
            </div>
          </div>;
        })}
      </Card>
    </div>
  );
}

function OwnerFacs({facs,users,pickFac,onRefresh}) {
  const [show,setShow]=useState(false);
  const [form,setForm]=useState({name:"",location:"",plan:"Starter",contact_email:""});
  const mon=curMon();
  async function create(){
    if(!form.name||!form.contact_email)return;
    await DB.createFac(form);
    setForm({name:"",location:"",plan:"Starter",contact_email:""});
    setShow(false);onRefresh();
  }
  return (
    <div>
      {show&&<Modal title="Create Factory" onClose={()=>setShow(false)}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="Factory Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required placeholder="Kishangarh Marble Works"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Inp label="Location" value={form.location} onChange={v=>setForm(p=>({...p,location:v}))} placeholder="Rajasthan"/>
            <Sel label="Plan" value={form.plan} onChange={v=>setForm(p=>({...p,plan:v}))} options={Object.keys(PLANS)} hint={`${fmtMoney(PLANS[form.plan].monthlyFee)}/mo`}/>
          </div>
          <Inp label="Contact Email" value={form.contact_email} onChange={v=>setForm(p=>({...p,contact_email:v}))} required type="email"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><Btn variant="secondary" onClick={()=>setShow(false)}>Cancel</Btn><Btn onClick={create} disabled={!form.name||!form.contact_email}>Create</Btn></div>
        </div>
      </Modal>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={TEXT.pageHeader}>Factories</div><div style={TEXT.meta}>{facs.length} registered</div></div>
        <Btn size="sm" onClick={()=>setShow(true)}>+ Create</Btn>
      </div>
      {facs.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{marginBottom:16,display:"flex",justifyContent:"center"}}><Icon name="factory" size={48} color={C.primary}/></div><Btn onClick={()=>setShow(true)}>+ Create First Factory</Btn></Card>:
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {facs.map(f=>{const sc=f.current_month===mon?f.current_month_scans||0:0;const b=calcBill(f.plan||"Starter",sc);const uCount=users.filter(u=>u.factory_id===f.id).length;return(
          <Card key={f.id}><div style={{padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div style={{flex:1,minWidth:0,paddingRight:10}}><div style={TEXT.panelTitle}>{f.name}</div><div style={TEXT.tinyMeta}>{f.location} Â· {f.plan||"Starter"}</div></div>
              <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}><StatPill status={f.status}/><BillPill status={f.billing_status||"pending"}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14}}>
              {[["Scans",sc,C.primary],["Users",uCount,C.text],["Bill",fmtMoney(b.total),C.green]].map(([l,v,col])=>(
                <div key={l} style={{background:C.surface,borderRadius:8,padding:"8px",textAlign:"center"}}><div style={{fontSize:15,fontWeight:700,color:col}}>{v}</div><div style={{fontSize:12,color:C.textDim}}>{l}</div></div>
              ))}
            </div>
            <Btn full variant="ghost" size="sm" onClick={()=>pickFac(f)}>Manage â†’</Btn>
          </div></Card>
        );})}
      </div>}
    </div>
  );
}

function OwnerFacDetail({fac,onBack,onRefresh}) {
  const [users,setUsers]=useState([]);
  const [show,setShow]=useState(false);
  const [showBuyer,setShowBuyer]=useState(false);
  const [manage,setManage]=useState(null);
  const mon=curMon();
  async function load(){const u=await DB.facUsers(fac.id);setUsers(u);}
  useEffect(()=>{load();},[]);
  const sc=fac.current_month===mon?fac.current_month_scans||0:0;
  const b=calcBill(fac.plan||"Starter",sc);

  async function createUser(form){
    const u=await DB.createUser({...form,factoryId:fac.id,factoryName:fac.name,avatar:form.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()});
    await DB.addActivity(activityForProfile("profile_created",null,u,{role:u.role,status:u.status}));
    load();return u;
  }
  async function createBuyer(form){
    const b=await DB.createBuyer({
      name:form.name,
      email:form.email,
      authUserId:form.authUserId,
      company:form.company||"",
      factoryId:fac.id,
      factoryName:fac.name
    });
    await DB.addActivity(activityForProfile("profile_created",null,b,{role:"buyer",status:b.status}));
    return b;
   }
  async function saveUser(user,updates){
    await DB.updUser(user.id,updates);
    await DB.addActivity(activityForProfile(updates.status==="suspended"?"profile_suspended":user.status==="suspended"&&updates.status==="active"?"profile_restored":"profile_updated",null,{...user,...updates},{role:updates.role,status:updates.status}));
    setUsers(prev=>prev.map(u=>u.id===user.id?{...u,...updates}:u));
    onRefresh();
  }

  return (
    <div>
      {show&&<UserFormModal title={"Add User â€” "+fac.name} facs={[fac]} onClose={()=>setShow(false)} onSubmit={createUser}/>}
      {showBuyer&&<UserFormModal title={"Add Buyer â€” "+fac.name} isBuyer onClose={()=>setShowBuyer(false)} onSubmit={createBuyer}/>}
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.primary,fontWeight:600,fontSize:13,cursor:"pointer",marginBottom:16,padding:0,fontFamily:FONT_STACK}}>â† Back</button>
      {manage&&<UserAccessModal user={manage} facs={[fac]} ownerMode onClose={()=>setManage(null)} onSave={saveUser}/>}
      <Card style={{marginBottom:18,padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div><div style={{fontSize:16,lineHeight:1.3,fontWeight:700,letterSpacing:0}}>{fac.name}</div><div style={TEXT.meta}>{fac.location}</div></div>
          <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}><StatPill status={fac.status}/><BillPill status={fac.billing_status||"pending"}/></div>
        </div>
        <PBar value={sc/b.includedScans*100} color={sc>b.includedScans?C.red:C.primary} h={8}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}><span style={{fontSize:12,color:C.textDim}}>{sc}/{b.includedScans} scans</span><span style={{fontSize:14,fontWeight:700,color:C.green}}>{fmtMoney(b.total)}</span></div>
      </Card>
      <Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={TEXT.panelTitle}>Users ({users.length})</div>
          <div style={{display:"flex",gap:14}}><Btn size="sm" variant="secondary" onClick={()=>setShowBuyer(true)}>+ Buyer</Btn><Btn size="sm" onClick={()=>setShow(true)}>+ User</Btn></div>
        </div>
        {users.length===0?<div style={{padding:"32px",textAlign:"center",color:C.textDim}}>No users yet.</div>:users.map((u,i)=>(
          <div key={u.id} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderBottom:i<users.length-1?`1px solid ${C.border}`:"none"}}>
            <Avi initials={u.avatar||"??"} size={36}/>
            <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{u.name}</div><div style={TEXT.tinyMeta}>{u.email}</div></div>
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
              <span style={{fontSize:12,fontWeight:600,color:C.primary,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,padding:"2px 7px",borderRadius:20,textTransform:"capitalize"}}>{u.role}</span>
              <StatPill status={u.status||"active"}/>
              <Btn size="sm" variant="secondary" onClick={()=>setManage(u)}>Manage</Btn>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function UserFormModal({title,onClose,onSubmit,onDone,facs,isBuyer}) {
  const [form,setForm]=useState({name:"",email:"",authUserId:"",role:"inspector",factoryId:facs?.[0]?.id||"",company:""});
  const [busy,setBusy]=useState(false);const [done,setDone]=useState(null);const [err,setErr]=useState("");
  async function submit(){
    if(!form.name||!form.email)return;
    setBusy(true);setErr("");
    try {
      const result=await onSubmit(form);
      setDone(result);
    } catch(e) {
      setErr(e.message||"Could not create profile.");
    }
    setBusy(false);
  }
  function finish(){(onDone||onClose)();}
  function sendInviteEmail(profile){
    const inviteUrl=`${window.location.origin}/invite`;
    const subject=encodeURIComponent("You're invited to Epistable AI");
    const body=encodeURIComponent(`Hi ${profile.name || ""},\n\nYou've been invited to Epistable AI.\n\nUse this link to accept your access and create your login:\n${inviteUrl}\n\nUse this email address when accepting the invite: ${profile.email}\n\nThanks,\nEpistable AI`);
    window.location.href=`mailto:${encodeURIComponent(profile.email)}?subject=${subject}&body=${body}`;
  }
  return (
    <Modal title={title} onClose={busy?()=>{}:onClose} closeOnBackdrop={false}>
      {done?<div>
        <div style={{textAlign:"center",marginBottom:18}}><div style={{fontSize:48,marginBottom:8}}>âœ…</div><div style={TEXT.pageHeader}>Created!</div></div>
        <div style={{background:C.primaryBg,border:`2px solid ${C.primaryBorder}`,borderRadius:12,padding:20,marginBottom:16}}>
          {[["Name",done.name],["Email",done.email],["Role",isBuyer?"Buyer":done.role],["Auth ID",done.auth_user_id||"Link in Supabase Auth"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.primaryBorder}`}}><span style={{fontSize:12,color:C.textDim}}>{l}</span><span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:l==="Auth ID"?"monospace":"inherit",textAlign:"right"}}>{v}</span></div>
          ))}
        </div>
        <div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.amber,marginBottom:18}}>Send them this link to accept access: {window.location.origin}/invite</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Btn variant="secondary" onClick={()=>sendInviteEmail(done)}>Send Invite Email</Btn>
          <Btn onClick={finish}>Done</Btn>
        </div>
      </div>:<div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Inp label="Full Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required placeholder="Rajesh Kumar"/>
        {isBuyer&&<Inp label="Company" value={form.company} onChange={v=>setForm(p=>({...p,company:v}))} placeholder="Al-Rashid Stone Trading, Dubai"/>}
        <Inp label="Email" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} required type="email"/>
        <AdvancedDisclosure><Inp label="Supabase Auth User ID" value={form.authUserId} onChange={v=>setForm(p=>({...p,authUserId:v}))} placeholder="Optional" hint="Leave blank for invite flow. The user links this by accepting /invite."/></AdvancedDisclosure>
        {!isBuyer&&<Sel label="Role" value={form.role} onChange={v=>setForm(p=>({...p,role:v}))} options={[{value:"inspector",label:"Inspector"},{value:"manager",label:"Manager"},{value:"admin",label:"Admin"}]}/>}
        {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"14px 16px",fontSize:12,color:C.red,fontWeight:600}}>{err}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Btn variant="secondary" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy||!form.name||!form.email}>{busy?"Creatingâ€¦":"Create Profile"}</Btn>
        </div>
      </div>}
    </Modal>
  );
}

function UserAccessModal({user,facs,onClose,onSave,ownerMode=false,fixedRole=null}) {
  const [form,setForm]=useState({
    name:user.name||"",
    email:user.email||"",
    authUserId:user.auth_user_id||"",
    role:fixedRole||user.role||"inspector",
    factoryId:user.factory_id||facs?.[0]?.id||"",
    company:user.company||"",
    status:user.status||"active"
  });
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const roleOptions=ownerMode
    ? [{value:"admin",label:"Admin"},{value:"manager",label:"Manager"},{value:"inspector",label:"Inspector"},{value:"buyer",label:"Buyer"}]
    : [{value:"admin",label:"Admin"},{value:"manager",label:"Manager"},{value:"inspector",label:"Inspector"},{value:"buyer",label:"Buyer"}];
  const facOptions=(facs||[]).map(f=>({value:f.id,label:f.name}));
  async function submit(nextStatus=form.status){
    if(!form.name||!form.email)return;
    setBusy(true);setErr("");
    try {
      const fac=(facs||[]).find(f=>f.id===form.factoryId);
      await onSave(user,{
        name:form.name.trim(),
        email:form.email.trim().toLowerCase(),
        auth_user_id:form.authUserId.trim()||null,
        role:fixedRole||form.role,
        factory_id:form.factoryId||null,
        factory_name:fac?.name||user.factory_name||"",
        company:(fixedRole||form.role)==="buyer"?(form.company||""):"",
        status:nextStatus,
        avatar:form.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()
      });
      onClose();
    } catch(e) {
      setErr(e.message||"Could not update access.");
    }
    setBusy(false);
  }
  const suspended=form.status==="suspended";
  return (
    <Modal title={"Manage Access"} onClose={busy?()=>{}:onClose} closeOnBackdrop={false}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",alignItems:"center",gap:14,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
          <Avi initials={(user.avatar||user.name||"??").slice(0,2).toUpperCase()} size={38}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{user.name}</div><div style={{fontSize:12,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div></div>
          <StatPill status={form.status}/>
        </div>
        <Inp label="Full Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required/>
        <Inp label="Email" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} required type="email"/>
        <AdvancedDisclosure><Inp label="Supabase Auth User ID" value={form.authUserId} onChange={v=>setForm(p=>({...p,authUserId:v}))} hint="This links the profile to Supabase Auth login."/></AdvancedDisclosure>
        <div style={{display:"grid",gridTemplateColumns:ownerMode?"1fr 1fr":"1fr",gap:14}}>
          {fixedRole?<div><label style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>Role</label><div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:10,padding:"14px 16px",fontSize:13,fontWeight:600,color:C.primary,textTransform:"capitalize"}}>{fixedRole}</div></div>:<Sel label="Role" value={form.role} onChange={v=>setForm(p=>({...p,role:v}))} options={roleOptions}/>}
          {ownerMode&&<Sel label="Factory" value={form.factoryId} onChange={v=>setForm(p=>({...p,factoryId:v}))} options={facOptions}/>}
        </div>
        {(fixedRole||form.role)==="buyer"&&<Inp label="Company" value={form.company} onChange={v=>setForm(p=>({...p,company:v}))}/>}
        <Sel label="Access Status" value={form.status} onChange={v=>setForm(p=>({...p,status:v}))} options={[{value:"active",label:"Active"},{value:"suspended",label:"Suspended"},{value:"inactive",label:"Inactive"}]}/>
        {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"14px 16px",fontSize:12,color:C.red,fontWeight:600}}>{err}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Btn variant="secondary" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={()=>submit()} disabled={busy||!form.name||!form.email}>{busy?"Saving...":"Save Changes"}</Btn>
        </div>
        <Btn variant={suspended?"green":"red"} onClick={()=>submit(suspended?"active":"suspended")} disabled={busy} full>
          {suspended?"Restore Access":"Suspend Access"}
        </Btn>
      </div>
    </Modal>
  );
}

function OwnerUsers({users,facs,onRefresh}) {
  const [show,setShow]=useState(false);const [search,setSearch]=useState("");
  const [manage,setManage]=useState(null);
  const filtered=users.filter(u=>u.name?.toLowerCase().includes(search.toLowerCase())||u.email?.toLowerCase().includes(search.toLowerCase())||u.factory_name?.toLowerCase().includes(search.toLowerCase()));
  async function createUser(form){
    const fac=facs.find(f=>f.id===form.factoryId);
    const u=await DB.createUser({...form,factoryName:fac?.name||"Unknown",avatar:form.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()});
    await DB.addActivity(activityForProfile("profile_created",null,u,{role:u.role,status:u.status}));
    return u;
  }
  async function saveUser(user,updates){
    await DB.updUser(user.id,updates);
    await DB.addActivity(activityForProfile(updates.status==="suspended"?"profile_suspended":user.status==="suspended"&&updates.status==="active"?"profile_restored":"profile_updated",null,{...user,...updates},{role:updates.role,status:updates.status}));
    onRefresh();
  }
  return (
    <div>
      {show&&<UserFormModal title="Create User" facs={facs} onClose={()=>setShow(false)} onDone={()=>{setShow(false);onRefresh();}} onSubmit={createUser}/>}
      {manage&&<UserAccessModal user={manage} facs={facs} ownerMode onClose={()=>setManage(null)} onSave={saveUser}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div><div style={TEXT.pageHeader}>All Users</div><div style={TEXT.meta}>{users.length} accounts</div></div>
        <Btn size="sm" onClick={()=>setShow(true)}>+ Create</Btn>
      </div>
      <div style={{marginBottom:16}}><Inp value={search} onChange={setSearch} placeholder="Search name, email, factoryâ€¦" icon="search"/></div>
      {filtered.length===0?<Card style={{padding:"40px",textAlign:"center"}}><div style={{marginBottom:16,display:"flex",justifyContent:"center"}}><Icon name="user" size={32} color={C.primary}/></div><div style={{fontWeight:600}}>No users yet</div></Card>:
      <Card>{filtered.map((u,i)=>(
        <div key={u.id} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none"}}>
          <Avi initials={u.avatar||"??"} size={36}/>
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{u.name}</div><div style={{...TEXT.tinyMeta,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.factory_name} Â· {u.email}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <span style={{fontSize:12,fontWeight:600,color:C.primary,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,padding:"3px 9px",borderRadius:20,textTransform:"capitalize"}}>{u.role}</span>
            <StatPill status={u.status||"active"}/>
            <Btn size="sm" variant="secondary" onClick={()=>setManage(u)}>Manage</Btn>
          </div>
        </div>
      ))}</Card>}
    </div>
  );
}

function OwnerDisputes() {
  const [disputes,setDisputes]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{DB.allDisputes().then(d=>{setDisputes(d);setLoading(false);});},[]);
  const catLabel={wrong_grade:"Wrong Grade",defect_missed:"Defect Missed",measurement:"Wrong Measurement",other:"Other"};
  if(loading)return <Loader/>;
  return (
    <div>
      <div style={TEXT.pageTitle}>All Disputes</div>
      {disputes.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{marginBottom:16,display:"flex",justifyContent:"center"}}><Icon name="users" size={48} color={C.primary}/></div><div style={TEXT.emptyTitle}>No disputes yet</div></Card>:
      <Card>{disputes.map((d,i)=>(
        <div key={d.id} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderBottom:i<disputes.length-1?`1px solid ${C.border}`:"none",background:d.status==="open"?C.redBg:C.white}}>
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{d.stone} <span style={TEXT.tinyMeta}>#{d.slab_id}</span></div><div style={TEXT.tinyMeta}>{d.factory_name} Â· {d.buyer_name} Â· {catLabel[d.category]||d.category}</div></div>
          <DisputeStatusPill status={d.status}/>
        </div>
      ))}</Card>}
    </div>
  );
}

function OwnerInquiries() {
  const [inquiries,setInquiries]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{DB.allInquiries().then(i=>{setInquiries(i);setLoading(false);});},[]);
  async function updStatus(id,status){await DB.updInquiry(id,{status});const i=await DB.allInquiries();setInquiries(i);}
  if(loading)return <Loader/>;
  return (
    <div>
      <div style={TEXT.pageTitle}>All Buyer Inquiries</div>
      {inquiries.length===0?<Card style={{padding:"48px",textAlign:"center"}}><div style={{marginBottom:16,display:"flex",justifyContent:"center"}}><Icon name="mail" size={48} color={C.primary}/></div><div style={TEXT.emptyTitle}>No inquiries yet</div></Card>:
      <Card>{inquiries.map((q,i)=>(
        <div key={q.id} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderBottom:i<inquiries.length-1?`1px solid ${C.border}`:"none",background:q.status==="new"?C.primaryBg:C.white}}>
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{q.buyer_name}{q.buyer_company?" Â· "+q.buyer_company:""}</div><div style={TEXT.tinyMeta}>{q.stone} Â· {q.factory_name} Â· {fmtD(q.created_at)}</div></div>
          <InqPill status={q.status}/>
        </div>
      ))}</Card>}
    </div>
  );
}

function OwnerSettings() {
  return (
    <div>
      <div style={{...TEXT.pageHeader,marginBottom:16}}>Settings</div>
      <Card style={{padding:20,marginBottom:18}}><Inp label="Platform Name" value="Epistable AI" onChange={()=>{}}/></Card>
      <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:20,fontSize:13,color:C.primary}}>âœ… Using Supabase â€” data syncs across all devices in real time.</div>
    </div>
  );
}

// â”€â”€ FACTORY APP â”€â”€
function FactoryApp({user,onLogout}) {
  const [page,setPage]=useState("home");
  const [insps,setInsps]=useState([]);
  const [fac,setFac]=useState(()=>user.factory_id?{id:user.factory_id,name:user.factory_name||user.factoryName||"Factory",plan:"Starter",status:"active",billing_status:"pending",current_month:curMon(),current_month_scans:0}:null);
  const [notifs,setNotifs]=useState([]);
  const [activity,setActivity]=useState([]);
  const [inquiries,setInquiries]=useState([]);
  const [salesInsps,setSalesInsps]=useState([]);
  const [disputes,setDisputes]=useState([]);
  const [quotes,setQuotes]=useState([]);
  const [loading,setLoading]=useState(false);
  const [shellLoading,setShellLoading]=useState(true);
  const [adminDataLoading,setAdminDataLoading]=useState(false);
  const [refreshError,setRefreshError]=useState("");
  const [viewPortal,setViewPortal]=useState(false);

  async function load({blockAdmin=true}={}){
    if(blockAdmin)setLoading(true);
    setShellLoading(true);
    const canManage=user.role==="admin"||user.role==="manager";
    let userInsps=[];
    setRefreshError("");
    try {
      const [i,f]=await Promise.all([DB.userInsps(user.id),DB.getFac(user.factory_id)]);
      userInsps=i||[];
      setInsps(userInsps);setFac(prev=>f||prev);setSalesInsps(prev=>canManage?(prev.length?prev:userInsps):userInsps);
    } catch(e) {
      console.error("Factory shell refresh failed",e);
      setRefreshError(e.message||"Could not refresh factory data. Check your connection and retry.");
    } finally {
      setLoading(false);
      setShellLoading(false);
    }
    setAdminDataLoading(true);
    const adminLoad=Promise.all([DB.getNotifs(user.id),DB.facActivity(user.factory_id),canManage?DB.facInquiries(user.factory_id):Promise.resolve([]),canManage?DB.facInsps(user.factory_id):Promise.resolve([]),canManage?DB.facDisputes(user.factory_id):Promise.resolve([]),canManage?DB.facQuotes(user.factory_id):Promise.resolve([])])
      .then(([n,a,q,fi,d,qt])=>{setNotifs(n);setActivity(a);setInquiries(q);setSalesInsps(canManage?fi:userInsps);setDisputes(d);setQuotes(qt);})
      .catch(e=>{console.error("Factory dashboard refresh failed",e);setRefreshError(e.message||"Some dashboard data could not be refreshed.");})
      .finally(()=>setAdminDataLoading(false));
    if(blockAdmin)await adminLoad;
  }
  useEffect(()=>{load({blockAdmin:false});},[]);
  if(loading)return <Loader/>;
  const isAdmin=user.role==="admin"||user.role==="manager";
  if(viewPortal&&fac&&isAdmin)return <BuyerPortal factoryId={fac.id} onBack={()=>setViewPortal(false)} buyer={null}/>;
  const unread=notifs.filter(n=>!n.read).length;
  const mon=curMon();
  const sc=fac?.current_month===mon?fac?.current_month_scans||0:0;
  const b=fac?calcBill(fac.plan||"Starter",sc):{total:0,includedScans:100};
  const paused=fac?.status==="paused";

  const nav=[
    {id:"home",label:"Home",icon:"building"},
    {id:"scan",label:"Scan",icon:"search"},
    {id:"history",label:"History",icon:"list"},
    ...(isAdmin?[{id:"analytics",label:"Analytics",icon:"chart"}]:[]),
    ...(isAdmin?[{id:"team",label:"Team",icon:"users"},{id:"suppliers",label:"Suppliers",icon:"factory"},{id:"buyers",label:"Buyers",icon:"location"},{id:"inquiries",label:"Inquiries",icon:"mail"},{id:"disputes",label:"Disputes",icon:"alert"}]:[]),
    {id:"notifs",label:"Alerts",icon:"bell",badge:unread||undefined},
  ];
  if(isAdmin&&!nav.some(n=>n.id==="docs"))nav.splice(4,0,{id:"docs",label:"Documents",icon:"file"});
  if(isAdmin&&!nav.some(n=>n.id==="sales"))nav.splice(5,0,{id:"sales",label:"Sales",icon:"currency"});
  if(isAdmin&&!nav.some(n=>n.id==="quotes"))nav.splice(6,0,{id:"quotes",label:"Quotes",icon:"message"});

  const pages={
    home:<FacHome user={user} fac={fac} insps={insps} inquiries={inquiries} sc={sc} b={b} paused={paused} isAdmin={isAdmin} setPage={setPage} openPortal={()=>setViewPortal(true)}/>,
    scan:<FacScan user={user} fac={fac} paused={paused} onSaved={()=>{load();setPage("history");}}/>,
    history:<FacHistory insps={insps}/>,
    analytics:<FacAnalytics insps={insps}/>,
    ...(isAdmin?{docs:<SellerDocuments fac={fac} user={user} DB={DB} insps={salesInsps.length?salesInsps:insps}/>}:{}),
    ...(isAdmin?{sales:<FacSalesDashboard inquiries={inquiries} insps={salesInsps} disputes={disputes} quotes={quotes} setPage={setPage} onChange={load}/>}:{ }),
    ...(isAdmin?{quotes:<FacQuotesPage quotes={quotes} insps={salesInsps} onChange={load}/>}:{ }),
    ...(isAdmin?{team:<FacTeam fac={fac} actor={user} activity={activity} onActivity={load}/>,suppliers:<FacSuppliers fac={fac}/>,buyers:<FacBuyers fac={fac} actor={user} onActivity={load}/>,inquiries:<FacInquiries fac={fac} onChange={load}/>,disputes:<FacDisputes fac={fac}/>}:{}),
    notifs:<FacNotifs notifs={notifs} onRead={async()=>{await DB.readAll(user.id);load();}}/>,
  };

  return (
    <>
      <Shell brandSub={<div style={{background:"rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 10px",fontSize:12,color:"rgba(255,255,255,0.8)",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:paused?"#f87171":"#4ade80"}}>â—</span>{paused?"Paused":fac?.name||"Factory"}</div>}
        navItems={nav} page={page} onNav={p=>{setPage(p);if(p==="notifs"){DB.readAll(user.id);load();}}} onLogout={onLogout} userName={user.name} userSub={user.role}>
        {paused&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,padding:"12px 20px",display:"flex",alignItems:"center",gap:14}}><span style={{fontSize:18}}>ðŸš«</span><div style={{fontSize:13,fontWeight:600,color:C.red}}>Account Paused â€” Contact Epistable support to resume.</div></div>}
        <ErrorNotice message={refreshError} onRetry={()=>load({blockAdmin:false})}/>
        {(shellLoading||adminDataLoading)&&isAdmin&&<div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:600,color:C.primary,marginBottom:16}}>Refreshing dashboard data...</div>}
        {pages[page]||pages.home}
      </Shell>
      <ChatBot role="factory" ctxData={{fac,insps,user}}/>
    </>
  );
}

function FacHome({user,fac,insps,inquiries=[],sc,b,paused,isAdmin,setPage,openPortal}) {
  const [readinessCopied,setReadinessCopied]=useState(false);
  const today=insps.filter(i=>Date.now()-i.ts<86400000);
  const byG=g=>insps.filter(i=>i.grade===g).length;
  const pp=insps.length?Math.round(byG("Premium")/insps.length*100):0;
  const overdueFollowups=inquiries.filter(q=>q.followUpAt&&q.followUpAt<Date.now()&&q.status!=="closed");
  const quoteRequests=inquiries.filter(q=>/quote request/i.test(q.message||"")&&q.status!=="closed");
  const newInquiries=inquiries.filter(q=>q.status==="new");
  const availableSlabs=insps.filter(i=>(i.inventoryStatus||"available")==="available").length;
  const reservedSlabs=insps.filter(i=>(i.inventoryStatus||"available")==="reserved").length;
  const soldSlabs=insps.filter(i=>(i.inventoryStatus||"available")==="sold").length;
  const rejectedToday=today.filter(i=>i.grade==="Rejected").length;
  const traceKeys=["quarrySource","batchNo","blockNo","productionLine","operator","containerNo","customerRef"];
  const traceFields=insps.reduce((s,i)=>{const t=i.measurements?.traceability||{};return s+traceKeys.filter(k=>!!t[k]).length;},0);
  const traceCoverage=insps.length?Math.round(traceFields/(insps.length*traceKeys.length)*100):0;
  const auditReady=insps.filter(i=>i.measurements?.audit?.calibrationChecked&&i.measurements?.audit?.checklistComplete).length;
  const auditReadyPct=insps.length?Math.round(auditReady/insps.length*100):0;
  const capaNeeded=insps.filter(i=>(i.defects||[]).length>0&&!i.measurements?.audit?.correctiveAction).length;
  const photoComplete=insps.filter(i=>Array.isArray(i.photos)&&["front","surface","edge"].every(slot=>i.photos.some(p=>{
    const label=`${p?.slot||""} ${p?.label||""}`.toLowerCase();
    return label.includes(slot)||label.includes(slot==="front"?"slab":slot);
  }))).length;
  const aiReviewed=insps.filter(i=>i.measurements?.aiReview?.suggestedGrade).length;
  const traceReady=insps.filter(i=>traceKeys.filter(k=>!!i.measurements?.traceability?.[k]).length>=4).length;
  const readinessScore=insps.length?Math.round((traceCoverage+auditReadyPct+(capaNeeded?Math.max(0,100-Math.min(capaNeeded*20,100)):100))/3):0;
  const readinessActions=[
    traceCoverage<70&&{label:"Add traceability to scans",detail:"Record source, batch, block, line, operator, shipment, and order references on new inspections.",page:"scan",color:C.amber},
    auditReadyPct<70&&{label:"Complete audit checks",detail:"Mark calibration and inspection checklist completion while recording measurements.",page:"scan",color:C.primary},
    capaNeeded>0&&{label:"Close CAPA gaps",detail:`${capaNeeded} defect record${capaNeeded===1?"":"s"} need root cause and corrective action notes.`,page:"analytics",color:C.red},
    insps.length<5&&{label:"Build evidence volume",detail:"Create at least five complete certificates so trends and exports become useful.",page:"scan",color:C.green},
  ].filter(Boolean).slice(0,3);
  async function copyFactoryReadinessSummary(){
    const lines=[
      `${fac?.name||user.factory_name||"Factory"} readiness: ${readinessScore}%`,
      `Scans: ${insps.length}`,
      `Traceability coverage: ${traceCoverage}%`,
      `Audit checklist completion: ${auditReadyPct}%`,
      `CAPA gaps: ${capaNeeded}`,
      `Available slabs: ${availableSlabs}`,
      `Premium rate: ${pp}%`,
      "",
      "Next actions:",
      ...(readinessActions.length?readinessActions.map(a=>`- ${a.label}: ${a.detail}`):["- Maintain current scan discipline and export evidence before buyer or audit reviews."]),
    ];
    const text=lines.join("\n");
    try{
      await navigator.clipboard.writeText(text);
      setReadinessCopied(true);
      setTimeout(()=>setReadinessCopied(false),1400);
    }catch(e){
      window.prompt("Copy readiness summary",text);
    }
  }
  const adminPriorities=[...overdueFollowups.slice(0,2).map(q=>({label:"Overdue follow-up",detail:q.buyerName||q.buyer_name||"Buyer",color:C.red,page:"inquiries"})),...quoteRequests.slice(0,2).map(q=>({label:"Quote request",detail:`${q.buyerName||q.buyer_name||"Buyer"} - ${q.stone}`,color:C.green,page:"inquiries"})),...newInquiries.slice(0,2).map(q=>({label:"New inquiry",detail:`${q.buyerName||q.buyer_name||"Buyer"} - ${q.stone}`,color:C.primary,page:"inquiries"}))].slice(0,4);
  const homeKpisNext=[{label:"Scans This Month",value:sc,icon:"Scan",color:C.primary},{label:"Available Slabs",value:availableSlabs,icon:"Stock",color:C.green},{label:"Premium Rate",value:pp+"%",icon:"Grade",color:C.green},{label:"Bill Due",value:fmtMoney(b.total),icon:"Bill",color:C.amber},...(isAdmin?[{label:"Quote Requests",value:quoteRequests.length,icon:"Quote",color:C.primary},{label:"Overdue Follow-ups",value:overdueFollowups.length,icon:"Due",color:overdueFollowups.length?C.red:C.textDim}]:[])];
  const adminKpis=[
    {label:"Available Slabs",value:availableSlabs,icon:"Stock",color:C.green},
    {label:"Quote Requests",value:quoteRequests.length,icon:"Quote",color:quoteRequests.length?C.primary:C.textDim},
    {label:"Open Follow-ups",value:overdueFollowups.length,icon:"Due",color:overdueFollowups.length?C.red:C.textDim},
    {label:"Bill Due",value:fmtMoney(b.total),icon:"Bill",color:b.total?C.amber:C.textDim},
  ];
  const focusItems=[
    quoteRequests.length&&{label:"Quote requests",detail:`${quoteRequests.length} buyer request${quoteRequests.length===1?" needs":"s need"} pricing.`,page:"inquiries",tone:"success",icon:"message"},
    overdueFollowups.length&&{label:"Overdue follow-ups",detail:`${overdueFollowups.length} buyer follow-up${overdueFollowups.length===1?" is":"s are"} overdue.`,page:"inquiries",tone:"danger",icon:"date"},
    insps.length===0&&{label:"First scan",detail:"Create one buyer-ready slab certificate with photos and measurements.",page:"scan",tone:"primary",icon:"camera"},
    availableSlabs===0&&insps.length>0&&{label:"Publish inventory",detail:"Mark available slabs so buyers can browse and request quotes.",page:"history",tone:"warning",icon:"package"},
    b.total>0&&{label:"Billing",detail:`${fmtMoney(b.total)} is due for current usage.`,page:"sales",tone:"warning",icon:"billing"},
  ].filter(Boolean).slice(0,3);
  const adminActions=[
    {label:"Scan slab",detail:"Create a certificate and QR from a new inspection.",icon:"camera",page:"scan",primary:true},
    {label:"Open Documents",detail:"Add certificates, reports, shipment papers, and buyer proof.",icon:"file",page:"docs"},
    {label:"Respond to quotes",detail:quoteRequests.length?`${quoteRequests.length} request${quoteRequests.length===1?"":"s"} waiting.`:"Review inquiries and prepare quotes.",icon:"message",page:"inquiries"},
  ];
  const recentActivity=[
    ...inquiries.map(q=>({ts:q.ts||q.created_at||0,label:/quote request/i.test(q.message||"")?"Quote request received":"Buyer inquiry received",detail:`${q.buyerName||q.buyer_name||"Buyer"}${q.stone?` - ${q.stone}`:""}`,page:"inquiries",icon:"message"})),
    ...insps.map(i=>({ts:i.ts||0,label:"Slab scanned",detail:`${i.stone||"Stone"}${i.grade?` - ${i.grade}`:""}`,page:"history",icon:"verified"})),
  ].sort((a,b)=>Number(b.ts||0)-Number(a.ts||0)).slice(0,5);
  if(isAdmin)return (
    <div>
      <Card style={{padding:22,marginBottom:18,borderColor:focusItems.length?C.primaryBorder:C.greenBorder,background:focusItems.length?C.primaryBg:C.greenBg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:18,flexWrap:"wrap"}}>
          <div style={{minWidth:240,flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:C.textMid,marginBottom:6}}>Today&apos;s focus</div>
            <div style={{fontSize:24,lineHeight:1.2,fontWeight:700,color:C.text,letterSpacing:0,marginBottom:8}}>
              {focusItems.length?`${focusItems.length} item${focusItems.length===1?"":"s"} need attention`:"Factory is clear for now"}
            </div>
            <div style={{fontSize:14,lineHeight:1.6,color:C.textMid,maxWidth:720}}>
              {focusItems.length?"Handle the few things that move buyers forward today: pricing, follow-ups, proof, and fresh inventory.":"No urgent buyer follow-ups right now. Keep scanning and adding proof as work happens."}
            </div>
          </div>
          <Btn onClick={()=>setPage(focusItems[0]?.page||"scan")} disabled={paused&&focusItems[0]?.page==="scan"}>
            {focusItems.length?"Review now":"New Scan"}
          </Btn>
        </div>
        {focusItems.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:18}}>
          {focusItems.map(item=>{
            const tone=item.tone==="danger"?{bg:C.redBg,border:C.redBorder,color:C.red}:item.tone==="warning"?{bg:C.amberBg,border:C.amberBorder,color:C.amber}:item.tone==="success"?{bg:C.greenBg,border:C.greenBorder,color:C.green}:{bg:C.white,border:C.primaryBorder,color:C.primary};
            return (
              <button key={item.label} onClick={()=>setPage(item.page)} style={{display:"flex",gap:12,alignItems:"flex-start",background:C.white,border:`1px solid ${tone.border}`,borderRadius:10,padding:"14px 15px",cursor:"pointer",fontFamily:FONT_STACK,textAlign:"left"}}>
                <span style={{width:34,height:34,borderRadius:10,background:tone.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name={item.icon} size={17} color={tone.color}/>
                </span>
                <span style={{minWidth:0}}>
                  <span style={{display:"block",fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>{item.label}</span>
                  <span style={{display:"block",fontSize:12,lineHeight:1.5,color:C.textMid}}>{item.detail}</span>
                </span>
              </button>
            );
          })}
        </div>}
      </Card>

      <KpiGrid items={adminKpis}/>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:18}}>
        {adminActions.map(action=>(
          <button key={action.label} onClick={()=>setPage(action.page)} disabled={paused&&action.page==="scan"} style={{background:action.primary?C.primary:C.white,border:`1px solid ${action.primary?C.primary:C.border}`,borderRadius:14,padding:"18px",cursor:paused&&action.page==="scan"?"not-allowed":"pointer",fontFamily:FONT_STACK,textAlign:"left",boxShadow:action.primary?"0 3px 8px rgba(10,37,64,0.16)":C.shadow,opacity:paused&&action.page==="scan"?0.55:1}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <span style={{width:38,height:38,borderRadius:11,background:action.primary?"rgba(255,255,255,0.14)":C.primaryBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon name={action.icon} size={18} color={action.primary?C.white:C.primary}/>
              </span>
              <span style={{fontSize:15,fontWeight:700,color:action.primary?C.white:C.text}}>{action.label}</span>
            </div>
            <div style={{fontSize:13,lineHeight:1.55,color:action.primary?"rgba(255,255,255,0.78)":C.textMid}}>{action.detail}</div>
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:18,alignItems:"start"}}>
        <Card>
          <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:C.text}}>Recent activity</div>
              <div style={{fontSize:12,lineHeight:1.45,color:C.textDim,marginTop:2}}>Latest buyer and inspection movement</div>
            </div>
            <Btn size="sm" variant="ghost" onClick={()=>setPage("history")}>History</Btn>
          </div>
          {recentActivity.length===0?<div style={{padding:18,fontSize:13,lineHeight:1.6,color:C.textMid}}>No activity yet. Start with one scan, then share the certificate or buyer inventory link.</div>:
            recentActivity.map((item,i)=>(
              <button key={`${item.label}-${item.ts}-${i}`} onClick={()=>setPage(item.page)} style={{width:"100%",display:"flex",alignItems:"center",gap:13,padding:"14px 18px",border:"none",borderBottom:i<recentActivity.length-1?`1px solid ${C.border}`:"none",background:C.white,cursor:"pointer",fontFamily:FONT_STACK,textAlign:"left"}}>
                <span style={{width:34,height:34,borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name={item.icon} size={16} color={C.primary}/>
                </span>
                <span style={{flex:1,minWidth:0}}>
                  <span style={{display:"block",fontSize:13,fontWeight:700,color:C.text}}>{item.label}</span>
                  <span style={{display:"block",fontSize:12,color:C.textDim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:2}}>{item.detail}</span>
                </span>
                <span style={{fontSize:12,color:C.textDim,flexShrink:0}}>{item.ts?fmtT(item.ts):""}</span>
              </button>
            ))}
        </Card>

        <Card style={{padding:18,borderColor:C.primaryBorder,background:C.primaryBg}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{width:36,height:36,borderRadius:11,background:C.white,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Icon name="file" size={17} color={C.primary}/>
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:C.primary,marginBottom:4}}>Buyer proof lives in Documents</div>
              <div style={{fontSize:13,lineHeight:1.6,color:C.textMid,marginBottom:14}}>Add certificates, test reports, shipment papers, and slab evidence only when you have them. No long checklist on Home.</div>
              <Btn size="sm" onClick={()=>setPage("docs")}>Open Documents</Btn>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
  const factoryNextSteps=isAdmin?[
    {label:"1. Publish trust",detail:`${availableSlabs} available slabs can be shared from buyer inventory.`,color:C.green,bg:C.greenBg,border:C.greenBorder},
    {label:"2. Convert demand",detail:quoteRequests.length?`${quoteRequests.length} quote request${quoteRequests.length===1?"":"s"} need pricing.`:"Create quotes from fresh inquiries.",color:C.primary,bg:C.primaryBg,border:C.primaryBorder},
    {label:"3. Close orders",detail:reservedSlabs?`${reservedSlabs} reserved slab${reservedSlabs===1?"":"s"} need follow-up.`:"Accepted quotes will appear in Sales.",color:C.amber,bg:C.amberBg,border:C.amberBorder},
  ]:[
    {label:"1. Capture evidence",detail:"Add full slab, surface, edge, and defect photos.",color:C.primary,bg:C.primaryBg,border:C.primaryBorder},
    {label:"2. Grade consistently",detail:"Record measurements and defects before saving.",color:C.green,bg:C.greenBg,border:C.greenBorder},
    {label:"3. Share proof",detail:"Use QR certificates from history when buyers ask.",color:C.amber,bg:C.amberBg,border:C.amberBorder},
  ];
  const setupItems=isAdmin?[
    {label:"Scan first verified slab",detail:"Create one certificate with photos and measurements.",done:insps.length>0,onClick:()=>setPage("scan")},
    {label:"Publish buyer-ready inventory",detail:"Keep Premium and Standard slabs available for buyer browsing.",done:availableSlabs>0,onClick:openPortal},
    {label:"Turn interest into quotes",detail:"Open inquiries and send quotes when buyers request pricing.",done:quoteRequests.length>0||reservedSlabs>0||soldSlabs>0,onClick:()=>setPage("inquiries")},
  ]:[
    {label:"Capture full evidence",detail:"Use required photo slots during the scan.",done:insps.length>0,onClick:()=>setPage("scan")},
    {label:"Review saved certificates",detail:"Open history to confirm grade, QR, and evidence look right.",done:insps.length>0,onClick:()=>setPage("history")},
    {label:"Keep scanning today",detail:"More scans improve factory analytics and buyer confidence.",done:today.length>=3,onClick:()=>setPage("scan")},
  ];
  const pilotItems=isAdmin?[
    {label:"100 inspection records",value:`${Math.min(insps.length,100)}/100`,done:insps.length>=100,page:"history"},
    {label:"Photo evidence discipline",value:`${photoComplete}/${insps.length||0}`,done:insps.length>0&&photoComplete/insps.length>=0.8,page:"history"},
    {label:"Traceability coverage",value:`${traceCoverage}%`,done:traceCoverage>=70,page:"analytics"},
    {label:"Audit checklist completion",value:`${auditReadyPct}%`,done:auditReadyPct>=70,page:"analytics"},
    {label:"CAPA gaps closed",value:capaNeeded?`${capaNeeded} open`:"Clear",done:capaNeeded===0,page:"analytics"},
    {label:"Buyer demand captured",value:`${inquiries.length}`,done:inquiries.length>=5,page:"inquiries"},
    {label:"AI review dataset",value:`${aiReviewed} reviewed`,done:aiReviewed>=20,page:"analytics"},
    {label:"Trace-ready slabs",value:`${traceReady}/${insps.length||0}`,done:insps.length>0&&traceReady/insps.length>=0.7,page:"history"},
  ]:[];
  const pilotDone=pilotItems.filter(i=>i.done).length;
  const pilotPct=pilotItems.length?Math.round(pilotDone/pilotItems.length*100):0;
  const firstSlabSteps=[
    {label:"Open Scan",detail:"Choose the stone type and supplier source.",done:false,page:"scan"},
    {label:"Capture Evidence",detail:"Add front, surface, and edge photos so buyers can trust the certificate.",done:false,page:"scan"},
    {label:"Show QR",detail:"After saving, share the certificate link or QR with a buyer.",done:insps.length>0,page:"history"},
  ];
  return (
    <div>
      {insps.length===0&&<Card style={{padding:20,marginBottom:18,borderColor:C.primaryBorder,background:C.primaryBg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:16,flexWrap:"wrap"}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:16,fontWeight:700,color:C.primary,marginBottom:4}}>Create your first buyer-ready slab</div>
            <div style={{fontSize:13,lineHeight:1.65,color:C.textMid}}>Start with one habit: scan a slab, add photos, save it, then share the QR certificate. Everything else can wait.</div>
          </div>
          <Btn onClick={()=>setPage("scan")} disabled={paused}>Start First Scan</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14}}>
          {firstSlabSteps.map((step,i)=>(
            <button key={step.label} onClick={()=>setPage(step.page)} style={{display:"flex",alignItems:"flex-start",gap:12,background:C.white,border:`1px solid ${step.done?C.greenBorder:C.primaryBorder}`,borderRadius:10,padding:"14px 16px",cursor:"pointer",fontFamily:FONT_STACK,textAlign:"left"}}>
              <span style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:step.done?C.green:C.primaryBg,color:step.done?C.white:C.primary,fontSize:12,fontWeight:700,flexShrink:0}}>{step.done?"âœ“":i+1}</span>
              <span style={{minWidth:0}}><span style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:3}}>{step.label}</span><span style={{display:"block",fontSize:12,lineHeight:1.55,color:C.textDim}}>{step.detail}</span></span>
            </button>
          ))}
        </div>
      </Card>}
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary})`,borderRadius:14,padding:"18px",marginBottom:18,color:C.white}}>
        <div style={{fontSize:12,lineHeight:1.65,color:"rgba(255,255,255,0.7)",marginBottom:6,textTransform:"capitalize"}}>ðŸ‘‹ {user.role}</div>
        <div style={{...TEXT.heroTitle,marginBottom:4}}>{user.name}</div>
        <div style={{fontSize:13,lineHeight:1.65,color:"rgba(255,255,255,0.7)",marginBottom:18}}>{fac?.name||"Factory"}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {[["Today",today.length,"search"],["Total",insps.length,"package"],["Premium%",pp+"%","verified"]].map(([l,v,icon])=>(
            <div key={l} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:12}}>{icon}</div><div style={{fontSize:18,fontWeight:700,lineHeight:1.1,letterSpacing:0,marginTop:4}}>{v}</div><div style={{fontSize:12,lineHeight:1.3,color:"rgba(255,255,255,0.65)",marginTop:2}}>{l}</div></div>
          ))}
        </div>
      </div>
      <KpiGrid items={homeKpisNext}/>
      <GuidanceCard title={isAdmin?"Next best actions":"Inspection workflow"} subtitle={isAdmin?"Keep buyer demand moving from verified slab to quote to sale":"A repeatable scan flow builds buyer trust"} items={factoryNextSteps} actionLabel={isAdmin?"Open Sales":"New Scan"} onAction={()=>setPage(isAdmin?"sales":"scan")} style={{marginBottom:18}}/>
      {isAdmin?<Card style={{padding:20,marginBottom:18,borderColor:C.primaryBorder,background:C.primaryBg}}>
        <div style={{display:"flex",alignItems:"center",gap:14,justifyContent:"space-between",flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start",minWidth:240,flex:1}}>
            <div style={{width:38,height:38,borderRadius:12,background:C.white,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Icon name="file" size={18} color={C.primary}/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.primary,marginBottom:3}}>Add buyer proof when you have it</div>
              <div style={{fontSize:13,lineHeight:1.6,color:C.textMid,maxWidth:680}}>Skip the full checklist for now. Use Documents to add certificates, test reports, shipment papers, and slab evidence one item at a time.</div>
            </div>
          </div>
          <Btn size="sm" onClick={()=>setPage("docs")}>Open Documents</Btn>
        </div>
      </Card>:<SetupChecklist title="Inspector checklist" subtitle="Small habits that make certificates stronger" items={setupItems} style={{marginBottom:18}}/>}
      {false&&<Card style={{padding:20,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:16}}>
          <div>
            <div style={{fontSize:14,fontWeight:700}}>Pilot readiness checklist</div>
            <div style={TEXT.tinyMeta}>Evidence, buyer demand, traceability, CAPA, and AI review signals for a serious factory pilot</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:24,fontWeight:700,color:pilotPct>=70?C.green:C.amber,lineHeight:1}}>{pilotPct}%</div>
            <div style={{fontSize:12,color:C.textDim,fontWeight:600,marginTop:3}}>{pilotDone}/{pilotItems.length} ready</div>
          </div>
        </div>
        <PBar value={pilotPct} color={pilotPct>=70?C.green:C.amber} h={8}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginTop:16}}>
          {pilotItems.map(item=>(
            <button key={item.label} onClick={()=>setPage(item.page)} style={{display:"flex",alignItems:"center",gap:11,background:item.done?C.greenBg:C.surface,border:`1px solid ${item.done?C.greenBorder:C.border}`,borderRadius:9,padding:"13px 14px",cursor:"pointer",fontFamily:FONT_STACK,textAlign:"left"}}>
              <span style={{width:18,height:18,borderRadius:"50%",background:item.done?C.green:C.white,border:`1px solid ${item.done?C.green:C.border}`,color:item.done?C.white:C.textDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,flexShrink:0}}>{item.done?"âœ“":"â€¢"}</span>
              <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:12,fontWeight:600,color:C.text}}>{item.label}</span><span style={{display:"block",fontSize:12,color:item.done?C.green:C.textDim,fontWeight:500,marginTop:2}}>{item.value}</span></span>
            </button>
          ))}
        </div>
      </Card>}
      {false&&<Card style={{padding:20,marginBottom:18,borderColor:readinessScore>=70?C.greenBorder:C.amberBorder,background:readinessScore>=70?C.greenBg:C.amberBg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:16}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:readinessScore>=70?C.green:C.amber}}>Certification readiness</div>
            <div style={{fontSize:12,color:C.textMid,lineHeight:1.55,marginTop:2}}>A quick signal for how much audit-ready proof your current scans contain.</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Btn size="sm" variant="secondary" onClick={copyFactoryReadinessSummary}>{readinessCopied?"Copied":"Copy"}</Btn>
            <div style={{fontSize:26,fontWeight:700,color:readinessScore>=70?C.green:C.amber,lineHeight:1}}>{readinessScore}%</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {[["Traceability",traceCoverage,traceCoverage>=70?C.green:C.amber],["Audit checklist",auditReadyPct,auditReadyPct>=70?C.green:C.amber],["CAPA closure",capaNeeded?Math.max(0,100-Math.min(capaNeeded*20,100)):100,capaNeeded?C.red:C.green]].map(([label,value,color])=>(
            <div key={label}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,marginBottom:5}}><span>{label}</span><span style={{color}}>{value}%</span></div>
              <PBar value={value} color={color} h={7}/>
            </div>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginTop:16}}>
          <div style={{fontSize:12,color:C.textMid,lineHeight:1.65}}>{capaNeeded?`${capaNeeded} defect record${capaNeeded===1?"":"s"} still need corrective action notes.`:"No open CAPA gaps in current scan data."}</div>
          <Btn size="sm" variant="secondary" onClick={()=>setPage("analytics")}>Analytics</Btn>
        </div>
        {readinessActions.length>0&&<div style={{borderTop:`1px solid ${readinessScore>=70?C.greenBorder:C.amberBorder}`,marginTop:16,paddingTop:12,display:"flex",flexDirection:"column",gap:14}}>
          {readinessActions.map(action=>(
            <button key={action.label} onClick={()=>setPage(action.page)} style={{display:"flex",alignItems:"center",gap:11,background:C.white,border:`1px solid ${C.border}`,borderRadius:9,padding:"13px 14px",cursor:"pointer",fontFamily:FONT_STACK,textAlign:"left"}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:action.color,flexShrink:0}}/>
              <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:12,fontWeight:600,color:C.text}}>{action.label}</span><span style={{display:"block",fontSize:12,color:C.textDim,lineHeight:1.55}}>{action.detail}</span></span>
              <span style={{fontSize:12,color:C.primary,fontWeight:600}}>Fix</span>
            </button>
          ))}
        </div>}
      </Card>}
      {isAdmin&&<Card style={{padding:20,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:16}}>
          <div><div style={{fontSize:14,fontWeight:700}}>Today at a glance</div><div style={TEXT.tinyMeta}>Inventory, buyer demand, and quality signals</div></div>
          <Btn size="sm" variant="ghost" onClick={()=>setPage("sales")}>Sales</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16}}>
          {[["Reserved",reservedSlabs,C.amber],["Sold",soldSlabs,C.green],["Rejected Today",rejectedToday,rejectedToday?C.red:C.textDim]].map(([label,value,color])=>(
            <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:"13px 14px"}}>
              <div style={{fontSize:18,fontWeight:700,color,lineHeight:1}}>{value}</div>
              <div style={{fontSize:12,color:C.textDim,fontWeight:600,marginTop:5}}>{label}</div>
            </div>
          ))}
        </div>
        {adminPriorities.length===0?<div style={{fontSize:12,color:C.textDim,background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:10}}>No urgent buyer follow-ups right now.</div>:
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {adminPriorities.map((p,i)=>(
              <button key={`${p.label}-${i}`} onClick={()=>setPage(p.page)} style={{display:"flex",alignItems:"center",gap:11,background:C.white,border:`1px solid ${C.border}`,borderRadius:9,padding:"13px 14px",cursor:"pointer",fontFamily:FONT_STACK,textAlign:"left"}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:p.color,flexShrink:0}}/>
                <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:12,fontWeight:600,color:C.text}}>{p.label}</span><span style={{display:"block",fontSize:12,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.detail}</span></span>
                <span style={{fontSize:12,color:C.primary,fontWeight:600}}>Open</span>
              </button>
            ))}
          </div>}
      </Card>}
      {isAdmin&&overdueFollowups.length>0&&<Card style={{padding:20,marginBottom:18,borderColor:C.redBorder,background:C.redBg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.red}}>Follow-ups overdue</div>
            <div style={{fontSize:12,color:C.textMid,marginTop:2}}>{overdueFollowups.slice(0,2).map(q=>q.buyerName||q.buyer_name).join(", ")}{overdueFollowups.length>2?" and more":""}</div>
          </div>
          <Btn size="sm" variant="red" onClick={()=>setPage("inquiries")}>Open</Btn>
        </div>
      </Card>}
      <PBar value={sc/b.includedScans*100} color={sc>=b.includedScans?C.red:sc/b.includedScans>0.8?C.amber:C.primary} h={8}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6,marginBottom:18}}><span style={{fontSize:12,color:C.textDim}}>{sc}/{b.includedScans} scans</span><span style={{fontSize:12,fontWeight:600,color:C.amber}}>{fmtMoney(b.total)} due</span></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
        <button onClick={()=>setPage("scan")} disabled={paused} style={{background:paused?"#e2e8f0":`linear-gradient(135deg,${C.primary},${C.teal})`,border:"none",borderRadius:14,padding:"22px 18px",cursor:paused?"not-allowed":"pointer",textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
          <div style={{marginBottom:8,display:"flex"}}><Icon name="search" size={28} color={paused?C.textDim:C.white}/></div><div style={{fontSize:15,fontWeight:700,color:paused?C.textDim:C.white}}>New Scan</div>
        </button>
        {isAdmin?
          <button onClick={openPortal} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 18px",cursor:"pointer",textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
            <div style={{fontSize:28,marginBottom:8}}>ðŸŒ</div><div style={{fontSize:15,fontWeight:700,color:C.text}}>Public Inventory Preview</div>
          </button>:
          <button onClick={()=>setPage("history")} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 18px",cursor:"pointer",textAlign:"left",WebkitTapHighlightColor:"transparent"}}>
            <div style={{fontSize:28,marginBottom:8}}>ðŸ“‹</div><div style={{fontSize:15,fontWeight:700,color:C.text}}>Slab Certificates</div>
          </button>}
      </div>
      {today.length>0&&<Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={TEXT.itemTitle}>Today's Scans</div>
          <button onClick={()=>setPage("history")} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer"}}>All â†’</button>
        </div>
        {today.slice(0,5).map((r,i)=>{const g=gradeConf(r.grade);return(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:14,padding:"11px 16px",borderBottom:i<Math.min(today.length,5)-1?`1px solid ${C.border}`:"none"}}>
            <div style={{width:38,height:38,borderRadius:8,background:g.bg,border:`1px solid ${g.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{g.emoji}</div>
            <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{r.stone}</div><div style={TEXT.tinyMeta}>{fmtT(r.ts)}</div></div>
            <span style={{...T.pill,color:g.color,background:g.bg,border:`1px solid ${g.border}`,padding:"3px 10px",borderRadius:20,flexShrink:0}}>{r.grade}</span>
          </div>
        );})}
      </Card>}
    </div>
  );
}

const PHOTO_SLOTS = [
  {id:"front",label:"Full slab",hint:"Entire slab in one frame",required:true},
  {id:"surface",label:"Surface close-up",hint:"Polish, stain, vein, color",required:true},
  {id:"edge",label:"Edge/corner",hint:"Thickness, chips, corner condition",required:true},
  {id:"defect",label:"Defect close-up",hint:"Required when defects are selected",required:false},
];

const defaultMeasurements = () => ({
  thickness:"",
  length:"",
  width:"",
  polish:3,
  soundTest:"clear",
  edgeCondition:"good",
  surfaceFinish:"polished",
  traceability:{
    quarrySource:"",
    batchNo:"",
    blockNo:"",
    productionLine:"",
    operator:"",
    containerNo:"",
    customerRef:"",
  },
  audit:{
    calibrationChecked:false,
    checklistComplete:false,
    rootCause:"",
    correctiveAction:"",
    actionOwner:"",
    actionDue:"",
  },
});

function FacScan({user,fac,paused,onSaved}) {
  const [step,setStep]=useState(0);
  const [form,setForm]=useState({stone:"makrana",supplierId:"",supplier:"",measurements:defaultMeasurements(),defects:[],exportReady:false,notes:""});
  const [grade,setGrade]=useState(null);const [loading,setLoading]=useState(false);const [saved,setSaved]=useState(false);
  const [savedInsp,setSavedInsp]=useState(null);const [qrSlab,setQrSlab]=useState(null);const [linkCopied,setLinkCopied]=useState(false);
  const [aiGrade,setAiGrade]=useState("");const [overrideReason,setOverrideReason]=useState("");
  const [saving,setSaving]=useState(false);const [saveError,setSaveError]=useState("");
  const [photos,setPhotos]=useState({});
  const [photoSlot,setPhotoSlot]=useState("front");
  const [suppliers,setSuppliers]=useState([]);
  const [supplierMode,setSupplierMode]=useState("registered");
  const [quickSupplier,setQuickSupplier]=useState("");
  const [supplierBusy,setSupplierBusy]=useState(false);
  const [supplierErr,setSupplierErr]=useState("");
  const fileRef=useRef();const videoRef=useRef();const canvasRef=useRef();
  const [cameraOpen,setCameraOpen]=useState(false);const [cameraStream,setCameraStream]=useState(null);const [cameraError,setCameraError]=useState("");
  useEffect(()=>{if(fac)DB.facSuppliers(fac.id).then(setSuppliers);},[fac]);
  if(paused)return <div style={{textAlign:"center",padding:40}}><div style={{fontSize:48,marginBottom:16}}>ðŸš«</div><div style={{fontSize:16,fontWeight:700}}>Account Paused</div></div>;

  const requiredPhotoSlots=PHOTO_SLOTS.filter(s=>s.required||(s.id==="defect"&&form.defects.length>0));
  const completePhotoSlots=requiredPhotoSlots.filter(s=>photos[s.id]?.src).length;
  const photoReady=completePhotoSlots===requiredPhotoSlots.length;
  const photoEvidence=PHOTO_SLOTS.map(s=>photos[s.id]?{slot:s.id,label:s.label,src:photos[s.id].src}:null).filter(Boolean);
  const scanTrace=form.measurements.traceability||{};
  const scanAudit=form.measurements.audit||{};
  const scanTraceKeys=["quarrySource","batchNo","blockNo","productionLine","operator","containerNo","customerRef"];
  const scanTraceCount=scanTraceKeys.filter(k=>!!scanTrace[k]).length;
  const scanAuditCount=["calibrationChecked","checklistComplete","rootCause","correctiveAction","actionOwner","actionDue"].filter(k=>!!scanAudit[k]).length;
  const scanCapaOk=form.defects.length===0||!!scanAudit.correctiveAction;
  const evidenceScore=Math.round(((photoReady?100:0)+(scanTraceCount/scanTraceKeys.length*100)+(scanAuditCount/6*100)+(scanCapaOk?100:0))/4);
  const evidenceChecklist=[
    {label:"Photo evidence",done:photoReady,detail:`${completePhotoSlots}/${requiredPhotoSlots.length} required slots captured`},
    {label:"Traceability",done:scanTraceCount>=4,detail:`${scanTraceCount}/7 fields recorded`},
    {label:"Audit checks",done:!!scanAudit.calibrationChecked&&!!scanAudit.checklistComplete,detail:`${scanAuditCount}/6 audit fields recorded`},
    {label:"CAPA notes",done:scanCapaOk,detail:scanCapaOk?"No open corrective-action gap":"Defect scan needs corrective action"},
  ];
  const selectedSupplier=suppliers.find(s=>s.id===form.supplierId);
  const supplierReady=supplierMode==="unknown"||(supplierMode==="registered"&&!!form.supplierId)||(supplierMode==="manual"&&!!form.supplier.trim());
  const supplierName=()=>supplierMode==="unknown"?"Unknown supplier":supplierMode==="registered"?(selectedSupplier?.name||""):form.supplier.trim();
  function setEvidencePhoto(slotId,src){setPhotos(p=>({...p,[slotId]:{src,label:PHOTO_SLOTS.find(s=>s.id===slotId)?.label||slotId}}));}
  function removeEvidencePhoto(slotId){setPhotos(p=>{const n={...p};delete n[slotId];return n;});}
  function chooseUpload(slotId){setPhotoSlot(slotId);setTimeout(()=>fileRef.current?.click(),0);}
  function chooseSupplierMode(mode){
    setSupplierMode(mode);setSupplierErr("");
    if(mode==="registered")setForm(p=>({...p,supplier:""}));
    if(mode==="manual")setForm(p=>({...p,supplierId:""}));
    if(mode==="unknown")setForm(p=>({...p,supplierId:"",supplier:"Unknown supplier"}));
  }
  async function addQuickSupplier(){
    const name=quickSupplier.trim();
    if(!name){setSupplierErr("Enter a supplier name.");return;}
    setSupplierBusy(true);setSupplierErr("");
    try {
      const s=await DB.createSupplier({name,contact:"",phone:"",location:"",notes:"Created during scan",factoryId:fac?.id});
      setSuppliers(prev=>[s,...prev]);
      setForm(p=>({...p,supplierId:s.id,supplier:""}));
      setSupplierMode("registered");
      setQuickSupplier("");
    } catch(e) {
      setSupplierErr(e.message||"Could not add supplier.");
    }
    setSupplierBusy(false);
  }

  async function openCamera(slotId=photoSlot){
    setPhotoSlot(slotId);
    setCameraError("");setCameraOpen(true);
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
      setCameraStream(stream);
      setTimeout(()=>{if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play();}},100);
    } catch(e){setCameraError("Camera unavailable. Use upload instead.");setCameraOpen(false);}
  }
  function stopCamera(){if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());setCameraStream(null);}setCameraOpen(false);}
  function capturePhoto(){
    if(!videoRef.current||!canvasRef.current)return;
    const v=videoRef.current;const c=canvasRef.current;
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext("2d").drawImage(v,0,0);
    setEvidencePhoto(photoSlot,c.toDataURL("image/jpeg",0.85));
    stopCamera();
  }
  function toggleDefect(id){setForm(p=>({...p,defects:p.defects.includes(id)?p.defects.filter(d=>d!==id):[...p.defects,id]}));}
  function setMeas(k,v){setForm(p=>({...p,measurements:{...p.measurements,[k]:v}}));}
  function setTrace(k,v){setForm(p=>({...p,measurements:{...p.measurements,traceability:{...(p.measurements.traceability||{}),[k]:v}}}));}
  function setAudit(k,v){setForm(p=>({...p,measurements:{...p.measurements,audit:{...(p.measurements.audit||{}),[k]:v}}}));}

  async function gradeWithAI(){
    setLoading(true);setGrade(null);
    try {
      const trace=form.measurements.traceability||{};
      const res=await fetch("https://epistable-ai.elston55541.workers.dev/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,system:`You are Epistable, a stone slab grading expert. Grade as: Premium (â‚¹${GRADES[0].price}/sqft), Standard (â‚¹${GRADES[1].price}/sqft), Commercial (â‚¹${GRADES[2].price}/sqft), or Rejected. Return ONLY JSON: {"grade":"Premium|Standard|Commercial|Rejected","reason":"1-2 sentences","pricePerSqFt":number,"exportReady":boolean,"tips":"1 tip"}`,messages:[{role:"user",content:`Stone: ${STONES.find(s=>s.id===form.stone)?.label||form.stone}\nSupplier: ${supplierName()||"Unknown"}\nSource: ${trace.quarrySource||"Not recorded"}, Batch: ${trace.batchNo||"Not recorded"}, Block: ${trace.blockNo||"Not recorded"}, Line: ${trace.productionLine||"Not recorded"}\nThickness=${form.measurements.thickness}mm, Size=${form.measurements.length}Ã—${form.measurements.width}cm, Polish=${form.measurements.polish}/5\nDefects: ${form.defects.join(", ")||"None"}\nNotes: ${form.notes||"None"}`}]})});
      const data=await res.json();
      let text=data.content?.[0]?.text||"{}";text=text.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(text);
      setGrade(parsed);setAiGrade(parsed.grade||"");
    } catch(e){const fallback={grade:"Standard",reason:"AI unavailable. Default grade assigned.",pricePerSqFt:480,exportReady:false,tips:"Check connection."};setGrade(fallback);setAiGrade(fallback.grade);}
    setLoading(false);
  }

  async function save(){
    if(!grade||saving)return;
    setSaving(true);setSaveError("");
    try {
      const capturedSupplier=supplierName();
      const measurementsWithReview={...form.measurements,aiReview:{suggestedGrade:aiGrade||grade.grade,finalGrade:grade.grade,overrideReason:overrideReason.trim(),reviewedAt:Date.now()}};
      const insp={id:genId("SLB"),userId:user.id,factoryId:user.factory_id,factoryName:user.factory_name||fac?.name,inspector:user.name,stone:STONES.find(s=>s.id===form.stone)?.label||form.stone,supplier:capturedSupplier,supplierId:supplierMode==="registered"?form.supplierId||null:null,grade:grade.grade,reason:grade.reason,pricePerSqFt:grade.pricePerSqFt,exportReady:grade.exportReady||form.exportReady,measurements:measurementsWithReview,defects:form.defects,notes:form.notes,photo:photoEvidence[0]?.src||null,photos:photoEvidence,ts:Date.now(),date:fmtD(Date.now()),time:fmtT(Date.now())};
      await DB.saveInsp(insp);
      setSavedInsp(insp);
      setSaved(true);
    } catch(e) {
      setSaveError(e.message||"Could not save this slab. Your entries are still on screen, so you can retry.");
    } finally {
      setSaving(false);
    }
  }

  if(saved){
    const certificateUrl=savedInsp?`${window.location.origin}/slab/${encodeURIComponent(savedInsp.id)}`:"";
    async function copyCertificateLink(){
      if(!certificateUrl)return;
      try{
        await navigator.clipboard.writeText(certificateUrl);
        setLinkCopied(true);
        setTimeout(()=>setLinkCopied(false),1400);
      }catch(e){
        window.prompt("Copy certificate link",certificateUrl);
      }
    }
    function resetScan(){
      setStep(0);setForm({stone:"makrana",supplierId:"",supplier:"",measurements:defaultMeasurements(),defects:[],exportReady:false,notes:""});setSupplierMode("registered");setQuickSupplier("");setSupplierErr("");setGrade(null);setAiGrade("");setOverrideReason("");setSaved(false);setSavedInsp(null);setPhotos({});setPhotoSlot("front");setSaveError("");setLinkCopied(false);
    }
    return(
      <div style={{padding:"24px 0"}}>
        {qrSlab&&<SlabQRModal slab={qrSlab} onClose={()=>setQrSlab(null)}/>}
        <Card style={{padding:24,textAlign:"center",borderColor:C.greenBorder,background:C.greenBg,marginBottom:18}}>
          <div style={{width:58,height:58,borderRadius:"50%",background:C.green,color:C.white,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Icon name="check" size={30} color={C.white}/></div>
          <div style={{fontSize:22,fontWeight:700,color:C.green,marginBottom:6}}>Buyer-ready certificate created</div>
          <div style={{fontSize:13,lineHeight:1.65,color:C.textMid,maxWidth:460,margin:"0 auto 16px"}}>This scan is now a QR-backed slab record with grade, photos, measurements, traceability, and audit evidence.</div>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:C.white,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:"10px 14px",marginBottom:16}}>
            <span style={{fontSize:12,fontFamily:"monospace",color:C.textDim}}>{savedInsp?.id}</span>
            <Pill tone="success">{grade?.grade}</Pill>
          </div>
          <div style={{fontSize:30,fontWeight:700,color:C.green,marginBottom:4}}>{fmtMoney(grade?.pricePerSqFt)}<span style={{fontSize:14,fontWeight:500,color:C.textDim}}> / sq ft</span></div>
          <div style={{fontSize:13,lineHeight:1.65,color:C.textMid}}>{grade?.reason}</div>
        </Card>
        <Card style={{padding:20,marginBottom:18}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>Share this proof now</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14}}>
            <Btn onClick={()=>savedInsp&&setQrSlab(savedInsp)}><Icon name="qr" size={15}/> Show QR</Btn>
            <Btn variant="secondary" onClick={copyCertificateLink}>{linkCopied?"Copied":"Copy Link"}</Btn>
            <Btn variant="secondary" onClick={()=>certificateUrl&&window.open(certificateUrl,"_blank","noopener,noreferrer")}>Open Certificate</Btn>
            <Btn variant="ghost" onClick={onSaved}>View History</Btn>
          </div>
        </Card>
        <SetupChecklist title="What to do next" subtitle="Keep training simple: repeat this workflow for a few slabs before exploring reports." items={[
          {label:"Share the QR with a buyer",detail:"Use Show QR or Copy Link while the slab is fresh.",done:false,onClick:()=>savedInsp&&setQrSlab(savedInsp)},
          {label:"Scan four more slabs",detail:"Five records are enough to show trends and a stronger demo.",done:false,onClick:resetScan},
          {label:"Review certificate quality",detail:"Open History to compare evidence completeness across slabs.",done:false,onClick:onSaved},
        ]}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:18}}>
          <Btn variant="secondary" onClick={resetScan}>Scan Another</Btn>
          <Btn onClick={onSaved}>Done</Btn>
        </div>
      </div>
    );
  }

  const steps=["Stone","Measurements","Defects","Grade"];
  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onload=ev=>setEvidencePhoto(photoSlot,ev.target.result);r.readAsDataURL(f);}e.target.value="";}} style={{display:"none"}}/>
      <canvas ref={canvasRef} style={{display:"none"}}/>
      {cameraOpen&&<div style={{position:"fixed",inset:0,background:"#000",zIndex:500,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <button onClick={stopCamera} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:"#fff",padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>âœ• Cancel</button>
          <div style={{color:"#fff",fontSize:13,fontWeight:600}}>{PHOTO_SLOTS.find(s=>s.id===photoSlot)?.label}</div>
        </div>
        {cameraError?<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24,color:"#fff"}}>{cameraError}</div>:
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
          <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>}
        <div style={{padding:"20px",display:"flex",justifyContent:"center",flexShrink:0}}>
          <button onClick={capturePhoto} style={{width:72,height:72,borderRadius:"50%",background:"#fff",border:"4px solid rgba(255,255,255,0.4)",cursor:"pointer",fontSize:28,WebkitTapHighlightColor:"transparent"}}><Icon name="camera" size={28} color={C.primary}/></button>
        </div>
      </div>}
      <div style={{display:"flex",gap:4,marginBottom:20}}>
        {steps.map((s,i)=>(
          <div key={s} style={{flex:1,textAlign:"center"}}><div style={{height:4,borderRadius:2,background:i<=step?C.primary:C.border,marginBottom:4}}/><div style={{fontSize:12,color:i===step?C.primary:C.textDim,fontWeight:i===step?700:400}}>{s}</div></div>
        ))}
      </div>
      {step===0&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{fontSize:16,fontWeight:700}}>Stone Type</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {STONES.map(s=>(
            <button key={s.id} onClick={()=>setForm(p=>({...p,stone:s.id}))} style={{padding:"12px",background:form.stone===s.id?C.primaryBg:C.white,border:`2px solid ${form.stone===s.id?C.primary:C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left",fontFamily:FONT_STACK,WebkitTapHighlightColor:"transparent"}}>
              <div style={{fontSize:13,fontWeight:600,color:form.stone===s.id?C.primary:C.text}}>{s.label}</div>
            </button>
          ))}
        </div>
        <Card style={{padding:20,borderColor:supplierReady?C.greenBorder:C.amberBorder,background:supplierReady?C.white:C.amberBg}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:14}}>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>Supplier Source</div>
              <div style={{fontSize:12,color:C.textDim,marginTop:2}}>This powers supplier scorecards and purchasing decisions.</div>
            </div>
            <span style={{fontSize:12,fontWeight:600,color:supplierReady?C.green:C.amber}}>{supplierReady?"Captured":"Required"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16}}>
            {[["registered","Registered"],["manual","Typed"],["unknown","Unknown"]].map(([mode,label])=>(
              <button key={mode} onClick={()=>chooseSupplierMode(mode)} style={{padding:"9px 6px",background:supplierMode===mode?C.primary:C.white,border:`1px solid ${supplierMode===mode?C.primary:C.border}`,borderRadius:8,color:supplierMode===mode?C.white:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>{label}</button>
            ))}
          </div>
          {supplierMode==="registered"&&<>
            {suppliers.length>0?<Sel label="Select Supplier" value={form.supplierId} onChange={v=>setForm(p=>({...p,supplierId:v}))} options={[{value:"",label:"Select supplier..."},...suppliers.map(s=>({value:s.id,label:s.name}))]}/>
            :<div style={{fontSize:12,color:C.textMid,marginBottom:14}}>No registered suppliers yet. Add one below or use Typed/Unknown.</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:14,marginTop:14}}>
              <input value={quickSupplier} onChange={e=>setQuickSupplier(e.target.value)} placeholder="Quick add supplier" style={{width:"100%",padding:"14px 16px",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:FONT_STACK}}/>
              <Btn size="sm" variant="secondary" onClick={addQuickSupplier} disabled={supplierBusy}>{supplierBusy?"Adding...":"+ Add"}</Btn>
            </div>
          </>}
          {supplierMode==="manual"&&<Inp label="Supplier Name" value={form.supplier} onChange={v=>setForm(p=>({...p,supplier:v}))} placeholder="e.g. Shree Marble Exports" hint="This will appear under unregistered suppliers until added as a supplier record."/>}
          {supplierMode==="unknown"&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 16px",fontSize:12,color:C.textMid,fontWeight:600}}>Use only when the slab source is genuinely unavailable.</div>}
          {supplierErr&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:C.red,fontWeight:600,marginTop:14}}>{supplierErr}</div>}
        </Card>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <label style={{display:"block",fontSize:13,fontWeight:600}}>Photo Evidence</label>
            <span style={{fontSize:12,fontWeight:600,color:photoReady?C.green:C.amber}}>{completePhotoSlots}/{requiredPhotoSlots.length} required</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            {PHOTO_SLOTS.slice(0,3).map(slot=>(
              <div key={slot.id} style={{border:`1px solid ${photos[slot.id]?C.greenBorder:C.border}`,borderRadius:12,overflow:"hidden",background:photos[slot.id]?C.greenBg:C.white}}>
                <div style={{aspectRatio:"4/3",background:C.surface,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {photos[slot.id]?<img src={photos[slot.id].src} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<div style={{fontSize:12,color:C.textDim,fontWeight:600,textAlign:"center",padding:8}}>{slot.hint}</div>}
                  {photos[slot.id]&&<button onClick={()=>removeEvidencePhoto(slot.id)} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.65)",border:"none",borderRadius:"50%",color:"#fff",width:22,height:22,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>Ã—</button>}
                </div>
                <div style={{padding:9}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:6}}>{photos[slot.id]?"âœ“ ":""}{slot.label}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    <button onClick={()=>openCamera(slot.id)} style={{padding:"7px",background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:8,color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Camera</button>
                    <button onClick={()=>chooseUpload(slot.id)} style={{padding:"7px",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,color:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Upload</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Btn full onClick={()=>setStep(1)} disabled={!photoReady||!supplierReady}>Next â†’ Measurements</Btn>
      </div>}
      {step===1&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{fontSize:16,fontWeight:700}}>Measurements</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <Inp label="Thickness (mm)" value={form.measurements.thickness} onChange={v=>setMeas("thickness",v)} placeholder="20"/>
          <Inp label="Length (cm)" value={form.measurements.length} onChange={v=>setMeas("length",v)} placeholder="120"/>
          <Inp label="Width (cm)" value={form.measurements.width} onChange={v=>setMeas("width",v)} placeholder="60"/>
        </div>
        <div>
          <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:8}}>Polish Level: {form.measurements.polish}/5</label>
          <input type="range" min={1} max={5} value={form.measurements.polish} onChange={e=>setMeas("polish",Number(e.target.value))} style={{width:"100%"}}/>
        </div>
        <Sel label="Sound Test" value={form.measurements.soundTest} onChange={v=>setMeas("soundTest",v)} options={[{value:"clear",label:"Clear"},{value:"dull",label:"Dull"},{value:"hollow",label:"Hollow"}]}/>
        <Sel label="Edge Condition" value={form.measurements.edgeCondition} onChange={v=>setMeas("edgeCondition",v)} options={[{value:"good",label:"Good"},{value:"minor",label:"Minor chips"},{value:"damaged",label:"Damaged"}]}/>
        <Sel label="Surface Finish" value={form.measurements.surfaceFinish} onChange={v=>setMeas("surfaceFinish",v)} options={[{value:"polished",label:"Polished"},{value:"honed",label:"Honed"},{value:"brushed",label:"Brushed"},{value:"sandblasted",label:"Sandblasted"}]}/>
        <Card style={{padding:20}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Traceability</div>
          <div style={{fontSize:12,color:C.textDim,lineHeight:1.65,marginBottom:16}}>Optional now, but valuable for export buyers, audits, and batch-level quality history.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Inp label="Quarry / Source" value={form.measurements.traceability?.quarrySource||""} onChange={v=>setTrace("quarrySource",v)} placeholder="Makrana Quarry A"/>
            <Inp label="Batch No." value={form.measurements.traceability?.batchNo||""} onChange={v=>setTrace("batchNo",v)} placeholder="B-204"/>
            <Inp label="Block No." value={form.measurements.traceability?.blockNo||""} onChange={v=>setTrace("blockNo",v)} placeholder="BLK-17"/>
            <Inp label="Production Line" value={form.measurements.traceability?.productionLine||""} onChange={v=>setTrace("productionLine",v)} placeholder="Line 2"/>
            <Inp label="Operator" value={form.measurements.traceability?.operator||""} onChange={v=>setTrace("operator",v)} placeholder="Operator name"/>
            <Inp label="Container / Shipment" value={form.measurements.traceability?.containerNo||""} onChange={v=>setTrace("containerNo",v)} placeholder="CONT-123"/>
          </div>
          <div style={{marginTop:14}}><Inp label="Customer / Order Ref" value={form.measurements.traceability?.customerRef||""} onChange={v=>setTrace("customerRef",v)} placeholder="PO-1009"/></div>
        </Card>
        <Card style={{padding:20}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Audit Readiness</div>
          <div style={{fontSize:12,color:C.textDim,lineHeight:1.65,marginBottom:16}}>Capture simple proof points that reduce audit and buyer follow-up later.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <button onClick={()=>setAudit("calibrationChecked",!form.measurements.audit?.calibrationChecked)} style={{padding:"10px",background:form.measurements.audit?.calibrationChecked?C.greenBg:C.white,border:`1px solid ${form.measurements.audit?.calibrationChecked?C.greenBorder:C.border}`,borderRadius:9,color:form.measurements.audit?.calibrationChecked?C.green:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>{form.measurements.audit?.calibrationChecked?"Calibration checked":"Mark calibration"}</button>
            <button onClick={()=>setAudit("checklistComplete",!form.measurements.audit?.checklistComplete)} style={{padding:"10px",background:form.measurements.audit?.checklistComplete?C.greenBg:C.white,border:`1px solid ${form.measurements.audit?.checklistComplete?C.greenBorder:C.border}`,borderRadius:9,color:form.measurements.audit?.checklistComplete?C.green:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>{form.measurements.audit?.checklistComplete?"Checklist complete":"Mark checklist"}</button>
          </div>
        </Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><Btn variant="secondary" onClick={()=>setStep(0)}>â† Back</Btn><Btn onClick={()=>setStep(2)}>Next â†’ Defects</Btn></div>
      </div>}
      {step===2&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{fontSize:16,fontWeight:700}}>Defects Found</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {DEFECTS.map(d=>{const sel=form.defects.includes(d.id);return(
            <button key={d.id} onClick={()=>toggleDefect(d.id)} style={{padding:"12px",background:sel?"#fff3e0":C.white,border:`2px solid ${sel?d.color:C.border}`,borderRadius:10,cursor:"pointer",textAlign:"left",fontFamily:FONT_STACK}}>
              <div style={{fontSize:13,fontWeight:600,color:sel?d.color:C.text}}>{sel?"âœ“ ":""}{d.label}</div>
            </button>
          );})}
        </div>
        <button onClick={()=>setForm(p=>({...p,exportReady:!p.exportReady}))} style={{padding:"10px 18px",background:form.exportReady?C.greenBg:C.white,border:`2px solid ${form.exportReady?C.green:C.border}`,borderRadius:10,cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:FONT_STACK,color:form.exportReady?C.green:C.textMid,alignSelf:"flex-start"}}>{form.exportReady?"Export Ready":"Domestic Only"}</button>
        {form.defects.length>0&&<Card style={{padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:14}}>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Defect close-up required</div>
              <div style={{fontSize:12,color:C.textDim,marginTop:2}}>Capture the most visible defect so buyers can verify the grade.</div>
            </div>
            <span style={{fontSize:12,fontWeight:600,color:photos.defect?C.green:C.red}}>{photos.defect?"Complete":"Missing"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:14,alignItems:"stretch"}}>
            <div style={{aspectRatio:"1",background:C.surface,border:`1px solid ${photos.defect?C.greenBorder:C.border}`,borderRadius:10,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {photos.defect?<img src={photos.defect.src} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<span style={{fontSize:12,color:C.textDim,fontWeight:600,textAlign:"center",padding:8}}>Defect photo</span>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14,justifyContent:"center"}}>
              <button onClick={()=>openCamera("defect")} style={{padding:"10px",background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:8,color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Camera</button>
              <button onClick={()=>chooseUpload("defect")} style={{padding:"10px",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,color:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Upload</button>
              {photos.defect&&<button onClick={()=>removeEvidencePhoto("defect")} style={{padding:"8px",background:"transparent",border:"none",color:C.red,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Remove</button>}
            </div>
          </div>
        </Card>}
        {form.defects.length>0&&<Card style={{padding:20,borderColor:C.amberBorder,background:C.amberBg}}>
          <div style={{fontSize:14,fontWeight:700,color:C.amber,marginBottom:4}}>Corrective Action</div>
          <div style={{fontSize:12,color:C.textMid,lineHeight:1.65,marginBottom:16}}>Optional CAPA notes turn this scan into audit evidence, not just a defect record.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Inp label="Root Cause" value={form.measurements.audit?.rootCause||""} onChange={v=>setAudit("rootCause",v)} placeholder="Handling damage"/>
            <Inp label="Action Owner" value={form.measurements.audit?.actionOwner||""} onChange={v=>setAudit("actionOwner",v)} placeholder="QC manager"/>
          </div>
          <div style={{marginTop:14}}><Inp label="Corrective Action" value={form.measurements.audit?.correctiveAction||""} onChange={v=>setAudit("correctiveAction",v)} placeholder="Re-polish edge and inspect next batch"/></div>
          <div style={{marginTop:14}}><Inp label="Due Date" value={form.measurements.audit?.actionDue||""} onChange={v=>setAudit("actionDue",v)} placeholder="2026-05-30"/></div>
        </Card>}
        <div><label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} style={{width:"100%",padding:"12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,resize:"none",outline:"none",boxSizing:"border-box"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><Btn variant="secondary" onClick={()=>setStep(1)}>â† Back</Btn><Btn disabled={!photoReady} onClick={()=>{setStep(3);gradeWithAI();}}><Icon name="bot" size={15}/> Grade with AI</Btn></div>
      </div>}
      {step===3&&<div>
        <div style={{fontSize:16,fontWeight:700,marginBottom:18}}>AI Grade Result</div>
        {loading?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{marginBottom:16,display:"flex",justifyContent:"center"}}><Icon name="bot" size={48} color={C.primary}/></div><div style={{fontSize:16,fontWeight:700}}>Analysing slabâ€¦</div></div>
        :grade?(()=>{const g=gradeConf(grade.grade);return(
          <div>
            <div style={{background:g.bg,border:`2px solid ${g.border}`,borderRadius:14,padding:"24px",textAlign:"center",marginBottom:18}}>
              <div style={{fontSize:52,marginBottom:8}}>{g.emoji}</div>
              <div style={{fontSize:26,fontWeight:700,color:g.color,marginBottom:4}}>{grade.grade}</div>
              <div style={{fontSize:32,fontWeight:700,color:C.green,marginBottom:8}}>{fmtMoney(grade.pricePerSqFt)}<span style={{fontSize:16,fontWeight:400,color:C.textDim}}>/sqft</span></div>
            </div>
            <Card style={{padding:20,marginBottom:16}}>
              <div style={{fontSize:13,color:C.text,lineHeight:1.7,marginBottom:8}}>{grade.reason}</div>
              {grade.tips&&<div style={{background:C.primaryBg,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.primary}}><Icon name="alert" size={13}/> {grade.tips}</div>}
            </Card>
            <Card style={{padding:20,marginBottom:16,borderColor:C.amberBorder,background:C.amberBg}}>
              <div style={{fontSize:13,fontWeight:600,color:C.amber,marginBottom:5}}>AI-assisted, inspector-confirmed</div>
              <div style={{fontSize:12,lineHeight:1.65,color:C.textMid}}>Review the evidence photos, measurements, defects, and price before saving. If the AI grade does not match the slab, override it below so the certificate reflects the human inspection.</div>
              {aiGrade&&<div style={{fontSize:12,color:C.textMid,fontWeight:600,marginTop:8}}>AI suggested: {aiGrade} Â· Final: {grade.grade}</div>}
            </Card>
            {aiGrade&&grade.grade!==aiGrade&&<Card style={{padding:20,marginBottom:16,borderColor:C.primaryBorder,background:C.primaryBg}}>
              <div style={{fontSize:13,fontWeight:600,color:C.primary,marginBottom:6}}>Override reason</div>
              <textarea value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} rows={2} placeholder="Why did the inspector change the AI grade?" style={{width:"100%",padding:"14px 16px",background:C.white,border:`1px solid ${C.primaryBorder}`,borderRadius:9,fontSize:13,lineHeight:1.55,outline:"none",resize:"none",boxSizing:"border-box",fontFamily:FONT_STACK}}/>
              <div style={{fontSize:12,color:C.textMid,lineHeight:1.65,marginTop:6}}>This helps build a future training dataset for AI grading confidence and human overrides.</div>
            </Card>}
            <Card style={{padding:20,marginBottom:16,borderColor:evidenceScore>=70?C.greenBorder:C.amberBorder,background:evidenceScore>=70?C.greenBg:C.amberBg}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:14}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:evidenceScore>=70?C.green:C.amber}}>Evidence completeness</div>
                  <div style={{fontSize:12,color:C.textMid,lineHeight:1.65,marginTop:2}}>Stronger evidence improves buyer confidence and audit readiness.</div>
                </div>
                <div style={{fontSize:22,fontWeight:700,color:evidenceScore>=70?C.green:C.amber,lineHeight:1}}>{evidenceScore}%</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {evidenceChecklist.map(item=>(
                  <div key={item.label} style={{background:C.white,border:`1px solid ${item.done?C.greenBorder:C.amberBorder}`,borderRadius:9,padding:"8px 9px"}}>
                    <div style={{fontSize:12,fontWeight:600,color:item.done?C.green:C.amber,marginBottom:3}}>{item.done?"Complete":"Review"} - {item.label}</div>
                    <div style={{fontSize:12,color:C.textDim,lineHeight:1.55}}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </Card>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:14,marginBottom:18}}>
              {GRADES.map(g=>(
                <button key={g.id} onClick={()=>{setGrade({...grade,grade:g.id,pricePerSqFt:g.price});if(g.id===aiGrade)setOverrideReason("");}} style={{padding:"8px 4px",background:grade.grade===g.id?g.bg:C.white,border:`2px solid ${grade.grade===g.id?g.border:C.border}`,borderRadius:10,cursor:"pointer",fontFamily:FONT_STACK,textAlign:"center"}}>
                  <div style={{fontSize:14,marginBottom:3}}>{g.emoji}</div><div style={{fontSize:12,fontWeight:600,color:grade.grade===g.id?g.color:C.textDim}}>{g.id}</div>
                </button>
              ))}
            </div>
            <ErrorNotice title="Could not save slab" message={saveError} onRetry={save}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><Btn variant="secondary" onClick={()=>{setStep(2);setGrade(null);setAiGrade("");setOverrideReason("");setSaveError("");}}>â† Redo</Btn><Btn variant="green" onClick={save} disabled={saving}>{saving?"Saving...":"âœ“ Save Slab"}</Btn></div>
          </div>
        );})():null}
      </div>}
    </div>
  );
}

function FactorySlabDetailModal({slab,onClose,onQr,onStatus}) {
  const [copied,setCopied]=useState(false);
  const [statusBusy,setStatusBusy]=useState(false);
  const g=gradeConf(slab.grade);
  const measurements=slab.measurements||{};
  const traceability=measurements.traceability||{};
  const audit=measurements.audit||{};
  const aiReview=measurements.aiReview||{};
  const defects=Array.isArray(slab.defects)?slab.defects:[];
  const photos=(Array.isArray(slab.photos)?slab.photos:[]).map((p,idx)=>typeof p==="string"?{src:p,label:idx===0?"Primary photo":`Evidence ${idx+1}`}:p).filter(p=>p?.src);
  const certificateUrl=`${window.location.origin}/slab/${encodeURIComponent(slab.id)}`;
  async function copyLink(){
    try {
      await navigator.clipboard.writeText(certificateUrl);
      setCopied(true);
      setTimeout(()=>setCopied(false),1500);
    } catch(e) {
      window.prompt("Copy certificate link",certificateUrl);
    }
  }
  async function changeStatus(status){
    if(status===(slab.inventoryStatus||"available")||statusBusy)return;
    setStatusBusy(true);
    await onStatus?.(slab,status);
    setStatusBusy(false);
  }
  return (
    <Modal title="Slab Details" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:g.bg,border:`1px solid ${g.border}`,borderRadius:12,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:14}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12,fontFamily:"monospace",color:C.textDim,marginBottom:4}}>{slab.id}</div>
              <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:3}}>{slab.stone}</div>
              <div style={{fontSize:12,color:C.textMid}}>{slab.date} Â· {slab.time}</div>
            </div>
            <span style={{fontSize:12,fontWeight:600,color:g.color,background:C.white,border:`1px solid ${g.border}`,borderRadius:20,padding:"5px 10px",flexShrink:0}}>{slab.grade}</span>
          </div>
          <div style={{fontSize:24,fontWeight:700,color:C.green}}>{fmtMoney(slab.pricePerSqFt)}<span style={{fontSize:12,fontWeight:600,color:C.textDim}}> / sq ft</span></div>
        </div>
        <Card style={{padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:14}}>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>Inventory Status</div>
              <div style={{fontSize:12,color:C.textDim,marginTop:2}}>Controls whether buyers should treat this slab as purchasable.</div>
            </div>
            <InventoryPill status={slab.inventoryStatus}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            {Object.entries(INV_STATUS).map(([id,c])=>(
              <button key={id} disabled={statusBusy} onClick={()=>changeStatus(id)} style={{padding:"9px 6px",background:(slab.inventoryStatus||"available")===id?c.bg:C.white,border:`1px solid ${(slab.inventoryStatus||"available")===id?c.border:C.border}`,borderRadius:8,color:(slab.inventoryStatus||"available")===id?c.color:C.textMid,fontSize:12,fontWeight:600,cursor:statusBusy?"not-allowed":"pointer",fontFamily:FONT_STACK}}>{c.label}</button>
            ))}
          </div>
        </Card>
        {(slab.photo||photos.length>0)&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {[slab.photo?{src:slab.photo,label:"Primary"}:null,...photos].filter(Boolean).slice(0,6).map((p,idx)=>(
            <div key={idx} style={{position:"relative",borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`,aspectRatio:"1"}}>
              <img src={p.src} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              {p.label&&<div style={{position:"absolute",left:4,right:4,bottom:4,background:"rgba(0,0,0,0.62)",borderRadius:5,padding:"3px 4px",fontSize:12,fontWeight:600,color:"#fff",textAlign:"center"}}>{p.label}</div>}
            </div>
          ))}
        </div>}
        <Card style={{padding:20}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Inspection</div>
          {[["Supplier",slab.supplier],["Inspector",slab.inspector],["Thickness",measurements.thickness?`${measurements.thickness} mm`:""],["Size",measurements.length&&measurements.width?`${measurements.length} x ${measurements.width} cm`:""],["Sound",measurements.soundTest],["Edge",measurements.edgeCondition],["Finish",measurements.surfaceFinish],["Export Ready",slab.exportReady?"Yes":"No"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",gap:14,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:12,color:C.textDim,fontWeight:600}}>{l}</span><span style={{fontSize:12,color:C.text,fontWeight:600,textAlign:"right"}}>{v||"Not recorded"}</span></div>
          ))}
        </Card>
        {aiReview.suggestedGrade&&<Card style={{padding:20,borderColor:aiReview.suggestedGrade===aiReview.finalGrade?C.greenBorder:C.amberBorder,background:aiReview.suggestedGrade===aiReview.finalGrade?C.greenBg:C.amberBg}}>
          <div style={{fontSize:14,fontWeight:700,color:aiReview.suggestedGrade===aiReview.finalGrade?C.green:C.amber,marginBottom:8}}>AI Review</div>
          {[["AI Suggested",aiReview.suggestedGrade],["Final Grade",aiReview.finalGrade],["Override Reason",aiReview.overrideReason],["Reviewed",aiReview.reviewedAt?`${fmtD(aiReview.reviewedAt)} ${fmtT(aiReview.reviewedAt)}`:"Not recorded"]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",gap:14,padding:"7px 0",borderBottom:`1px solid ${aiReview.suggestedGrade===aiReview.finalGrade?C.greenBorder:C.amberBorder}`}}><span style={{fontSize:12,color:C.textDim,fontWeight:600}}>{l}</span><span style={{fontSize:12,color:C.text,fontWeight:600,textAlign:"right"}}>{v||"Not recorded"}</span></div>
          ))}
        </Card>}
        <Card style={{padding:20}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Traceability & Audit</div>
          {[["Quarry / Source",traceability.quarrySource],["Batch",traceability.batchNo],["Block",traceability.blockNo],["Line",traceability.productionLine],["Operator",traceability.operator],["Container",traceability.containerNo],["Customer Ref",traceability.customerRef],["Calibration",audit.calibrationChecked?"Checked":""],["Checklist",audit.checklistComplete?"Complete":""],["Root Cause",audit.rootCause],["Corrective Action",audit.correctiveAction],["Owner",audit.actionOwner],["Due",audit.actionDue]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",gap:14,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:12,color:C.textDim,fontWeight:600}}>{l}</span><span style={{fontSize:12,color:C.text,fontWeight:600,textAlign:"right"}}>{v||"Not recorded"}</span></div>
          ))}
        </Card>
        <Card style={{padding:20}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Grade Reason</div>
          <div style={{fontSize:13,lineHeight:1.7,color:C.textMid}}>{slab.reason||"No reason recorded."}</div>
          {defects.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:14}}>{defects.map(d=><span key={d} style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:20,padding:"4px 9px",fontSize:12,fontWeight:600,color:C.amber,textTransform:"capitalize"}}>{d}</span>)}</div>}
          {slab.notes&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"13px 14px",fontSize:12,color:C.textMid,lineHeight:1.55,marginTop:14}}>{slab.notes}</div>}
        </Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Btn variant="secondary" onClick={copyLink}>{copied?"Copied":"Copy Link"}</Btn>
          <Btn variant="secondary" onClick={onQr}>Share QR</Btn>
          <Btn style={{gridColumn:"1 / -1"}} onClick={()=>window.open(certificateUrl,"_blank","noopener,noreferrer")}>View Certificate</Btn>
        </div>
      </div>
    </Modal>
  );
}

function FacHistory({insps}) {
  const [search,setSearch]=useState("");const [filterG,setFilterG]=useState("All");const [evidenceFilter,setEvidenceFilter]=useState("All");const [qrSlab,setQrSlab]=useState(null);const [detailSlab,setDetailSlab]=useState(null);
  const [statusOverrides,setStatusOverrides]=useState({});
  const withStatus=useMemo(()=>insps.map(i=>({...i,inventoryStatus:statusOverrides[i.id]||i.inventoryStatus||"available"})),[insps,statusOverrides]);
  const traceKeys=["quarrySource","batchNo","blockNo","productionLine","operator","containerNo","customerRef"];
  const hasTrace=i=>traceKeys.some(k=>!!i.measurements?.traceability?.[k]);
  const isAuditReady=i=>!!(i.measurements?.audit?.calibrationChecked&&i.measurements?.audit?.checklistComplete);
  const needsCapa=i=>(i.defects||[]).length>0&&!i.measurements?.audit?.correctiveAction;
  const evidenceScore=i=>{
    const photos=Array.isArray(i.photos)?i.photos.filter(Boolean).length:(i.photo?1:0);
    const traceCount=traceKeys.filter(k=>!!i.measurements?.traceability?.[k]).length;
    const auditCount=["calibrationChecked","checklistComplete","rootCause","correctiveAction","actionOwner","actionDue"].filter(k=>!!i.measurements?.audit?.[k]).length;
    const capaOk=!needsCapa(i);
    return Math.round(((photos?100:0)+(traceCount/traceKeys.length*100)+(auditCount/6*100)+(capaOk?100:0))/4);
  };
  const missingTraceCount=withStatus.filter(i=>!hasTrace(i)).length;
  const auditReadyCount=withStatus.filter(isAuditReady).length;
  const capaNeededCount=withStatus.filter(needsCapa).length;
  const aiReviewedCount=withStatus.filter(i=>i.measurements?.aiReview?.suggestedGrade).length;
  const aiOverrideCount=withStatus.filter(i=>{
    const ai=i.measurements?.aiReview;
    return ai?.suggestedGrade&&ai?.finalGrade&&ai.suggestedGrade!==ai.finalGrade;
  }).length;
  const filtered=useMemo(()=>{
    const q=search.toLowerCase();
    return withStatus.filter(i=>(filterG==="All"||i.grade===filterG)&&
      (evidenceFilter==="All"||(evidenceFilter==="Trace"&&hasTrace(i))||(evidenceFilter==="Missing Trace"&&!hasTrace(i))||(evidenceFilter==="Audit Ready"&&isAuditReady(i))||(evidenceFilter==="CAPA Needed"&&needsCapa(i))||(evidenceFilter==="AI Reviewed"&&i.measurements?.aiReview?.suggestedGrade)||(evidenceFilter==="AI Overrides"&&i.measurements?.aiReview?.suggestedGrade&&i.measurements?.aiReview?.finalGrade&&i.measurements.aiReview.suggestedGrade!==i.measurements.aiReview.finalGrade)||(evidenceFilter==="Strong Evidence"&&evidenceScore(i)>=70)||(evidenceFilter==="Weak Evidence"&&evidenceScore(i)<70))&&
      (!q||i.stone?.toLowerCase().includes(q)||i.id?.toLowerCase().includes(q)||i.measurements?.traceability?.batchNo?.toLowerCase().includes(q)||i.measurements?.traceability?.quarrySource?.toLowerCase().includes(q)));
  },[withStatus,filterG,evidenceFilter,search]);
  async function updateStatus(slab,status){
    await DB.updInspStatus(slab.id,status);
    setStatusOverrides(p=>({...p,[slab.id]:status}));
    setDetailSlab(p=>p?.id===slab.id?{...p,inventoryStatus:status}:p);
  }
  return (
    <div>
      {qrSlab&&<SlabQRModal slab={qrSlab} onClose={()=>setQrSlab(null)}/>}
      {detailSlab&&<FactorySlabDetailModal slab={detailSlab} onClose={()=>setDetailSlab(null)} onStatus={updateStatus} onQr={()=>{setQrSlab(detailSlab);setDetailSlab(null);}}/>}
      <div style={TEXT.pageTitle}>Scan History</div>
      <div style={{marginBottom:14}}><Inp value={search} onChange={setSearch} placeholder="Search stone, slab IDâ€¦" icon="search"/></div>
      <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:18}}>
        {["All",...GRADES.map(g=>g.id)].map(f=>(
          <button key={f} onClick={()=>setFilterG(f)} style={{padding:"6px 14px",background:filterG===f?C.primary:C.white,border:`1px solid ${filterG===f?C.primary:C.border}`,borderRadius:20,color:filterG===f?C.white:C.textMid,fontSize:12,fontWeight:filterG===f?700:400,cursor:"pointer",fontFamily:FONT_STACK,whiteSpace:"nowrap",flexShrink:0}}>{f}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:18}}>
        {["All","Strong Evidence","Weak Evidence","Trace","Missing Trace","Audit Ready","CAPA Needed","AI Reviewed","AI Overrides"].map(f=>(
          <button key={f} onClick={()=>setEvidenceFilter(f)} style={{padding:"6px 14px",background:evidenceFilter===f?C.primaryBg:C.white,border:`1px solid ${evidenceFilter===f?C.primaryBorder:C.border}`,borderRadius:20,color:evidenceFilter===f?C.primary:C.textMid,fontSize:12,fontWeight:evidenceFilter===f?800:500,cursor:"pointer",fontFamily:FONT_STACK,whiteSpace:"nowrap",flexShrink:0}}>{f}</button>
        ))}
      </div>
      <Card style={{padding:12,marginBottom:18}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:14}}>
          {[["Missing Trace",missingTraceCount,missingTraceCount?C.amber:C.green],["Audit Ready",auditReadyCount,C.green],["CAPA Needed",capaNeededCount,capaNeededCount?C.red:C.green],["AI Reviewed",aiReviewedCount,C.primary],["AI Overrides",aiOverrideCount,aiOverrideCount?C.amber:C.green]].map(([label,value,color])=>(
            <button key={label} onClick={()=>setEvidenceFilter(label)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:"8px 6px",textAlign:"center",cursor:"pointer",fontFamily:FONT_STACK}}>
              <div style={{fontSize:16,fontWeight:700,color,lineHeight:1}}>{value}</div>
              <div style={{fontSize:12,color:C.textDim,fontWeight:600,marginTop:4}}>{label}</div>
            </button>
          ))}
        </div>
      </Card>
      {filtered.length===0?<EmptyState title={insps.length?"No matching slabs":"No inspections yet"} body={insps.length?"Clear the filters or search another slab ID, stone, grade, batch, or source.":"Start with a scan. Each saved slab becomes a QR-backed certificate for buyers and factory records."} actionLabel={insps.length?"Clear filters":undefined} onAction={()=>{setSearch("");setFilterG("All");setEvidenceFilter("All");}}/>:
      <Card>{filtered.map((r,i)=>{const g=gradeConf(r.grade);const trace=r.measurements?.traceability||{};const ai=r.measurements?.aiReview||{};const hasAiOverride=ai.suggestedGrade&&ai.finalGrade&&ai.suggestedGrade!==ai.finalGrade;const traceMeta=[trace.batchNo&&`Batch ${trace.batchNo}`,trace.quarrySource].filter(Boolean).join(" - ");const ev=evidenceScore(r);return(
        <div key={r.id} onClick={()=>setDetailSlab(r)} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none",cursor:"pointer"}}>
          {r.photo?<div style={{width:44,height:44,borderRadius:8,overflow:"hidden",flexShrink:0}}><img src={r.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>:
          <div style={{width:44,height:44,borderRadius:8,background:g.bg,border:`1px solid ${g.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{g.emoji}</div>}
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{r.stone}</div><div style={TEXT.tinyMeta}>{traceMeta||`${r.date} - ${r.time}`}</div>{traceMeta&&<div style={{...TEXT.tinyMeta,marginTop:2}}>{r.date} - {r.time}</div>}</div>
          <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}>
            <span style={{...T.pill,color:g.color,background:g.bg,border:`1px solid ${g.border}`,padding:"3px 10px",borderRadius:20}}>{r.grade}</span>
            <span style={{fontSize:12,fontWeight:600,color:ev>=70?C.green:C.amber,background:ev>=70?C.greenBg:C.amberBg,border:`1px solid ${ev>=70?C.greenBorder:C.amberBorder}`,borderRadius:6,padding:"2px 8px"}}>Evidence {ev}%</span>
            <InventoryPill status={r.inventoryStatus}/>
            {hasAiOverride&&<span style={{fontSize:12,fontWeight:600,color:C.amber,background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:6,padding:"2px 8px"}}>AI override</span>}
            {needsCapa(r)&&<span style={{fontSize:12,fontWeight:600,color:C.red,background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:6,padding:"2px 8px"}}>CAPA</span>}
            {!hasTrace(r)&&<span style={{fontSize:12,fontWeight:600,color:C.amber,background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:6,padding:"2px 8px"}}>No trace</span>}
            <button onClick={e=>{e.stopPropagation();setQrSlab(r);}} style={{fontSize:12,fontWeight:600,color:C.primary,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontFamily:FONT_STACK}}><Icon name="qr" size={12}/> QR</button>
          </div>
        </div>
      );})}
      </Card>}
    </div>
  );
}

function FacAnalytics({insps}) {
  const [briefCopied,setBriefCopied]=useState(false);
  const [gapCopied,setGapCopied]=useState(false);
  const byG=g=>insps.filter(i=>i.grade===g).length;
  const total=insps.length;const pp=total?Math.round(byG("Premium")/total*100):0;
  const today=insps.filter(i=>Date.now()-i.ts<86400000).length;
  const week=insps.filter(i=>Date.now()-i.ts<7*86400000).length;
  const defectMap={};insps.forEach(i=>(i.defects||[]).forEach(d=>{defectMap[d]=(defectMap[d]||0)+1;}));
  const topDefects=Object.entries(defectMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const traceKeys=["quarrySource","batchNo","blockNo","productionLine","operator","containerNo","customerRef"];
  const traceFieldCount=insps.reduce((s,i)=>{const t=i.measurements?.traceability||{};return s+traceKeys.filter(k=>!!t[k]).length;},0);
  const traceCoverage=total?Math.round(traceFieldCount/(total*traceKeys.length)*100):0;
  const auditReadyCount=insps.filter(i=>i.measurements?.audit?.calibrationChecked&&i.measurements?.audit?.checklistComplete).length;
  const auditReadyPct=total?Math.round(auditReadyCount/total*100):0;
  const capaNeeded=insps.filter(i=>(i.defects||[]).length>0&&!i.measurements?.audit?.correctiveAction).length;
  const batchCount=new Set(insps.map(i=>i.measurements?.traceability?.batchNo).filter(Boolean)).size;
  const aiReviewed=insps.filter(i=>i.measurements?.aiReview?.suggestedGrade);
  const aiOverrides=aiReviewed.filter(i=>i.measurements?.aiReview?.suggestedGrade&&i.measurements?.aiReview?.suggestedGrade!==i.measurements?.aiReview?.finalGrade);
  const aiOverrideRate=aiReviewed.length?Math.round(aiOverrides.length/aiReviewed.length*100):0;
  function groupQuality(keyFn){
    const map=new Map();
    insps.forEach(i=>{
      const key=keyFn(i)||"Not recorded";
      const row=map.get(key)||{key,total:0,premium:0,rejected:0,defects:0,trace:0};
      row.total+=1;
      row.premium+=i.grade==="Premium"?1:0;
      row.rejected+=i.grade==="Rejected"?1:0;
      row.defects+=(i.defects||[]).length;
      row.trace+=traceKeys.filter(k=>!!i.measurements?.traceability?.[k]).length;
      map.set(key,row);
    });
    return [...map.values()].sort((a,b)=>b.total-a.total).slice(0,5).map(r=>({...r,premiumPct:r.total?Math.round(r.premium/r.total*100):0,rejectPct:r.total?Math.round(r.rejected/r.total*100):0,tracePct:r.total?Math.round(r.trace/(r.total*traceKeys.length)*100):0}));
  }
  const sourceQuality=groupQuality(i=>i.measurements?.traceability?.quarrySource||i.supplier);
  const stoneQuality=groupQuality(i=>i.stone);
  const batchQuality=groupQuality(i=>i.measurements?.traceability?.batchNo);
  function downloadAuditCsv(){
    const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const readinessFor=i=>{
      const traceCount=traceKeys.filter(k=>!!i.measurements?.traceability?.[k]).length;
      const auditCount=["calibrationChecked","checklistComplete","rootCause","correctiveAction","actionOwner","actionDue"].filter(k=>!!i.measurements?.audit?.[k]).length;
      const photoScore=i.photo?100:0;
      return Math.round(((traceCount/traceKeys.length)*100+(auditCount/6)*100+photoScore)/3);
    };
    const rows=[
      ["Slab ID","Certificate URL","Readiness Score","Date","Time","Stone","Grade","AI Suggested Grade","AI Final Grade","AI Override Reason","AI Reviewed At","Supplier","Source","Batch","Block","Line","Operator","Container","Customer Ref","Calibration Checked","Checklist Complete","Defects","Root Cause","Corrective Action","Action Owner","Action Due","Notes"],
      ...insps.map(i=>{
        const t=i.measurements?.traceability||{};
        const a=i.measurements?.audit||{};
        const ai=i.measurements?.aiReview||{};
        return [i.id,`${window.location.origin}/slab/${encodeURIComponent(i.id)}`,readinessFor(i),i.date,i.time,i.stone,i.grade,ai.suggestedGrade,ai.finalGrade,ai.overrideReason,ai.reviewedAt?`${fmtD(ai.reviewedAt)} ${fmtT(ai.reviewedAt)}`:"",i.supplier,t.quarrySource,t.batchNo,t.blockNo,t.productionLine,t.operator,t.containerNo,t.customerRef,a.calibrationChecked?"Yes":"No",a.checklistComplete?"Yes":"No",(i.defects||[]).join("; "),a.rootCause,a.correctiveAction,a.actionOwner,a.actionDue,i.notes];
      })
    ];
    const csv="\ufeff"+rows.map(r=>r.map(esc).join(",")).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;
    a.download=`epistable-audit-evidence-${curMon()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function downloadAiReviewCsv(){
    const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const rows=[
      ["Slab ID","Certificate URL","Stone","Supplier","Source","Batch","Date","Time","Defects","Photo Count","Photo Evidence Labels","AI Suggested Grade","Final Inspector Grade","Override Reason","Reviewed At","Thickness","Length","Width","Polish","Notes"],
      ...aiReviewed.map(i=>{
        const ai=i.measurements?.aiReview||{};
        const m=i.measurements||{};
        const t=i.measurements?.traceability||{};
        const photos=Array.isArray(i.photos)?i.photos.filter(Boolean):[];
        const photoLabels=photos.map((p,idx)=>typeof p==="string"?`Evidence ${idx+1}`:(p.label||p.slot||`Evidence ${idx+1}`)).join("; ");
        return [i.id,`${window.location.origin}/slab/${encodeURIComponent(i.id)}`,i.stone,i.supplier,t.quarrySource,t.batchNo,i.date,i.time,(i.defects||[]).join("; "),photos.length||(i.photo?1:0),photoLabels||((i.photo&&!photos.length)?"Primary photo":""),ai.suggestedGrade,ai.finalGrade||i.grade,ai.overrideReason,ai.reviewedAt?`${fmtD(ai.reviewedAt)} ${fmtT(ai.reviewedAt)}`:"",m.thickness,m.length,m.width,m.polish,i.notes];
      })
    ];
    const csv="\ufeff"+rows.map(r=>r.map(esc).join(",")).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;
    a.download=`epistable-ai-review-dataset-${curMon()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function downloadAuditPacket(){
    const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
    const rows=insps.map(i=>{
      const t=i.measurements?.traceability||{};
      const a=i.measurements?.audit||{};
      const ai=i.measurements?.aiReview||{};
      const certificate=`${window.location.origin}/slab/${encodeURIComponent(i.id)}`;
      const traceCount=traceKeys.filter(k=>!!t[k]).length;
      const auditCount=["calibrationChecked","checklistComplete","rootCause","correctiveAction","actionOwner","actionDue"].filter(k=>!!a[k]).length;
      return `<tr><td>${esc(i.id)}</td><td>${esc(i.stone)}</td><td>${esc(i.grade)}</td><td>${esc(ai.suggestedGrade||"Not recorded")}</td><td>${esc(ai.finalGrade||i.grade)}</td><td>${esc(ai.overrideReason||"None")}</td><td>${esc(ai.reviewedAt?`${fmtD(ai.reviewedAt)} ${fmtT(ai.reviewedAt)}`:"Not recorded")}</td><td>${esc(i.supplier||"Not recorded")}</td><td>${esc(t.batchNo||"Not recorded")}</td><td>${traceCount}/7</td><td>${auditCount}/6</td><td>${(i.defects||[]).length?esc((i.defects||[]).join(", ")):"None"}</td><td><a href="${certificate}">Certificate</a></td></tr>`;
    }).join("");
    const stoneRows=stoneQuality.map(r=>`<tr><td>${esc(r.key)}</td><td>${r.total}</td><td>${r.premiumPct}%</td><td>${r.rejectPct}%</td><td>${r.defects}</td></tr>`).join("");
    const sourceRows=sourceQuality.map(r=>`<tr><td>${esc(r.key)}</td><td>${r.total}</td><td>${r.premiumPct}%</td><td>${r.rejectPct}%</td><td>${r.tracePct}%</td></tr>`).join("");
    const batchRows=batchQuality.filter(r=>r.key!=="Not recorded").map(r=>`<tr><td>${esc(r.key)}</td><td>${r.total}</td><td>${r.premiumPct}%</td><td>${r.rejectPct}%</td><td>${r.defects}</td></tr>`).join("");
    const defectRows=topDefects.length?topDefects.map(([d,c])=>`<tr><td>${esc(d)}</td><td>${c}</td></tr>`).join(""):`<tr><td colspan="2">No defects recorded</td></tr>`;
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Epistable Audit Packet ${curMon()}</title><style>
      body{font-family:Segoe UI,Arial,sans-serif;color:#1a2533;margin:32px;line-height:1.45}
      h1{margin:0 0 4px;font-size:28px} h2{margin-top:28px;font-size:18px}
      .meta{color:#4a5568;margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}
      .kpi{border:1px solid #e2e8f0;border-radius:8px;padding:12px}.kpi b{display:block;font-size:22px}
      table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;vertical-align:top}th{background:#f8f9fb}
      .note{border:1px solid #b8d0f0;background:#e8f0fa;border-radius:8px;padding:12px;margin-top:18px;color:#0057a8}
      .actions{display:flex;gap:14px;margin:16px 0}.actions button{background:#0057a8;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}
      @media print{body{margin:16px}.grid{grid-template-columns:repeat(4,1fr)}a{color:#0057a8}.actions{display:none}}
    </style></head><body>
      <h1>Epistable Audit Evidence Packet</h1>
      <div class="meta">Generated ${esc(fmtD(Date.now()))} Â· Period ${esc(curMon())} Â· ${total} inspections</div>
      <div class="actions"><button onclick="window.print()">Print / Save PDF</button></div>
      <div class="grid">
        <div class="kpi"><b>${total}</b>Total inspections</div>
        <div class="kpi"><b>${pp}%</b>Premium rate</div>
        <div class="kpi"><b>${traceCoverage}%</b>Trace coverage</div>
        <div class="kpi"><b>${auditReadyPct}%</b>Audit checklist completion</div>
      </div>
      <div class="note">This packet organizes Epistable inspection evidence for buyer QC, internal review, and certification-readiness preparation. It is not a third-party certification.</div>
      <h2>Slab Certificate Register</h2><table><thead><tr><th>Slab</th><th>Stone</th><th>Grade</th><th>AI Suggested</th><th>Final Grade</th><th>Override Reason</th><th>Reviewed</th><th>Supplier</th><th>Batch</th><th>Trace</th><th>Audit</th><th>Defects</th><th>Link</th></tr></thead><tbody>${rows||"<tr><td colspan='13'>No inspections recorded</td></tr>"}</tbody></table>
      <h2>Stone Quality Summary</h2><table><thead><tr><th>Stone</th><th>Slabs</th><th>Premium</th><th>Rejected</th><th>Defect Records</th></tr></thead><tbody>${stoneRows||"<tr><td colspan='5'>No stone data recorded</td></tr>"}</tbody></table>
      <h2>Source Quality Summary</h2><table><thead><tr><th>Source/Supplier</th><th>Slabs</th><th>Premium</th><th>Rejected</th><th>Trace Coverage</th></tr></thead><tbody>${sourceRows||"<tr><td colspan='5'>No source data recorded</td></tr>"}</tbody></table>
      <h2>Batch Quality Summary</h2><table><thead><tr><th>Batch</th><th>Slabs</th><th>Premium</th><th>Rejected</th><th>Defect Records</th></tr></thead><tbody>${batchRows||"<tr><td colspan='5'>No batch data recorded</td></tr>"}</tbody></table>
      <h2>Top Defects</h2><table><thead><tr><th>Defect</th><th>Count</th></tr></thead><tbody>${defectRows}</tbody></table>
    </body></html>`;
    const url=URL.createObjectURL(new Blob([html],{type:"text/html;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;
    a.download=`epistable-audit-packet-${curMon()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function copyEvidenceBrief(){
    const lines=[
      `Epistable factory evidence brief - ${curMon()}`,
      `Total inspections: ${total}`,
      `Today: ${today}`,
      `This week: ${week}`,
      `Premium rate: ${pp}%`,
      `Traceability coverage: ${traceCoverage}%`,
      `Audit checklist completion: ${auditReadyPct}% (${auditReadyCount}/${total||0})`,
      `CAPA needed: ${capaNeeded}`,
      `Recorded batches: ${batchCount}`,
      `AI reviewed scans: ${aiReviewed.length}`,
      `AI override rate: ${aiOverrideRate}%`,
      "",
      "Top defects:",
      ...(topDefects.length?topDefects.map(([d,c])=>`- ${d}: ${c}`):["- None recorded"]),
      "",
      "Stone quality:",
      ...(stoneQuality.length?stoneQuality.slice(0,3).map(r=>`- ${r.key}: ${r.total} slabs, ${r.premiumPct}% premium, ${r.rejectPct}% rejected`):["- Not enough stone data"]),
      "",
      "Source quality:",
      ...(sourceQuality.length?sourceQuality.slice(0,3).map(r=>`- ${r.key}: ${r.total} slabs, ${r.premiumPct}% premium, ${r.rejectPct}% rejected, ${r.tracePct}% trace coverage`):["- Not enough source data"]),
    ];
    const text=lines.join("\n");
    try{
      await navigator.clipboard.writeText(text);
      setBriefCopied(true);
      setTimeout(()=>setBriefCopied(false),1400);
    }catch(e){
      window.prompt("Copy evidence brief",text);
    }
  }
  function readinessGapRows(){
    return insps.map(i=>{
      const t=i.measurements?.traceability||{};
      const audit=i.measurements?.audit||{};
      const photos=Array.isArray(i.photos)?i.photos.filter(Boolean):[];
      const missing=[];
      if(!photos.length&&!i.photo)missing.push("photo evidence");
      if(traceKeys.filter(k=>!!t[k]).length<4)missing.push("traceability");
      if(!audit.calibrationChecked)missing.push("calibration check");
      if(!audit.checklistComplete)missing.push("inspection checklist");
      if((i.defects||[]).length>0&&!audit.correctiveAction)missing.push("corrective action");
      return {i,missing};
    }).filter(r=>r.missing.length);
  }
  async function copyGapSummary(){
    const gapRows=readinessGapRows();
    const lines=[
      `Epistable readiness gap summary - ${curMon()}`,
      `Slabs needing follow-up: ${gapRows.length}`,
      "",
      ...(gapRows.length?gapRows.slice(0,10).map(({i,missing})=>`- ${i.id} | ${i.stone} | ${missing.join(", ")}`):["- No readiness gaps found in current inspection data."]),
    ];
    const text=lines.join("\n");
    try{
      await navigator.clipboard.writeText(text);
      setGapCopied(true);
      setTimeout(()=>setGapCopied(false),1400);
    }catch(e){
      window.prompt("Copy gap summary",text);
    }
  }
  function downloadPilotReport(){
    const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
    const readyScore=Math.round((Math.min(total,100)+traceCoverage+auditReadyPct+(capaNeeded?Math.max(0,100-Math.min(capaNeeded*20,100)):100)+(aiReviewed.length?Math.min(100,aiReviewed.length*5):0))/5);
    const metricRows=[
      ["Inspection records",`${total}/100 target`],
      ["Premium rate",`${pp}%`],
      ["Traceability coverage",`${traceCoverage}%`],
      ["Audit checklist completion",`${auditReadyPct}%`],
      ["CAPA gaps",capaNeeded],
      ["Recorded batches",batchCount],
      ["AI reviewed scans",aiReviewed.length],
      ["AI override rate",`${aiOverrideRate}%`],
    ].map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("");
    const defectRows=topDefects.length?topDefects.map(([d,c])=>`<tr><td>${esc(d)}</td><td>${c}</td></tr>`).join(""):`<tr><td colspan="2">No defects recorded</td></tr>`;
    const stoneRows=stoneQuality.map(r=>`<tr><td>${esc(r.key)}</td><td>${r.total}</td><td>${r.premiumPct}%</td><td>${r.rejectPct}%</td></tr>`).join("");
    const sourceRows=sourceQuality.map(r=>`<tr><td>${esc(r.key)}</td><td>${r.total}</td><td>${r.premiumPct}%</td><td>${r.rejectPct}%</td><td>${r.tracePct}%</td></tr>`).join("");
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Epistable Pilot Report ${curMon()}</title><style>
      body{font-family:Segoe UI,Arial,sans-serif;color:#1a2533;margin:32px;line-height:1.45}
      h1{margin:0 0 4px;font-size:28px} h2{margin-top:26px;font-size:18px}.meta{color:#4a5568;margin-bottom:18px}
      .score{border:1px solid #b8d0f0;background:#e8f0fa;border-radius:10px;padding:20px;margin:16px 0;color:#0057a8}.score b{font-size:30px;display:block}
      table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;vertical-align:top}th{background:#f8f9fb}
      .note{border:1px solid #fcd34d;background:#fffbeb;border-radius:8px;padding:12px;margin-top:18px;color:#b45309}
      .actions{display:flex;gap:14px;margin:16px 0}.actions button{background:#0057a8;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}
      @media print{body{margin:16px}.actions{display:none}}
    </style></head><body>
      <h1>Epistable Factory Pilot Report</h1>
      <div class="meta">Generated ${esc(fmtD(Date.now()))} Â· Period ${esc(curMon())}</div>
      <div class="actions"><button onclick="window.print()">Print / Save PDF</button></div>
      <div class="score"><b>${readyScore}%</b>Pilot readiness signal based on scan volume, traceability, audit completion, CAPA closure, and AI review coverage.</div>
      <div class="note">This is an internal pilot outcome report for buyer-audit readiness and compliance-readiness preparation. It is not a third-party certification.</div>
      <h2>Pilot Metrics</h2><table><tbody>${metricRows}</tbody></table>
      <h2>Stone Quality</h2><table><thead><tr><th>Stone</th><th>Slabs</th><th>Premium</th><th>Rejected</th></tr></thead><tbody>${stoneRows||"<tr><td colspan='4'>No stone data recorded</td></tr>"}</tbody></table>
      <h2>Source Quality</h2><table><thead><tr><th>Source/Supplier</th><th>Slabs</th><th>Premium</th><th>Rejected</th><th>Trace Coverage</th></tr></thead><tbody>${sourceRows||"<tr><td colspan='5'>No source data recorded</td></tr>"}</tbody></table>
      <h2>Top Defects</h2><table><thead><tr><th>Defect</th><th>Count</th></tr></thead><tbody>${defectRows}</tbody></table>
    </body></html>`;
    const url=URL.createObjectURL(new Blob([html],{type:"text/html;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;
    a.download=`epistable-pilot-report-${curMon()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function downloadGapReport(){
    const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
    const gapRows=readinessGapRows();
    const rows=gapRows.map(({i,missing})=>`<tr><td>${esc(i.id)}</td><td>${esc(i.stone)}</td><td>${esc(i.grade)}</td><td>${esc(i.supplier||"Not recorded")}</td><td>${esc(missing.join(", "))}</td><td><a href="${window.location.origin}/slab/${encodeURIComponent(i.id)}">Certificate</a></td></tr>`).join("");
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Epistable Readiness Gap Report ${curMon()}</title><style>
      body{font-family:Segoe UI,Arial,sans-serif;color:#1a2533;margin:32px;line-height:1.45}
      h1{margin:0 0 4px;font-size:28px}.meta{color:#4a5568;margin-bottom:18px}
      .summary{border:1px solid #fcd34d;background:#fffbeb;border-radius:10px;padding:20px;margin:16px 0;color:#b45309}.summary b{font-size:28px;display:block}
      table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;vertical-align:top}th{background:#f8f9fb}
      .actions{display:flex;gap:14px;margin:16px 0}.actions button{background:#0057a8;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}
      @media print{body{margin:16px}.actions{display:none}}
    </style></head><body>
      <h1>Epistable Readiness Gap Report</h1>
      <div class="meta">Generated ${esc(fmtD(Date.now()))} Â· Period ${esc(curMon())}</div>
      <div class="actions"><button onclick="window.print()">Print / Save PDF</button></div>
      <div class="summary"><b>${gapRows.length}</b>Slabs need evidence or compliance-readiness follow-up.</div>
      <table><thead><tr><th>Slab</th><th>Stone</th><th>Grade</th><th>Supplier</th><th>Missing / Needs Work</th><th>Link</th></tr></thead><tbody>${rows||"<tr><td colspan='6'>No readiness gaps found in current inspection data.</td></tr>"}</tbody></table>
    </body></html>`;
    const url=URL.createObjectURL(new Blob([html],{type:"text/html;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;
    a.download=`epistable-readiness-gap-report-${curMon()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:16}}>
        <div style={TEXT.pageHeader}>Analytics</div>
        <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
          <Btn size="sm" variant="ghost" onClick={copyEvidenceBrief} disabled={!insps.length}>{briefCopied?"Copied":"Copy Brief"}</Btn>
          <Btn size="sm" variant="secondary" onClick={downloadPilotReport} disabled={!insps.length}>Export Pilot Report</Btn>
          <Btn size="sm" variant="ghost" onClick={copyGapSummary} disabled={!insps.length}>{gapCopied?"Gaps Copied":"Copy Gaps"}</Btn>
          <Btn size="sm" variant="secondary" onClick={downloadGapReport} disabled={!insps.length}>Gap Report</Btn>
          <Btn size="sm" variant="secondary" onClick={downloadAuditPacket} disabled={!insps.length}>Export Audit Packet</Btn>
          <Btn size="sm" variant="secondary" onClick={downloadAuditCsv} disabled={!insps.length}>Export Evidence CSV</Btn>
        </div>
      </div>
      <KpiGrid items={[{label:"Today",value:today,icon:"date",color:C.primary},{label:"This Week",value:week,icon:"date",color:C.teal},{label:"Premium Rate",value:pp+"%",icon:"verified",color:C.green},{label:"Total",value:total,icon:"package",color:C.text}]}/>
      <KpiGrid items={[{label:"Trace Coverage",value:traceCoverage+"%",icon:"Trace",color:traceCoverage>=70?C.green:C.amber},{label:"Audit Ready",value:auditReadyPct+"%",icon:"Audit",color:auditReadyPct>=70?C.green:C.amber},{label:"CAPA Needed",value:capaNeeded,icon:"CAPA",color:capaNeeded?C.red:C.green},{label:"Batches",value:batchCount,icon:"Batch",color:C.primary}]}/>
      {aiReviewed.length>0&&<Card style={{marginBottom:18}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",gap:14,alignItems:"center"}}>
          <div style={TEXT.panelTitle}>AI Review Learning</div>
          <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <span style={{fontSize:12,fontWeight:600,color:aiOverrideRate>25?C.amber:C.green}}>{aiOverrideRate}% override rate</span>
            <Btn size="sm" variant="secondary" onClick={downloadAiReviewCsv}>Export AI Dataset</Btn>
          </div>
        </div>
        <div style={{padding:20,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {[["Reviewed",aiReviewed.length,C.primary],["Overrides",aiOverrides.length,aiOverrides.length?C.amber:C.green],["Aligned",aiReviewed.length-aiOverrides.length,C.green]].map(([label,value,color])=>(
            <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color,lineHeight:1}}>{value}</div>
              <div style={{fontSize:12,color:C.textDim,fontWeight:600,marginTop:5}}>{label}</div>
            </div>
          ))}
        </div>
        {aiOverrides.length>0&&<div style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:14}}>
          {aiOverrides.slice(0,3).map(i=><div key={i.id} style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:9,padding:"13px 14px"}}>
            <div style={{fontSize:12,fontWeight:600,color:C.amber}}>{i.stone}: {i.measurements.aiReview.suggestedGrade} -&gt; {i.measurements.aiReview.finalGrade}</div>
            <div style={{fontSize:12,color:C.textMid,lineHeight:1.65,marginTop:3}}>{i.measurements.aiReview.overrideReason||"No override reason recorded"}</div>
          </div>)}
        </div>}
      </Card>}
      <Card style={{marginBottom:18}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,...TEXT.panelTitle}}>Grade Distribution</div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
          {GRADES.map(g=>{const count=byG(g.id);const pct=total?Math.round(count/total*100):0;return(
            <div key={g.id}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={TEXT.itemTitle}>{g.emoji} {g.id}</span><span style={{...TEXT.itemTitle,color:g.color}}>{count} ({pct}%)</span></div><PBar value={pct} color={g.color}/></div>
          );})}
        </div>
      </Card>
      {stoneQuality.length>0&&<Card style={{marginBottom:18}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,...TEXT.panelTitle}}>Stone Quality</div>
        <div style={{padding:20,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14}}>
          {stoneQuality.map(r=>(
            <div key={r.key} style={{border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",background:r.rejectPct>15?C.redBg:C.white}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:8}}>{r.key}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                {[["Slabs",r.total,C.text],["Premium",r.premiumPct+"%",C.green],["Rejected",r.rejectPct+"%",r.rejectPct?C.red:C.textDim]].map(([l,v,col])=><div key={l} style={{background:C.surface,borderRadius:8,padding:"7px 5px",textAlign:"center"}}><div style={{fontSize:13,fontWeight:600,color:col}}>{v}</div><div style={{fontSize:12,color:C.textDim,fontWeight:600}}>{l}</div></div>)}
              </div>
            </div>
          ))}
        </div>
      </Card>}
      <Card style={{marginBottom:18}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",gap:14,alignItems:"center"}}>
          <div style={TEXT.panelTitle}>Audit Readiness</div>
          <span style={{fontSize:12,fontWeight:600,color:auditReadyPct>=70?C.green:C.amber}}>{auditReadyCount}/{total||0} complete</span>
        </div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,marginBottom:6}}><span>Traceability coverage</span><span>{traceCoverage}%</span></div>
            <PBar value={traceCoverage} color={traceCoverage>=70?C.green:C.amber} h={8}/>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,marginBottom:6}}><span>Audit checklist completion</span><span>{auditReadyPct}%</span></div>
            <PBar value={auditReadyPct} color={auditReadyPct>=70?C.green:C.amber} h={8}/>
          </div>
          {capaNeeded>0&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:"14px 16px",fontSize:12,color:C.red,fontWeight:600}}>CAPA attention needed on {capaNeeded} slab{capaNeeded===1?"":"s"} with defects but no corrective action recorded.</div>}
        </div>
      </Card>
      {sourceQuality.length>0&&<Card style={{marginBottom:18}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,...TEXT.panelTitle}}>Source Quality</div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
          {sourceQuality.map(r=>(
            <div key={r.key} style={{border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",background:r.rejectPct>15?C.redBg:C.white}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:14,marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:600,color:C.text}}>{r.key}</span>
                <span style={{fontSize:12,fontWeight:600,color:r.rejectPct>15?C.red:C.green}}>{r.total} slabs</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
                {[["Premium",r.premiumPct+"%",C.green],["Rejected",r.rejectPct+"%",r.rejectPct?C.red:C.textDim],["Trace",r.tracePct+"%",r.tracePct>=70?C.green:C.amber]].map(([l,v,col])=><div key={l} style={{background:C.surface,borderRadius:8,padding:"7px 6px",textAlign:"center"}}><div style={{fontSize:13,fontWeight:600,color:col}}>{v}</div><div style={{fontSize:12,color:C.textDim,fontWeight:600}}>{l}</div></div>)}
              </div>
            </div>
          ))}
        </div>
      </Card>}
      {batchQuality.some(r=>r.key!=="Not recorded")&&<Card style={{marginBottom:18}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,...TEXT.panelTitle}}>Batch Quality</div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
          {batchQuality.filter(r=>r.key!=="Not recorded").map(r=>(
            <div key={r.key} style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{r.key}</div>
                <div style={{fontSize:12,color:C.textDim}}>{r.total} slabs - {r.defects} defect records</div>
              </div>
              <span style={{fontSize:12,fontWeight:600,color:r.rejectPct>15?C.red:C.green,background:r.rejectPct>15?C.redBg:C.greenBg,border:`1px solid ${r.rejectPct>15?C.redBorder:C.greenBorder}`,borderRadius:20,padding:"4px 9px"}}>{r.premiumPct}% premium</span>
            </div>
          ))}
        </div>
      </Card>}
      {topDefects.length>0&&<Card>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,...TEXT.panelTitle}}>Top Defects</div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
          {topDefects.map(([d,cnt])=>(
            <div key={d} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:600,textTransform:"capitalize"}}>{d}</span>
              <span style={{fontSize:12,fontWeight:600,color:C.amber}}>{cnt}</span>
            </div>
          ))}
        </div>
      </Card>}
    </div>
  );
}

function FacTeam({fac,actor,activity=[],onActivity}) {
  const [users,setUsers]=useState([]);
  const [manage,setManage]=useState(null);
  const [search,setSearch]=useState("");
  async function load(){
    const u=await DB.facUsers(fac?.id||"");
    setUsers((u||[]).filter(x=>x.role!=="owner"));
  }
  useEffect(()=>{load();},[fac?.id]);
  async function saveUser(user,updates){
    await DB.updUser(user.id,{...updates,factory_id:fac.id,factory_name:fac.name});
    await DB.addActivity(activityForProfile(updates.status==="suspended"?"profile_suspended":user.status==="suspended"&&updates.status==="active"?"profile_restored":"profile_updated",actor,{...user,...updates,factory_id:fac.id,factory_name:fac.name},{role:updates.role,status:updates.status}));
    setUsers(prev=>prev.map(u=>u.id===user.id?{...u,...updates,factory_id:fac.id,factory_name:fac.name}:u));
    onActivity?.();
  }
  const filtered=users.filter(u=>!search||u.name?.toLowerCase().includes(search.toLowerCase())||u.email?.toLowerCase().includes(search.toLowerCase())||u.role?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      {manage&&<UserAccessModal user={manage} facs={[fac]} onClose={()=>setManage(null)} onSave={saveUser}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div><div style={TEXT.pageHeader}>Team Access</div><div style={TEXT.meta}>{users.length} profiles</div></div>
        <Btn size="sm" variant="secondary" onClick={load}>â†º</Btn>
      </div>
      <div style={{marginBottom:16}}><Inp value={search} onChange={setSearch} placeholder="Search team, buyers, roles..." icon="search"/></div>
      {filtered.length===0?<Card style={{padding:"40px",textAlign:"center"}}><div style={{marginBottom:16,display:"flex",justifyContent:"center"}}><Icon name="users" size={32} color={C.primary}/></div><div style={{fontWeight:600}}>No profiles found</div></Card>:
      <Card>{filtered.map((u,i)=>(
        <div key={u.id} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none"}}>
          <Avi initials={u.avatar||u.name?.slice(0,2).toUpperCase()||"??"} size={36}/>
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{u.name}</div><div style={{...TEXT.tinyMeta,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}{u.company?" Â· "+u.company:""}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <span style={{fontSize:12,fontWeight:600,color:C.primary,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,padding:"3px 9px",borderRadius:20,textTransform:"capitalize"}}>{u.role}</span>
            <StatPill status={u.status||"active"}/>
            <Btn size="sm" variant="secondary" onClick={()=>setManage(u)}>Manage</Btn>
          </div>
        </div>
      ))}</Card>}
      <ActivityList items={activity} compact/>
    </div>
  );
}

function FacSuppliers({fac}) {
  const [suppliers,setSuppliers]=useState([]);const [insps,setInsps]=useState([]);const [show,setShow]=useState(false);const [sel,setSel]=useState(null);
  const [windowDays,setWindowDays]=useState("90");const [sortBy,setSortBy]=useState("score");
  const [cleanup,setCleanup]=useState({name:"",supplierId:"",busy:false,error:""});
  const [form,setForm]=useState({name:"",contact:"",phone:"",location:"",notes:""});
  async function load(){const [s,i]=await Promise.all([DB.facSuppliers(fac?.id||""),DB.facInsps(fac?.id||"")]);setSuppliers(s);setInsps(i);}
  useEffect(()=>{load();},[fac?.id]);
  async function create(){if(!form.name)return;await DB.createSupplier({...form,factoryId:fac?.id});setForm({name:"",contact:"",phone:"",location:"",notes:""});setShow(false);load();}
  const normalize=v=>(v||"").trim().toLowerCase();
  const cutoff=windowDays==="all"?0:Date.now()-(Number(windowDays)||90)*86400000;
  const trackedInsps=insps.filter(i=>(i.supplierId||i.supplier)&&(windowDays==="all"||i.ts>=cutoff));
  const supplierNames=new Set(suppliers.map(s=>normalize(s.name)));
  function supplierRows(s){
    if(s._manual)return trackedInsps.filter(i=>!i.supplierId&&i.supplier&&!supplierNames.has(normalize(i.supplier)));
    return trackedInsps.filter(i=>i.supplierId===s.id||(!i.supplierId&&normalize(i.supplier)===normalize(s.name)));
  }
  function statsFor(s){
    const rows=supplierRows(s);
    const total=rows.length;
    const byG=g=>rows.filter(i=>i.grade===g).length;
    const premium=byG("Premium");const standard=byG("Standard");const commercial=byG("Commercial");const rejected=byG("Rejected");
    const premiumPct=total?Math.round(premium/total*100):0;
    const standardPct=total?Math.round(standard/total*100):0;
    const commercialPct=total?Math.round(commercial/total*100):0;
    const rejectPct=total?Math.round(rejected/total*100):0;
    const exportReady=rows.filter(i=>i.exportReady).length;
    const exportReadyPct=total?Math.round(exportReady/total*100):0;
    const defectSlabs=rows.filter(i=>(i.defects||[]).length>0).length;
    const defectRate=total?Math.round(defectSlabs/total*100):0;
    const avgPrice=total?Math.round(rows.reduce((sum,i)=>sum+(Number(i.pricePerSqFt)||0),0)/total):0;
    const volumeBonus=Math.min(10,Math.round(total/5));
    const score=total?Math.min(100,Math.max(0,Math.round((premiumPct*0.75)+(standardPct*0.28)+(exportReadyPct*0.12)+volumeBonus-(rejectPct*0.7)-(defectRate*0.22)))):0;
    const defects={};rows.forEach(i=>(i.defects||[]).forEach(d=>{defects[d]=(defects[d]||0)+1;}));
    const topDefects=Object.entries(defects).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const recent=rows.slice(0,6);
    const lastScan=rows[0]?.ts||null;
    const risk=total===0?{label:"No Data",color:C.textDim,bg:C.surface,border:C.border}
      :rejectPct>=20||defectRate>=55?{label:"Review",color:C.red,bg:C.redBg,border:C.redBorder}
      :score>=70&&rejectPct<=8?{label:"Preferred",color:C.green,bg:C.greenBg,border:C.greenBorder}
      :{label:"Monitor",color:C.amber,bg:C.amberBg,border:C.amberBorder};
    const recommendation=total===0?"Scan slabs from this supplier to build a reliable scorecard."
      :rejectPct>=20?"Review recent rejected slabs before placing the next order."
      :defectRate>=45?"Ask for tighter pre-dispatch checks around the recurring defects."
      :premiumPct>=55&&rejectPct<=8?"Prioritize this supplier for premium/export-ready orders."
      :"Keep monitoring before changing purchasing preference.";
    return {rows,total,premium,standard,commercial,premiumPct,standardPct,commercialPct,rejected,rejectPct,exportReadyPct,defectRate,avgPrice,score,topDefects,recent,lastScan,risk,recommendation};
  }
  const manualSupplier={id:"manual-suppliers",name:"Unregistered Suppliers",location:"Manual scan entries",contact:"Add suppliers to separate these",_manual:true};
  const manualStats=statsFor(manualSupplier);
  const scorecards=[...suppliers,...(manualStats.total>0?[manualSupplier]:[])].map(s=>({...s,_stats:statsFor(s)}));
  const ranked=[...scorecards].sort((a,b)=>{
    if(sortBy==="premium")return b._stats.premiumPct-a._stats.premiumPct||b._stats.total-a._stats.total;
    if(sortBy==="reject")return b._stats.rejectPct-a._stats.rejectPct||b._stats.rejected-a._stats.rejected;
    if(sortBy==="volume")return b._stats.total-a._stats.total||b._stats.score-a._stats.score;
    return b._stats.score-a._stats.score||b._stats.total-a._stats.total;
  });
  const scored=ranked.filter(s=>s._stats.total>0);
  const best=scored[0];
  const mostScanned=[...ranked].sort((a,b)=>b._stats.total-a._stats.total)[0];
  const mostRejected=[...scored].sort((a,b)=>b._stats.rejectPct-a._stats.rejectPct||b._stats.rejected-a._stats.rejected)[0];
  const totalSupplierScans=trackedInsps.length;
  const manualGroups=Object.values(supplierRows(manualSupplier).reduce((acc,row)=>{
    const name=row.supplier||"Unknown supplier";
    const key=normalize(name);
    if(!acc[key])acc[key]={name,rows:[]};
    acc[key].rows.push(row);
    return acc;
  },{})).sort((a,b)=>b.rows.length-a.rows.length||a.name.localeCompare(b.name));
  async function cleanupManualSupplier(group,mode){
    setCleanup(p=>({...p,name:group.name,busy:true,error:""}));
    try {
      const supplier=mode==="create"
        ? await DB.createSupplier({name:group.name,contact:"",phone:"",location:"",notes:"Created from unregistered scan cleanup",factoryId:fac?.id})
        : suppliers.find(s=>s.id===cleanup.supplierId);
      if(!supplier)throw new Error("Select a supplier to link.");
      await DB.linkInspectionsToSupplier(group.rows.map(r=>r.id),supplier);
      setCleanup({name:"",supplierId:"",busy:false,error:""});
      await load();
      setSel(null);
    } catch(e) {
      setCleanup(p=>({...p,busy:false,error:e.message||"Could not clean up supplier scans."}));
    }
  }
  return (
    <div>
      {show&&<Modal title="Add Supplier" onClose={()=>setShow(false)}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="Supplier Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required/>
          <Inp label="Contact Person" value={form.contact} onChange={v=>setForm(p=>({...p,contact:v}))}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Inp label="Phone" value={form.phone} onChange={v=>setForm(p=>({...p,phone:v}))}/>
            <Inp label="Location" value={form.location} onChange={v=>setForm(p=>({...p,location:v}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><Btn variant="secondary" onClick={()=>setShow(false)}>Cancel</Btn><Btn onClick={create} disabled={!form.name}>Add</Btn></div>
        </div>
      </Modal>}
      {sel&&(()=>{const st=sel._stats;return <Modal title={sel.name+" Scorecard"} onClose={()=>setSel(null)}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:18}}>
          {[["Score",st.score,C.primary],["Premium",st.premiumPct+"%",C.green],["Reject",st.rejectPct+"%",C.red]].map(([l,v,c])=>(
            <div key={l} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:10,textAlign:"center"}}><div style={{fontSize:18,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:12,color:C.textDim,fontWeight:600}}>{l}</div></div>
          ))}
        </div>
        <div style={{background:st.risk.bg,border:`1px solid ${st.risk.border}`,borderRadius:10,padding:"14px 16px",fontSize:12,fontWeight:600,color:st.risk.color,marginBottom:16}}>{st.risk.label}: {st.recommendation}</div>
        {sel._manual&&<Card style={{padding:20,marginBottom:16,borderColor:C.amberBorder}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Clean Up Typed Supplier Names</div>
          <div style={{fontSize:12,color:C.textDim,lineHeight:1.55,marginBottom:16}}>Convert typed scan entries into registered suppliers so future scorecards stay accurate.</div>
          {cleanup.error&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:C.red,fontWeight:600,marginBottom:14}}>{cleanup.error}</div>}
          {manualGroups.map(group=>(
            <div key={group.name} style={{border:`1px solid ${C.border}`,borderRadius:10,padding:10,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:14,marginBottom:8}}>
                <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{group.name}</div><div style={{fontSize:12,color:C.textDim}}>{group.rows.length} scan{group.rows.length===1?"":"s"} to clean up</div></div>
                <Btn size="sm" variant="ghost" disabled={cleanup.busy&&cleanup.name===group.name} onClick={()=>cleanupManualSupplier(group,"create")}>{cleanup.busy&&cleanup.name===group.name?"Working...":"Create"}</Btn>
              </div>
              {suppliers.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:14}}>
                <select value={cleanup.name===group.name?cleanup.supplierId:""} onChange={e=>setCleanup({name:group.name,supplierId:e.target.value,busy:false,error:""})} style={{width:"100%",padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,fontFamily:FONT_STACK,minWidth:0}}>
                  <option value="">Link to existing...</option>
                  {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <Btn size="sm" variant="secondary" disabled={cleanup.busy||cleanup.name!==group.name||!cleanup.supplierId} onClick={()=>cleanupManualSupplier(group,"link")}>Link</Btn>
              </div>}
            </div>
          ))}
        </Card>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16}}>
          {[["Defect Rate",st.defectRate+"%",C.amber],["Export Ready",st.exportReadyPct+"%",C.teal],["Avg Price",fmtMoney(st.avgPrice),C.green]].map(([l,v,c])=>(
            <div key={l} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,padding:10,textAlign:"center"}}><div style={{fontSize:15,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:12,color:C.textDim,fontWeight:600}}>{l}</div></div>
          ))}
        </div>
        <Card style={{padding:20,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Grade Distribution</div>
          {GRADES.map(g=>{const count=st.rows.filter(i=>i.grade===g.id).length;const pct=st.total?Math.round(count/st.total*100):0;return(
            <div key={g.id} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,marginBottom:4}}><span>{g.id}</span><span style={{color:g.color}}>{count} ({pct}%)</span></div><PBar value={pct} color={g.color}/></div>
          );})}
        </Card>
        <Card style={{padding:20,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Top Defects</div>
          {st.topDefects.length===0?<div style={{fontSize:13,color:C.green,fontWeight:600}}>No defects recorded</div>:st.topDefects.map(([d,c])=>(
            <div key={d} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}><span style={{textTransform:"capitalize",fontWeight:700}}>{d}</span><span style={{fontWeight:700,color:C.amber}}>{c}</span></div>
          ))}
        </Card>
        <Card style={{padding:20}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Recent Slabs</div>
          {st.recent.length===0?<div style={{fontSize:13,color:C.textDim}}>No inspections yet.</div>:st.recent.map((r,i)=>{const g=gradeConf(r.grade);return(
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:14,padding:"9px 0",borderBottom:i<st.recent.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{width:34,height:34,borderRadius:8,background:g.bg,border:`1px solid ${g.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{g.emoji}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600}}>{r.stone}</div><div style={{fontSize:12,color:C.textDim}}>{r.date} Â· {r.id}</div></div>
              <span style={{fontSize:12,fontWeight:600,color:g.color,background:g.bg,border:`1px solid ${g.border}`,borderRadius:20,padding:"3px 8px"}}>{r.grade}</span>
            </div>
          );})}
        </Card>
      </Modal>;})()}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div><div style={TEXT.pageHeader}>Supplier Scorecards</div><div style={TEXT.meta}>{suppliers.length} registered suppliers</div></div>
        <div style={{display:"flex",gap:14}}><Btn size="sm" variant="secondary" onClick={load}>Refresh</Btn><Btn size="sm" onClick={()=>setShow(true)}>+ Add</Btn></div>
      </div>
      {scorecards.length>0&&<KpiGrid items={[
        {label:"Best Score",value:best?best._stats.score:"-",icon:"Top",color:C.green},
        {label:"Most Scanned",value:mostScanned?mostScanned._stats.total:0,icon:"Vol",color:C.primary},
        {label:"Reject Watch",value:mostRejected?mostRejected._stats.rejectPct+"%":"0%",icon:"Risk",color:C.red},
        {label:"Supplier Scans",value:totalSupplierScans,icon:"Scan",color:C.teal},
      ]}/>}
      <Card style={{padding:12,marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Sel label="Scan Window" value={windowDays} onChange={setWindowDays} options={[{value:"30",label:"Last 30 days"},{value:"90",label:"Last 90 days"},{value:"180",label:"Last 180 days"},{value:"all",label:"All time"}]}/>
          <Sel label="Rank By" value={sortBy} onChange={setSortBy} options={[{value:"score",label:"Quality score"},{value:"premium",label:"Premium rate"},{value:"reject",label:"Rejection risk"},{value:"volume",label:"Scan volume"}]}/>
        </div>
      </Card>
      {scorecards.length===0?<EmptyState title="No supplier scorecards yet" body="Add suppliers and select them during scans. Scorecards will show premium rate, rejection risk, defect patterns, and scan volume." actionLabel="+ Add First Supplier" onAction={()=>setShow(true)}/>:
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {ranked.map(s=>{const st=s._stats;return(
          <Card key={s.id} style={{padding:20,cursor:"pointer"}} onClick={()=>setSel(s)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:14}}>
              <div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:700,marginBottom:2}}>{s.name}</div><div style={{fontSize:12,color:C.textDim}}>{s.location||"â€”"} Â· {s.contact||"â€”"}</div></div>
              <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:18,fontWeight:700,color:st.risk.color}}>{st.score}</div><div style={{fontSize:12,color:C.textDim,fontWeight:600}}>Score</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
              {[["Scans",st.total,C.primary],["Premium",st.premiumPct+"%",C.green],["Reject",st.rejectPct+"%",C.red],["Defects",st.defectRate+"%",C.amber]].map(([l,v,c])=><div key={l} style={{background:C.surface,borderRadius:8,padding:8,textAlign:"center"}}><div style={{fontSize:14,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:12,color:C.textDim,fontWeight:600}}>{l}</div></div>)}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:st.topDefects.length>0?10:0}}>
              <span style={{background:st.risk.bg,border:`1px solid ${st.risk.border}`,borderRadius:20,padding:"3px 9px",fontSize:12,fontWeight:600,color:st.risk.color}}>{st.risk.label}</span>
              <span style={{fontSize:12,fontWeight:600,color:C.textDim}}>{st.lastScan?`Last scan ${fmtD(st.lastScan)}`:"No scans yet"}</span>
            </div>
            {st.topDefects.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {st.topDefects.map(([d,c])=><span key={d} style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:20,padding:"3px 8px",fontSize:12,fontWeight:600,color:C.amber,textTransform:"capitalize"}}>{d} Â· {c}</span>)}
            </div>}
          </Card>
        );})}
      </div>}
    </div>
  );
}

function FacBuyers({fac,actor,onActivity}) {
  const [buyers,setBuyers]=useState([]);const [show,setShow]=useState(false);const [manage,setManage]=useState(null);
  async function load(){const b=await DB.facBuyers(fac?.id||"");setBuyers(b);}
  useEffect(()=>{load();},[fac?.id]);
  async function createBuyer(form){
    const b=await DB.createBuyer({name:form.name,email:form.email,authUserId:form.authUserId,company:form.company||"",factoryId:fac.id,factoryName:fac.name});
    await DB.addActivity(activityForProfile("profile_created",actor,b,{role:"buyer",status:b.status}));
    setBuyers(prev=>prev.some(x=>x.id===b.id)?prev:[b,...prev]);
    return b;
  }
  function closeAfterCreate(){
    setShow(false);
    load();
  }
  async function saveBuyer(buyer,updates){
    await DB.updUser(buyer.id,{...updates,role:"buyer",factory_id:fac.id,factory_name:fac.name});
    await DB.addActivity(activityForProfile(updates.status==="suspended"?"profile_suspended":buyer.status==="suspended"&&updates.status==="active"?"profile_restored":"profile_updated",actor,{...buyer,...updates,role:"buyer",factory_id:fac.id,factory_name:fac.name},{role:"buyer",status:updates.status}));
    setBuyers(prev=>prev.map(b=>b.id===buyer.id?{...b,...updates,role:"buyer",factory_id:fac.id,factory_name:fac.name}:b));
    onActivity?.();
  }
  return (
    <div>
{show&&<UserFormModal title={"Add Buyer â€” "+fac?.name} isBuyer onClose={()=>setShow(false)} onDone={closeAfterCreate} onSubmit={createBuyer}/>}      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div><div style={TEXT.pageHeader}>Buyers</div><div style={TEXT.meta}>{buyers.length} accounts</div></div>
        <Btn size="sm" variant="secondary" onClick={load}>â†º</Btn> <Btn size="sm" onClick={()=>setShow(true)}>+ Add Buyer</Btn>
      </div>
      {manage&&<UserAccessModal user={manage} facs={[fac]} fixedRole="buyer" onClose={()=>setManage(null)} onSave={saveBuyer}/>}
      {buyers.length===0?<EmptyState title="No buyers yet" body="Create buyer access so customers can browse verified inventory, request quotes, and track accepted orders." actionLabel="+ Add First Buyer" onAction={()=>setShow(true)}/>:
      <Card>{buyers.map((b,i)=>(
        <div key={b.id} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderBottom:i<buyers.length-1?`1px solid ${C.border}`:"none"}}>
          <Avi initials={b.name.slice(0,2).toUpperCase()} size={36} color={C.teal} bg="#e0f7fa" border="#80deea"/>
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{b.name}</div><div style={TEXT.tinyMeta}>{b.company?b.company+" Â· ":""}{b.email}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <StatPill status={b.status||"active"}/>
            <Btn size="sm" variant="secondary" onClick={()=>setManage(b)}>Manage</Btn>
          </div>
        </div>
      ))}</Card>}
    </div>
  );
}

function FacInquiries({fac,onChange}) {
  const [inquiries,setInquiries]=useState([]);const [sel,setSel]=useState(null);
  const [follow,setFollow]=useState({priority:"warm",factoryNotes:"",followUpDate:""});
  const [quote,setQuote]=useState({areaSqFt:"",validityDate:"",notes:""});
  const [quoteBusy,setQuoteBusy]=useState(false);
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [priorityFilter,setPriorityFilter]=useState("all");
  const [requestFilter,setRequestFilter]=useState("all");
  async function load(){setInquiries(await DB.facInquiries(fac?.id||""));}
  useEffect(()=>{load();},[]);
  function quoteRequest(q){
    const msg=q?.message||"";
    const read=label=>msg.match(new RegExp(`${label}:\\s*([^\\n]+)`,"i"))?.[1]?.trim()||"";
    const area=read("Area required").replace(/[^0-9.]/g,"");
    return {isQuote:/quote request/i.test(msg),area,deliveryLocation:read("Delivery location"),targetDate:read("Target date"),buyerNotes:read("Buyer notes"),additionalMessage:read("Additional message")};
  }
  function quoteNotesFromRequest(req){
    return [req.deliveryLocation?`Delivery location: ${req.deliveryLocation}`:null,req.targetDate?`Target date: ${req.targetDate}`:null,req.buyerNotes?`Buyer notes: ${req.buyerNotes}`:null,req.additionalMessage?`Additional message: ${req.additionalMessage}`:null].filter(Boolean).join("\n");
  }
  const defaultQuoteDate=()=>new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  function openInquiry(q){
    const req=quoteRequest(q);
    setSel(q);
    setFollow({priority:req.isQuote?"hot":q.priority||"warm",factoryNotes:q.factoryNotes||"",followUpDate:q.followUpAt?new Date(q.followUpAt).toISOString().slice(0,10):""});
    setQuote({areaSqFt:req.area||"",validityDate:defaultQuoteDate(),notes:quoteNotesFromRequest(req)});
  }
  function followTs(){return follow.followUpDate?new Date(`${follow.followUpDate}T09:00:00`).getTime():null;}
  function buyerPhone(q){return (q.message||"").match(/Phone:\s*([^\n]+)/i)?.[1]?.trim()||"";}
  async function refresh(){await load();onChange?.();}
  async function updStatus(id,status){await DB.updInquiry(id,{status});setSel(null);await refresh();}
  async function reserveInquiry(q){await DB.updInquiry(q.id,{status:"reserved"});await DB.updInspStatus(q.slabId||q.slab_id,"reserved");setSel(null);await refresh();}
  async function saveFollowup(){if(!sel)return;await DB.updInquiry(sel.id,{priority:follow.priority,factory_notes:follow.factoryNotes||null,follow_up_at:followTs()});setSel(null);await refresh();}
  async function createQuote(){
    if(!sel||quoteBusy)return;
    const area=Number(quote.areaSqFt||0);
    const price=Number(sel.pricePerSqFt||sel.price_per_sq_ft||0);
    if(!area||!price)return;
    setQuoteBusy(true);
    try {
      const q=await DB.createQuote({inquiryId:sel.id,slabId:sel.slabId||sel.slab_id,factoryId:sel.factoryId||sel.factory_id,factoryName:sel.factoryName||sel.factory_name,buyerName:sel.buyerName||sel.buyer_name,buyerCompany:sel.buyerCompany||sel.buyer_company,buyerEmail:sel.buyerEmail||sel.buyer_email,stone:sel.stone,grade:sel.grade,pricePerSqFt:price,areaSqFt:area,totalAmount:Math.round(area*price),validityTs:quote.validityDate?new Date(`${quote.validityDate}T23:59:59`).getTime():null,notes:quote.notes,status:"sent"});
      await DB.updInquiry(sel.id,{status:"reserved"});
      await DB.updInspStatus(sel.slabId||sel.slab_id,"reserved");
      setSel(null);await refresh();
      window.open(`/quote/${encodeURIComponent(q.id)}`,"_blank");
    } finally { setQuoteBusy(false); }
  }
  const overdueCount=inquiries.filter(q=>q.followUpAt&&q.followUpAt<Date.now()&&q.status!=="closed").length;
  const quoteRequestCount=inquiries.filter(q=>quoteRequest(q).isQuote&&q.status!=="closed").length;
  const hotCount=inquiries.filter(q=>(q.priority||"warm")==="hot"&&q.status!=="closed").length;
  const filtered=inquiries.filter(q=>{
    const req=quoteRequest(q);
    const hay=[q.buyerName,q.buyer_name,q.buyerCompany,q.buyer_company,q.buyerEmail,q.buyer_email,q.stone,q.grade,q.slabId,q.slab_id,q.message].filter(Boolean).join(" ").toLowerCase();
    const overdue=q.followUpAt&&q.followUpAt<Date.now()&&q.status!=="closed";
    return (statusFilter==="all"||q.status===statusFilter)&&(priorityFilter==="all"||(q.priority||"warm")===priorityFilter)&&(requestFilter==="all"||(requestFilter==="quote"&&req.isQuote)||(requestFilter==="overdue"&&overdue))&&(!search||hay.includes(search.toLowerCase()));
  }).sort((a,b)=>{
    const score=q=>q.followUpAt&&q.followUpAt<Date.now()&&q.status!=="closed"?0:(q.priority||"warm")==="hot"?1:quoteRequest(q).isQuote?2:q.status==="new"?3:q.status==="contacted"?4:q.status==="reserved"?5:6;
    return score(a)-score(b)||Number(b.created_at||0)-Number(a.created_at||0);
  });
  return (
    <div>
      {sel&&(()=>{const req=quoteRequest(sel);const buyerEmail=sel.buyerEmail||sel.buyer_email;const slabId=sel.slabId||sel.slab_id;return <Modal title={req.isQuote?"Quote Request":"Buyer Inquiry"} onClose={()=>setSel(null)}>
        <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:20,marginBottom:18}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:2}}>{sel.buyerName||sel.buyer_name}{(sel.buyerCompany||sel.buyer_company)?" - "+(sel.buyerCompany||sel.buyer_company):""}</div>
          {[["Slab",slabId],["Stone",sel.stone],["Grade",sel.grade],...(req.isQuote?[]:[["Message",sel.message||"-"]])].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.primaryBorder}`}}><span style={{fontSize:12,color:C.textDim}}>{l}</span><span style={{fontSize:12,fontWeight:600}}>{v}</span></div>
          ))}
        </div>
        {req.isQuote&&<Card style={{padding:12,marginBottom:16,boxShadow:"none",background:C.greenBg,borderColor:C.greenBorder}}>
          <div style={{fontSize:13,fontWeight:600,color:C.green,marginBottom:9}}>Buyer quote requirements</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:req.buyerNotes||req.additionalMessage?9:0}}>
            {[["Area",req.area?`${req.area} sq ft`:"Not specified"],["Delivery",req.deliveryLocation||"Not specified"],["Target date",req.targetDate||"Not specified"],["Est. value",req.area?`Rs ${Math.round(Number(req.area||0)*Number(sel.pricePerSqFt||sel.price_per_sq_ft||0)).toLocaleString("en-IN")}`:"-"]].map(([l,v])=>(
              <div key={l} style={{background:C.white,border:`1px solid ${C.greenBorder}`,borderRadius:8,padding:"8px 9px"}}><div style={{fontSize:12,color:C.textDim,fontWeight:600,marginBottom:3}}>{l}</div><div style={{fontSize:12,color:C.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis"}}>{v}</div></div>
            ))}
          </div>
          {(req.buyerNotes||req.additionalMessage)&&<div style={{background:C.white,border:`1px solid ${C.greenBorder}`,borderRadius:8,padding:"13px 14px",fontSize:12,lineHeight:1.65,color:C.textMid}}>{req.buyerNotes&&<div><span style={{fontWeight:700,color:C.text}}>Notes:</span> {req.buyerNotes}</div>}{req.additionalMessage&&<div style={{marginTop:req.buyerNotes?5:0}}><span style={{fontWeight:700,color:C.text}}>Message:</span> {req.additionalMessage}</div>}</div>}
        </Card>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}><Sel label="Priority" value={follow.priority} onChange={v=>setFollow(p=>({...p,priority:v}))} options={[{value:"hot",label:"Hot"},{value:"warm",label:"Warm"},{value:"low",label:"Low"}]}/><Inp label="Next follow-up" type="date" value={follow.followUpDate} onChange={v=>setFollow(p=>({...p,followUpDate:v}))}/></div>
        <div style={{marginBottom:16}}><label style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:6}}>Factory Notes</label><textarea value={follow.factoryNotes} onChange={e=>setFollow(p=>({...p,factoryNotes:e.target.value}))} rows={3} placeholder="Call notes, buyer requirement, next step..." style={{width:"100%",padding:"12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,resize:"none",outline:"none",boxSizing:"border-box"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}><Btn variant="ghost" onClick={()=>buyerEmail&&(window.location.href=`mailto:${buyerEmail}?subject=Epistable inquiry for ${slabId}`)} disabled={!buyerEmail}>Email</Btn><Btn variant="ghost" onClick={()=>{const p=buyerPhone(sel).replace(/[^0-9]/g,"");if(p)window.open(`https://wa.me/${p}`,"_blank");}} disabled={!buyerPhone(sel)}>WhatsApp</Btn></div>
        <Card style={{padding:12,marginBottom:16,boxShadow:"none",background:C.surface}}><div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Create Quote</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}><Inp label="Area (sq ft)" value={quote.areaSqFt} onChange={v=>setQuote(p=>({...p,areaSqFt:v.replace(/[^0-9.]/g,"")}))} placeholder="120"/><Inp label="Valid until" type="date" value={quote.validityDate} onChange={v=>setQuote(p=>({...p,validityDate:v}))}/></div><textarea value={quote.notes} onChange={e=>setQuote(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Quote notes, payment terms, delivery..." style={{width:"100%",padding:"14px 16px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,resize:"none",outline:"none",boxSizing:"border-box",marginBottom:14}}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14}}><div style={{fontSize:12,color:C.textDim,fontWeight:600}}>Total: {fmtMoney(Math.round(Number(quote.areaSqFt||0)*Number(sel.pricePerSqFt||sel.price_per_sq_ft||0)))}</div><Btn size="sm" onClick={createQuote} disabled={quoteBusy||!Number(quote.areaSqFt||0)}>{quoteBusy?"Creating...":"Create Quote"}</Btn></div></Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><Btn variant="secondary" onClick={saveFollowup}>Save</Btn><Btn variant="secondary" onClick={()=>updStatus(sel.id,"contacted")}>Contacted</Btn><Btn variant="ghost" onClick={()=>reserveInquiry(sel)}>Reserve</Btn><Btn variant="green" onClick={()=>updStatus(sel.id,"closed")}>Close</Btn></div>
      </Modal>;})()}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:18}}><div><div style={TEXT.pageHeader}>Buyer Inquiries</div><div style={TEXT.meta}>Prioritize quote requests, hot buyers, and overdue follow-ups</div></div><Btn size="sm" variant="secondary" onClick={load}>Refresh</Btn></div>
      <KpiGrid items={[{label:"Open",value:inquiries.filter(q=>q.status!=="closed").length,icon:"Open",color:C.primary},{label:"Quote Requests",value:quoteRequestCount,icon:"Quote",color:C.green},{label:"Hot Buyers",value:hotCount,icon:"Hot",color:C.red},{label:"Overdue",value:overdueCount,icon:"Due",color:overdueCount?C.red:C.textDim}]}/>
      <Card style={{padding:12,marginBottom:18}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search buyer, slab, stone..." style={{padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,outline:"none",minWidth:0}}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,outline:"none"}}><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="reserved">Reserved</option><option value="closed">Closed</option></select><select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} style={{padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,outline:"none"}}><option value="all">All priorities</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="low">Low</option></select><select value={requestFilter} onChange={e=>setRequestFilter(e.target.value)} style={{padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,outline:"none"}}><option value="all">All inquiries</option><option value="quote">Quote requests</option><option value="overdue">Overdue follow-ups</option></select></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginTop:14}}><div style={{fontSize:12,color:C.textDim,fontWeight:600}}>{filtered.length} of {inquiries.length} inquiries shown</div><button onClick={()=>{setSearch("");setStatusFilter("all");setPriorityFilter("all");setRequestFilter("all");}} style={{background:"transparent",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Reset filters</button></div></Card>
      {inquiries.length===0?<EmptyState title="No inquiries yet" body="When buyers scan certificates or browse inventory, their requests will appear here. Share slab QR codes or the public inventory preview to start demand."/>:filtered.length===0?<EmptyState title="No matching inquiries" body="Try clearing filters, widening the status, or searching another buyer, slab, or stone." actionLabel="Clear filters" onAction={()=>{setSearch("");setStatusFilter("all");setPriorityFilter("all");setRequestFilter("all");}}/>:<Card>{filtered.map((q,i)=>{const req=quoteRequest(q);const overdue=q.followUpAt&&q.followUpAt<Date.now()&&q.status!=="closed";return(<div key={q.id} onClick={()=>openInquiry(q)} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none",cursor:"pointer",background:overdue?C.redBg:q.status==="new"?C.primaryBg:C.white}}><div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{q.buyerName||q.buyer_name}</div><div style={TEXT.tinyMeta}>{q.stone} - {q.grade}{req.isQuote?" - Quote request":""}{q.followUpAt?` - Follow up ${fmtD(q.followUpAt)}`:""}</div></div><div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>{overdue&&<span style={{fontSize:12,fontWeight:600,color:C.red,background:C.white,border:`1px solid ${C.redBorder}`,borderRadius:20,padding:"3px 8px"}}>Overdue</span>}<span style={{fontSize:12,fontWeight:600,color:(q.priority||"warm")==="hot"?C.red:(q.priority||"warm")==="low"?C.textDim:C.amber,background:C.white,border:`1px solid ${C.border}`,borderRadius:20,padding:"3px 8px",textTransform:"capitalize"}}>{q.priority||"warm"}</span><InqPill status={q.status}/></div></div>);})}</Card>}
    </div>
  );
}
function FacQuotesPage({quotes=[],insps=[],onChange}) {
  const [search,setSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [copied,setCopied]=useState("");
  const [saleBusy,setSaleBusy]=useState("");
  const [fulfillBusy,setFulfillBusy]=useState("");
  const [reviseQuote,setReviseQuote]=useState(null);
  const [reviseForm,setReviseForm]=useState({areaSqFt:"",pricePerSqFt:"",validityDate:"",notes:""});
  const [reviseBusy,setReviseBusy]=useState(false);
  const soldSlabIds=new Set(insps.filter(i=>(i.inventoryStatus||"available")==="sold").map(i=>i.id));
  function effectiveStatus(q){
    if(q.status==="sent"&&q.validityTs&&q.validityTs<Date.now())return "expired";
    if(q.status==="accepted"&&soldSlabIds.has(q.slabId||q.slab_id))return "sold";
    return q.status||"sent";
  }
  function isExpiringSoon(q){
    const vt=q.validityTs||q.validity_ts;
    return q.status==="sent"&&vt&&vt>Date.now()&&vt-Date.now()<=3*86400000;
  }
  const counts=quotes.reduce((acc,q)=>{const s=effectiveStatus(q);acc[s]=(acc[s]||0)+1;return acc;},{});
  const awaitingResponse=quotes.filter(q=>effectiveStatus(q)==="sent").length;
  const expiringSoon=quotes.filter(isExpiringSoon).length;
  const fulfillmentActionCount=quotes.filter(q=>effectiveStatus(q)==="accepted"&&!["delivered","sold"].includes(activeFulfillment(q))).length;
  const actionCount=quotes.filter(q=>["accepted","revision_requested"].includes(effectiveStatus(q))).length;
  const soldValue=quotes.filter(q=>effectiveStatus(q)==="sold").reduce((s,q)=>s+Number(q.totalAmount||q.total_amount||0),0);
  const filtered=quotes.filter(q=>{
    const hay=[q.id,q.buyerName,q.buyer_name,q.buyerCompany,q.buyer_company,q.buyerEmail,q.buyer_email,q.stone,q.slabId,q.slab_id,q.grade,q.buyerMessage,q.buyer_message].filter(Boolean).join(" ").toLowerCase();
    const status=effectiveStatus(q);
    return (statusFilter==="all"||status===statusFilter||(statusFilter==="expiring_soon"&&isExpiringSoon(q)))&&(!search||hay.includes(search.toLowerCase()));
  }).sort((a,b)=>{
    const rank=q=>effectiveStatus(q)==="revision_requested"?0:effectiveStatus(q)==="accepted"?1:isExpiringSoon(q)?2:effectiveStatus(q)==="sent"?3:effectiveStatus(q)==="expired"?4:effectiveStatus(q)==="revised"?5:effectiveStatus(q)==="sold"?6:9;
    return rank(a)-rank(b)||Number(b.created_at||0)-Number(a.created_at||0);
  });
  function statusStyle(status){
    const map={
      sent:{label:"Sent",c:C.primary,bg:C.primaryBg,b:C.primaryBorder},
      expiring_soon:{label:"Expiring soon",c:C.amber,bg:C.amberBg,b:C.amberBorder},
      accepted:{label:"Accepted",c:C.green,bg:C.greenBg,b:C.greenBorder},
      revision_requested:{label:"Changes requested",c:C.amber,bg:C.amberBg,b:C.amberBorder},
      revised:{label:"Revised",c:C.textDim,bg:C.surface,b:C.border},
      expired:{label:"Expired",c:C.red,bg:C.redBg,b:C.redBorder},
      sold:{label:"Sold",c:C.green,bg:C.greenBg,b:C.greenBorder},
    };
    return map[status]||map.sent;
  }
  function nextStep(status,q){
    const map={
      revision_requested:{text:"Buyer requested changes. Create and send a revised quote.",c:C.amber,bg:C.amberBg,b:C.amberBorder},
      accepted:{text:"Buyer accepted. Confirm payment or dispatch, then mark the slab sold.",c:C.green,bg:C.greenBg,b:C.greenBorder},
      sent:{text:"Waiting for buyer response.",c:C.primary,bg:C.primaryBg,b:C.primaryBorder},
      expired:{text:"Quote expired. Send a fresh quote if the buyer is still interested.",c:C.red,bg:C.redBg,b:C.redBorder},
      revised:{text:"This quote was replaced by a newer revision.",c:C.textDim,bg:C.surface,b:C.border},
      sold:{text:"Closed. Slab is marked sold.",c:C.green,bg:C.greenBg,b:C.greenBorder},
    };
    if(status==="sent"&&q&&isExpiringSoon(q))return {text:"Quote expires soon. Follow up with the buyer before it goes cold.",c:C.amber,bg:C.amberBg,b:C.amberBorder};
    return map[status]||map.sent;
  }
  function quoteFulfillmentSteps(current){
    const ids=["payment_pending","payment_received","dispatch_scheduled","dispatched","delivered","sold"];
    const currentIndex=ids.indexOf(current);
    return ids.map((id,i)=>({...fulfillmentConf(id),done:currentIndex>=i,current:currentIndex===i}));
  }
  async function copyQuote(q){
    const url=`${window.location.origin}/quote/${encodeURIComponent(q.id)}`;
    try{await navigator.clipboard.writeText(url);setCopied(q.id);setTimeout(()=>setCopied(""),1400);}catch(e){window.prompt("Copy quote link",url);}
  }
  async function copyFollowup(q){
    const url=`${window.location.origin}/quote/${encodeURIComponent(q.id)}`;
    const text=`Hi ${q.buyerName||q.buyer_name||"there"}, sharing the Epistable quote for ${q.stone}: ${url}`;
    try{await navigator.clipboard.writeText(text);setCopied("follow-"+q.id);setTimeout(()=>setCopied(""),1400);}catch(e){window.prompt("Copy follow-up message",text);}
  }
  function openRevision(q){
    setReviseQuote(q);
    setReviseForm({
      areaSqFt:String(q.areaSqFt||q.area_sq_ft||""),
      pricePerSqFt:String(q.pricePerSqFt||q.price_per_sq_ft||""),
      validityDate:q.validityTs||q.validity_ts?new Date(q.validityTs||q.validity_ts).toISOString().slice(0,10):"",
      notes:q.notes||""
    });
  }
  async function markQuoteSold(q){
    if(saleBusy)return;
    setSaleBusy(q.id);
    try {
      await DB.updateQuoteFulfillment(q.id,"sold");
      await DB.updInspStatus(q.slabId||q.slab_id,"sold");
      if(q.inquiryId||q.inquiry_id)await DB.updInquiry(q.inquiryId||q.inquiry_id,{status:"closed"});
      await onChange?.();
    } finally {
      setSaleBusy("");
    }
  }
  async function updateFulfillment(q,status){
    if(fulfillBusy)return;
    setFulfillBusy(q.id+"-"+status);
    try {
      await DB.updateQuoteFulfillment(q.id,status);
      await onChange?.();
    } finally {
      setFulfillBusy("");
    }
  }
  async function createRevision(){
    if(!reviseQuote||reviseBusy)return;
    const area=Number(reviseForm.areaSqFt||0);
    const price=Number(reviseForm.pricePerSqFt||0);
    if(!area||!price)return;
    setReviseBusy(true);
    try {
      const q=await DB.createQuote({
        inquiryId:reviseQuote.inquiryId||reviseQuote.inquiry_id,
        slabId:reviseQuote.slabId||reviseQuote.slab_id,
        factoryId:reviseQuote.factoryId||reviseQuote.factory_id,
        factoryName:reviseQuote.factoryName||reviseQuote.factory_name,
        buyerName:reviseQuote.buyerName||reviseQuote.buyer_name,
        buyerCompany:reviseQuote.buyerCompany||reviseQuote.buyer_company,
        buyerEmail:reviseQuote.buyerEmail||reviseQuote.buyer_email,
        stone:reviseQuote.stone,
        grade:reviseQuote.grade,
        pricePerSqFt:price,
        areaSqFt:area,
        totalAmount:Math.round(area*price),
        validityTs:reviseForm.validityDate?new Date(`${reviseForm.validityDate}T23:59:59`).getTime():null,
        notes:reviseForm.notes,
        parentQuoteId:reviseQuote.parentQuoteId||reviseQuote.parent_quote_id||reviseQuote.id,
        revisionNumber:Number(reviseQuote.revisionNumber||reviseQuote.revision_number||1)+1,
        status:"sent"
      });
      await DB.updQuote(reviseQuote.id,{status:"revised"});
      try{await DB.notifyBuyerRevisedQuote(q.id);}catch(e){console.warn("Buyer quote notification skipped",e);}
      setReviseQuote(null);await onChange?.();
      window.open(`/quote/${encodeURIComponent(q.id)}`,"_blank");
    } finally {
      setReviseBusy(false);
    }
  }
  return (
    <div>
      {reviseQuote&&<Modal title="Create Revised Quote" onClose={()=>setReviseQuote(null)}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:10,padding:12}}>
            <div style={{fontSize:13,fontWeight:600,color:C.amber,marginBottom:4}}>Buyer requested changes</div>
            <div style={{fontSize:12,color:C.textMid,lineHeight:1.55}}>{reviseQuote.buyerMessage||reviseQuote.buyer_message||"No buyer note provided."}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Inp label="Area (sq ft)" value={reviseForm.areaSqFt} onChange={v=>setReviseForm(p=>({...p,areaSqFt:v.replace(/[^0-9.]/g,"")}))}/>
            <Inp label="Price / sq ft" value={reviseForm.pricePerSqFt} onChange={v=>setReviseForm(p=>({...p,pricePerSqFt:v.replace(/[^0-9.]/g,"")}))}/>
          </div>
          <Inp label="Valid until" type="date" value={reviseForm.validityDate} onChange={v=>setReviseForm(p=>({...p,validityDate:v}))}/>
          <textarea value={reviseForm.notes} onChange={e=>setReviseForm(p=>({...p,notes:e.target.value}))} rows={3} placeholder="Revised quote notes, delivery, payment terms..." style={{width:"100%",padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,resize:"none",outline:"none",boxSizing:"border-box"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14}}>
            <div style={{fontSize:13,fontWeight:600,color:C.green}}>Total: {fmtMoney(Math.round(Number(reviseForm.areaSqFt||0)*Number(reviseForm.pricePerSqFt||0)))}</div>
            <Btn onClick={createRevision} disabled={reviseBusy||!Number(reviseForm.areaSqFt||0)||!Number(reviseForm.pricePerSqFt||0)}>{reviseBusy?"Creating...":"Create Revision"}</Btn>
          </div>
        </div>
      </Modal>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:18}}>
        <div><div style={TEXT.pageHeader}>Quotes</div><div style={TEXT.meta}>Manage sent quotes, buyer decisions, revisions, and sold status</div></div>
      </div>
      <KpiGrid items={[{label:"Awaiting Response",value:awaitingResponse,icon:"Reply",color:C.primary},{label:"Needs Action",value:actionCount,icon:"Now",color:actionCount?C.amber:C.textDim},{label:"Expiring Soon",value:expiringSoon,icon:"Due",color:expiringSoon?C.amber:C.textDim},{label:"Sold Value",value:fmtMoney(soldValue),icon:"Sold",color:C.green}]}/>
      <Card style={{padding:12,marginBottom:18}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search quote, buyer, stone, slab..." style={{padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,outline:"none",minWidth:0}}/>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,outline:"none"}}>
            <option value="all">All statuses</option>
            <option value="sent">Sent</option>
            <option value="expiring_soon">Expiring soon</option>
            <option value="accepted">Accepted</option>
            <option value="revision_requested">Changes requested</option>
            <option value="revised">Revised</option>
            <option value="expired">Expired</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:14}}>
          {["sent","expiring_soon","accepted","revision_requested","revised","expired","sold"].map(s=>{const cfg=statusStyle(s);const count=s==="expiring_soon"?expiringSoon:counts[s]||0;return <button key={s} onClick={()=>setStatusFilter(statusFilter===s?"all":s)} style={{padding:"5px 10px",background:statusFilter===s?cfg.bg:C.white,border:`1px solid ${statusFilter===s?cfg.b:C.border}`,borderRadius:20,color:statusFilter===s?cfg.c:C.textDim,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>{cfg.label} ({count})</button>;})}
        </div>
      </Card>
      {filtered.length===0?<EmptyState title={quotes.length?"No matching quotes":"No quotes found"} body={quotes.length?"Clear the filters or search another quote, buyer, slab, or stone.":"Create a quote from a buyer inquiry. Sent quotes become buyer links, and accepted quotes become trackable orders."} actionLabel={quotes.length?"Clear filters":undefined} onAction={()=>{setSearch("");setStatusFilter("all");}}/>:
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {filtered.map(q=>{const status=effectiveStatus(q);const cfg=statusStyle(status);const step=nextStep(status,q);const canRevise=status==="revision_requested";const canSell=status==="accepted";const fulfillment=fulfillmentConf(activeFulfillment(q));const buyerEmail=q.buyerEmail||q.buyer_email;return(
          <Card key={q.id} style={{padding:20,borderColor:canRevise?C.amberBorder:canSell?C.greenBorder:C.border}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"flex-start",marginBottom:14,flexWrap:"wrap"}}>
              <div style={{minWidth:0}}>
                <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                  <span style={{fontSize:12,fontFamily:"monospace",fontWeight:600,color:C.text}}>{q.id}</span>
                  <span style={{fontSize:12,fontWeight:600,color:cfg.c,background:cfg.bg,border:`1px solid ${cfg.b}`,borderRadius:20,padding:"2px 8px"}}>{cfg.label}</span>
                  {isExpiringSoon(q)&&<span style={{fontSize:12,fontWeight:600,color:C.amber,background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:20,padding:"2px 8px"}}>Expiring soon</span>}
                  {status==="accepted"&&<span style={{fontSize:12,fontWeight:600,color:fulfillment.color,background:fulfillment.bg,border:`1px solid ${fulfillment.border}`,borderRadius:20,padding:"2px 8px"}}>{fulfillment.label}</span>}
                  {(q.revisionNumber||q.revision_number)>1&&<span style={{fontSize:12,fontWeight:600,color:C.purple,background:C.purpleBg,border:`1px solid ${C.purpleBorder}`,borderRadius:20,padding:"2px 8px"}}>Rev {q.revisionNumber||q.revision_number}</span>}
                </div>
                <div style={{fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.buyerCompany||q.buyerName||"Buyer"}</div>
                <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{q.stone} Â· {q.grade} Â· {q.slabId||q.slab_id}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:18,fontWeight:700,color:C.green}}>{fmtMoney(Number(q.totalAmount||0))}</div>
                <div style={{fontSize:12,color:C.textDim}}>{q.validityTs||q.validity_ts?`Valid ${fmtD(q.validityTs||q.validity_ts)}`:"No validity"}</div>
              </div>
            </div>
            <div style={{background:step.bg,border:`1px solid ${step.b}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:step.c,lineHeight:1.65,fontWeight:600,marginBottom:14}}>{step.text}</div>
            {status==="accepted"&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:10,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:8}}>Fulfillment stage</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:6}}>
                {quoteFulfillmentSteps(activeFulfillment(q)).map(s=><button key={s.id} disabled={!!fulfillBusy||s.id==="sold"} onClick={()=>updateFulfillment(q,s.id)} style={{padding:"8px 6px",background:s.current?s.bg:C.white,border:`1px solid ${s.current?s.border:C.border}`,borderRadius:8,color:s.current?s.color:C.textMid,fontSize:12,fontWeight:600,cursor:fulfillBusy||s.id==="sold"?"not-allowed":"pointer",fontFamily:FONT_STACK,opacity:s.id==="sold"?0.65:1}}>{s.done&&!s.current?"Done Â· ":""}{s.label}</button>)}
              </div>
            </div>}
            {(q.buyerMessage||q.buyer_message)&&<div style={{background:C.white,border:`1px solid ${canRevise?C.amberBorder:C.border}`,borderRadius:8,padding:"13px 14px",fontSize:12,color:C.textMid,lineHeight:1.65,marginBottom:14}}><span style={{fontWeight:700,color:canRevise?C.amber:C.text}}>Buyer note:</span> {q.buyerMessage||q.buyer_message}</div>}
            <div style={{display:"flex",gap:14,flexWrap:"wrap",justifyContent:"flex-end"}}>
              <Btn size="sm" variant="secondary" onClick={()=>window.open(`/quote/${encodeURIComponent(q.id)}`,"_blank","noopener,noreferrer")}>Open Buyer Quote</Btn>
              <Btn size="sm" variant="secondary" onClick={()=>copyQuote(q)}>{copied===q.id?"Copied":"Copy Link"}</Btn>
              <Btn size="sm" variant="secondary" onClick={()=>copyFollowup(q)}>{copied==="follow-"+q.id?"Copied Msg":"Copy Follow-up"}</Btn>
              {buyerEmail&&<Btn size="sm" variant="secondary" onClick={()=>{window.location.href=`mailto:${buyerEmail}?subject=Epistable quote ${q.id}`;}}>Email Buyer</Btn>}
              {(q.slabId||q.slab_id)&&<Btn size="sm" variant="secondary" onClick={()=>window.open(`/slab/${encodeURIComponent(q.slabId||q.slab_id)}`,"_blank","noopener,noreferrer")}>View Slab</Btn>}
              {canRevise&&<Btn size="sm" variant="ghost" onClick={()=>openRevision(q)}>Create Revised Quote</Btn>}
              {canSell&&<Btn size="sm" variant="green" disabled={saleBusy===q.id} onClick={()=>markQuoteSold(q)}>{saleBusy===q.id?"Closing...":"Mark Slab Sold"}</Btn>}
            </div>
          </Card>
        );})}
      </div>}
    </div>
  );
}

function FacSalesDashboard({inquiries=[],insps=[],disputes=[],quotes=[],setPage,onChange}) {
  const [orderBusy,setOrderBusy]=useState("");
  const [orderCopied,setOrderCopied]=useState("");
  const [briefCopied,setBriefCopied]=useState(false);
  const byStatus=s=>inquiries.filter(q=>q.status===s).length;
  const overdue=inquiries.filter(q=>q.followUpAt&&q.followUpAt<Date.now()&&q.status!=="closed");
  const funnel=[["New",byStatus("new"),C.primary],["Contacted",byStatus("contacted"),C.amber],["Reserved",byStatus("reserved"),C.purple],["Closed",byStatus("closed"),C.green]];
  const maxFunnel=Math.max(1,...funnel.map(x=>x[1]));
  const slabInterest=Object.values(inquiries.reduce((acc,q)=>{
    const id=q.slabId||q.slab_id||"unknown";
    acc[id]=acc[id]||{id,stone:q.stone,grade:q.grade,count:0,latest:0};
    acc[id].count+=1;acc[id].latest=Math.max(acc[id].latest,q.created_at||0);
    return acc;
  },{})).sort((a,b)=>b.count-a.count||b.latest-a.latest).slice(0,5);
  const recent=[
    ...inquiries.slice(0,8).map(q=>({kind:"Inquiry",title:q.buyerName||q.buyer_name||"Buyer",sub:`${q.stone} Â· ${q.status}`,ts:q.created_at||0,color:q.status==="new"?C.primary:q.status==="reserved"?C.purple:C.textMid})),
    ...disputes.slice(0,5).map(d=>({kind:"Dispute",title:d.buyerName||d.buyer_name||"Buyer",sub:`${d.stone} Â· ${d.status}`,ts:d.created_at||0,color:d.status==="open"?C.red:C.textMid})),
  ].sort((a,b)=>b.ts-a.ts).slice(0,8);
  const soldSlabIds=new Set(insps.filter(i=>(i.inventoryStatus||"available")==="sold").map(i=>i.id));
  const sentQuotes=quotes.filter(q=>q.status==="sent").length;
  const acceptedQuotes=quotes.filter(q=>q.status==="accepted").length;
  const soldQuotes=quotes.filter(q=>q.status==="accepted"&&soldSlabIds.has(q.slabId||q.slab_id));
  const acceptedActionItems=quotes.filter(q=>q.status==="accepted"&&!soldSlabIds.has(q.slabId||q.slab_id)).slice(0,5);
  const wonValue=soldQuotes.reduce((sum,q)=>sum+Number(q.totalAmount||q.total_amount||0),0);
  const decidedQuotes=quotes.filter(q=>q.status==="accepted"||q.status==="revision_requested").slice(0,5);
  const revisionRequests=quotes.filter(q=>q.status==="revision_requested").slice(0,5);
  const fulfillmentStages=["payment_pending","payment_received","dispatch_scheduled","dispatched","delivered"];
  const activeOrders=quotes
    .filter(q=>q.status==="accepted"&&!soldSlabIds.has(q.slabId||q.slab_id)&&activeFulfillment(q)!=="sold")
    .sort((a,b)=>fulfillmentStages.indexOf(activeFulfillment(a))-fulfillmentStages.indexOf(activeFulfillment(b))||Number(a.created_at||0)-Number(b.created_at||0));
  const stageCounts=fulfillmentStages.map(id=>({conf:fulfillmentConf(id),count:activeOrders.filter(q=>activeFulfillment(q)===id).length}));
  const stageRank={payment_pending:0,payment_received:1,dispatch_scheduled:2,dispatched:3,delivered:4,sold:5};
  function orderAction(q){
    const status=activeFulfillment(q);
    const map={payment_pending:"Confirm payment",payment_received:"Schedule dispatch",dispatch_scheduled:"Dispatch slab",dispatched:"Confirm delivery",delivered:"Mark sold"};
    return map[status]||"Review order";
  }
  function nextOrderStatus(q){
    const status=activeFulfillment(q);
    const map={payment_pending:"payment_received",payment_received:"dispatch_scheduled",dispatch_scheduled:"dispatched",dispatched:"delivered",delivered:"sold"};
    return map[status]||"payment_pending";
  }
  async function copyOrderLink(q){
    const url=`${window.location.origin}/quote/${encodeURIComponent(q.id)}`;
    try{await navigator.clipboard.writeText(url);setOrderCopied(q.id);setTimeout(()=>setOrderCopied(""),1400);}catch(e){window.prompt("Copy quote link",url);}
  }
  async function copySalesBrief(){
    const text=[
      `Epistable sales update - ${fmtD(Date.now())}`,
      `New inquiries: ${byStatus("new")}`,
      `Quotes sent: ${sentQuotes}`,
      `Accepted quotes: ${acceptedQuotes}`,
      `Active orders: ${activeOrders.length}`,
      `Sold value: Rs ${wonValue.toLocaleString("en-IN")}`,
      overdue.length?`Overdue follow-ups: ${overdue.map(q=>q.buyerName||q.buyer_name||"Buyer").slice(0,3).join(", ")}`:"No overdue follow-ups",
    ].join("\n");
    try{await navigator.clipboard.writeText(text);setBriefCopied(true);setTimeout(()=>setBriefCopied(false),1400);}catch(e){window.prompt("Copy sales update",text);}
  }
  async function advanceOrder(q){
    if(orderBusy)return;
    const next=nextOrderStatus(q);
    setOrderBusy(q.id);
    try {
      await DB.updateQuoteFulfillment(q.id,next);
      if(next==="sold"){
        await DB.updInspStatus(q.slabId||q.slab_id,"sold");
        if(q.inquiryId||q.inquiry_id)await DB.updInquiry(q.inquiryId||q.inquiry_id,{status:"closed"});
      }
      await onChange?.();
    } finally {
      setOrderBusy("");
    }
  }
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div><div style={TEXT.pageHeader}>Sales Dashboard</div><div style={TEXT.meta}>Buyer demand, quote movement, and follow-ups</div></div>
        <Btn size="sm" variant="ghost" onClick={()=>setPage("quotes")}>Open Quotes</Btn>
      </div>
      <KpiGrid items={[{label:"New Inquiries",value:byStatus("new"),icon:"New",color:C.primary},{label:"Quotes Sent",value:sentQuotes,icon:"currency",color:C.green},{label:"Accepted Quotes",value:acceptedQuotes,icon:"Won",color:C.green},{label:"Sold Value",value:fmtMoney(wonValue),icon:"Sold",color:C.green}]}/>
      <GuidanceCard title="Sales operating rhythm" subtitle="A simple daily checklist for factory follow-up" actionLabel={briefCopied?"Copied":"Copy update"} onAction={copySalesBrief} style={{marginBottom:18}} items={[
        {label:"Morning",detail:"Review new inquiries and send quotes for interested slabs.",color:C.primary,bg:C.primaryBg,border:C.primaryBorder},
        {label:"Afternoon",detail:"Follow up sent quotes and handle buyer change requests.",color:C.amber,bg:C.amberBg,border:C.amberBorder},
        {label:"Dispatch",detail:"Move accepted orders through payment, dispatch, delivery, and sold.",color:C.green,bg:C.greenBg,border:C.greenBorder},
      ]}/>
      <Card style={{padding:20,marginBottom:18,borderColor:activeOrders.length?C.primaryBorder:C.border}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:18}}>
          <div>
            <div style={{fontSize:15,fontWeight:700}}>Active Orders</div>
            <div style={{fontSize:12,color:C.textDim,marginTop:2}}>Accepted quotes that need payment, dispatch, delivery, or sold closure</div>
          </div>
          <Btn size="sm" variant={activeOrders.length?"primary":"secondary"} onClick={()=>setPage("quotes")}>Manage Orders</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:14,marginBottom:activeOrders.length?14:0}}>
          {stageCounts.map(({conf,count})=>(
            <div key={conf.id} style={{background:count?conf.bg:C.surface,border:`1px solid ${count?conf.border:C.border}`,borderRadius:10,padding:"10px 9px"}}>
              <div style={{fontSize:18,fontWeight:700,color:count?conf.color:C.textDim,lineHeight:1}}>{count}</div>
              <div style={{fontSize:12,fontWeight:600,color:count?conf.color:C.textDim,marginTop:5}}>{conf.label}</div>
            </div>
          ))}
        </div>
        {activeOrders.length===0?<div style={{fontSize:13,color:C.textDim,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>No active accepted orders yet. When a buyer accepts a quote, it will appear here until sold.</div>:
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {activeOrders.slice(0,5).map(q=>{const conf=fulfillmentConf(activeFulfillment(q));const nextIndex=Math.max(0,stageRank[activeFulfillment(q)]??0);return(
            <div key={q.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1.2fr) minmax(120px,0.7fr) auto",gap:14,alignItems:"center",padding:"11px 0",borderTop:`1px solid ${C.border}`}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.buyerCompany||q.buyerName||"Buyer"}</div>
                <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{q.stone} - {fmtMoney(Number(q.totalAmount||q.total_amount||0))} - {q.id}</div>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:conf.color,marginBottom:5}}>{conf.label}</div>
                <PBar value={(nextIndex+1)/fulfillmentStages.length*100} color={conf.color} h={6}/>
              </div>
              <div style={{display:"flex",gap:6,justifyContent:"flex-end",flexWrap:"wrap"}}>
                <Btn size="sm" variant="secondary" onClick={()=>window.open(`/quote/${encodeURIComponent(q.id)}`,"_blank","noopener,noreferrer")}>Open</Btn>
                <Btn size="sm" variant="secondary" onClick={()=>copyOrderLink(q)}>{orderCopied===q.id?"Copied":"Copy"}</Btn>
                <Btn size="sm" variant={activeFulfillment(q)==="delivered"?"green":"ghost"} disabled={orderBusy===q.id} onClick={()=>advanceOrder(q)}>{orderBusy===q.id?"Updating...":orderAction(q)}</Btn>
              </div>
            </div>
          );})}
          {activeOrders.length>5&&<button onClick={()=>setPage("quotes")} style={{background:"transparent",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK,padding:"8px 0 0",textAlign:"left"}}>View {activeOrders.length-5} more active orders</button>}
        </div>}
      </Card>
      {revisionRequests.length>0&&<Card style={{padding:20,marginBottom:18,borderColor:C.amberBorder,background:C.amberBg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:14}}>
          <div><div style={{fontSize:14,fontWeight:700,color:C.amber}}>Quote changes requested</div><div style={{fontSize:12,color:C.textMid,marginTop:2}}>Handle these in Quotes so revisions stay tracked in one place.</div></div>
          <Btn size="sm" variant="ghost" onClick={()=>setPage("quotes")}>{revisionRequests.length} to review</Btn>
        </div>
        {revisionRequests.map((q,i)=>(
          <div key={q.id} style={{display:"flex",alignItems:"center",gap:14,padding:"10px 0",borderTop:i===0?`1px solid ${C.amberBorder}`:"none",borderBottom:i<revisionRequests.length-1?`1px solid ${C.amberBorder}`:"none"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.buyerCompany||q.buyerName||"Buyer"}</div>
              <div style={{fontSize:12,color:C.textMid}}>{q.stone} Â· {fmtMoney(Number(q.totalAmount||0))}</div>
              {q.buyerMessage&&<div style={{fontSize:12,color:C.textMid,lineHeight:1.65,marginTop:4}}>{q.buyerMessage}</div>}
            </div>
            <Btn size="sm" variant="ghost" onClick={()=>setPage("quotes")}>Review</Btn>
          </div>
        ))}
      </Card>}
      {acceptedActionItems.length>0&&<Card style={{padding:20,marginBottom:18,borderColor:C.greenBorder,background:C.greenBg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:14}}>
          <div><div style={{fontSize:14,fontWeight:700,color:C.green}}>Accepted quotes ready to move</div><div style={{fontSize:12,color:C.textMid,marginTop:2}}>Advance payment, dispatch, delivery, and sold status from this dashboard.</div></div>
          <Btn size="sm" variant="ghost" onClick={()=>setPage("quotes")}>Open Quotes</Btn>
        </div>
        {acceptedActionItems.map((q,i)=>(
          <div key={q.id} style={{display:"flex",alignItems:"center",gap:14,padding:"10px 0",borderTop:i===0?`1px solid ${C.greenBorder}`:"none",borderBottom:i<acceptedActionItems.length-1?`1px solid ${C.greenBorder}`:"none"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.buyerCompany||q.buyerName||"Buyer"}</div>
              <div style={{fontSize:12,color:C.textMid}}>{q.stone} Â· {fmtMoney(Number(q.totalAmount||0))}</div>
            </div>
            <Btn size="sm" variant="green" disabled={orderBusy===q.id} onClick={()=>advanceOrder(q)}>{orderBusy===q.id?"Updating...":orderAction(q)}</Btn>
          </div>
        ))}
      </Card>}
      {overdue.length>0&&<Card style={{padding:20,marginBottom:18,borderColor:C.redBorder,background:C.redBg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14}}>
          <div><div style={{fontSize:14,fontWeight:700,color:C.red}}>Follow up now</div><div style={{fontSize:12,color:C.textMid,marginTop:2}}>{overdue.slice(0,3).map(q=>q.buyerName||q.buyer_name).join(", ")}</div></div>
          <Btn size="sm" variant="red" onClick={()=>setPage("inquiries")}>Review</Btn>
        </div>
      </Card>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14}}>
        <Card style={{padding:20}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:18}}>Inquiry Funnel</div>
          {funnel.map(([label,count,color])=>(
            <div key={label} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,marginBottom:5}}><span>{label}</span><span style={{color}}>{count}</span></div>
              <PBar value={count/maxFunnel*100} color={color} h={8}/>
            </div>
          ))}
        </Card>
        <Card style={{padding:20}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>Top Interested Slabs</div>
          {slabInterest.length===0?<div style={{fontSize:13,color:C.textDim}}>No buyer interest yet</div>:slabInterest.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:14,padding:"10px 0",borderBottom:i<slabInterest.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{width:28,height:28,borderRadius:8,background:C.primaryBg,color:C.primary,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600}}>{i+1}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.stone||s.id}</div><div style={{fontSize:12,color:C.textDim}}>{s.grade||"Grade"} Â· {s.id}</div></div>
              <div style={{fontSize:13,fontWeight:600,color:C.primary}}>{s.count}</div>
            </div>
          ))}
        </Card>
        <Card style={{padding:20}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>Recent Buyer Activity</div>
          {recent.length===0?<div style={{fontSize:13,color:C.textDim}}>No buyer activity yet</div>:recent.map((a,i)=>(
            <div key={`${a.kind}-${a.ts}-${i}`} style={{display:"flex",gap:14,padding:"10px 0",borderBottom:i<recent.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:a.color,marginTop:5,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{a.kind}: {a.title}</div><div style={{fontSize:12,color:C.textDim}}>{a.sub} Â· {fmtD(a.ts)}</div></div>
            </div>
          ))}
        </Card>
        <Card style={{padding:20}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>Latest Quote Updates</div>
          {decidedQuotes.length===0?<div style={{fontSize:13,color:C.textDim}}>No accepted quotes or change requests yet.</div>:decidedQuotes.map((q,i)=>{
            const accepted=q.status==="accepted";
            return (
              <div key={q.id} style={{padding:"10px 0",borderBottom:i<decidedQuotes.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:14,marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.buyerCompany||q.buyerName||"Buyer"}</div>
                  <span style={{fontSize:12,fontWeight:600,color:accepted?C.green:C.amber,background:accepted?C.greenBg:C.amberBg,border:`1px solid ${accepted?C.greenBorder:C.amberBorder}`,borderRadius:20,padding:"2px 8px",whiteSpace:"nowrap"}}>{accepted?"Accepted":"Changes requested"}</span>
                </div>
                <div style={{fontSize:12,color:C.textDim,marginBottom:q.buyerMessage?4:0}}>{q.stone} Â· {fmtMoney(Number(q.totalAmount||0))}</div>
                {q.buyerMessage&&<div style={{fontSize:12,color:C.textMid,lineHeight:1.65}}>{q.buyerMessage}</div>}
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

function FacDisputes({fac}) {
  const [disputes,setDisputes]=useState([]);const [sel,setSel]=useState(null);const [response,setResponse]=useState("");
  async function load(){setDisputes(await DB.facDisputes(fac?.id||""));}
  useEffect(()=>{load();},[]);
  async function update(id,status){await DB.updDispute(id,{status,response:response||undefined});setSel(null);setResponse("");load();}
  const catLabel={wrong_grade:"Wrong Grade",defect_missed:"Defect Missed",measurement:"Wrong Measurement",other:"Other"};
  return (
    <div>
      {sel&&<Modal title="Dispute" onClose={()=>{setSel(null);setResponse("");}}>
        <div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:20,marginBottom:18}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{sel.stone} â€” {catLabel[sel.category]||sel.category}</div>
          <div style={{fontSize:13,lineHeight:1.7}}>{sel.details}</div>
        </div>
        <div style={{marginBottom:16}}><textarea value={response} onChange={e=>setResponse(e.target.value)} rows={3} placeholder="Your responseâ€¦" style={{width:"100%",padding:"12px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,resize:"none",outline:"none",boxSizing:"border-box"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Btn variant="secondary" size="sm" onClick={()=>update(sel.id,"dismissed")}>âœ— Dismiss</Btn>
          <Btn variant="green" size="sm" onClick={()=>update(sel.id,"resolved")}>âœ… Resolve</Btn>
        </div>
      </Modal>}
      <div style={TEXT.pageTitle}>Disputes</div>
      {disputes.length===0?<EmptyState title="No disputes" body="Buyer certificate disputes and mismatch reports will appear here. For now, your certificate trail is clean."/>:
      <Card>{disputes.map((d,i)=>(
        <div key={d.id} onClick={()=>{setSel(d);setResponse(d.response||"");}} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderBottom:i<disputes.length-1?`1px solid ${C.border}`:"none",cursor:"pointer",background:d.status==="open"?C.redBg:C.white}}>
          <div style={{flex:1,minWidth:0}}><div style={TEXT.itemTitle}>{d.stone}</div><div style={TEXT.tinyMeta}>{catLabel[d.category]||d.category} Â· {d.buyer_name}</div></div>
          <DisputeStatusPill status={d.status}/>
        </div>
      ))}</Card>}
    </div>
  );
}

function FacNotifs({notifs,onRead}) {
  useEffect(()=>{if(notifs.some(n=>!n.read))onRead();},[]);
  return (
    <div>
      <div style={TEXT.pageTitle}>Alerts</div>
      {notifs.length===0?<EmptyState title="No alerts yet" body="Quote updates, buyer decisions, follow-ups, and order movement will appear here."/>:
      <Card>{notifs.map((n,i)=>(
        <div key={n.id} style={{display:"flex",gap:14,padding:"14px 16px",borderBottom:i<notifs.length-1?`1px solid ${C.border}`:"none",background:n.read?C.white:C.primaryBg}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}><ChromeIcon icon={n.icon||"bell"} size={16} color={C.primary}/></div>
          <div style={{flex:1}}><div style={{...TEXT.itemTitle,marginBottom:2}}>{n.title}</div><div style={{...TEXT.meta,color:C.textMid}}>{n.msg}</div></div>
        </div>
      ))}</Card>}
    </div>
  );
}

// â”€â”€ BUYER â”€â”€
function quoteStatusConf(status) {
  const m={
    sent:{label:"Sent",c:C.primary,bg:C.primaryBg,b:C.primaryBorder},
    accepted:{label:"Accepted",c:C.green,bg:C.greenBg,b:C.greenBorder},
    revision_requested:{label:"Changes requested",c:C.amber,bg:C.amberBg,b:C.amberBorder},
    revised:{label:"Revised",c:C.textDim,bg:C.surface,b:C.border},
    expired:{label:"Expired",c:C.red,bg:C.redBg,b:C.redBorder},
    sold:{label:"Sold",c:C.green,bg:C.greenBg,b:C.greenBorder},
  };
  return m[status]||m.sent;
}

function quoteTimelineItems(q) {
  const status=q.status||"sent";
  const expired=q.validityTs&&q.validityTs<Date.now();
  const timelineStatus=expired&&status==="sent"?"expired":status;
  const fulfillment=fulfillmentConf(activeFulfillment(q));
  const fulfillmentIndex=QUOTE_FULFILLMENT.findIndex(s=>s.id===fulfillment.id);
  return [
    {label:"Quote sent",detail:q.created_at?fmtD(q.created_at):"Sent by factory",done:true,current:false},
    {
      label:"Buyer response",
      detail:timelineStatus==="accepted"?"Accepted by buyer":timelineStatus==="revision_requested"?"Changes requested":timelineStatus==="revised"?"Revised quote issued":timelineStatus==="expired"?"Expired before response":"Waiting for response",
      done:["accepted","revision_requested","revised"].includes(timelineStatus),
      current:timelineStatus==="sent"
    },
    ...(["accepted"].includes(timelineStatus)?QUOTE_FULFILLMENT.filter(x=>x.id!=="not_started").map(x=>({
      label:x.label,
      detail:x.buyer,
      done:fulfillmentIndex>=QUOTE_FULFILLMENT.findIndex(s=>s.id===x.id),
      current:fulfillment.id===x.id
    })):[{
      label:timelineStatus==="revision_requested"?"Factory review":timelineStatus==="revised"?"Revised quote":timelineStatus==="expired"?"Quote expired":"Order tracking",
      detail:timelineStatus==="revision_requested"?"Factory can send a revised quote":timelineStatus==="revised"?"Use the latest quote from the factory":timelineStatus==="expired"?"Ask the factory for a fresh quote":"Starts after quote acceptance",
      done:timelineStatus==="revised",
      current:timelineStatus==="revision_requested"
    }])
  ];
}

function BuyerQuoteTimeline({quote}) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14}}>
      {quoteTimelineItems(quote).map((step,i)=>(
        <div key={`${quote.id}-${step.label}`} style={{display:"flex",gap:14,alignItems:"flex-start",background:step.current?C.primaryBg:step.done?C.greenBg:C.surface,border:`1px solid ${step.current?C.primaryBorder:step.done?C.greenBorder:C.border}`,borderRadius:10,padding:10}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:step.done?C.green:step.current?C.primary:C.border,color:step.done||step.current?C.white:C.textDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,flexShrink:0}}>{step.done?"OK":i+1}</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:step.done?C.green:step.current?C.primary:C.text}}>{step.label}</div>
            <div style={{fontSize:12,color:C.textMid,lineHeight:1.55,marginTop:2}}>{step.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function buyerQuoteNextAction(q) {
  const expired=q.validityTs&&q.validityTs<Date.now()&&q.status==="sent";
  if(expired)return {label:"Ask factory for updated quote",color:C.red,bg:C.redBg,border:C.redBorder};
  if(q.status==="sent")return {label:"Accept or request changes",color:C.primary,bg:C.primaryBg,border:C.primaryBorder};
  if(q.status==="revision_requested")return {label:"Waiting for factory revision",color:C.amber,bg:C.amberBg,border:C.amberBorder};
  if(q.status==="accepted") {
    const f=fulfillmentConf(activeFulfillment(q));
    return {label:f.buyer,color:f.color,bg:f.bg,border:f.border};
  }
  if(q.status==="revised")return {label:"A newer quote replaced this one",color:C.textDim,bg:C.surface,border:C.border};
  return {label:"Quote closed",color:C.textDim,bg:C.surface,border:C.border};
}

function buyerQuotePriority(q) {
  const expired=q.validityTs&&q.validityTs<Date.now()&&q.status==="sent";
  if(q.status==="sent"&&!expired)return 0;
  if(q.status==="accepted"&&activeFulfillment(q)!=="sold")return 1;
  if(q.status==="revision_requested")return 2;
  if(expired)return 3;
  if(q.status==="revised")return 4;
  if(activeFulfillment(q)==="sold")return 5;
  return 6;
}

function BuyerQuotesPage({buyer,onBack,onLogout,onViewPortal,embedded=false}) {
  const [fac,setFac]=useState(null);const [quotes,setQuotes]=useState([]);const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("active");const [search,setSearch]=useState("");const [sortBy,setSortBy]=useState("priority");const [copiedQuote,setCopiedQuote]=useState("");
  const [quoteAction,setQuoteAction]=useState(null);const [quoteMsg,setQuoteMsg]=useState("");const [quoteBusy,setQuoteBusy]=useState("");const [quoteError,setQuoteError]=useState("");
  const [loadError,setLoadError]=useState("");
  const [resolvedFactoryId,setResolvedFactoryId]=useState(buyer.factory_id||buyer.factoryId||"");
  const {isMobile}=useBP();
  const buyerFactoryId=buyer.factory_id||buyer.factoryId||resolvedFactoryId;
  async function load(){
    let fid=buyerFactoryId;
    if(!fid){fid=await resolveBuyerFactoryId(buyer);if(fid)setResolvedFactoryId(fid);}
    if(!fid){setLoadError("This buyer is not linked to a factory yet.");setLoading(false);return;}
    setLoading(true);setLoadError("");
    try {
      const [f,qt]=await Promise.all([DB.getFac(fid),DB.buyerQuotes(buyer.email,fid)]);
      setFac(f);setQuotes(qt);
    } catch(e) {
      setLoadError(e.message||"Could not load buyer quotes.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{load();},[buyer.email,buyer.factory_id,buyer.factoryId,resolvedFactoryId]);
  function openQuoteAction(q,decision){setQuoteAction({quote:q,decision});setQuoteMsg("");setQuoteError("");}
  async function submitQuoteAction(){
    if(!quoteAction||quoteBusy)return;
    setQuoteBusy(quoteAction.decision);setQuoteError("");
    const {data,error}=await supabase.rpc("respond_to_quote",{quote_id:quoteAction.quote.id,decision:quoteAction.decision,message:quoteMsg});
    setQuoteBusy("");
    if(error){setQuoteError(error.message||"Could not update quote.");return;}
    const row=Array.isArray(data)?data[0]:data;
    if(row)setQuotes(prev=>prev.map(q=>q.id===row.id?mapQuote(row):q));
    setQuoteAction(null);setQuoteMsg("");
  }
  async function copyBuyerQuoteSummary(q){
    const next=buyerQuoteNextAction(q);
    const text=[
      `Epistable quote: ${q.id}`,
      `Factory: ${q.factoryName||q.factory_name||fac?.name||"Verified factory"}`,
      `Slab: ${q.slabId||q.slab_id||"-"} | ${q.stone} | ${q.grade}`,
      `Area: ${Number(q.areaSqFt||q.area_sq_ft||0).toLocaleString("en-IN")} sq ft`,
      `Total: Rs ${Number(q.totalAmount||q.total_amount||0).toLocaleString("en-IN")}`,
      `Status: ${next.label}`,
      `${window.location.origin}/quote/${encodeURIComponent(q.id)}`,
    ].join("\n");
    try{await navigator.clipboard.writeText(text);setCopiedQuote(q.id);setTimeout(()=>setCopiedQuote(""),1400);}catch(e){window.prompt("Copy quote summary",text);}
  }
  const filtered=useMemo(()=>{
    const qText=search.toLowerCase();
    return quotes.filter(q=>{
      const expired=q.validityTs&&q.validityTs<Date.now()&&q.status==="sent";
      const matchesFilter=filter==="respond"?q.status==="sent"&&!expired:
        filter==="accepted"?q.status==="accepted"&&activeFulfillment(q)!=="sold":
        filter==="closed"?expired||q.status==="revised"||activeFulfillment(q)==="sold":
        !expired&&q.status!=="revised"&&activeFulfillment(q)!=="sold";
      const hay=[q.id,q.stone,q.grade,q.slabId,q.slab_id,q.factoryName,q.factory_name,q.buyerMessage,q.buyer_message].filter(Boolean).join(" ").toLowerCase();
      return matchesFilter&&(!qText||hay.includes(qText));
    }).sort((a,b)=>{
      if(sortBy==="newest")return Number(b.created_at||0)-Number(a.created_at||0);
      if(sortBy==="valueHigh")return Number(b.totalAmount||b.total_amount||0)-Number(a.totalAmount||a.total_amount||0);
      if(sortBy==="valueLow")return Number(a.totalAmount||a.total_amount||0)-Number(b.totalAmount||b.total_amount||0);
      return buyerQuotePriority(a)-buyerQuotePriority(b)||Number(b.created_at||0)-Number(a.created_at||0);
    });
  },[quotes,filter,search,sortBy]);
  const quoteCounts=useMemo(()=>quotes.reduce((acc,q)=>{
    const expired=q.validityTs&&q.validityTs<Date.now()&&q.status==="sent";
    acc.needResponse+=q.status==="sent"&&!expired?1:0;
    acc.accepted+=q.status==="accepted"&&activeFulfillment(q)!=="sold"?1:0;
    return acc;
  },{needResponse:0,accepted:0}),[quotes]);
  const needResponse=quoteCounts.needResponse;
  const accepted=quoteCounts.accepted;
  if(loading)return embedded?<div style={{padding:isMobile?"48px 0":"72px 0"}}><Loader/></div>:<Loader/>;
  return (
    <div style={{minHeight:embedded?"auto":"100vh",background:embedded?"transparent":C.bg,fontFamily:FONT_STACK,color:C.text}}>
      {quoteAction&&<Modal title={quoteAction.decision==="accepted"?"Accept Quote":"Request Changes"} onClose={()=>{setQuoteAction(null);setQuoteError("");}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>{quoteAction.quote.stone} - {fmtMoney(Number(quoteAction.quote.totalAmount||0))}</div>
            <div style={{fontSize:12,color:C.textDim}}>{quoteAction.quote.grade} - {quoteAction.quote.id}</div>
          </div>
          <textarea value={quoteMsg} onChange={e=>setQuoteMsg(e.target.value)} rows={3} placeholder={quoteAction.decision==="accepted"?"Optional note for the factory":"What should the factory change?"} style={{width:"100%",padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,resize:"none",outline:"none",boxSizing:"border-box"}}/>
          {quoteError&&<div style={{fontSize:12,color:C.red,background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 10px"}}>{quoteError}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Btn variant="secondary" onClick={()=>setQuoteAction(null)}>Cancel</Btn>
            <Btn variant={quoteAction.decision==="accepted"?"green":"primary"} onClick={submitQuoteAction} disabled={!!quoteBusy}>{quoteBusy?"Sending...":quoteAction.decision==="accepted"?"Accept Quote":"Send Request"}</Btn>
          </div>
        </div>
      </Modal>}
      {!embedded&&<div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,padding:"16px 16px 22px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:16}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:C.white,padding:"7px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Back</button>
          <button onClick={onLogout} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:C.white,padding:"7px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Sign Out</button>
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.68)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:5}}>Buyer Quotes</div>
        <div style={{fontSize:24,fontWeight:700,color:C.white,marginBottom:4}}>Track quotes and orders</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.75)"}}>{fac?.name||buyer.factory_name||"Factory"} - {quotes.length} quotes</div>
      </div>}
      <div style={{padding:embedded?0:"14px 14px 60px"}}>
        <ErrorNotice message={loadError} onRetry={load}/>
        <KpiGrid items={[{label:"Need Response",value:needResponse,icon:"Reply",color:C.primary},{label:"Accepted",value:accepted,icon:"Won",color:C.green},{label:"Total Quotes",value:quotes.length,icon:"Quote",color:C.text},{label:"Factory",value:fac?.name?"1":"-",icon:"Mill",color:C.teal}]}/>
        <Card style={{padding:12,marginBottom:18}}>
          <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(130px,180px)",gap:14}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search quote, slab, stone..." style={{padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,outline:"none",minWidth:0}}/>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,outline:"none",minWidth:0}}>
              <option value="priority">Priority first</option>
              <option value="newest">Newest first</option>
              <option value="valueHigh">Value high-low</option>
              <option value="valueLow">Value low-high</option>
            </select>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginTop:9}}>
            <div style={{fontSize:12,color:C.textDim,fontWeight:600}}>{filtered.length} of {quotes.length} quotes shown</div>
            <button onClick={()=>{setSearch("");setSortBy("priority");setFilter("active");}} style={{background:"transparent",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Reset</button>
          </div>
        </Card>
        <div style={{display:"flex",gap:14,overflowX:"auto",marginBottom:18}}>
          {[["active","Active"],["respond","Need response"],["accepted","Accepted"],["closed","Closed"]].map(([id,label])=>(
            <button key={id} onClick={()=>setFilter(id)} style={{padding:"8px 14px",background:filter===id?C.primary:C.white,border:`1px solid ${filter===id?C.primary:C.border}`,borderRadius:20,color:filter===id?C.white:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK,whiteSpace:"nowrap",flexShrink:0}}>{label}</button>
          ))}
        </div>
        {filtered.length===0?<EmptyState title={quotes.length?"No matching quotes":"No quotes here yet"} body={quotes.length?"Try another status filter or reset sorting to see more quotes.":"Browse verified slabs and express interest to receive a factory quote."} actionLabel="Browse Inventory" onAction={()=>onViewPortal(buyerFactoryId)} secondaryLabel={quotes.length?"Reset filters":undefined} onSecondary={()=>{setSearch("");setSortBy("priority");setFilter("active");}}/>:<div style={{display:"flex",flexDirection:"column",gap:14}}>
          {filtered.map(q=>{const s=quoteStatusConf(q.status);const f=fulfillmentConf(activeFulfillment(q));const next=buyerQuoteNextAction(q);const expired=q.validityTs&&q.validityTs<Date.now()&&q.status==="sent";const canRespond=q.status==="sent"&&!expired;return(
            <Card key={q.id} style={{padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:14}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.stone}</div>
                  <div style={{fontSize:12,color:C.textDim,marginTop:2}}>{q.grade} - {q.id} - {fmtD(q.created_at)}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:700,color:C.green}}>{fmtMoney(Number(q.totalAmount||0))}</div>
                  <div style={{fontSize:12,color:C.textDim}}>{q.validityTs?`Valid ${fmtD(q.validityTs)}`:"No validity"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>
                <span style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c,padding:"4px 9px",borderRadius:20,fontSize:12,fontWeight:600}}>{expired?"Expired":s.label}</span>
                {q.status==="accepted"&&<span style={{background:f.bg,border:`1px solid ${f.border}`,color:f.color,padding:"4px 9px",borderRadius:20,fontSize:12,fontWeight:600}}>{f.label}</span>}
              </div>
              <div style={{background:next.bg,border:`1px solid ${next.border}`,borderRadius:10,padding:"9px 11px",fontSize:12,fontWeight:600,color:next.color,marginBottom:16}}>{next.label}</div>
              <BuyerQuoteTimeline quote={q}/>
              {(q.buyerMessage||q.buyer_message)&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,padding:10,fontSize:12,color:C.textMid,lineHeight:1.65,marginTop:16}}><span style={{fontWeight:700,color:C.text}}>Your note:</span> {q.buyerMessage||q.buyer_message}</div>}
              <div style={{display:"flex",gap:14,flexWrap:"wrap",justifyContent:"flex-end",marginTop:16}}>
                <Btn size="sm" variant="secondary" onClick={()=>window.open(`/quote/${encodeURIComponent(q.id)}`,"_blank","noopener,noreferrer")}>Open Quote</Btn>
                <Btn size="sm" variant="secondary" onClick={()=>copyBuyerQuoteSummary(q)}>{copiedQuote===q.id?"Copied":"Copy Summary"}</Btn>
                {q.slabId&&<Btn size="sm" variant="secondary" onClick={()=>window.location.assign(`/slab/${encodeURIComponent(q.slabId)}`)}>Slab Certificate</Btn>}
                {canRespond&&<Btn size="sm" variant="ghost" onClick={()=>openQuoteAction(q,"revision_requested")}>Request Changes</Btn>}
                {canRespond&&<Btn size="sm" variant="green" onClick={()=>openQuoteAction(q,"accepted")}>Accept</Btn>}
              </div>
            </Card>
          );})}
        </div>}
      </div>
    </div>
  );
}

function BuyerHome({buyer,onLogout,onViewPortal,onViewQuotes}) {
  const [fac,setFac]=useState(null);const [insps,setInsps]=useState([]);const [inquiries,setInquiries]=useState([]);const [quotes,setQuotes]=useState([]);
  const [quoteAction,setQuoteAction]=useState(null);const [quoteMsg,setQuoteMsg]=useState("");const [quoteBusy,setQuoteBusy]=useState("");const [quoteError,setQuoteError]=useState("");
  const [loadError,setLoadError]=useState("");
  const [resolvedFactoryId,setResolvedFactoryId]=useState(buyer.factory_id||buyer.factoryId||"");
  const buyerFactoryId=buyer.factory_id||buyer.factoryId||resolvedFactoryId;
  useEffect(()=>{
    let active=true;
    async function load(){
      let fid=buyerFactoryId;
      if(!fid){fid=await resolveBuyerFactoryId(buyer);if(active&&fid)setResolvedFactoryId(fid);}
      if(!fid||!active)return;
      try {
        setLoadError("");
        const [f,i,q,qt]=await Promise.all([DB.getFac(fid),DB.facInsps(fid),DB.buyerInquiries(buyer.email,fid),DB.buyerQuotes(buyer.email,fid)]);
        if(active){setFac(f);setInsps(i.filter(x=>x.grade==="Premium"||x.grade==="Standard"));setInquiries(q);setQuotes(qt);}
      } catch(e) {
        if(active)setLoadError(e.message||"Could not refresh buyer data.");
      }
    }
    load();
    return()=>{active=false;};
  },[buyer.email,buyer.factory_id,buyer.factoryId,resolvedFactoryId]);
  const activeInquiries=inquiries.filter(q=>q.status!=="closed").length;
  const visibleQuotes=[...quotes].sort((a,b)=>buyerQuotePriority(a)-buyerQuotePriority(b)||Number(b.created_at||0)-Number(a.created_at||0));
  const activeQuotes=quotes.filter(q=>!(q.status==="sent"&&q.validityTs&&q.validityTs<Date.now())&&!["revised","expired","sold"].includes(q.status)&&activeFulfillment(q)!=="sold").length;
  const responseQuotes=quotes.filter(q=>q.status==="sent"&&!(q.validityTs&&q.validityTs<Date.now())).length;
  const priorityQuote=visibleQuotes[0];
  const priorityAction=priorityQuote?buyerQuoteNextAction(priorityQuote):null;
  const buyerSetupItems=[
    {label:"Browse verified inventory",detail:"Filter slabs and open certificates before shortlisting.",done:insps.length>0,onClick:()=>onViewPortal(buyerFactoryId)},
    {label:"Request a quote",detail:"Send area, delivery location, and notes from a slab card.",done:activeInquiries>0||quotes.length>0,onClick:()=>onViewPortal(buyerFactoryId)},
    {label:"Track quote or order",detail:"Accept, request changes, or follow dispatch status.",done:quotes.length>0,onClick:onViewQuotes},
  ];
  function openQuoteAction(q,decision){setQuoteAction({quote:q,decision});setQuoteMsg("");setQuoteError("");}
  async function submitQuoteAction(){
    if(!quoteAction||quoteBusy)return;
    setQuoteBusy(quoteAction.decision);setQuoteError("");
    const {data,error}=await supabase.rpc("respond_to_quote",{quote_id:quoteAction.quote.id,decision:quoteAction.decision,message:quoteMsg});
    setQuoteBusy("");
    if(error){setQuoteError(error.message||"Could not update quote.");return;}
    const row=Array.isArray(data)?data[0]:data;
    if(row)setQuotes(prev=>prev.map(q=>q.id===row.id?mapQuote(row):q));
    setQuoteAction(null);setQuoteMsg("");
  }
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT_STACK,color:C.text}}>
      {quoteAction&&<Modal title={quoteAction.decision==="accepted"?"Accept Quote":"Request Changes"} onClose={()=>{setQuoteAction(null);setQuoteError("");}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>{quoteAction.quote.stone} Â· {fmtMoney(Number(quoteAction.quote.totalAmount||0))}</div>
            <div style={{fontSize:12,color:C.textDim}}>{quoteAction.quote.grade} Â· {quoteAction.quote.id}</div>
          </div>
          <textarea value={quoteMsg} onChange={e=>setQuoteMsg(e.target.value)} rows={3} placeholder={quoteAction.decision==="accepted"?"Optional note for the factory":"What should the factory change?"} style={{width:"100%",padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,resize:"none",outline:"none",boxSizing:"border-box"}}/>
          {quoteError&&<div style={{fontSize:12,color:C.red,background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 10px"}}>{quoteError}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Btn variant="secondary" onClick={()=>setQuoteAction(null)}>Cancel</Btn>
            <Btn variant={quoteAction.decision==="accepted"?"green":"primary"} onClick={submitQuoteAction} disabled={!!quoteBusy}>{quoteBusy? "Sending..." : quoteAction.decision==="accepted"?"Accept Quote":"Send Request"}</Btn>
          </div>
        </div>
      </Modal>}
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,padding:"20px 18px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>Epistable Â· Buyer Portal</div>
            <div style={{fontSize:20,fontWeight:700,color:C.white}}>Hello, {buyer.name.split(" ")[0]}!</div>
            {buyer.company&&<div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginTop:2}}>{buyer.company}</div>}
          </div>
          <button onClick={onLogout} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,color:C.white,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Sign Out</button>
        </div>
        <div style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontSize:16,lineHeight:1.3,fontWeight:700,letterSpacing:0,color:C.white,marginBottom:2}}>{fac?.name||buyer.factory_name}</div>
          <div style={{fontSize:12,lineHeight:1.65,color:"rgba(255,255,255,0.7)",marginBottom:16}}>{fac?.location} Â· Verified by Epistable</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            {[["Available",insps.length,"package"],["Inquiries",activeInquiries,"mail"],["Quotes",activeQuotes,"Quote"]].map(([l,v,icon])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 6px",textAlign:"center"}}><div style={{fontSize:12}}>{icon}</div><div style={{fontSize:18,fontWeight:700,color:C.white,lineHeight:1.1,letterSpacing:0,marginBottom:2}}>{v}</div><div style={{fontSize:12,lineHeight:1.3,color:"rgba(255,255,255,0.65)"}}>{l}</div></div>
            ))}
          </div>
        </div>
        </div>
        <div style={{padding:"16px 16px 48px"}}>
        <ErrorNotice message={loadError}/>
        <div onClick={()=>{try{if(buyerFactoryId)localStorage.setItem("epistable_last_buyer_factory_id",buyerFactoryId);}catch{}onViewPortal(buyerFactoryId);}} style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary})`,borderRadius:14,padding:"20px",marginBottom:18,display:"flex",alignItems:"center",gap:16,cursor:"pointer"}}>
          <div style={{width:52,height:52,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="package" size={26} color={C.white}/></div>
          <div style={{flex:1}}><div style={{fontSize:16,lineHeight:1.3,fontWeight:700,letterSpacing:0,color:C.white,marginBottom:3}}>View Verified Inventory</div><div style={{fontSize:12,lineHeight:1.65,color:"rgba(255,255,255,0.7)"}}>{insps.length} slabs available</div></div>
          <span style={{fontSize:22,color:"rgba(255,255,255,0.5)"}}>â†’</span>
        </div>
        <div onClick={onViewQuotes} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",marginBottom:18,display:"flex",alignItems:"center",gap:14,cursor:"pointer",boxShadow:C.shadow}}>
          <div style={{width:46,height:46,borderRadius:12,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:C.primary,flexShrink:0}}>Quote</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:3}}>Track Quotes & Orders</div><div style={{fontSize:12,color:C.textMid}}>{activeQuotes} active quotes, {responseQuotes} waiting for response</div></div>
          <span style={{fontSize:20,color:C.textDim}}>&gt;</span>
        </div>
        <GuidanceCard title="How buying works" subtitle="From verified slab to delivery tracking" style={{marginBottom:18}} items={[
          {label:"1. Shortlist",detail:"Open inventory, filter slabs, and review certificates.",color:C.primary,bg:C.primaryBg,border:C.primaryBorder},
          {label:"2. Request quote",detail:"Send area, delivery location, and requirements.",color:C.amber,bg:C.amberBg,border:C.amberBorder},
          {label:"3. Track order",detail:"Accept the quote and follow payment, dispatch, and delivery.",color:C.green,bg:C.greenBg,border:C.greenBorder},
        ]}/>
        <SetupChecklist title="Buyer setup checklist" subtitle="The shortest path from browsing to confirmed order" items={buyerSetupItems} style={{marginBottom:18}}/>
        {priorityQuote&&<Card style={{padding:20,marginBottom:18,borderColor:priorityAction.border,background:priorityAction.bg}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:14}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:priorityAction.color,textTransform:"uppercase",marginBottom:4}}>Next action</div>
              <div style={{fontSize:15,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{priorityQuote.stone}</div>
              <div style={{fontSize:12,color:C.textMid,marginTop:3}}>{priorityQuote.grade} - {fmtMoney(Number(priorityQuote.totalAmount||0))}</div>
            </div>
            <span style={{fontSize:12,fontWeight:600,color:priorityAction.color,background:C.white,border:`1px solid ${priorityAction.border}`,borderRadius:20,padding:"5px 9px",whiteSpace:"nowrap"}}>{priorityAction.label}</span>
          </div>
          <div style={{display:"flex",gap:14,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <Btn size="sm" variant="secondary" onClick={onViewQuotes}>Track</Btn>
            <Btn size="sm" variant="secondary" onClick={()=>window.open(`/quote/${encodeURIComponent(priorityQuote.id)}`,"_blank","noopener,noreferrer")}>Open Quote</Btn>
            {priorityQuote.status==="sent"&&!(priorityQuote.validityTs&&priorityQuote.validityTs<Date.now())&&<Btn size="sm" variant="green" onClick={()=>openQuoteAction(priorityQuote,"accepted")}>Accept</Btn>}
          </div>
        </Card>}
        <div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:"14px 16px",display:"flex",gap:14}}>
          <span style={{display:"flex",alignItems:"center",flexShrink:0}}><Icon name="verified" size={18} color={C.green}/></span>
          <div><div style={{...TEXT.itemTitle,color:C.green,marginBottom:2}}>Epistable Verified</div><div style={{...TEXT.meta,color:C.textMid}}>All slabs independently graded. Records are tamper-proof.</div></div>
        </div>
        {quotes.length>0&&<Card style={{marginTop:14}}>
          <div style={{padding:"15px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:14}}>
            <div><div style={{fontSize:14,fontWeight:700}}>My Quotes</div><div style={{fontSize:12,color:C.textDim,marginTop:2}}>Track quotes sent by the factory</div></div>
            <button onClick={onViewQuotes} style={{background:"transparent",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK,whiteSpace:"nowrap"}}>View all</button>
          </div>
          {visibleQuotes.slice(0,5).map((q,i)=>{const s=quoteStatusConf(q.status);const f=fulfillmentConf(activeFulfillment(q));const expired=q.validityTs&&q.validityTs<Date.now();const canRespond=q.status==="sent"&&!expired;return(
            <div key={q.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderBottom:i<Math.min(visibleQuotes.length,5)-1?`1px solid ${C.border}`:"none",flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.stone} Â· {fmtMoney(Number(q.totalAmount||0))}</div>
                <div style={{fontSize:12,color:C.textDim}}>{q.grade} Â· {fmtD(q.created_at)}</div>
              </div>
              <span style={{background:s.bg,border:`1px solid ${s.b}`,color:s.c,padding:"3px 9px",borderRadius:20,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{s.label}</span>
              {q.status==="accepted"&&<span style={{background:f.bg,border:`1px solid ${f.border}`,color:f.color,padding:"3px 9px",borderRadius:20,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{f.label}</span>}
              <button onClick={onViewQuotes} style={{background:C.white,border:`1px solid ${C.primaryBorder}`,borderRadius:8,color:C.primary,padding:"5px 8px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK,whiteSpace:"nowrap"}}>Track</button>
              <button onClick={()=>window.open(`/quote/${encodeURIComponent(q.id)}`,"_blank","noopener,noreferrer")} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,color:C.primary,padding:"5px 8px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK,whiteSpace:"nowrap"}}>Open</button>
              {q.slabId&&<button onClick={()=>window.location.assign(`/slab/${encodeURIComponent(q.slabId)}`)} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,color:C.textMid,padding:"5px 8px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK,whiteSpace:"nowrap"}}>Slab</button>}
              {canRespond&&<button onClick={()=>openQuoteAction(q,"revision_requested")} style={{background:C.white,border:`1px solid ${C.amberBorder}`,borderRadius:8,color:C.amber,padding:"5px 8px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK,whiteSpace:"nowrap"}}>Changes</button>}
              {canRespond&&<button onClick={()=>openQuoteAction(q,"accepted")} style={{background:C.green,border:"none",borderRadius:8,color:C.white,padding:"5px 8px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK,whiteSpace:"nowrap"}}>Accept</button>}
            </div>
          );})}
        </Card>}
        {inquiries.length>0&&<Card style={{marginTop:14}}>
          <div style={{padding:"15px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:14,fontWeight:700}}>My Inquiries</div>
            <button onClick={onViewPortal} style={{background:"transparent",border:"none",color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Browse slabs</button>
          </div>
          {inquiries.slice(0,4).map((q,i)=>(
            <div key={q.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderBottom:i<Math.min(inquiries.length,4)-1?`1px solid ${C.border}`:"none"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.stone}</div>
                <div style={{fontSize:12,color:C.textDim}}>{q.grade} Â· {fmtD(q.created_at)}</div>
              </div>
              <InqPill status={q.status}/>
            </div>
          ))}
        </Card>}
      </div>
    </div>
  );
}

function slabDims(slab) {
  const m=slab?.measurements||{};
  return m.length&&m.width?`${m.length} x ${m.width} cm`:"Size not recorded";
}

function BuyerWordmark({ compact = false }) {
  return (
    <div style={{display:"inline-flex",alignItems:"baseline",gap:compact?4:5,whiteSpace:"nowrap",lineHeight:1}}>
      <span style={{fontSize:compact?21:25,fontWeight:750,letterSpacing:-0.25,color:C.primaryD}}>Epistable</span>
      <span style={{fontSize:compact?21:25,fontWeight:750,letterSpacing:-0.25,color:C.primary}}>AI</span>
    </div>
  );
}

function BuyerPortal({factoryId,onBack,buyer,onLogout}) {
  const [fac,setFac]=useState(null);const [insps,setInsps]=useState([]);const [filter,setFilter]=useState("All");const [search,setSearch]=useState("");
  const [inventoryLoading,setInventoryLoading]=useState(true);
  const [stoneFilter,setStoneFilter]=useState("All");const [supplierFilter,setSupplierFilter]=useState("All");const [exportFilter,setExportFilter]=useState("All");const [statusFilter,setStatusFilter]=useState("available");
  const [fastStoneOptions,setFastStoneOptions]=useState([]);
  const [maxPrice,setMaxPrice]=useState("");const [sortBy,setSortBy]=useState("newest");
  const [viewMode,setViewMode]=useState("all");const [savedIds,setSavedIds]=useState([]);
  const localFactoryId=()=>{try{return localStorage.getItem("epistable_last_buyer_factory_id")||"";}catch{return "";}};
  const [portalFactoryId,setPortalFactoryId]=useState(factoryId||buyer?.factory_id||buyer?.factoryId||localFactoryId());
  const [inquiry,setInquiry]=useState(null);const [inquiryMsg,setInquiryMsg]=useState("");const [inquirySent,setInquirySent]=useState(false);
  const [quoteReq,setQuoteReq]=useState({areaSqFt:"",deliveryLocation:"",targetDate:"",notes:""});
  const [loadError,setLoadError]=useState("");const [inquiryBusy,setInquiryBusy]=useState(false);const [inquiryError,setInquiryError]=useState("");
  const [qrSlab,setQrSlab]=useState(null);
  const [shortlistCopied,setShortlistCopied]=useState(false);
  const [mobileFiltersOpen,setMobileFiltersOpen]=useState(false);
  const [tradeOpen,setTradeOpen]=useState(false);
  const [tradePrompt,setTradePrompt]=useState("");
  const {isMobile}=useBP();
  const shortlistKey=`epistable_shortlist_${buyer?.id||buyer?.email||factoryId||"guest"}`;
  useEffect(()=>{
    if(typeof window==="undefined")return undefined;
    const guardState={...window.history.state,epistableBuyerExitGuard:true};
    window.history.pushState(guardState,"",window.location.href);
    function onPopState(){
      const shouldExit=window.confirm("Do you want to exit the buyer portal?");
      if(shouldExit){
        window.removeEventListener("popstate",onPopState);
        window.history.back();
        return;
      }
      window.history.pushState(guardState,"",window.location.href);
    }
    window.addEventListener("popstate",onPopState);
    return()=>window.removeEventListener("popstate",onPopState);
  },[]);
  useEffect(()=>{
    let active=true;
    async function load(){
      let fid=factoryId||buyer?.factory_id||buyer?.factoryId||portalFactoryId||localFactoryId();
      if(!fid&&buyer?.email){
        const freshBuyer=await DB.getBuyerByEmail(buyer.email);
        fid=freshBuyer?.factory_id||freshBuyer?.factoryId||"";
      }
      if(!fid&&buyer?.factory_name){
        const namedFac=await DB.getFacByName(buyer.factory_name);
        fid=namedFac?.id||"";
      }
      if(!fid){if(active){setLoadError("No factory inventory is linked to this buyer yet.");setInventoryLoading(false);}return;}
      if(active)setPortalFactoryId(fid);
      try {
        setLoadError("");
        setInventoryLoading(true);
        setFastStoneOptions([]);
        DB.facStoneOptions(fid).then(options=>{if(active)setFastStoneOptions(options);}).catch(()=>{});
        const [f,i]=await Promise.all([DB.getFac(fid),DB.facBuyerInsps(fid)]);
        if(active){setFac(f);setInsps(i);setInventoryLoading(false);}
        DB.facBuyerPhotos(fid,i.slice(0,36).map(x=>x.id)).then(photos=>{
          if(!active||!photos.length)return;
          const byId=new Map(photos.map(p=>[p.id,p.photo]));
          setInsps(prev=>prev.map(s=>byId.has(s.id)?{...s,photo:byId.get(s.id)}:s));
        }).catch(()=>{});
      } catch(e) {
        if(active){setLoadError(e.message||"Could not load buyer inventory.");setInventoryLoading(false);}
      }
    }
    load();
    return()=>{active=false;};
  },[factoryId,buyer?.email,buyer?.factory_id,buyer?.factoryId]);
  useEffect(()=>{
    try{setSavedIds(JSON.parse(localStorage.getItem(shortlistKey)||"[]"));}catch{setSavedIds([]);}
  },[shortlistKey]);
  const savedSet=useMemo(()=>new Set(savedIds),[savedIds]);
  const savedSlabs=useMemo(()=>insps.filter(i=>savedSet.has(i.id)),[insps,savedSet]);
  const inventoryCounts=useMemo(()=>insps.reduce((acc,i)=>{
    const status=i.inventoryStatus||"available";
    acc.available+=status==="available"?1:0;
    acc.reserved+=status==="reserved"?1:0;
    acc.exportReady+=i.exportReady?1:0;
    acc.premium+=i.grade==="Premium"?1:0;
    return acc;
  },{available:0,reserved:0,exportReady:0,premium:0}),[insps]);
  const availableCount=inventoryCounts.available;
  const reservedCount=inventoryCounts.reserved;
  const exportCount=inventoryCounts.exportReady;
  const premiumCount=inventoryCounts.premium;
  function toggleSaved(id){
    setSavedIds(prev=>{
      const next=prev.includes(id)?prev.filter(x=>x!==id):[id,...prev];
      try{localStorage.setItem(shortlistKey,JSON.stringify(next));}catch{}
      return next;
    });
  }
  const exportReadiness=s=>{
    const trace=s.measurements?.traceability||{};
    const audit=s.measurements?.audit||{};
    const traceCount=["quarrySource","batchNo","blockNo","productionLine","operator","containerNo","customerRef"].filter(k=>trace[k]).length;
    const auditCount=["calibrationChecked","checklistComplete","rootCause","correctiveAction","actionOwner","actionDue"].filter(k=>audit[k]).length;
    return {score:Math.round(((s.exportReady?100:0)+(traceCount/7)*100+(auditCount/6)*100+(s.photo?100:0))/4),trace,audit,traceCount,auditCount};
  };
  async function copyShortlist(){
    const lines=savedSlabs.map(s=>{const e=exportReadiness(s);return `${s.stone} | ${s.grade} | Rs ${s.pricePerSqFt}/sqft | Export readiness ${e.score}%${e.trace.batchNo?` | Batch ${e.trace.batchNo}`:""} | ${window.location.origin}/slab/${encodeURIComponent(s.id)}`;});
    const text=lines.length?lines.join("\n"):"No slabs saved yet.";
    try{await navigator.clipboard.writeText(text);setShortlistCopied(true);setTimeout(()=>setShortlistCopied(false),1400);}catch(e){window.prompt("Copy shortlist",text);}
  }
  const stoneOptions=useMemo(()=>["All",...Array.from(new Set([...fastStoneOptions,...insps.map(i=>i.stone).filter(Boolean)])).sort()],[fastStoneOptions,insps]);
  const supplierOptions=useMemo(()=>["All",...Array.from(new Set(insps.map(i=>i.supplier).filter(Boolean))).sort()],[insps]);
  const featuredSlabs=useMemo(()=>insps
    .filter(i=>(i.inventoryStatus||"available")==="available")
    .map(s=>({slab:s,readiness:exportReadiness(s)}))
    .sort((a,b)=>(b.slab.exportReady?1:0)-(a.slab.exportReady?1:0)||(b.slab.grade==="Premium"?1:0)-(a.slab.grade==="Premium"?1:0)||b.readiness.score-a.readiness.score||Number(b.slab.ts||0)-Number(a.slab.ts||0))
    .slice(0,4),[insps]);
  const featuredSet=useMemo(()=>new Set(featuredSlabs.map(x=>x.slab.id)),[featuredSlabs]);
  const filtered=useMemo(()=>{
    const q=search.toLowerCase();
    return insps.filter(i=>(filter==="All"||i.grade===filter)
      &&(viewMode==="all"||(viewMode==="saved"&&savedSet.has(i.id))||(viewMode==="featured"&&featuredSet.has(i.id)))
      &&(stoneFilter==="All"||i.stone===stoneFilter)
      &&(supplierFilter==="All"||i.supplier===supplierFilter)
      &&(exportFilter==="All"||(exportFilter==="Export"&&i.exportReady)||(exportFilter==="Domestic"&&!i.exportReady))
      &&(statusFilter==="All"||(i.inventoryStatus||"available")===statusFilter)
      &&(!maxPrice||Number(i.pricePerSqFt||0)<=Number(maxPrice))
      &&(!q||[i.stone,i.id,i.supplier,i.grade,slabDims(i),i.measurements?.traceability?.batchNo,i.measurements?.traceability?.quarrySource,i.measurements?.traceability?.containerNo,...(i.defects||[])].filter(Boolean).join(" ").toLowerCase().includes(q)))
    .sort((a,b)=>{
      if(sortBy==="priceLow")return Number(a.pricePerSqFt||0)-Number(b.pricePerSqFt||0);
      if(sortBy==="priceHigh")return Number(b.pricePerSqFt||0)-Number(a.pricePerSqFt||0);
      if(sortBy==="grade")return (a.grade==="Premium"?0:1)-(b.grade==="Premium"?0:1);
      if(sortBy==="evidence")return exportReadiness(b).score-exportReadiness(a).score;
      return Number(b.ts||0)-Number(a.ts||0);
    });
  },[insps,filter,viewMode,savedSet,featuredSet,stoneFilter,supplierFilter,exportFilter,statusFilter,maxPrice,search,sortBy]);
  const clearFilters=()=>{setViewMode("all");setFilter("All");setStoneFilter("All");setSupplierFilter("All");setExportFilter("All");setStatusFilter("available");setMaxPrice("");setSortBy("newest");setSearch("");};
  const tradeBudget=useMemo(()=>{
    const text=tradePrompt.toLowerCase();
    const m=text.match(/(?:under|below|upto|up to|less than|<=?)\s*(?:rs|inr|₹)?\s*([0-9,]+)/i)||text.match(/(?:rs|inr|₹)\s*([0-9,]+)/i);
    return m?Number(String(m[1]).replace(/,/g,"")):0;
  },[tradePrompt]);
  const tradeStone=useMemo(()=>{
    const text=tradePrompt.toLowerCase();
    return stoneOptions.find(o=>o!=="All"&&text.includes(String(o).toLowerCase()))||"All";
  },[tradePrompt,stoneOptions]);
  const tradeRecommendations=useMemo(()=>{
    const text=tradePrompt.toLowerCase();
    const wantsExport=/export|overseas|dubai|uae|qatar|oman|saudi|international|shipment/.test(text);
    const wantsPremium=/premium|best|luxury|hotel|lobby|top/.test(text);
    const wantsEvidence=/evidence|trace|batch|certificate|verified|readiness|proof/.test(text);
    const wantsBudget=/budget|cheap|affordable|under|below|price|rate|cost/.test(text);
    const words=text.split(/[^a-z0-9]+/).filter(w=>w.length>2);
    return insps.map(s=>{
      const e=exportReadiness(s);
      const hay=[s.stone,s.supplier,s.grade,slabDims(s),s.measurements?.traceability?.batchNo,s.measurements?.traceability?.quarrySource,...(s.defects||[])].filter(Boolean).join(" ").toLowerCase();
      let score=0;
      if((s.inventoryStatus||"available")==="available")score+=24;
      if(s.exportReady)score+=wantsExport?26:8;
      if(s.grade==="Premium")score+=wantsPremium?24:10;
      if(s.grade==="Standard")score+=6;
      score+=Math.round(e.score/5);
      if(wantsEvidence)score+=Math.round(e.score/3);
      if(tradeStone!=="All"&&s.stone===tradeStone)score+=32;
      if(tradeBudget&&Number(s.pricePerSqFt||0)<=tradeBudget)score+=26;
      if(wantsBudget&&Number(s.pricePerSqFt||0)>0)score+=Math.max(0,16-Math.round(Number(s.pricePerSqFt||0)/80));
      words.forEach(w=>{if(hay.includes(w))score+=5;});
      return {slab:s,score,evidence:e};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||Number(b.slab.ts||0)-Number(a.slab.ts||0)).slice(0,4);
  },[insps,tradePrompt,tradeBudget,tradeStone]);
  function applyTradePrompt(prompt=tradePrompt){
    const text=prompt.toLowerCase();
    const matchedStone=stoneOptions.find(o=>o!=="All"&&text.includes(String(o).toLowerCase()))||"All";
    const m=text.match(/(?:under|below|upto|up to|less than|<=?)\s*(?:rs|inr|₹)?\s*([0-9,]+)/i)||text.match(/(?:rs|inr|₹)\s*([0-9,]+)/i);
    setViewMode("all");
    setStatusFilter("available");
    setStoneFilter(matchedStone);
    setExportFilter(/export|overseas|dubai|uae|qatar|oman|saudi|international|shipment/.test(text)?"Export":"All");
    setFilter(/premium|best|luxury|hotel|lobby|top/.test(text)?"Premium":"All");
    setMaxPrice(m?String(Number(String(m[1]).replace(/,/g,""))):"");
    setSortBy(/evidence|trace|batch|certificate|verified|readiness|proof/.test(text)?"evidence":/budget|cheap|affordable|under|below|price|rate|cost/.test(text)?"priceLow":"newest");
    setSearch(matchedStone==="All"?"":matchedStone);
    setMobileFiltersOpen(false);
    setTradeOpen(false);
  }
  function openTradeWithPrompt(prompt=""){
    if(prompt)setTradePrompt(prompt);
    setTradeOpen(true);
  }
  function openSupplierProfile(){
    const id=portalFactoryId||factoryId||buyer?.factory_id||buyer?.factoryId;
    if(id)window.location.assign(`/supplier/${encodeURIComponent(id)}`);
  }
  function confirmBuyerLogout(){
    if(!onLogout)return;
    if(window.confirm("Are you sure you want to log out?"))onLogout();
  }
  function openQuoteRequest(slab){
    setInquiry(slab);
    setInquiryMsg("");
    setQuoteReq({areaSqFt:"",deliveryLocation:"",targetDate:"",notes:""});
    setInquirySent(false);
  }
  async function submitInquiry(){
    if(!inquiry||inquiryBusy)return;
    setInquiryBusy(true);setInquiryError("");
    const readiness=exportReadiness(inquiry);
    const requestLines=[
      "Quote request",
      `Certificate: ${window.location.origin}/slab/${encodeURIComponent(inquiry.id)}`,
      `Export readiness: ${readiness.score}%`,
      `Traceability fields: ${readiness.traceCount}/7`,
      `Audit fields: ${readiness.auditCount}/6`,
      readiness.trace.batchNo?`Batch: ${readiness.trace.batchNo}`:null,
      readiness.trace.quarrySource?`Source: ${readiness.trace.quarrySource}`:null,
      quoteReq.areaSqFt?`Area required: ${quoteReq.areaSqFt} sq ft`:null,
      quoteReq.deliveryLocation?`Delivery location: ${quoteReq.deliveryLocation}`:null,
      quoteReq.targetDate?`Target date: ${quoteReq.targetDate}`:null,
      quoteReq.notes?`Buyer notes: ${quoteReq.notes}`:null,
      inquiryMsg?`Additional message: ${inquiryMsg}`:null
    ].filter(Boolean);
    try {
      await DB.createInquiry({slabId:inquiry.id,stone:inquiry.stone,grade:inquiry.grade,pricePerSqFt:inquiry.pricePerSqFt,factoryId:portalFactoryId,factoryName:fac?.name||"",buyerName:buyer?.name||"Guest Buyer",buyerCompany:buyer?.company||"",buyerEmail:buyer?.email||"",message:requestLines.join("\n")});
      setInquirySent(true);
    } catch(e) {
      setInquiryError(e.message||"Could not send this request. Please retry.");
    } finally {
      setInquiryBusy(false);
    }
  }
  const estimateTotal=quoteReq.areaSqFt&&inquiry?Math.round(Number(quoteReq.areaSqFt||0)*Number(inquiry.pricePerSqFt||0)):0;
  const inquiryExportReadiness=inquiry?exportReadiness(inquiry):{score:0,traceCount:0,auditCount:0};
  const inquiryReadiness=inquiryExportReadiness.score;
  const factoryName=fac?.name||buyer?.factory_name||"Verified factory";
  const buyerInitials=(buyer?.name||"Buyer").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
  const activeFilterCount=[filter!=="All",viewMode!=="all",stoneFilter!=="All",supplierFilter!=="All",exportFilter!=="All",statusFilter!=="available",!!maxPrice,sortBy!=="newest",!!search].filter(Boolean).length;
  const showInventorySkeleton=inventoryLoading&&insps.length===0;
  const tradeExamples=isMobile?[]:["Export-ready under Rs 500","Best evidence first","Premium slabs for hotel lobby","Makrana White available"];
  const tradeHasPrompt=tradePrompt.trim().length>0;
  const canOpenBuyerQuotes=!!buyer?.email;
  const resultMotionKey=[viewMode,filter,stoneFilter,supplierFilter,exportFilter,statusFilter,maxPrice,sortBy,search].join("|");
  const sidebarItems=[
    {label:"Trade GPT",mobileLabel:"GPT",icon:"bot",action:()=>openTradeWithPrompt()},
    {label:"Catalog",mobileLabel:"Catalog",icon:"package",active:viewMode==="all"&&!tradeOpen,action:()=>{setViewMode("all");setTradeOpen(false);}},
    {label:"My Quotes",mobileLabel:"Quotes",icon:"message",active:viewMode==="quotes"&&!tradeOpen,action:canOpenBuyerQuotes?()=>{setViewMode("quotes");setTradeOpen(false);}:null},
    {label:"My Orders",mobileLabel:"Orders",icon:"truck",active:viewMode==="quotes"&&!tradeOpen,action:canOpenBuyerQuotes?()=>{setViewMode("quotes");setTradeOpen(false);}:null},
    {label:"My Requirements",mobileLabel:"Needs",icon:"list",action:null},
    {label:"Profile",mobileLabel:"Profile",icon:"user",action:null},
  ];
  const heroSlab=filtered[0]||insps[0]||null;
  const heroName=heroSlab?.stone||"Verified Stone";
  const heroImage=heroSlab?.photo||"";
  const heroStyle=heroImage
    ? {backgroundImage:`linear-gradient(90deg,rgba(8,12,24,0.86) 0%,rgba(8,12,24,0.62) 42%,rgba(8,12,24,0.18) 100%),url("${heroImage}")`}
    : {backgroundImage:"linear-gradient(90deg,rgba(8,12,24,0.92),rgba(17,24,95,0.74)),linear-gradient(135deg,#1c2743,#4d5d73)"};
  const seasonLabel=slab=>{
    const inv=slab.inventoryStatus||"available";
    if(inv==="available")return "AVAILABLE NOW";
    if(inv==="reserved")return "RESERVED";
    if(inv==="sold")return "SOLD";
    return String(inv).toUpperCase();
  };
  const mobileNavItems=[
    {label:"Catalog",mobileLabel:"Catalog",icon:"package",active:viewMode==="all"&&!tradeOpen,action:()=>{setViewMode("all");setTradeOpen(false);}},
    {label:"Trade GPT",mobileLabel:"GPT",icon:"bot",active:tradeOpen,action:()=>openTradeWithPrompt()},
    {label:"Saved",mobileLabel:"Saved",icon:"check",active:viewMode==="saved"&&!tradeOpen,action:()=>{setViewMode("saved");setTradeOpen(false);}},
    {label:"Quotes",mobileLabel:"Quotes",icon:"message",active:viewMode==="quotes"&&!tradeOpen,action:canOpenBuyerQuotes?()=>{setViewMode("quotes");setTradeOpen(false);}:null},
  ];
  const activeMobileNavIndex=Math.max(0,mobileNavItems.findIndex(item=>item.active));
  const mobileNavIndicatorTransform=[
    "translateX(0) translateY(-18px)",
    "translateX(calc(100% + 7px)) translateY(-18px)",
    "translateX(calc(200% + 14px)) translateY(-18px)",
    "translateX(calc(300% + 21px)) translateY(-18px)",
  ][activeMobileNavIndex]||"translateX(0) translateY(-18px)";
  return (
    <div className={`buyer-app${tradeOpen?" buyer-app-trade-open":""}`} style={{minHeight:"100vh",fontFamily:FONT_STACK,color:C.text,display:"grid",gridTemplateColumns:isMobile?"1fr":"274px minmax(0,1fr)"}}>
      {qrSlab&&<SlabQRModal slab={qrSlab} onClose={()=>setQrSlab(null)}/>}
      {!isMobile&&<aside className="buyer-sidebar" style={{position:"sticky",top:0,height:"100vh",padding:"28px 14px 16px",boxSizing:"border-box",display:"flex",flexDirection:"column",gap:24}}>
        <div style={{padding:"0 16px 2px"}}>
              <BuyerWordmark />
        </div>
        <nav style={{display:"flex",flexDirection:"column",gap:8}}>
          {sidebarItems.map(item=>(
            <button key={item.label} className="buyer-button" onClick={item.action||undefined} disabled={!item.action&&!item.active} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",borderRadius:10,border:"none",background:item.active?C.primaryBg:"transparent",color:item.active?C.primaryD:"#5c6678",fontSize:15,fontWeight:item.active?700:600,cursor:item.action||item.active?"pointer":"default",fontFamily:FONT_STACK,textAlign:"left",opacity:1}}>
              <Icon name={item.icon} size={18}/>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div style={{marginTop:"auto",borderTop:`1px solid ${C.border}`,paddingTop:18}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <Avi initials={buyerInitials} size={38}/>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{buyer?.name||"Buyer"}</div>
              <div style={{fontSize:11,color:C.textDim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{buyer?.company||factoryName}</div>
            </div>
          </div>
          {onBack&&<button className="buyer-button" onClick={onBack} style={{width:"100%",background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 12px",color:C.textMid,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT_STACK}}>Back to home</button>}
          {onLogout&&<button className="buyer-button" onClick={confirmBuyerLogout} style={{width:"100%",marginTop:10,background:C.white,border:`1px solid ${C.redBorder}`,borderRadius:12,padding:"12px 14px",color:C.red,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:FONT_STACK,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 2px rgba(198,40,40,0.06)"}}>Log out</button>}
        </div>
      </aside>}
      <main style={{minWidth:0}}>
      <div className="buyer-topbar" style={{position:"sticky",top:0,zIndex:20,background:"#fff",borderBottom:`1px solid ${C.border}`,boxShadow:isMobile?"0 8px 18px rgba(16,24,40,0.04)":"none",padding:isMobile?"22px 32px 22px":"15px 30px",display:"flex",alignItems:"center",gap:isMobile?10:18,flexWrap:isMobile?"wrap":"nowrap"}}>
        {isMobile?<>
          <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0,flex:1}}>
            {viewMode==="quotes"
              ? <h1 style={{margin:0,fontSize:26,lineHeight:1.2,fontWeight:750,letterSpacing:0,color:C.text}}>Quotes</h1>
              : <BuyerWordmark compact />}
          </div>
          {onLogout&&<button className="buyer-button" onClick={confirmBuyerLogout} style={{background:C.white,border:`1px solid ${C.redBorder}`,borderRadius:12,color:C.red,padding:"10px 14px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FONT_STACK,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 1px 2px rgba(198,40,40,0.06)"}} aria-label="Log out of buyer portal">Log out</button>}
        </>:<>
          {viewMode==="quotes"
            ? <h1 style={{margin:0,fontSize:26,lineHeight:1.2,fontWeight:700,letterSpacing:-0.2,color:C.text,flex:"0 0 auto"}}>Quotes</h1>
            : <div style={{flex:"0 0 auto"}}><BuyerWordmark /></div>}
          <div style={{flex:1}}/>
          {viewMode!=="quotes"&&<div style={{width:380,maxWidth:"48vw",position:"relative"}}>
            <Icon name="search" size={18} color={C.textDim} style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stone, batch, source" style={{width:"100%",padding:"13px 14px 13px 42px",background:"#f9fbfe",border:`1px solid ${C.border}`,borderRadius:999,fontSize:15,outline:"none",boxSizing:"border-box",fontFamily:FONT_STACK,color:C.text}}/>
          </div>}
          {viewMode!=="quotes"&&<button className="buyer-button" onClick={()=>setSortBy("newest")} style={{width:50,height:50,background:C.white,border:`1px solid ${C.border}`,borderRadius:999,color:C.textMid,cursor:"pointer",fontFamily:FONT_STACK,display:"inline-flex",alignItems:"center",justifyContent:"center"}} aria-label="Refresh catalog"><Icon name="refresh" size={19}/></button>}
          {viewMode!=="quotes"&&<button className="buyer-button" style={{width:50,height:50,background:C.white,border:`1px solid ${C.border}`,borderRadius:999,color:C.textMid,cursor:"pointer",fontFamily:FONT_STACK,display:"inline-flex",alignItems:"center",justifyContent:"center"}} aria-label="Help"><Icon name="alert" size={19}/></button>}
        </>}
      </div>
      <div style={{padding:isMobile?"0 0 184px":"30px 30px 90px",maxWidth:1600,margin:"0 auto"}}>
        {viewMode==="quotes"&&canOpenBuyerQuotes?<BuyerQuotesPage buyer={buyer} embedded onViewPortal={()=>{setViewMode("all");setTradeOpen(false);}}/>:<>
        <ErrorNotice message={loadError}/>
        {isMobile?<>
          <section className="buyer-featured-card buyer-enter" style={{"--i":0,marginBottom:32}}>
            <div style={{display:"flex",overflowX:"auto",scrollSnapType:"x mandatory"}}>
              {(featuredSlabs.length?featuredSlabs:[{slab:heroSlab,readiness:heroSlab?exportReadiness(heroSlab):{score:0}}].filter(x=>x.slab)).map(({slab,readiness})=>(
                <article key={slab.id} className="buyer-featured-hero" style={{flex:"0 0 100%",scrollSnapAlign:"start",background:C.white,overflow:"hidden"}}>
                  <div onClick={()=>window.location.assign(`/slab/${encodeURIComponent(slab.id)}`)} style={{height:430,background:"#edf3fa",position:"relative",cursor:"pointer",overflow:"hidden"}}>
                    {slab.photo?<img src={slab.photo} alt={slab.stone} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#f8fafc,#edf3fa)"}}><Icon name="package" size={42} color="#8da0bf"/></div>}
                    <div style={{position:"absolute",inset:"auto 0 0",padding:"110px 26px 34px",background:"linear-gradient(180deg,rgba(6,18,45,0),rgba(6,18,45,0.82))",color:C.white}}>
                      <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(255,255,255,0.16)",border:"1px solid rgba(255,255,255,0.34)",borderRadius:999,padding:"7px 14px",fontSize:12,fontWeight:800,marginBottom:14}}>
                        <Icon name="trend" size={14}/> Featured
                      </div>
                      <div style={{fontSize:42,lineHeight:1.03,fontWeight:850,letterSpacing:0,maxWidth:320}}>{slab.stone}</div>
                      <div style={{fontSize:17,lineHeight:1.45,fontWeight:600,color:"rgba(255,255,255,0.86)",marginTop:16,maxWidth:340}}>{slab.grade} · {fmtMoney(slab.pricePerSqFt)}/sqft · Export readiness {readiness.score}%</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:28}}>
                        <button className="buyer-button" onClick={e=>{e.stopPropagation();openQuoteRequest(slab);}} style={{background:C.white,border:`1px solid ${C.white}`,borderRadius:12,color:C.primaryD,padding:"16px 12px",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:FONT_STACK}}>Request Quote</button>
                        <button className="buyer-button" onClick={e=>{e.stopPropagation();openSupplierProfile();}} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.76)",borderRadius:12,color:C.white,padding:"16px 12px",fontSize:15,fontWeight:750,cursor:"pointer",fontFamily:FONT_STACK}}>Supplier profile</button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>:<section className="buyer-hero buyer-enter" style={{...heroStyle,borderRadius:20,minHeight:376,padding:"42px 50px",marginBottom:30,color:C.white,display:"flex",alignItems:"center"}}>
          <div style={{maxWidth:isMobile?420:560,width:"100%"}}>
            <div style={{display:"inline-flex",alignItems:"center",padding:isMobile?"5px 10px":"7px 20px",borderRadius:999,background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.55)",fontSize:isMobile?11:14,fontWeight:700,marginBottom:isMobile?10:14}}>
              Buyer-ready inventory
            </div>
            <h2 style={{fontSize:isMobile?27:48,lineHeight:isMobile?1.12:1.02,letterSpacing:0,margin:isMobile?"0 0 10px":"0 0 18px",fontWeight:700}}>
              Premium<br/><span style={{color:"#c9dcff"}}>{heroName}</span>
            </h2>
            <div style={{fontSize:isMobile?13:17,lineHeight:1.55,color:"rgba(255,255,255,0.86)",maxWidth:580,marginBottom:isMobile?14:28}}>Verified photos, export checks, and quote workflow from {factoryName}.</div>
            <div style={{display:"flex",gap:isMobile?8:18,flexWrap:"wrap"}}>
              <button className="buyer-button" disabled={!canOpenBuyerQuotes} onClick={()=>{if(!canOpenBuyerQuotes)return;setViewMode("quotes");setTradeOpen(false);}} style={{background:C.white,border:"none",borderRadius:isMobile?12:14,padding:isMobile?"11px 14px":"16px 30px",color:C.primaryD,fontSize:isMobile?13:16,fontWeight:700,cursor:canOpenBuyerQuotes?"pointer":"not-allowed",fontFamily:FONT_STACK,opacity:canOpenBuyerQuotes?1:0.7}}>View quotes</button>
              <button className="buyer-button" onClick={()=>setSortBy("evidence")} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.75)",borderRadius:isMobile?12:14,padding:isMobile?"10px 14px":"15px 30px",color:C.white,fontSize:isMobile?13:16,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Export ready first</button>
            </div>
          </div>
          {!isMobile&&<div style={{position:"absolute",left:"50%",bottom:20,transform:"translateX(-50%)",display:"flex",gap:8}}>
            {[0,1,2].map(i=><span key={i} style={{width:i===1?13:10,height:i===1?13:10,borderRadius:999,background:i===1?C.white:"rgba(255,255,255,0.48)",display:"block"}}/> )}
          </div>}
        </section>}
        <section className="buyer-filter-panel buyer-enter" style={{"--i":1,background:C.white,borderRadius:isMobile?14:16,padding:isMobile?32:30,margin:isMobile?"0 32px 32px":undefined,marginBottom:isMobile?32:60,display:"block",boxShadow:isMobile?"0 18px 42px rgba(16,24,40,0.08)":undefined}}>
          <div style={{position:"relative",marginBottom:isMobile?26:28}}>
            <Icon name="search" size={24} color="#8da0bf" style={{position:"absolute",left:20,top:"50%",transform:"translateY(-50%)"}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by stone name, origin, batch, supplier" style={{width:"100%",padding:isMobile?"17px 18px 17px 58px":"18px 22px 18px 60px",background:"#fbfcff",border:`1px solid ${C.border}`,borderRadius:999,fontSize:isMobile?16:18,outline:"none",boxSizing:"border-box",fontFamily:FONT_STACK,color:C.text}}/>
          </div>
          {!isMobile&&<div style={{height:1,background:"#edf1f6",marginBottom:28}}/>}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"minmax(220px,1fr) minmax(220px,1fr) minmax(180px,0.8fr) 106px",gap:isMobile?18:20,alignItems:"end"}}>
            <label style={{display:"grid",gap:10}}>
              <span style={{fontSize:12,fontWeight:700,color:"#667085",letterSpacing:0}}>Availability</span>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:isMobile?"12px 11px":"17px 18px",border:`1px solid ${C.border}`,borderRadius:isMobile?12:14,background:"#fbfcff",fontSize:isMobile?13:17,fontWeight:600,fontFamily:FONT_STACK,minWidth:0,color:C.text}}>
                <option value="available">All Articles</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
                <option value="All">All Statuses</option>
              </select>
            </label>
            <label style={{display:"grid",gap:10}}>
              <span style={{fontSize:12,fontWeight:700,color:"#667085",letterSpacing:0}}>Stone</span>
              <select value={stoneFilter} onChange={e=>setStoneFilter(e.target.value)} style={{padding:isMobile?"12px 11px":"17px 18px",border:`1px solid ${C.border}`,borderRadius:isMobile?12:14,background:"#fbfcff",fontSize:isMobile?13:17,fontWeight:600,fontFamily:FONT_STACK,minWidth:0,color:C.text}}>
                {stoneOptions.map(o=><option key={o} value={o}>{o==="All"?"All Categories":o}</option>)}
              </select>
            </label>
            <label style={{display:"grid",gap:10}}>
              <span style={{fontSize:12,fontWeight:700,color:"#667085",letterSpacing:0}}>Sort by</span>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:isMobile?"12px 11px":"17px 18px",border:`1px solid ${C.border}`,borderRadius:isMobile?12:14,background:"#fbfcff",fontSize:isMobile?13:17,fontWeight:600,fontFamily:FONT_STACK,minWidth:0,color:C.text}}>
                <option value="newest">Newest</option>
                <option value="priceLow">Price low-high</option>
                <option value="priceHigh">Price high-low</option>
                <option value="grade">Premium first</option>
                <option value="evidence">Export readiness</option>
              </select>
            </label>
            <button className="buyer-button" onClick={clearFilters} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:isMobile?12:14,color:C.textMid,padding:isMobile?"12px 11px":"17px 18px",fontSize:isMobile?13:16,fontWeight:700,cursor:"pointer",fontFamily:FONT_STACK,alignSelf:"end"}}>Clear</button>
          </div>
        </section>
        {showInventorySkeleton?
        <div className="buyer-results-grid" key={resultMotionKey} style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit,minmax(300px,1fr))",gap:isMobile?26:28,margin:isMobile?"0 32px":undefined}}>
          {[0,1,2].map(i=>(
            <div key={i} className="buyer-product-card buyer-enter" style={{"--i":i+2,background:C.white,border:`1px solid ${C.border}`,borderRadius:isMobile?18:16,overflow:"hidden",minHeight:isMobile?"auto":520,display:"flex",flexDirection:"column"}}>
              <div className="buyer-skeleton" style={{height:isMobile?190:238}}/>
              <div style={{padding:isMobile?"15px 14px 16px":"24px 20px 22px"}}>
                <div className="buyer-skeleton" style={{height:24,width:"58%",borderRadius:8,marginBottom:10}}/>
                <div className="buyer-skeleton" style={{height:14,width:"38%",borderRadius:8,marginBottom:18}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile?8:14,marginBottom:12}}>
                  <div className="buyer-skeleton" style={{height:isMobile?67:76,borderRadius:isMobile?12:8}}/>
                  <div className="buyer-skeleton" style={{height:isMobile?67:76,borderRadius:isMobile?12:8}}/>
                </div>
                <div className="buyer-skeleton" style={{height:76,borderRadius:12,marginBottom:16}}/>
                <div className="buyer-skeleton" style={{height:isMobile?48:54,borderRadius:isMobile?12:9}}/>
              </div>
            </div>
          ))}
        </div>:
        filtered.length===0?<EmptyState title={viewMode==="saved"?"No saved slabs yet":insps.length?"No slabs match these filters":"No slabs available yet"} body={viewMode==="saved"?"Save slabs from inventory to compare and request quotes later.":insps.length?"Try clearing filters, increasing max price, or changing stone, supplier, grade, or status.":"This factory has not published available Premium or Standard slabs yet."} actionLabel={insps.length?"Clear filters":undefined} onAction={clearFilters}/>:
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit,minmax(300px,1fr))",gap:isMobile?26:28,margin:isMobile?"0 32px":undefined}}>
          {filtered.map((slab,index)=>{
            const g=gradeConf(slab.grade);
            const inv=slab.inventoryStatus||"available";
            const canInquire=inv==="available";
            const saved=savedSet.has(slab.id);
            const exportReadyScore=exportReadiness(slab);
            const readiness=exportReadyScore.score;
            return (
              <div key={slab.id} className="buyer-product-card buyer-enter" style={{"--i":Math.min(index,8)+2,background:"#fff",border:`1px solid ${C.border}`,borderRadius:isMobile?18:16,overflow:"hidden",minHeight:isMobile?"auto":520,display:"flex",flexDirection:"column"}}>
                <div onClick={()=>window.location.assign(`/slab/${encodeURIComponent(slab.id)}`)} style={{cursor:"pointer"}}>
                  <div style={{height:isMobile?190:238,background:"#fff",position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {slab.photo?<img className="buyer-image" src={slab.photo} alt={slab.stone} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:
                    <div className="buyer-image" style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#f8fafc,#edf3fa)"}}><Icon name="package" size={50} color="#9aa8bb"/></div>}
                    <div style={{position:"absolute",top:isMobile?12:16,left:isMobile?12:16,background:"#fff7e8",border:"1px solid #faedcf",borderRadius:6,padding:isMobile?"6px 8px":"7px 10px",fontSize:11,fontWeight:800,color:"#8a4300",letterSpacing:0}}>{seasonLabel(slab)}</div>
                    <div style={{position:"absolute",top:isMobile?12:16,right:isMobile?12:16,background:g.bg,border:`1px solid ${g.border}`,borderRadius:6,padding:isMobile?"6px 8px":"6px 10px",fontSize:11,fontWeight:800,color:g.color}}>{slab.grade}</div>
                  </div>
                  <div style={{padding:isMobile?"15px 14px 9px":"24px 20px 10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:isMobile?12:18}}>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:isMobile?19:23,fontWeight:750,marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:C.text}}>{slab.stone}</div>
                        <div style={{fontSize:13,color:C.textDim,fontWeight:600}}>{slab.supplier||factoryName}</div>
                        <button className="buyer-button" onClick={e=>{e.stopPropagation();openSupplierProfile();}} style={{marginTop:7,background:"transparent",border:"none",padding:0,color:C.primary,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:FONT_STACK}}>Supplier profile</button>
                      </div>
                      <button className="buyer-button" onClick={e=>{e.stopPropagation();toggleSaved(slab.id);}} style={{background:saved?C.primary:C.white,border:`1px solid ${saved?C.primary:C.border}`,borderRadius:999,width:isMobile?40:36,height:isMobile?40:36,color:saved?C.white:C.textMid,cursor:"pointer",fontFamily:FONT_STACK,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}} aria-label={saved?"Remove from saved slabs":"Save slab"}><Icon name={saved?"check":"add"} size={16}/></button>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile?8:14,marginBottom:12}}>
                      <div style={{background:isMobile?"#f8fbff":"#eef5ff",border:"1px solid #dce8f8",borderRadius:isMobile?12:8,padding:isMobile?"10px 11px":"13px 16px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#5f7392",marginBottom:6}}>Size</div>
                        <div style={{fontSize:isMobile?14:17,fontWeight:700,color:"#26364f",lineHeight:1.25}}>{slabDims(slab)}</div>
                      </div>
                      <div style={{background:isMobile?"#f8fbff":"#eef5ff",border:"1px solid #dce8f8",borderRadius:isMobile?12:8,padding:isMobile?"10px 11px":"13px 16px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#5f7392",marginBottom:6}}>Rate</div>
                        <div style={{fontSize:isMobile?14:17,fontWeight:700,color:"#26364f",lineHeight:1.25}}>{fmtMoney(slab.pricePerSqFt)}/sqft</div>
                      </div>
                    </div>
                    <div style={{background:"#fbfcff",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 11px",marginBottom:6}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,marginBottom:8,alignItems:"center"}}>
                        <div style={{fontSize:12,color:C.textMid,fontWeight:700}}>Export readiness</div>
                        <div style={{fontSize:12,color:readiness>=70?C.green:C.amber,fontWeight:800}}>{readiness}%</div>
                      </div>
                      <div style={{height:6,background:"#edf2f8",borderRadius:999,overflow:"hidden",marginBottom:8}}>
                        <span className="buyer-evidence-fill" style={{"--buyer-readiness-scale":Math.max(0.08,Math.min(1,readiness/100)),display:"block",height:"100%",width:"100%",transform:"scaleX(var(--buyer-readiness-scale))",background:readiness>=70?C.green:C.primary,borderRadius:999}}/>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{padding:isMobile?"8px 14px 16px":"12px 20px 22px",marginTop:"auto"}}>
                  <button className="buyer-button" disabled={!canInquire} onClick={()=>{if(!canInquire)return;openQuoteRequest(slab);}} style={{width:"100%",background:canInquire?C.primary:C.surface,border:`1px solid ${canInquire?C.primary:C.border}`,borderRadius:isMobile?12:9,padding:isMobile?"14px 12px":"17px 12px",color:canInquire?C.white:C.textDim,fontSize:15,fontWeight:750,cursor:canInquire?"pointer":"not-allowed",fontFamily:FONT_STACK,marginBottom:10,boxShadow:canInquire&&isMobile?"0 10px 24px rgba(0,87,168,0.18)":"none"}}>{canInquire?"Request Quote":invConf(inv).label}</button>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr",gap:isMobile?8:0}}>
                    <button className="buyer-button" onClick={()=>openSupplierProfile()} style={{width:"100%",background:C.white,border:"1px solid #cfe0ff",borderRadius:isMobile?10:9,padding:isMobile?"12px 10px":"14px 12px",color:"#1267e8",fontSize:isMobile?13:15,fontWeight:700,cursor:"pointer",fontFamily:FONT_STACK}}>Supplier profile</button>
                    <button className="buyer-button" onClick={()=>window.location.assign(`/quality/${encodeURIComponent(slab.id)}`)} style={{width:"100%",background:isMobile?C.white:"transparent",border:isMobile?`1px solid ${C.border}`:"none",borderRadius:isMobile?10:0,padding:isMobile?"12px 10px":"12px 12px 0",color:C.textMid,fontSize:isMobile?13:13,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6}}><Icon name="file" size={15}/> Quality report</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>}
        </>}
      </div>
      </main>
      {isMobile&&<nav className="buyer-mobile-nav" aria-label="Buyer navigation" style={{position:"fixed",left:10,right:10,bottom:"calc(10px + env(safe-area-inset-bottom))",zIndex:140,background:"#fff",border:`1px solid ${C.border}`,borderRadius:18,boxShadow:"0 14px 34px rgba(16,24,40,0.18)",padding:"8px 8px 7px",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:7,overflow:"visible"}}>
        <span className="buyer-mobile-nav-indicator" aria-hidden="true" style={{transform:mobileNavIndicatorTransform}}/>
        {mobileNavItems.map(item=>(
          <button
            key={item.label}
            className={`buyer-button buyer-mobile-nav-item${item.active?" is-active":""}`}
            onClick={item.action||undefined}
            disabled={!item.action&&!item.active}
            style={{minHeight:item.active?58:52,background:item.active?"transparent":"#f9fbfe",border:`1px solid ${item.active?"transparent":"#eef2f7"}`,borderRadius:item.active?999:12,color:item.active?C.white:"#5c6678",fontSize:11,fontWeight:700,cursor:item.action||item.active?"pointer":"default",fontFamily:FONT_STACK,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,opacity:item.action||item.active?1:0.62,padding:"6px 4px",transform:item.active?"translateY(-18px)":"none",boxShadow:"none"}}
          >
            <Icon name={item.icon} size={17}/>
            <span style={{whiteSpace:"nowrap",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis"}}>{item.mobileLabel||item.label}</span>
          </button>
        ))}
      </nav>}
      {tradeOpen&&(
        <div className="buyer-trade-overlay" style={{position:"fixed",top:0,left:0,right:0,bottom:isMobile?"calc(92px + env(safe-area-inset-bottom))":0,background:isMobile?C.white:"rgba(246,248,252,0.96)",zIndex:isMobile?120:260,display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"center",padding:isMobile?"0":"24px"}} onClick={()=>setTradeOpen(false)}>
          <div className="buyer-trade-sheet buyer-gpt-shell" style={{width:"100%",maxWidth:760,height:isMobile?"100%":"min(760px, calc(100dvh - 48px))",background:C.white,border:isMobile?"none":`1px solid ${C.border}`,borderRadius:isMobile?0:18,boxShadow:isMobile?"none":"0 22px 70px rgba(16,24,40,0.12)",boxSizing:"border-box",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
            <div style={{height:58,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,padding:isMobile?"0 14px":"0 18px",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                <div style={{width:30,height:30,borderRadius:9,background:"#f2f4f7",display:"flex",alignItems:"center",justifyContent:"center",color:C.textMid,flexShrink:0}}><Icon name="bot" size={16}/></div>
                <div style={{fontSize:15,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Trade GPT</div>
              </div>
              <button className="buyer-button" onClick={()=>setTradeOpen(false)} style={{width:34,height:34,borderRadius:10,border:"none",background:"transparent",color:C.textMid,cursor:"pointer",fontFamily:FONT_STACK,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}} aria-label="Close Trade GPT"><Icon name="close" size={17}/></button>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:isMobile?"34px 18px 18px":"30px 24px 22px"}}>
              <div style={{maxWidth:620,margin:"0 auto",display:"flex",flexDirection:"column",gap:18}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start",justifyContent:isMobile?"center":"flex-start",textAlign:isMobile?"center":"left"}}>
                  {!isMobile&&<div style={{width:30,height:30,borderRadius:9,background:"#f2f4f7",display:"flex",alignItems:"center",justifyContent:"center",color:C.textMid,flexShrink:0}}><Icon name="bot" size={15}/></div>}
                  <div style={{fontSize:isMobile?16:15,lineHeight:1.65,color:C.text,maxWidth:isMobile?300:520}}>
                    {isMobile?"What are you looking for?":"Tell me the stone, budget, delivery market, or export readiness you need. I can narrow the catalog for you."}
                    {isMobile&&<div style={{fontSize:13,lineHeight:1.55,color:C.textDim,marginTop:8}}>Ask in plain language. I will filter the catalog for you.</div>}
                  </div>
                </div>

                {!tradeHasPrompt&&tradeExamples.length>0&&(
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginLeft:isMobile?0:42}}>
                    {tradeExamples.map(example=>(
                      <button key={example} className="buyer-chip" onClick={()=>setTradePrompt(example)} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 14px",fontSize:13,lineHeight:1.35,fontWeight:600,color:C.textMid,cursor:"pointer",fontFamily:FONT_STACK,textAlign:"left"}}>{example}</button>
                    ))}
                  </div>
                )}

                {tradeHasPrompt&&(
                  <>
                    <div style={{display:"flex",justifyContent:"flex-end"}}>
                      <div style={{maxWidth:"80%",background:"#f2f4f7",borderRadius:"18px 18px 4px 18px",padding:"11px 14px",fontSize:14,lineHeight:1.55,color:C.text}}>{tradePrompt.trim()}</div>
                    </div>
                    <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{width:30,height:30,borderRadius:9,background:"#f2f4f7",display:"flex",alignItems:"center",justifyContent:"center",color:C.textMid,flexShrink:0}}><Icon name="bot" size={15}/></div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,lineHeight:1.6,color:C.text,marginBottom:12}}>
                          {tradeRecommendations.length?`I found ${tradeRecommendations.length} good match${tradeRecommendations.length===1?"":"es"}. Apply this to update the catalog.`:"I do not see a strong match yet. Try adding a stone name, budget, export market, or readiness requirement."}
                        </div>
                        {tradeRecommendations.length>0&&(
                          <div style={{display:"flex",flexDirection:"column",gap:8}}>
                            {tradeRecommendations.slice(0,3).map(({slab,evidence})=>(
                              <button key={slab.id} className="buyer-button" onClick={()=>{setTradePrompt(slab.stone);applyTradePrompt(slab.stone);}} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 12px",textAlign:"left",cursor:"pointer",fontFamily:FONT_STACK}}>
                                <span style={{minWidth:0}}>
                                  <span style={{display:"block",fontSize:13,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{slab.stone}</span>
                                  <span style={{display:"block",fontSize:12,color:C.textDim,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{slab.grade} · {fmtMoney(slab.pricePerSqFt)}/sqft · Export readiness {evidence.score}%</span>
                                </span>
                                <Icon name="filter" size={15} color={C.textDim}/>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{borderTop:`1px solid ${C.border}`,padding:isMobile?"12px":"14px 18px 18px",flexShrink:0,background:C.white}}>
              <div style={{maxWidth:620,margin:"0 auto",display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:10,alignItems:"end",border:`1px solid ${C.border}`,borderRadius:18,padding:"8px 8px 8px 14px",background:"#fff"}}>
                <textarea value={tradePrompt} onChange={e=>setTradePrompt(e.target.value)} rows={1} placeholder="Ask for slabs, budget, export readiness..." style={{width:"100%",minHeight:38,maxHeight:120,padding:"8px 0",border:"none",background:"transparent",fontSize:14,lineHeight:1.45,color:C.text,fontFamily:FONT_STACK,resize:"none",outline:"none",boxSizing:"border-box"}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&tradePrompt.trim()){e.preventDefault();applyTradePrompt();}}}/>
                <button className="buyer-button" onClick={()=>applyTradePrompt()} disabled={!tradeHasPrompt} style={{width:38,height:38,borderRadius:12,background:tradeHasPrompt?C.primary:C.surface,border:`1px solid ${tradeHasPrompt?C.primary:C.border}`,color:tradeHasPrompt?C.white:C.textDim,cursor:tradeHasPrompt?"pointer":"not-allowed",fontFamily:FONT_STACK,display:"inline-flex",alignItems:"center",justifyContent:"center"}} aria-label="Apply to catalog"><Icon name="filter" size={16}/></button>
              </div>
            </div>
          </div>
        </div>
      )}
      {inquiry&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setInquiry(null)}>
          <div className="buyer-sheet" style={{background:C.white,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:560,padding:"20px"}} onClick={e=>e.stopPropagation()}>
            {inquirySent?<div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:48,marginBottom:16}}>â‚¹</div>
              <div style={{...TEXT.pageHeader,marginBottom:8}}>Quote Request Sent</div>
              <div style={{fontSize:13,lineHeight:1.55,color:C.textMid,marginBottom:20}}>Your quote request for slab <strong>{inquiry.id}</strong> has been sent to {fac?.name}.</div>
              <button onClick={()=>setInquiry(null)} style={{padding:"12px 28px",background:C.primary,border:"none",borderRadius:10,color:C.white,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Done</button>
            </div>:<div>
              <div style={{fontSize:16,lineHeight:1.3,fontWeight:700,letterSpacing:0,marginBottom:14}}>Request Quote â€” {inquiry.stone}</div>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:600}}>{inquiry.grade} slab</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.green}}>Rs {inquiry.pricePerSqFt}/sqft</div>
                </div>
                <div style={{fontSize:12,color:C.textDim}}>{inquiry.id} Â· {slabDims(inquiry)}</div>
              </div>
              <div style={{background:inquiryReadiness>=70?C.greenBg:C.amberBg,border:`1px solid ${inquiryReadiness>=70?C.greenBorder:C.amberBorder}`,borderRadius:10,padding:12,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:6}}>
                  <div style={{fontSize:13,fontWeight:600,color:inquiryReadiness>=70?C.green:C.amber}}>Export readiness</div>
                  <div style={{fontSize:16,fontWeight:700,color:inquiryReadiness>=70?C.green:C.amber}}>{inquiryReadiness}%</div>
                </div>
                <div style={{fontSize:12,lineHeight:1.55,color:C.textMid}}>Includes export flag, photo proof, {inquiryExportReadiness.traceCount}/7 traceability fields, and {inquiryExportReadiness.auditCount}/6 audit fields. Review the certificate before confirming commercial terms.</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <Inp label="Area Required" value={quoteReq.areaSqFt} onChange={v=>setQuoteReq(p=>({...p,areaSqFt:v.replace(/[^0-9.]/g,"")}))} placeholder="120" hint="sq ft"/>
                <Inp label="Target Date" value={quoteReq.targetDate} onChange={v=>setQuoteReq(p=>({...p,targetDate:v}))} type="date"/>
              </div>
              {estimateTotal>0&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"14px 16px",fontSize:12,fontWeight:600,color:C.green,marginBottom:14}}>Estimated quote value: Rs {estimateTotal.toLocaleString("en-IN")}</div>}
              <Inp label="Delivery Location" value={quoteReq.deliveryLocation} onChange={v=>setQuoteReq(p=>({...p,deliveryLocation:v}))} placeholder="City, country" />
              <textarea value={quoteReq.notes} onChange={e=>setQuoteReq(p=>({...p,notes:e.target.value}))} placeholder="Requirement notes, payment terms, packing, shipping..." rows={3} style={{width:"100%",padding:"14px 16px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,lineHeight:1.55,outline:"none",resize:"none",boxSizing:"border-box",margin:"12px 0 10px"}}/>
              <textarea value={inquiryMsg} onChange={e=>setInquiryMsg(e.target.value)} placeholder="Optional message to the factory..." rows={2} style={{width:"100%",padding:"14px 16px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,lineHeight:1.55,outline:"none",resize:"none",boxSizing:"border-box",marginBottom:18}}/>
              <ErrorNotice title="Could not send request" message={inquiryError} onRetry={submitInquiry}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <button onClick={()=>setInquiry(null)} style={{padding:"12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Cancel</button>
                <button onClick={submitInquiry} disabled={inquiryBusy} style={{padding:"12px",background:C.primary,border:"none",borderRadius:10,color:C.white,fontSize:14,fontWeight:600,cursor:inquiryBusy?"not-allowed":"pointer",fontFamily:FONT_STACK,opacity:inquiryBusy?0.65:1}}>{inquiryBusy?"Sending...":"Send Request"}</button>
              </div>
            </div>}
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€ ROOT â”€â”€
function PublicQuotePage({quoteId}) {
  const [quote,setQuote]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [copied,setCopied]=useState(false);
  const [summaryCopied,setSummaryCopied]=useState(false);
  const [buyerMessage,setBuyerMessage]=useState("");
  const [decisionBusy,setDecisionBusy]=useState("");
  const [decisionError,setDecisionError]=useState("");
  useEffect(()=>{
    let active=true;
    supabase.rpc("get_public_quote",{quote_id:quoteId}).then(({data,error})=>{
      if(!active)return;
      if(error){setError(error.message||"Quote unavailable.");setLoading(false);return;}
      const row=Array.isArray(data)?data[0]:data;
      if(!row)setError("Quote not found.");
      setQuote(row);setLoading(false);
    }).catch(e=>{if(active){setError(e.message||"Quote unavailable.");setLoading(false);}});
    return()=>{active=false;};
  },[quoteId]);
  if(loading)return <Loader/>;
  if(error)return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT_STACK,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{padding:24,maxWidth:420,textAlign:"center"}}>
        <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>Quote unavailable</div>
        <div style={{fontSize:13,color:C.textMid}}>{error}</div>
      </Card>
    </div>
  );
  const statusColor={draft:C.textDim,sent:C.primary,accepted:C.green,revision_requested:C.amber,revised:C.textDim,expired:C.red}[quote.status]||C.primary;
  const statusLabel=(quote.status||"sent").replace("_"," ");
  const validUntil=quote.validity_ts?fmtD(quote.validity_ts):"Not specified";
  const expired=quote.validity_ts&&quote.validity_ts<Date.now();
  const expiringSoon=quote.status==="sent"&&quote.validity_ts&&quote.validity_ts>Date.now()&&quote.validity_ts-Date.now()<=3*86400000;
  const daysLeft=quote.validity_ts&&!expired?Math.max(1,Math.ceil((quote.validity_ts-Date.now())/86400000)):0;
  const timelineStatus=expired&&quote.status==="sent"?"expired":quote.status||"sent";
  const fulfillment=fulfillmentConf(quote.fulfillment_status||(quote.status==="accepted"?"payment_pending":"not_started"));
  const canDecide=quote.status==="sent"&&!expired;
  const quoteTimeline=[
    {label:"Quote sent",detail:quote.created_at?fmtD(quote.created_at):"Sent to buyer",done:true,current:false},
    {
      label:"Buyer response",
      detail:timelineStatus==="accepted"?"Accepted by buyer":timelineStatus==="revision_requested"?"Changes requested by buyer":timelineStatus==="revised"?"Buyer requested changes":timelineStatus==="expired"?"Expired before response":"Waiting for buyer",
      done:["accepted","revision_requested","revised"].includes(timelineStatus),
      current:timelineStatus==="sent"
    },
    ...(["accepted"].includes(timelineStatus)?QUOTE_FULFILLMENT.filter(x=>!["not_started"].includes(x.id)).map(x=>({
      label:x.label,
      detail:x.buyer,
      done:QUOTE_FULFILLMENT.findIndex(s=>s.id===fulfillment.id)>=QUOTE_FULFILLMENT.findIndex(s=>s.id===x.id),
      current:fulfillment.id===x.id,
      muted:false
    })):[{
      label:timelineStatus==="revised"?"Revised quote":timelineStatus==="revision_requested"?"Factory review":"Sale follow-up",
      detail:timelineStatus==="revision_requested"?"Factory can send a revised quote":timelineStatus==="revised"?"A newer quote has replaced this one":timelineStatus==="expired"?"Ask the factory for an updated quote":"Starts after buyer response",
      done:timelineStatus==="revised",
      current:timelineStatus==="revision_requested",
      muted:timelineStatus==="sent"||timelineStatus==="expired"
    }])
  ];
  async function copyLink(){
    try{await navigator.clipboard.writeText(window.location.href);setCopied(true);setTimeout(()=>setCopied(false),1400);}catch(e){}
  }
  async function copyQuoteSummary(){
    const text=[
      `Epistable quote: ${quote.id}`,
      `Factory: ${quote.factory_name||"Verified factory"}`,
      `Slab: ${quote.slab_id||"-"} | ${quote.stone} | ${quote.grade}`,
      `Area: ${Number(quote.area_sq_ft||0).toLocaleString("en-IN")} sq ft`,
      `Rate: Rs ${Number(quote.price_per_sq_ft||0).toLocaleString("en-IN")}/sq ft`,
      `Total: Rs ${Number(quote.total_amount||0).toLocaleString("en-IN")}`,
      `Valid until: ${validUntil}`,
      window.location.href
    ].join("\n");
    try{await navigator.clipboard.writeText(text);setSummaryCopied(true);setTimeout(()=>setSummaryCopied(false),1400);}catch(e){window.prompt("Copy quote summary",text);}
  }
  async function submitDecision(decision){
    if(!canDecide||decisionBusy)return;
    setDecisionBusy(decision);setDecisionError("");
    const {data,error}=await supabase.rpc("respond_to_quote",{quote_id:quoteId,decision,message:buyerMessage});
    setDecisionBusy("");
    if(error){setDecisionError(error.message||"Could not update quote.");return;}
    const row=Array.isArray(data)?data[0]:data;
    if(row)setQuote(row);
  }
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT_STACK,color:C.text}}>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,padding:"22px 18px 90px"}}>
        <div style={{maxWidth:820,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
          <div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.65)",fontWeight:600,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:8}}>Epistable Quote</div>
            <div style={{fontSize:28,fontWeight:700,color:C.white,lineHeight:1.1,marginBottom:6}}>Proforma quote</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.72)"}}>{quote.factory_name||"Verified factory"} - {quote.stone}</div>
          </div>
          <button onClick={copyLink} style={{background:"rgba(255,255,255,0.14)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:10,color:C.white,padding:"9px 13px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK,whiteSpace:"nowrap"}}>{copied?"Copied":"Copy link"}</button>
        </div>
      </div>
      <div style={{maxWidth:820,margin:"-62px auto 0",padding:"0 14px 40px"}}>
        <Card style={{overflow:"hidden"}}>
          <div style={{padding:20,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:12,color:C.textDim,fontWeight:600,marginBottom:4}}>Quote ID</div>
              <div style={{fontSize:14,fontFamily:"monospace",fontWeight:700,color:C.text}}>{quote.id}</div>
            </div>
            <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
              {expired&&<span style={{background:C.redBg,border:`1px solid ${C.redBorder}`,color:C.red,borderRadius:20,padding:"5px 11px",fontSize:12,fontWeight:600}}>Expired</span>}
              {expiringSoon&&<span style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,color:C.amber,borderRadius:20,padding:"5px 11px",fontSize:12,fontWeight:600}}>Expires in {daysLeft} day{daysLeft===1?"":"s"}</span>}
              <span style={{background:C.surface,border:`1px solid ${C.border}`,color:statusColor,borderRadius:20,padding:"5px 11px",fontSize:12,fontWeight:600,textTransform:"capitalize"}}>{statusLabel}</span>
              {quote.status==="accepted"&&<span style={{background:fulfillment.bg,border:`1px solid ${fulfillment.border}`,color:fulfillment.color,borderRadius:20,padding:"5px 11px",fontSize:12,fontWeight:600}}>{fulfillment.label}</span>}
            </div>
          </div>
          <div style={{padding:20,borderBottom:`1px solid ${C.border}`,background:expiringSoon?C.amberBg:C.greenBg}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14}}>
              {[["Verified slab",quote.slab_id||"-"],["Factory issued",quote.factory_name||"Verified factory"],["Buyer action",canDecide?"Accept or request changes":statusLabel],["Validity",expired?"Expired":quote.validity_ts?`${daysLeft} day${daysLeft===1?"":"s"} left`:"Not specified"]].map(([label,value])=>(
                <div key={label} style={{background:C.white,border:`1px solid ${expiringSoon?C.amberBorder:C.greenBorder}`,borderRadius:10,padding:"14px 16px"}}>
                  <div style={{fontSize:12,color:C.textDim,fontWeight:600,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:13,color:C.text,fontWeight:600}}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:20,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,borderBottom:`1px solid ${C.border}`}}>
            {[["Buyer",quote.buyer_company||quote.buyer_name||"Buyer"],["Email",quote.buyer_email||"Not provided"],["Factory",quote.factory_name||"Factory"],["Valid Until",validUntil]].map(([label,value])=>(
              <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
                <div style={{fontSize:12,color:C.textDim,fontWeight:600,marginBottom:5}}>{label}</div>
                <div style={{fontSize:13,fontWeight:600,wordBreak:"break-word"}}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{padding:20,borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>Quote timeline</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14}}>
              {quoteTimeline.map((step,i)=>(
                <div key={step.label} style={{display:"flex",gap:14,alignItems:"flex-start",background:step.current?C.primaryBg:step.done?C.greenBg:C.surface,border:`1px solid ${step.current?C.primaryBorder:step.done?C.greenBorder:C.border}`,borderRadius:10,padding:12,opacity:step.muted?0.72:1}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:step.done?C.green:step.current?C.primary:C.border,color:step.done||step.current?C.white:C.textDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,flexShrink:0}}>{step.done?"âœ“":i+1}</div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:step.done?C.green:step.current?C.primary:C.text}}>{step.label}</div>
                    <div style={{fontSize:12,color:C.textMid,lineHeight:1.65,marginTop:3}}>{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:20}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:16}}>Slab details</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:16}}>
              {[["Slab",quote.slab_id],["Stone",quote.stone],["Grade",quote.grade],["Area",`${Number(quote.area_sq_ft||0).toLocaleString("en-IN")} sq ft`]].map(([label,value])=>(
                <div key={label} style={{borderBottom:`1px solid ${C.border}`,padding:"0 0 10px"}}>
                  <div style={{fontSize:12,color:C.textDim,fontWeight:600,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:600}}>{value||"-"}</div>
                </div>
              ))}
            </div>
            <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:20,marginBottom:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:14,alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,color:C.primary,fontWeight:600,marginBottom:4}}>Total quote value</div>
                  <div style={{fontSize:28,fontWeight:700,color:C.green}}>{fmtMoney(Number(quote.total_amount||0))}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:12,color:C.textDim,fontWeight:600}}>Rate</div>
                  <div style={{fontSize:15,fontWeight:700}}>{fmtMoney(Number(quote.price_per_sq_ft||0))}/sq ft</div>
                </div>
              </div>
            </div>
            <GuidanceCard title="Before you accept" subtitle="Quick trust checks for the buyer" style={{marginBottom:16,boxShadow:"none"}} items={[
              {label:"Certificate",detail:"Open the slab certificate and confirm grade, photos, and defects.",color:C.primary,bg:C.primaryBg,border:C.primaryBorder},
              {label:"Commercials",detail:"Confirm area, rate, delivery terms, and validity date.",color:C.amber,bg:C.amberBg,border:C.amberBorder},
              {label:"Tracking",detail:"After acceptance, this quote becomes the order tracking link.",color:C.green,bg:C.greenBg,border:C.greenBorder},
            ]}/>
            {quote.notes&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:13,marginBottom:16}}>
              <div style={{fontSize:12,color:C.textDim,fontWeight:600,marginBottom:5}}>Notes</div>
              <div style={{fontSize:13,lineHeight:1.7}}>{quote.notes}</div>
            </div>}
            {quote.status==="accepted"&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:20,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:C.green,marginBottom:4}}>Quote accepted</div>
              <div style={{fontSize:12,color:C.textMid}}>Current next step: {fulfillment.buyer}. Keep this link for order tracking.</div>
              {quote.buyer_message&&<div style={{fontSize:12,color:C.text,marginTop:8,lineHeight:1.55}}>Buyer note: {quote.buyer_message}</div>}
            </div>}
            {quote.status==="revision_requested"&&<div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:12,padding:20,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:C.amber,marginBottom:4}}>Changes requested</div>
              <div style={{fontSize:12,color:C.textMid}}>We sent your note to the factory. They can respond with a revised quote link.</div>
              {quote.buyer_message&&<div style={{fontSize:12,color:C.text,marginTop:8,lineHeight:1.55}}>Buyer note: {quote.buyer_message}</div>}
            </div>}
            {quote.status==="revised"&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:C.textMid,marginBottom:4}}>Revised quote sent</div>
              <div style={{fontSize:12,color:C.textMid}}>This quote has been replaced by a newer quote. Please use the latest revised quote link from the factory.</div>
            </div>}
            {canDecide&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Respond to this quote</div>
              <textarea value={buyerMessage} onChange={e=>setBuyerMessage(e.target.value)} rows={3} placeholder="Add a note for the factory, such as delivery terms, quantity, or pricing questions (optional)" style={{width:"100%",padding:"13px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,resize:"none",outline:"none",boxSizing:"border-box",marginBottom:14}}/>
              {decisionError&&<div style={{fontSize:12,color:C.red,background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"8px 10px",marginBottom:14}}>{decisionError}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <button onClick={()=>submitDecision("revision_requested")} disabled={!!decisionBusy} style={{background:C.white,border:`1px solid ${C.amberBorder}`,borderRadius:10,color:C.amber,padding:"13px 14px",fontSize:13,fontWeight:600,cursor:decisionBusy?"not-allowed":"pointer",fontFamily:FONT_STACK,opacity:decisionBusy?0.65:1}}>{decisionBusy==="revision_requested"?"Sending...":"Request Changes"}</button>
                <button onClick={()=>submitDecision("accepted")} disabled={!!decisionBusy} style={{background:C.green,border:"none",borderRadius:10,color:C.white,padding:"13px 14px",fontSize:13,fontWeight:600,cursor:decisionBusy?"not-allowed":"pointer",fontFamily:FONT_STACK,opacity:decisionBusy?0.65:1}}>{decisionBusy==="accepted"?"Accepting...":"Accept Quote"}</button>
              </div>
            </div>}
            {!canDecide&&quote.status==="sent"&&expired&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:12,padding:20,marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:C.red,marginBottom:4}}>Quote expired</div>
              <div style={{fontSize:12,color:C.textMid}}>Please ask the factory for an updated quote.</div>
            </div>}
            <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
              {quote.slab_id&&<button onClick={()=>window.location.assign(`/slab/${encodeURIComponent(quote.slab_id)}`)} style={{background:C.primary,border:"none",borderRadius:10,color:C.white,padding:"11px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>View slab certificate</button>}
              <button onClick={copyQuoteSummary} style={{background:C.white,border:`1px solid ${C.primaryBorder}`,borderRadius:10,color:C.primary,padding:"11px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>{summaryCopied?"Copied summary":"Copy summary"}</button>
              <button onClick={()=>window.print()} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:10,color:C.textMid,padding:"11px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>Print quote</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SupplierProfileMockup({prototype=true,factoryId=""}) {
  const {isMobile}=useBP();
  const [mode,setMode]=useState(prototype?"visual":"profile");
  const [profileFac,setProfileFac]=useState(null);
  const [profileInsps,setProfileInsps]=useState([]);
  const [buyerLens,setBuyerLens]=useState("Europe");
  useEffect(()=>{
    if(!factoryId)return;
    let active=true;
    Promise.all([DB.getFac(factoryId),DB.facBuyerInsps(factoryId)])
      .then(([f,i])=>{if(active){setProfileFac(f);setProfileInsps(i||[]);}})
      .catch(()=>{});
    return()=>{active=false;};
  },[factoryId]);
  const heroImage="/mockups/supplier-profile-hero.png";
  const factoryImages=[
    {label:"Slab inspection",src:"https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80",detail:"Current Makrana White lot photographed before quote"},
    {label:"Packing check",src:"https://images.unsplash.com/photo-1604079628040-94301bb21b91?auto=format&fit=crop&w=900&q=80",detail:"Wooden crate and edge-protection evidence"},
    {label:"Dispatch floor",src:"https://images.unsplash.com/photo-1581092921461-39b9d08a9b21?auto=format&fit=crop&w=900&q=80",detail:"Loading lane and inventory handover area"},
  ];
  const profileName=profileFac?.name||"Sharma Marble Works";
  const verifiedSlabCount=profileInsps.length||186;
  const exportDocPct=profileInsps.length?Math.round((profileInsps.filter(i=>i.exportReady).length/profileInsps.length)*100):92;
  const trustStats=[
    {label:"Verified slabs",value:String(verifiedSlabCount),detail:"Inspected buyer-visible slabs"},
    {label:"Export docs",value:`${exportDocPct}%`,detail:"Traceability and packing evidence coverage"},
    {label:"Quote response",value:"1 day",detail:"Median buyer response time"},
    {label:"Active since",value:"2008",detail:"Family-operated Makrana supplier"},
  ];
  const evidence=[
    {label:"GST and IEC",status:"Verified",score:"100",icon:"file",color:C.green,bg:C.greenBg,border:C.greenBorder},
    {label:"Traceability",status:"Strong",score:"88",icon:"qr",color:C.primary,bg:C.primaryBg,border:C.primaryBorder},
    {label:"Packing evidence",status:"Available",score:"94",icon:"box",color:C.green,bg:C.greenBg,border:C.greenBorder},
    {label:"Certification",status:"Partial",score:"62",icon:"verified",color:C.amber,bg:C.amberBg,border:C.amberBorder},
  ];
  const people=[
    {name:"Arvind Sharma",role:"Owner",img:"https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=240&q=80",detail:"Second-generation stone operator. Handles pricing and long-term buyer relationships."},
    {name:"Meera Joshi",role:"Buyer desk",img:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",detail:"English and Hindi. Shares quotes, documents, and shipment updates."},
    {name:"Ramesh Gurjar",role:"Dispatch lead",img:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80",detail:"Coordinates packing photos, vehicle loading, and final handover checks."},
  ];
  const capabilities=[
    ["Primary stones","Makrana White, Albeta, Dungri"],
    ["Finishes","Polished, honed, leather, cut-to-size"],
    ["Monthly capacity","38,000-45,000 sq ft"],
    ["Export markets","UAE, Qatar, Oman, domestic hotel projects"],
    ["Typical lead time","3-5 days for available slabs"],
    ["Languages","Hindi, English"],
  ];
  const recent=[
    "12 Makrana White slabs inspected this week",
    "Dubai hotel lobby quote sent yesterday",
    "Packing photos uploaded for 3 accepted orders",
  ];
  const confidence=[
    {label:"Quality proof",value:91,color:C.green},
    {label:"Export ready",value:86,color:C.primary},
    {label:"Response",value:78,color:C.amber},
  ];
  const capabilityChips=["Makrana White","Export packing","Cut-to-size","UAE/Qatar","3-5 day lead","English desk"];
  const buyerLenses={
    International:{score:82,title:"International readiness",chips:["Export docs","Traceable lots","Packing photos"],focus:["Quality proof","Export packing","Named contact"]},
    Europe:{score:78,title:"European buyer lens",chips:["Documentation","Traceability","Consistency"],focus:["Invoice + packing list","Lot-level source","Tolerance control"]},
    GCC:{score:86,title:"GCC project lens",chips:["Availability","Speed","Large lots"],focus:["Ready stock","Hotel projects","Fast dispatch"]},
    "North America":{score:74,title:"North America lens",chips:["Sample match","Claims trail","Email record"],focus:["Sample-to-shipment","Defect disclosure","Change history"]},
    Domestic:{score:88,title:"Domestic buyer lens",chips:["Price","Availability","Delivery"],focus:["Local dispatch","Known supplier","Fast quote"]},
    "Design / Project":{score:80,title:"Architect lens",chips:["Finish","Color range","References"],focus:["Visual consistency","Sample confidence","Project supply"]},
  };
  const activeLens=buyerLenses[buyerLens];
  const WireBlock=({h=18,w="100%",label})=>(
    <div style={{display:"grid",gap:8}}>
      {label&&<div style={{fontSize:11,fontWeight:700,color:C.textDim}}>{label}</div>}
      <div style={{height:h,width:w,background:"#eef3f8",border:"1px solid #dfe7f1",borderRadius:8}}/>
    </div>
  );
  if(prototype&&mode==="wireframe")return (
    <div style={{minHeight:"100vh",background:"#f4f6fa",fontFamily:FONT_STACK,color:C.text,padding:isMobile?"18px 14px 32px":"28px"}}>
      <div style={{maxWidth:1180,margin:"0 auto"}}>
        {prototype&&<MockupTopbar mode={mode} setMode={setMode}/>}
        <Card style={{padding:isMobile?16:24,marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.25fr 0.75fr",gap:16}}>
            <WireBlock h={isMobile?180:240} label="Hero image / factory context"/>
            <div style={{display:"grid",gap:10}}>
              <WireBlock h={isMobile?58:72} label="Evidence thumbnail"/>
              <WireBlock h={isMobile?58:72} label="People thumbnail"/>
              <WireBlock h={isMobile?58:72} label="Packing thumbnail"/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.2fr 0.8fr",gap:18,marginTop:18}}>
            <div style={{display:"grid",gap:12}}>
              <WireBlock h={34} w="70%" label="Factory name and location"/>
              <WireBlock h={18} w="92%" label="Human factory note"/>
              <WireBlock h={18} w="82%"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {trustStats.map(s=><WireBlock key={s.label} h={72} label={s.label}/>)}
            </div>
          </div>
        </Card>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"0.9fr 1.1fr",gap:16}}>
          <Card style={{padding:18}}>
            <WireBlock h={22} w="46%" label="People"/>
            <div style={{display:"grid",gap:12,marginTop:14}}>
              {people.map(p=><WireBlock key={p.name} h={72}/>)}
            </div>
          </Card>
          <Card style={{padding:18}}>
            <WireBlock h={22} w="52%" label="Evidence scorecard"/>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginTop:14}}>
              {evidence.map(e=><WireBlock key={e.label} h={102}/>)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
  return (
    <div className="supplier-profile-mockup" style={{minHeight:"100vh",background:"#f5f7fb",fontFamily:FONT_STACK,color:C.text,padding:isMobile?"14px 12px 32px":"28px"}}>
      <div style={{maxWidth:1180,margin:"0 auto"}}>
        {prototype&&<MockupTopbar mode={mode} setMode={setMode}/>}
        {!prototype&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:16}}>
          <button className="buyer-button" onClick={()=>{if(window.history.length>1)window.history.back();else window.location.assign("/");}} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,color:C.textMid,padding:"10px 13px",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:FONT_STACK,display:"inline-flex",alignItems:"center",gap:8}}>
            <Icon name="prev" size={15}/> Back
          </button>
          <div style={{fontSize:12,fontWeight:850,color:C.textDim}}>Supplier profile</div>
        </div>}
        <section style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden",boxShadow:"0 18px 50px rgba(16,24,40,0.09)",marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1.08fr) 0.92fr",gap:0}}>
            <div style={{position:"relative",minHeight:isMobile?260:430,background:"#eef3f8"}}>
              <img src={heroImage} alt="Factory media" style={{width:"100%",height:"100%",position:"absolute",inset:0,objectFit:"cover",display:"block"}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(6,18,45,0.04),rgba(6,18,45,0.22))"}}/>
              <div style={{position:"absolute",left:isMobile?14:20,bottom:isMobile?14:20,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <button style={{display:"inline-flex",alignItems:"center",gap:8,background:C.white,border:"none",borderRadius:999,padding:"10px 13px",boxShadow:"0 10px 24px rgba(16,24,40,0.18)",fontSize:12,fontWeight:900,color:C.primaryD,cursor:"pointer",fontFamily:FONT_STACK}}>
                  <Icon name="play" size={14}/> Factory video
                </button>
                <span style={{background:"rgba(255,255,255,0.86)",border:"1px solid rgba(255,255,255,0.7)",borderRadius:999,padding:"9px 11px",fontSize:12,fontWeight:850,color:C.text}}>Photo / video slot</span>
              </div>
            </div>
            <div style={{padding:isMobile?18:28,display:"grid",alignContent:"space-between",gap:22}}>
              <div>
                <div style={{display:"inline-flex",alignItems:"center",gap:8,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:999,padding:"7px 12px",fontSize:12,fontWeight:900,color:C.primaryD,marginBottom:14}}>
                  <Icon name="verified" size={14}/> Supplier trust dossier
                </div>
                <h1 style={{margin:"0 0 10px",fontSize:isMobile?32:44,lineHeight:1.04,letterSpacing:0,fontWeight:900,color:C.text}}>{profileName}</h1>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
                  {["Quality proof","Traceable lots","Export packing","Named people"].map(tag=>(
                    <span key={tag} style={{background:"#fbfcff",border:`1px solid ${C.border}`,borderRadius:999,padding:"8px 10px",fontSize:12,fontWeight:850,color:C.textMid}}>{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {factoryImages.map(img=>(
                  <div key={img.label} style={{position:"relative",overflow:"hidden",borderRadius:12,border:`1px solid ${C.border}`,background:C.surface}}>
                    <img src={img.src} alt={img.label} style={{width:"100%",height:isMobile?74:92,objectFit:"cover",display:"block"}}/>
                    <div style={{padding:"7px 8px",fontSize:10,fontWeight:900,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{img.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:1,background:C.border}}>
            {trustStats.map(s=>(
              <div key={s.label} style={{background:C.white,padding:isMobile?"14px 13px":"18px 20px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                  <div style={{fontSize:isMobile?23:29,fontWeight:850,color:C.primaryD,letterSpacing:0}}>{s.value}</div>
                  <span style={{width:34,height:34,borderRadius:12,background:C.primaryBg,color:C.primary,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><Icon name={s.label==="Quote response"?"message":s.label==="Export docs"?"file":s.label==="Verified slabs"?"verified":"date"} size={16}/></span>
                </div>
                <div style={{fontSize:12,fontWeight:800,color:C.text,marginTop:3}}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>
        <section style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:18,padding:isMobile?14:18,boxShadow:"0 14px 34px rgba(16,24,40,0.06)",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap",marginBottom:14}}>
            <SectionTitle title="Buyer readiness" subtitle="Same supplier, different buyer priorities." compact/>
            <div style={{display:"flex",gap:7,overflowX:"auto",maxWidth:"100%"}}>
              {Object.keys(buyerLenses).map(lens=>(
                <button key={lens} onClick={()=>setBuyerLens(lens)} style={{background:buyerLens===lens?C.primary:C.surface,border:`1px solid ${buyerLens===lens?C.primary:C.border}`,borderRadius:999,color:buyerLens===lens?C.white:C.textMid,padding:"8px 11px",fontSize:12,fontWeight:850,cursor:"pointer",fontFamily:FONT_STACK,whiteSpace:"nowrap"}}>{lens}</button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"180px 1fr 1fr",gap:12,alignItems:"stretch"}}>
            <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:16,padding:16,display:"grid",placeItems:"center",textAlign:"center"}}>
              <div style={{fontSize:38,fontWeight:950,color:C.primaryD,lineHeight:1}}>{activeLens.score}</div>
              <div style={{fontSize:11,fontWeight:900,color:C.primary,marginTop:5}}>readiness</div>
            </div>
            <div style={{background:"#fbfcff",border:`1px solid ${C.border}`,borderRadius:16,padding:16}}>
              <div style={{fontSize:14,fontWeight:900,color:C.text,marginBottom:10}}>{activeLens.title}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {activeLens.chips.map(chip=><span key={chip} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:999,padding:"7px 10px",fontSize:12,fontWeight:850,color:C.textMid}}>{chip}</span>)}
              </div>
            </div>
            <div style={{display:"grid",gap:8}}>
              {activeLens.focus.map((item,i)=>(
                <div key={item} style={{display:"flex",alignItems:"center",gap:10,background:i===0?C.greenBg:C.surface,border:`1px solid ${i===0?C.greenBorder:C.border}`,borderRadius:12,padding:"10px 12px"}}>
                  <Icon name="check" size={14} color={i===0?C.green:C.primary}/>
                  <span style={{fontSize:12,fontWeight:850,color:C.text}}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"0.92fr 1.08fr",gap:16,alignItems:"start"}}>
          <div style={{display:"grid",gap:16}}>
            <Card style={{padding:20}}>
              <SectionTitle title="Universal trust core" subtitle="Quality, export, response."/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,alignItems:"center"}}>
                <div style={{height:164,borderRadius:18,background:`conic-gradient(${C.green} 0 82%, #edf2f8 82% 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:112,height:112,borderRadius:"50%",background:C.white,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",boxShadow:"inset 0 0 0 1px rgba(16,24,40,0.06)"}}>
                    <div>
                      <div style={{fontSize:34,fontWeight:900,color:C.primaryD,lineHeight:1}}>82</div>
                      <div style={{fontSize:11,fontWeight:850,color:C.textDim,marginTop:3}}>trust read</div>
                    </div>
                  </div>
                </div>
                <div style={{display:"grid",gap:10}}>
                  {confidence.map(item=>(
                    <div key={item.label}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:850,color:C.text,marginBottom:5}}>
                        <span>{item.label}</span><span>{item.value}%</span>
                      </div>
                      <div style={{height:8,background:"#edf2f8",borderRadius:999,overflow:"hidden"}}>
                        <span style={{display:"block",height:"100%",width:`${item.value}%`,background:item.color,borderRadius:999}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card style={{padding:20}}>
              <SectionTitle title="Human accountability" subtitle="Named roles, not a faceless supplier."/>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10}}>
                {people.map((p,i)=>(
                  <div key={p.name} style={{background:"#fbfcff",border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
                    <img src={p.img} alt={p.name} style={{width:"100%",height:isMobile?154:112,objectFit:"cover",display:"block"}}/>
                    <div style={{padding:10}}>
                      <div style={{fontSize:13,fontWeight:850,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                      <div style={{fontSize:11,fontWeight:800,color:C.primary,marginTop:2}}>{p.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{padding:20}}>
              <SectionTitle title="Supply capability" subtitle="Material, capacity, speed."/>
              <div style={{display:"flex",flexWrap:"wrap",gap:9}}>
                {capabilityChips.map(chip=>(
                  <span key={chip} style={{display:"inline-flex",alignItems:"center",gap:7,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:999,padding:"8px 11px",fontSize:12,fontWeight:850,color:C.primaryD}}>
                    <Icon name="check" size={13} color={C.primary}/>{chip}
                  </span>
                ))}
              </div>
            </Card>
          </div>
          <div style={{display:"grid",gap:16}}>
            <Card style={{padding:20}}>
              <SectionTitle title="Quality proof" subtitle="Photos tied to actual lots."/>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.15fr 0.85fr",gap:12}}>
                <img src={factoryImages[0].src} alt={factoryImages[0].label} style={{width:"100%",height:isMobile?210:278,objectFit:"cover",borderRadius:14,border:`1px solid ${C.border}`}}/>
                <div style={{display:"grid",gap:12}}>
                  {factoryImages.slice(1).map(img=>(
                    <div key={img.label} style={{display:"grid",gridTemplateColumns:"92px 1fr",gap:12,alignItems:"center",background:"#fbfcff",border:`1px solid ${C.border}`,borderRadius:12,padding:8}}>
                      <img src={img.src} alt={img.label} style={{width:92,height:74,objectFit:"cover",borderRadius:9}}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:850,color:C.text}}>{img.label}</div>
                        <div style={{fontSize:11,lineHeight:1.5,color:C.textDim,marginTop:4}}>Photo evidence</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card style={{padding:20}}>
              <SectionTitle title="Document evidence" subtitle="Compliance and traceability status."/>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
                {evidence.map(e=>(
                  <div key={e.label} style={{background:e.bg,border:`1px solid ${e.border}`,borderRadius:14,padding:14,display:"grid",gridTemplateColumns:"48px 1fr auto",gap:12,alignItems:"center"}}>
                    <div style={{width:48,height:48,borderRadius:14,background:C.white,border:`1px solid ${e.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:e.color}}>
                      <Icon name={e.icon} size={20}/>
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:900,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.label}</div>
                      <div style={{fontSize:11,fontWeight:850,color:e.color,marginTop:3}}>{e.status}</div>
                    </div>
                    <div style={{fontSize:22,fontWeight:900,color:e.color}}>{e.score}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{padding:20}}>
              <SectionTitle title="Operating rhythm" subtitle="Recent signals of responsiveness."/>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10,marginBottom:18}}>
                {recent.map((item,i)=>(
                  <div key={item} style={{background:"#fbfcff",border:`1px solid ${C.border}`,borderRadius:14,padding:12,minHeight:92,display:"grid",alignContent:"space-between"}}>
                    <div style={{width:34,height:34,borderRadius:12,background:i===0?C.greenBg:i===1?C.primaryBg:C.amberBg,color:i===0?C.green:i===1?C.primary:C.amber,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Icon name={i===0?"camera":i===1?"message":"box"} size={16}/>
                    </div>
                    <div style={{fontSize:12,fontWeight:850,lineHeight:1.35,color:C.text}}>{i===0?"12 slabs inspected":i===1?"Quote sent yesterday":"3 packing sets"}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
                <button className="buyer-button" style={{background:C.primary,border:"none",borderRadius:12,color:C.white,padding:"14px 16px",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:FONT_STACK}}>View inventory</button>
                <button className="buyer-button" style={{background:C.white,border:`1px solid ${C.primaryBorder}`,borderRadius:12,color:C.primaryD,padding:"14px 16px",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:FONT_STACK}}>Request quote</button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockupTopbar({mode,setMode}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:16,flexWrap:"wrap"}}>
      <div>
        <div style={{fontSize:12,fontWeight:800,color:C.primary,marginBottom:4}}>Prototype</div>
        <div style={{fontSize:22,fontWeight:850,color:C.text}}>Supplier trust profile</div>
      </div>
      <div style={{display:"inline-grid",gridTemplateColumns:"1fr 1fr",background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:4}}>
        {["wireframe","visual"].map(id=>(
          <button key={id} onClick={()=>setMode(id)} style={{background:mode===id?C.primary:"transparent",border:"none",borderRadius:9,color:mode===id?C.white:C.textMid,padding:"9px 12px",fontSize:12,fontWeight:800,textTransform:"capitalize",cursor:"pointer",fontFamily:FONT_STACK}}>{id}</button>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({title,subtitle,compact=false}) {
  return (
    <div style={{marginBottom:compact?0:16}}>
      <div style={{fontSize:15,fontWeight:850,color:C.text,marginBottom:3}}>{title}</div>
      {subtitle&&<div style={{fontSize:12,lineHeight:1.55,color:C.textDim}}>{subtitle}</div>}
    </div>
  );
}

export default function App() {
  const qualityMatch=window.location.pathname.match(/^\/quality\/([^/?#]+)/);
  const slabMatch=window.location.pathname.match(/^\/slab\/([^/?#]+)/);
  const quoteMatch=window.location.pathname.match(/^\/quote\/([^/?#]+)/);
  const supplierMatch=window.location.pathname.match(/^\/supplier\/([^/?#]+)/);
  const supplierMockupMatch=window.location.pathname==="/supplier-profile-mockup";
  const inviteMatch=window.location.pathname==="/invite";
  function normalizeProfile(profile){
    if(!profile)return profile;
    const factoryId=profile.factory_id||profile.factoryId||null;
    const factoryName=profile.factory_name||profile.factoryName||"";
    return {...profile,factory_id:factoryId,factoryId,factory_name:factoryName,factoryName};
  }
  function profileSession(profile){
    profile=normalizeProfile(profile);
    if(profile.role==="owner")return {type:"owner"};
    if(profile.role==="buyer")return {type:"buyer",buyer:profile};
    return {type:"factory",user:profile};
  }
  function readCachedProfile(){
    try {
      const raw=window.localStorage.getItem("epistable.profile");
      return raw?normalizeProfile(JSON.parse(raw)):null;
    } catch(e) {
      return null;
    }
  }
  function cacheProfile(profile){
    try {
      if(profile)window.localStorage.setItem("epistable.profile",JSON.stringify(normalizeProfile(profile)));
    } catch(e) {}
  }
  function clearCachedProfile(){
    try { window.localStorage.removeItem("epistable.profile"); } catch(e) {}
  }
  const cachedProfile=readCachedProfile();
  const [session,setSession]=useState(()=>cachedProfile?profileSession(cachedProfile):null);
  const [booting,setBooting]=useState(()=>!cachedProfile);
  useEffect(()=>{
    let active=true;
    getSessionProfile()
      .then(profile=>{if(!active)return;if(profile){cacheProfile(profile);setSession(profileSession(profile));}else{clearCachedProfile();setSession(null);}})
      .catch(e=>console.error("Session restore failed",e))
      .finally(()=>{if(active)setBooting(false);});
    return ()=>{active=false;};
  },[]);
  async function logout(){try{await signOut();}catch(e){}clearCachedProfile();setSession(null);}
  if(qualityMatch)return <QualityReport slabId={decodeURIComponent(qualityMatch[1])}/>;
  if(slabMatch)return <SlabCertificate slabId={decodeURIComponent(slabMatch[1])}/>;
  if(quoteMatch)return <PublicQuotePage quoteId={decodeURIComponent(quoteMatch[1])}/>;
  if(supplierMatch)return <SupplierProfileMockup prototype={false} factoryId={decodeURIComponent(supplierMatch[1])}/>;
  if(supplierMockupMatch)return <SupplierProfileMockup/>;
  if(inviteMatch)return <InviteAccept onAccepted={profile=>{window.history.replaceState(null,"","/");cacheProfile(profile);setSession(profileSession(profile));}}/>;
  if(booting)return <Loader/>;
  return session?.type==="owner"?<Owner onLogout={logout}/>
    :session?.type==="factory"?<FactoryApp user={session.user} onLogout={logout}/>
    :session?.type==="buyer"?<BuyerPortal factoryId={session.buyer.factory_id||session.buyer.factoryId} buyer={session.buyer} onLogout={logout}/>
    :<Login onOwner={()=>{clearCachedProfile();setSession({type:"owner"});}} onFactory={u=>{cacheProfile(u);setSession({type:"factory",user:normalizeProfile(u)});}} onBuyer={b=>{cacheProfile(b);setSession({type:"buyer",buyer:normalizeProfile(b)});}}/>;
}


```


===== FILE: src/MarketplaceApp.jsx =====

```jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { friendlyAuthError, getSessionProfile, signOut } from "./lib/auth";
import { marketplace } from "./lib/marketplace";
import { Login } from "./marketplace/Login";
import { Shell, pageFromHash, portalFor } from "./marketplace/Shell";
import { AccessManagement, Organisations, OwnOrganisation } from "./marketplace/Organisations";
import { Workflows, Verification } from "./marketplace/Workflows";
import { BuyerPortal } from "./marketplace/BuyerPortal";
import { Button, Heading, Notice, theme } from "./marketplace/ui";
import "./marketplace/marketplace.css";

export { Login };

export function Workspace({profile,access,api=marketplace,onLogout,signingOut}) {
  const mode=portalFor(access),[page,setPage]=useState(()=>pageFromHash(mode)),[data,setData]=useState(null),[error,setError]=useState("");
  const generation=useRef(0);
  const reload=useCallback(async()=>{
    const current=++generation.current;setError("");setData(null);
    try {
      const [organizations,products,rfqs,quotes,documents,reviews,orders]=await Promise.all([
        api.organizations(),
        api.products(mode==="buyer"?{published:true}:mode==="seller"?{sellerOrgId:access.org}:{}),
        api.rfqs(mode==="buyer"?{buyerOrgId:access.org}:{}),
        api.quotes(),
        api.documents(mode==="seller"?access.org:undefined),
        mode==="admin"?api.reviews():Promise.resolve([]),
        api.orders(mode==="buyer"?{buyerOrgId:access.org}:mode==="seller"?{sellerOrgId:access.org}:{})
      ]);
      if(current===generation.current)setData({organizations,products,rfqs,quotes,documents,reviews,orders});
    }catch(e){if(current===generation.current)setError(e.message||"Could not load your workspace.");}
  },[api,mode,access.org]);
  useEffect(()=>{reload();return()=>{generation.current++;};},[reload]);
  useEffect(()=>{const change=()=>setPage(pageFromHash(mode));window.addEventListener("hashchange",change);return()=>window.removeEventListener("hashchange",change);},[mode]);
  function navigate(next){window.location.hash="/"+mode+"/"+next;setPage(next);}
  if(mode==="buyer"){
    if(error)return <div className="buyer-app" style={{minHeight:"100vh",padding:24,fontFamily:"var(--mp-font)"}}><section className="mp-card"><h1>Buyer workspace unavailable</h1><Notice error>{error}</Notice><Button onClick={reload}>Retry loading</Button></section></div>;
    if(!data)return <div className="buyer-app" style={{minHeight:"100vh",display:"grid",placeItems:"center"}}><p role="status">Loading buyer marketplace…</p></div>;
    return <BuyerPortal profile={profile} access={access} data={data} api={api} onSaved={reload} onLogout={onLogout} signingOut={signingOut}/>;
  }
  let content;
  if(error)content=<><Heading title="Workspace unavailable"/><Notice error>{error}</Notice><Button onClick={reload}>Retry loading</Button></>;
  else if(!data)content=<p role="status">Loading your workspace…</p>;
  else if(page==="organizations")content=<Organisations organizations={data.organizations} api={api} onSaved={reload}/>;
  else if(page==="access")content=<AccessManagement organizations={data.organizations} api={api} onSaved={reload}/>;
  else if(page==="organization")content=<OwnOrganisation access={access} organizations={data.organizations} api={api} onSaved={reload}/>;
  else if(page==="overview")content=<><Heading title={mode==="admin"?"Food trade marketplace overview":mode==="seller"?"Processed-food seller overview":"Food sourcing overview"} description={mode==="admin"?"Manage verified organisations, processed-food products, sourcing activity and verification across Epistable.":mode==="seller"?"Manage your company profile, processed-food catalogue, certifications, buyer RFQs and quotes.":"Discover verified processed-food suppliers, manage sourcing RFQs and compare supplier responses."}/><div className="mp-grid">{[["Trade organisations",data.organizations.length,mode==="admin"?"organizations":"organization"],["Processed-food products",data.products.length,"products"],["Sourcing RFQs",data.rfqs.length,"rfqs"]].map(([label,count,target])=><article className="mp-card" key={label}><p className="mp-eyebrow">{label}</p><h2>{count}</h2><Button variant="secondary" onClick={()=>navigate(target)}>View {label.toLowerCase()}</Button></article>)}</div></>;
  else if(page==="verification")content=<Verification data={data} api={api} onSaved={reload}/>;
  else content=<Workflows key={page} page={page} mode={mode} access={access} data={data} api={api} onSaved={reload}/>;
  return <Shell profile={profile} mode={mode} page={page} onNavigate={navigate} onLogout={onLogout} signingOut={signingOut}>{content}</Shell>;
}

export default function MarketplaceApp() {
  const [state,setState]=useState({loading:true}),[signingOut,setSigningOut]=useState(false),[logoutError,setLogoutError]=useState("");
  const generation=useRef(0);
  const refresh=useCallback(async(background=false)=>{
    const current=++generation.current;if(background!==true)setState({loading:true});
    try{const profile=await getSessionProfile();const access=profile?await marketplace.context():null;if(current===generation.current)setState(previous=>background===true&&previous.profile?.auth_user_id===profile?.auth_user_id&&previous.access?.role===access?.role&&previous.access?.org===access?.org?previous:{profile,access});}
    catch(e){if(current===generation.current)setState({error:friendlyAuthError(e)});}
  },[]);
  useEffect(()=>{
    refresh();let timer;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
      // Defer Supabase calls until its auth callback has released the session lock.
      if(["SIGNED_IN","SIGNED_OUT","USER_UPDATED"].includes(event)){generation.current++;if(event==="SIGNED_OUT")setState({loading:true});clearTimeout(timer);timer=setTimeout(()=>refresh(true),0);}
    });
    const focused=()=>refresh(true);
    window.addEventListener("focus",focused);
    return()=>{generation.current++;clearTimeout(timer);subscription.unsubscribe();window.removeEventListener("focus",focused);};
  },[refresh]);
  async function logout(){setSigningOut(true);setLogoutError("");try{await signOut();generation.current++;setState({profile:null,access:null});}catch(e){setLogoutError(friendlyAuthError(e));}finally{setSigningOut(false);}}
  const mode=portalFor(state.access);
  return <div className="mp-root" style={theme}>{logoutError&&<Notice error>{logoutError}</Notice>}{state.loading?<div className="mp-login"><p role="status">Loading Epistable…</p></div>:state.error?<div className="mp-login"><section className="mp-card"><h1>Unable to open workspace</h1><Notice error>{state.error}</Notice><div className="mp-actions"><Button onClick={refresh}>Retry</Button><Button variant="secondary" onClick={logout} disabled={signingOut}>Sign out</Button></div></section></div>:!state.profile?<Login onSignedIn={refresh}/>:!mode?<div className="mp-login"><section className="mp-card"><h1>{state.profile?.organization_id?"Marketplace application under review":"Marketplace access needed"}</h1><p>{state.profile?.organization_id?"Your organisation has been submitted to Epistable. Access to the Buyer or Seller workspace is granted automatically after an administrator verifies the organisation.":"Your account is signed in. Epistable Food & Agri trade uses dedicated processed-food Seller and Buyer workspaces. An Epistable administrator needs to assign your organisation and access."}</p><div className="mp-actions"><Button onClick={refresh}>Refresh access</Button><Button variant="secondary" onClick={logout} disabled={signingOut}>Sign out</Button></div>{!state.profile?.organization_id&&<p><a href="/legacy">Open legacy stone workspace</a></p>}</section></div>:<Workspace key={state.profile.auth_user_id+":"+state.access.role+":"+state.access.org} profile={state.profile} access={state.access} onLogout={logout} signingOut={signingOut}/>}</div>;
}

```


===== FILE: src/components/AdminInviteLauncher.jsx =====

```jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const roles = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "inspector", label: "Inspector" },
  { value: "buyer", label: "Buyer" },
];

export function AdminInviteLauncher() {
  const [caller, setCaller] = useState(null);
  const [factories, setFactories] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "admin", factoryId: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;
      if (!authUser || !active) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id,role,status,factory_id,factory_name")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (!active || !profile || profile.status !== "active" || !["owner", "admin"].includes(profile.role)) return;
      setCaller(profile);

      if (profile.role === "owner") {
        const { data } = await supabase.from("factories").select("id,name").order("name");
        if (active) setFactories(data || []);
      } else if (profile.factory_id) {
        setFactories([{ id: profile.factory_id, name: profile.factory_name || "Factory" }]);
        setForm((f) => ({ ...f, factoryId: profile.factory_id }));
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const selectedFactory = useMemo(
    () => factories.find((f) => f.id === form.factoryId),
    [factories, form.factoryId]
  );

  if (!caller) return null;

  async function sendInvite(e) {
    e?.preventDefault?.();
    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();
    if (!email || !name) {
      setError("Name and email are required.");
      return;
    }
    if (caller.role !== "owner" && !form.factoryId) {
      setError("Your account is not linked to a factory.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("admin-invite", {
        body: {
          name,
          email,
          role: form.role,
          factory_id: form.factoryId || null,
          factory_name: selectedFactory?.name || null,
          redirect_to: `${window.location.origin}/invite`,
        },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      setMessage(`Invite sent to ${email}.`);
      setForm((f) => ({ ...f, name: "", email: "" }));
    } catch (err) {
      setError(err?.message || "Could not send invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setMessage(""); setError(""); }}
        style={{
          position: "fixed", right: 20, bottom: 20, zIndex: 9997,
          border: 0, borderRadius: 10, padding: "11px 16px",
          background: "#0057a8", color: "white", fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0,0,0,.18)", cursor: "pointer",
        }}
      >
        + Invite User
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(15,23,42,.46)", display: "grid", placeItems: "center", padding: 20 }}>
          <form onSubmit={sendInvite} style={{ width: "min(440px,100%)", background: "white", borderRadius: 14, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,.24)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#172033" }}>Invite Epistable User</div>
                <div style={{ fontSize: 12, color: "#667085", marginTop: 3 }}>Supabase sends a secure account invitation.</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} style={{ border: 0, background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Full name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" style={inputStyle} />

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "14px 0 6px" }}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@company.com" style={inputStyle} />

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "14px 0 6px" }}>Role</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={inputStyle}>
              {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>

            {caller.role === "owner" && (
              <>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, margin: "14px 0 6px" }}>Factory</label>
                <select value={form.factoryId} onChange={(e) => setForm((f) => ({ ...f, factoryId: e.target.value }))} style={inputStyle}>
                  <option value="">No factory</option>
                  {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </>
            )}

            {error && <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, background: "#fff1f2", color: "#b42318", fontSize: 12 }}>{error}</div>}
            {message && <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, background: "#ecfdf3", color: "#067647", fontSize: 12 }}>{message}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} style={secondaryButton}>Cancel</button>
              <button type="submit" disabled={busy || !form.name.trim() || !form.email.trim()} style={{ ...primaryButton, opacity: busy ? .65 : 1 }}>{busy ? "Sending…" : "Send Invite"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", border: "1px solid #d0d5dd", borderRadius: 8,
  padding: "11px 12px", fontSize: 13, background: "white", color: "#172033",
};
const primaryButton = { border: 0, borderRadius: 8, padding: "11px 13px", background: "#0057a8", color: "white", fontWeight: 700, cursor: "pointer" };
const secondaryButton = { border: "1px solid #d0d5dd", borderRadius: 8, padding: "11px 13px", background: "white", color: "#344054", fontWeight: 700, cursor: "pointer" };

```


===== FILE: src/components/EvidenceUploadModal.jsx =====

```jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { C } from "../lib/domain";
import { FONT_STACK, RADIUS, SPACE } from "../lib/tokens";
import { Btn, Inp, Modal, Sel, T } from "./ui";
import { Icon } from "./Icon";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const BUCKET = "factory_evidence";

function sanitizeFilename(name) {
  return name.replace(/[^A-Za-z0-9._-]/g, "_").replace(/_{2,}/g, "_");
}

function bytesLabel(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

function toDateInput(ts) {
  return ts ? new Date(ts).toISOString().slice(0, 10) : "";
}

function toTs(v) {
  return v ? new Date(`${v}T00:00:00`).getTime() : null;
}

function addMonths(ts, months) {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

export function EvidenceUploadModal({ req, evidence, bodies, factoryId, onClose, onSave, saving }) {
  const renewalMonths = req?.renewalPeriodMonths || req?.renewal_period_months || null;
  const isExistingPath = evidence?.file_url && !/^https?:\/\//i.test(evidence.file_url);

  const [form, setForm] = useState({
    certificateNumber: evidence?.certificate_number || "",
    issuingBodyId: evidence?.issuing_body_id || "",
    issuedAt: toDateInput(evidence?.issued_at),
    expiresAt: toDateInput(evidence?.expires_at),
    notes: evidence?.notes || "",
  });
  const [otherBody, setOtherBody] = useState(evidence?.metadata?.issuingBodyName || "");
  const [showOther, setShowOther] = useState(false);
  const [filePath, setFilePath] = useState(isExistingPath ? evidence.file_url : "");
  const [fileName, setFileName] = useState(
    evidence?.metadata?.fileName || (isExistingPath ? evidence.file_url.split("/").pop() : "")
  );
  const [fileSize, setFileSize] = useState(0);
  const [upload, setUpload] = useState({ status: "idle", error: "" });
  const [linkMode, setLinkMode] = useState(false);
  const [pasteUrl, setPasteUrl] = useState(
    evidence?.file_url && /^https?:\/\//i.test(evidence.file_url) ? evidence.file_url : ""
  );
  const [autoFilled, setAutoFilled] = useState(false);

  // Auto-fill expires_at from renewal period when issued date is entered and expiry is empty
  useEffect(() => {
    if (!form.issuedAt || form.expiresAt || !renewalMonths || autoFilled) return;
    const issuedTs = toTs(form.issuedAt);
    if (!issuedTs) return;
    setForm(prev => ({ ...prev, expiresAt: toDateInput(addMonths(issuedTs, renewalMonths)) }));
    setAutoFilled(true);
  }, [form.issuedAt, form.expiresAt, renewalMonths, autoFilled]);

  const bodyOptions = useMemo(() => [
    { value: "", label: "Select issuing body" },
    ...bodies.map(b => ({ value: b.id, label: b.name })),
    { value: "__other__", label: "Other..." },
  ], [bodies]);

  function onBodyChange(v) {
    if (v === "__other__") {
      setShowOther(true);
      setForm(prev => ({ ...prev, issuingBodyId: "" }));
    } else {
      setShowOther(false);
      setOtherBody("");
      setForm(prev => ({ ...prev, issuingBodyId: v }));
    }
  }

  async function handleFileSelected(file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setUpload({ status: "error", error: `File is too large (${bytesLabel(file.size)}). Max 10 MB.` });
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUpload({ status: "error", error: "Unsupported file type. Use PDF, JPEG, PNG, or WebP." });
      return;
    }
    if (!factoryId || !req?.id) {
      setUpload({ status: "error", error: "Cannot upload — factory or requirement context is missing." });
      return;
    }
    setUpload({ status: "uploading", error: "" });
    try {
      const safe = sanitizeFilename(file.name);
      const path = `${factoryId}/${req.id}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setFilePath(path);
      setFileName(file.name);
      setFileSize(file.size);
      setUpload({ status: "uploaded", error: "" });
    } catch (e) {
      console.error("Evidence upload failed", e);
      setUpload({ status: "error", error: e.message || "Upload failed. Try again." });
    }
  }

  function removeFile() {
    setFilePath("");
    setFileName("");
    setFileSize(0);
    setUpload({ status: "idle", error: "" });
  }

  function switchToLink() {
    setLinkMode(true);
    removeFile();
  }

  function switchToUpload() {
    setLinkMode(false);
    setPasteUrl("");
  }

  function handleSubmit() {
    const finalFileUrl = linkMode ? (pasteUrl.trim() || null) : (filePath || null);
    const metadata = { ...(evidence?.metadata || {}) };
    if (showOther && otherBody.trim()) metadata.issuingBodyName = otherBody.trim();
    else delete metadata.issuingBodyName;
    if (!linkMode && fileName) metadata.fileName = fileName;
    if (linkMode) delete metadata.fileName;

    onSave({
      status: "submitted",
      certificateNumber: form.certificateNumber || null,
      issuingBodyId: form.issuingBodyId || null,
      issuedAt: toTs(form.issuedAt),
      expiresAt: toTs(form.expiresAt),
      fileUrl: finalFileUrl,
      notes: form.notes,
      metadata: Object.keys(metadata).length ? metadata : undefined,
    });
  }

  const uploading = upload.status === "uploading";
  const hasEvidence = !!(filePath || pasteUrl.trim() || form.certificateNumber.trim() || form.notes.trim());
  const canSubmit = !saving && !uploading && hasEvidence;

  return (
    <Modal
      title={`Submit evidence - ${req.shortName || req.requirementName}`}
      onClose={uploading ? undefined : onClose}
      closeOnBackdrop={false}
    >
      <div style={{ display: "grid", gap: SPACE.base }}>
        <div style={{ fontSize: 13, lineHeight: 1.65, color: C.textMid }}>
          {req.evidence_instructions ||
            "Upload the certificate, report, or supporting document. This is submitted evidence — Epistable organises it, but does not issue certifications."}
        </div>

        {/* Upload area or paste-link area */}
        {!linkMode && (
          <div>
            <label style={{ display: "block", color: C.text, marginBottom: SPACE.sm, ...T.label }}>
              Document file
            </label>
            {filePath ? (
              <div
                style={{
                  border: `1px solid ${C.greenBorder}`,
                  background: C.greenBg,
                  borderRadius: RADIUS.md,
                  padding: SPACE.md,
                  display: "flex",
                  gap: SPACE.sm,
                  alignItems: "center",
                }}
              >
                <Icon name="check" size={18} color={C.green} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fileName || "Uploaded file"}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim }}>
                    {fileSize ? `${bytesLabel(fileSize)} uploaded` : "Saved evidence file"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  disabled={uploading || saving}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: C.red,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: FONT_STACK,
                  }}
                >
                  Replace
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px dashed ${upload.status === "error" ? C.redBorder : C.border}`,
                  borderRadius: RADIUS.md,
                  padding: `${SPACE.xl}px ${SPACE.md}px`,
                  cursor: uploading ? "wait" : "pointer",
                  background: C.surface,
                  gap: SPACE.sm,
                  textAlign: "center",
                }}
              >
                <Icon name={uploading ? "refresh" : "upload"} size={22} color={C.primary} />
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {uploading ? "Uploading..." : "Choose a file to upload"}
                </div>
                <div style={{ fontSize: 11, color: C.textDim }}>
                  PDF, JPEG, PNG, or WebP · up to 10 MB
                </div>
                <input
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={e => handleFileSelected(e.target.files?.[0])}
                  disabled={uploading}
                  style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
                />
              </label>
            )}
            {upload.error && (
              <div
                style={{
                  background: C.redBg,
                  border: `1px solid ${C.redBorder}`,
                  borderRadius: RADIUS.md,
                  padding: `${SPACE.sm}px ${SPACE.md}px`,
                  fontSize: 12,
                  color: C.red,
                  marginTop: SPACE.sm,
                }}
              >
                {upload.error}
              </div>
            )}
            <button
              type="button"
              onClick={switchToLink}
              disabled={uploading}
              style={{
                marginTop: SPACE.sm,
                background: "transparent",
                border: "none",
                color: C.primary,
                fontSize: 12,
                fontWeight: 600,
                cursor: uploading ? "not-allowed" : "pointer",
                padding: 0,
                fontFamily: FONT_STACK,
              }}
            >
              Or paste a link to an externally hosted document
            </button>
          </div>
        )}

        {linkMode && (
          <div>
            <Inp
              label="Document URL"
              value={pasteUrl}
              onChange={setPasteUrl}
              placeholder="https://..."
            />
            <button
              type="button"
              onClick={switchToUpload}
              style={{
                marginTop: SPACE.sm,
                background: "transparent",
                border: "none",
                color: C.primary,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                fontFamily: FONT_STACK,
              }}
            >
              Upload a file instead
            </button>
          </div>
        )}

        <Inp
          label="Certificate / document number"
          value={form.certificateNumber}
          onChange={v => setForm(p => ({ ...p, certificateNumber: v }))}
          placeholder="e.g. IEC number, certificate ID, test report no."
        />

        <div>
          <Sel
            label="Issuing body"
            value={showOther ? "__other__" : form.issuingBodyId}
            onChange={onBodyChange}
            options={bodyOptions}
          />
          {showOther && (
            <div style={{ marginTop: SPACE.sm }}>
              <Inp
                label="Issuing body name"
                value={otherBody}
                onChange={setOtherBody}
                placeholder="Enter the body name"
              />
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SPACE.md }}>
          <Inp
            label="Issued date"
            type="date"
            value={form.issuedAt}
            onChange={v => setForm(p => ({ ...p, issuedAt: v }))}
          />
          <Inp
            label={renewalMonths ? `Valid until (${renewalMonths}-mo renewal)` : "Valid until"}
            type="date"
            value={form.expiresAt}
            onChange={v => setForm(p => ({ ...p, expiresAt: v }))}
          />
        </div>

        <div>
          <label style={{ display: "block", color: C.text, marginBottom: SPACE.sm, ...T.label }}>
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            rows={3}
            placeholder="Scope, product covered, or what an auditor should know"
            style={{
              width: "100%",
              padding: 12,
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              boxSizing: "border-box",
              fontFamily: FONT_STACK,
              fontSize: 14,
              color: C.text,
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving || uploading}>
            Cancel
          </Btn>
          <Btn onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? "Saving..." : "Submit evidence"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

```


===== FILE: src/components/Icon.jsx =====

```jsx
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Box,
  Building2,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Factory,
  FileText,
  Filter,
  Image as ImageIcon,
  IndianRupee,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Package,
  Pause,
  Phone,
  Play,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Truck,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";

const MAP = {
  factory: Factory,
  user: User,
  users: Users,
  search: Search,
  bell: Bell,
  check: Check,
  close: X,
  alert: AlertTriangle,
  camera: Camera,
  image: ImageIcon,
  qr: QrCode,
  copy: Copy,
  print: Printer,
  download: Download,
  upload: Upload,
  next: ChevronRight,
  prev: ChevronLeft,
  pause: Pause,
  play: Play,
  add: Plus,
  remove: Minus,
  verified: ShieldCheck,
  building: Building2,
  package: Package,
  trend: TrendingUp,
  chart: BarChart3,
  list: ClipboardList,
  date: CalendarDays,
  mail: Mail,
  phone: Phone,
  message: MessageCircle,
  bot: Bot,
  settings: Settings,
  billing: CreditCard,
  currency: IndianRupee,
  truck: Truck,
  box: Box,
  location: MapPin,
  arrow: ArrowRight,
  show: Eye,
  hide: EyeOff,
  filter: Filter,
  refresh: RefreshCw,
  more: MoreHorizontal,
  file: FileText,
};

export function Icon({ name, size = 16, color = "currentColor", strokeWidth = 1.75, style }) {
  const Cmp = MAP[name];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}


```


===== FILE: src/components/OverflowMenu.jsx =====

```jsx
import { useEffect, useRef, useState } from "react";
import { C } from "../lib/domain";
import { FONT_STACK, RADIUS, SHADOW, SPACE, TYPE } from "../lib/tokens";
import { Icon } from "./Icon";

export function OverflowMenu({ items = [], label = "More actions" }) {
  const [open,setOpen]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{
    function onDoc(e) {
      if(ref.current && !ref.current.contains(e.target))setOpen(false);
    }
    document.addEventListener("mousedown",onDoc);
    return ()=>document.removeEventListener("mousedown",onDoc);
  },[]);

  return (
    <div ref={ref} style={{position:"relative",display:"inline-block"}}>
      <button
        type="button"
        onClick={()=>setOpen(o=>!o)}
        aria-label={label}
        style={{
          background:"transparent",border:`1px solid ${C.border}`,
          borderRadius:RADIUS.md,padding:"6px 8px",cursor:"pointer",
          display:"inline-flex",alignItems:"center",fontFamily:FONT_STACK,
        }}
      >
        <Icon name="more" size={14}/>
      </button>
      {open&&(
        <div style={{
          position:"absolute",right:0,top:"100%",marginTop:4,
          background:C.white,border:`1px solid ${C.border}`,
          borderRadius:RADIUS.md,boxShadow:SHADOW.raised,
          minWidth:180,zIndex:50,padding:SPACE.xs,
        }}>
          {items.map((it,i)=>(
            <button
              key={i}
              onClick={()=>{setOpen(false);it.onClick?.();}}
              disabled={it.disabled}
              style={{
                display:"block",width:"100%",textAlign:"left",
                padding:`${SPACE.sm}px ${SPACE.md}px`,background:"transparent",
                border:"none",borderRadius:RADIUS.sm,cursor:"pointer",
                fontFamily:FONT_STACK,fontSize:TYPE.label.size,
                color:it.tone==="danger"?C.red:C.text,
                opacity:it.disabled?0.5:1,
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

```


===== FILE: src/components/Pill.jsx =====

```jsx
import { C } from "../lib/domain";
import { RADIUS, SPACE, TYPE, WEIGHT } from "../lib/tokens";

const TONES = {
  neutral: { color: C.textMid, bg: C.surface, border: C.border },
  primary: { color: C.primary, bg: C.primaryBg, border: C.primaryBorder },
  accent: { color: C.accent, bg: C.accentBg, border: C.accentBorder },
  success: { color: C.green, bg: C.greenBg, border: C.greenBorder },
  warning: { color: C.amber, bg: C.amberBg, border: C.amberBorder },
  danger: { color: C.red, bg: C.redBg, border: C.redBorder },
  info: { color: C.blue, bg: C.blueBg, border: C.blueBorder },
};

export function Pill({ tone = "neutral", children, icon, size = "md", style }) {
  const t = TONES[tone] || TONES.neutral;
  const pad = size === "sm" ? `${SPACE.xs}px ${SPACE.sm + 2}px` : `${SPACE.xs + 1}px ${SPACE.md}px`;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: SPACE.xs + 1,
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.color,
        padding: pad,
        borderRadius: RADIUS.pill,
        whiteSpace: "nowrap",
        fontSize: TYPE.caption.size,
        fontWeight: WEIGHT.medium,
        lineHeight: 1.3,
        letterSpacing: TYPE.caption.letterSpacing,
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
}


```


===== FILE: src/components/QualityReport.jsx =====

```jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { C, gradeConf, fmtMoney } from "../lib/domain";
import { FONT_STACK } from "../lib/tokens";
import { useBP } from "../hooks/useBP";
import { Btn, Card, Loader } from "./ui";
import { Icon } from "./Icon";

const asList = value => Array.isArray(value) ? value : [];
const asObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const normalizePhoto = (photo,idx) => typeof photo === "string" ? {src:photo,label:idx===0?"Primary photo":`Evidence ${idx+1}`} : photo;

function ReportError({title,msg}) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT_STACK,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{padding:24,maxWidth:440,textAlign:"center"}}>
        <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:8}}>{title}</div>
        <div style={{fontSize:13,color:C.textMid,lineHeight:1.65,marginBottom:16}}>{msg}</div>
        <Btn onClick={()=>window.location.assign("/")}>Go to Epistable</Btn>
      </Card>
    </div>
  );
}

function Field({label,value}) {
  return (
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 14px"}}>
      <div style={{fontSize:10.5,fontWeight:750,color:C.textDim,textTransform:"uppercase",letterSpacing:.4,marginBottom:5}}>{label}</div>
      <div style={{fontSize:14,fontWeight:800,color:C.text,lineHeight:1.25}}>{value || "Not recorded"}</div>
    </div>
  );
}

function ScoreBar({label,value,color=C.green}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderTop:`1px solid ${C.border}`}}>
      <div style={{fontSize:12.5,fontWeight:650,color:C.text,flex:"0 0 43%"}}>{label}</div>
      <div style={{flex:1,height:7,borderRadius:999,background:C.primaryBg,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.min(Math.max(value,0),100)}%`,borderRadius:999,background:color}}/>
      </div>
      <div style={{fontSize:12,fontWeight:850,color:C.primaryD,width:34,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{value}</div>
    </div>
  );
}

function PlaceholderSlab({children}) {
  return (
    <div style={{position:"relative",height:"100%",minHeight:210,background:"linear-gradient(145deg,#fbfcfd 0%,#edf3f8 54%,#dce6ef 100%)",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(116deg,transparent 0 55%,rgba(74,85,104,.13) 56%,transparent 58%),linear-gradient(151deg,transparent 0 66%,rgba(74,85,104,.10) 67%,transparent 69%)"}}/>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(255,255,255,0) 0 52%,rgba(0,63,122,.14) 100%)"}}/>
      {children}
    </div>
  );
}

export function QualityReport({slabId}) {
  const [slab,setSlab]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [copied,setCopied]=useState(false);
  const [inq,setInq]=useState({name:"",company:"",email:"",phone:"",areaSqFt:"",message:""});
  const [inqBusy,setInqBusy]=useState(false);
  const [inqSent,setInqSent]=useState(false);
  const [inqError,setInqError]=useState("");
  const {isMobile}=useBP();

  useEffect(()=>{
    let active=true;
    async function load(){
      setLoading(true);setError("");
      try {
        const {data,error}=await supabase.rpc("get_public_slab_certificate",{slab_id:slabId});
        if(!active)return;
        if(error){setError(error.message||"Unable to load this quality report.");setLoading(false);return;}
        const row=Array.isArray(data)?data[0]:data;
        if(!row){setError("No verified slab was found for this report.");setLoading(false);return;}
        setSlab(row);setLoading(false);
      } catch(e) {
        if(active){setError(e.message||"Unable to load this quality report.");setLoading(false);}
      }
    }
    load();
    return()=>{active=false;};
  },[slabId]);

  const measurements=useMemo(()=>asObject(slab?.measurements),[slab]);
  const trace=useMemo(()=>asObject(measurements.traceability),[measurements]);
  const audit=useMemo(()=>asObject(measurements.audit),[measurements]);
  const defects=useMemo(()=>asList(slab?.defects),[slab]);
  const photos=useMemo(()=>asList(slab?.photos).map(normalizePhoto).filter(p=>p?.src),[slab]);

  if(loading)return <Loader/>;
  if(error)return <ReportError title="Quality report unavailable" msg={error}/>;

  const g=gradeConf(slab.grade);
  const photo=slab.photo || photos[0]?.src;
  const evidenceCount=photos.length || (photo ? 1 : 0);
  const traceCount=["quarrySource","batchNo","blockNo","productionLine","operator","containerNo","customerRef"].filter(k=>trace[k]).length;
  const auditCount=["calibrationChecked","checklistComplete","rootCause","correctiveAction","actionOwner","actionDue"].filter(k=>audit[k]).length;
  const exportScore=Math.round(((traceCount/7)*100+(auditCount/6)*100+(evidenceCount?100:0))/3);
  const qualityScores=[
    {label:"Colour consistency",value:slab.grade==="Premium"?92:slab.grade==="Standard"?82:68,color:slab.grade==="Commercial"?C.amber:C.green},
    {label:"Surface finish",value:Number(measurements.polish)?Math.min(100,Math.round(Number(measurements.polish)/5*100)):slab.grade==="Premium"?88:76,color:C.green},
    {label:"Structural integrity",value:defects.some(d=>String(d).toLowerCase().includes("crack"))?58:95,color:defects.some(d=>String(d).toLowerCase().includes("crack"))?C.red:C.green},
    {label:"Dimensional accuracy",value:measurements.thickness?84:70,color:measurements.thickness?C.green:C.amber},
  ];
  const reportUrl=window.location.href;
  const canInquire=(slab.inventory_status||"available")==="available";
  const inquiryReady=inq.name.trim()&&(inq.email.trim()||inq.phone.trim());
  const areaSqFt=Number(inq.areaSqFt);
  const quoteEstimate=Number.isFinite(areaSqFt)&&areaSqFt>0 ? Math.round(areaSqFt*Number(slab.price_per_sq_ft||0)) : 0;
  const batchLabel=trace.batchNo || slab.id;

  async function copyReport(){
    const text=[
      `Quality report: ${slab.stone}`,
      `Grade: ${slab.grade}`,
      `Export readiness: ${exportScore}%`,
      `Supplier: ${slab.factory_name}`,
      `Batch: ${batchLabel}`,
      `Link: ${reportUrl}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(()=>setCopied(false),1600);
    } catch(e) {
      window.prompt("Copy quality report",text);
    }
  }

  async function submitInquiry(){
    if(!inquiryReady||inqBusy)return;
    setInqBusy(true);setInqError("");
    const message=[
      inq.areaSqFt.trim()?`Area required: ${inq.areaSqFt.trim()} sq ft`:"",
      quoteEstimate?`Estimated slab value: ${fmtMoney(quoteEstimate)}`:"",
      inq.message.trim(),
      inq.phone.trim()?`Phone: ${inq.phone.trim()}`:"",
      `Quality report: ${reportUrl}`,
    ].filter(Boolean).join("\n\n");
    const {error}=await supabase.rpc("create_public_slab_inquiry",{
      slab_id:slab.id,
      buyer_name:inq.name.trim(),
      buyer_company:inq.company.trim(),
      buyer_email:inq.email.trim(),
      buyer_message:message,
    });
    if(error){setInqError(error.message||"Unable to send inquiry.");setInqBusy(false);return;}
    setInqSent(true);setInqBusy(false);
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#f8f9fb 0%,#f0f2f5 44%,#eef3f8 100%)",fontFamily:FONT_STACK,color:C.text,paddingBottom:92}}>
      <div style={{position:"sticky",top:0,zIndex:20,display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"rgba(248,249,251,.94)",backdropFilter:"blur(10px)",borderBottom:`1px solid ${C.border}`}}>
        <button onClick={()=>{if(window.history.length>1)window.history.back();else window.location.assign("/");}} aria-label="Back" style={{width:36,height:36,borderRadius:10,border:`1px solid ${C.border}`,background:C.white,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 1px 3px rgba(10,37,64,.04)"}}>
          <Icon name="prev" size={18} color={C.primaryD}/>
        </button>
        <div style={{fontSize:14,fontWeight:850,color:C.primaryD}}>
          Quality Report
          <div style={{fontSize:10.5,fontWeight:500,color:C.textDim,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{slab.factory_name}</div>
        </div>
        <button onClick={copyReport} aria-label="Share report" style={{marginLeft:"auto",width:36,height:36,borderRadius:10,border:`1px solid ${C.border}`,background:C.white,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 1px 3px rgba(10,37,64,.04)"}}>
          <Icon name={copied?"check":"upload"} size={18} color={copied?C.green:C.primaryD}/>
        </button>
      </div>

      <main style={{width:"100%",maxWidth:480,margin:"0 auto"}}>
        <section style={{padding:"22px 18px 0"}}>
          <div style={{height:318,border:`1px solid ${C.primaryBorder}`,borderRadius:16,boxShadow:"0 4px 16px rgba(10,37,64,.10)",position:"relative",overflow:"hidden",background:C.white}}>
            {photo?<img src={photo} alt={slab.stone} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<PlaceholderSlab/>}
            <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(255,255,255,0) 0 52%,rgba(0,63,122,.14) 100%)",pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:14,left:14,display:"inline-flex",alignItems:"center",gap:6,fontSize:10,fontWeight:850,color:C.green,background:"rgba(255,255,255,.9)",border:`1px solid ${C.greenBorder}`,padding:"6px 10px",borderRadius:999}}>
              <Icon name="verified" size={11}/>{slab.export_ready?"Export ready":"Epistable graded"}
            </div>
            <div style={{position:"absolute",right:14,top:14,fontSize:10,fontWeight:750,color:C.primaryD,background:"rgba(255,255,255,.78)",padding:"6px 10px",borderRadius:999}}>{batchLabel}</div>
            <div style={{position:"absolute",left:14,right:14,bottom:14,background:"rgba(255,255,255,.94)",border:`1px solid ${C.primaryBorder}`,borderRadius:14,padding:14,display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"end",boxShadow:"0 4px 16px rgba(10,37,64,.08)"}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:23,fontWeight:850,color:C.primaryD,lineHeight:1.05}}>{slab.stone}</div>
                <div style={{fontSize:10.5,color:C.textMid,marginTop:5,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{evidenceCount || "No"} photo{evidenceCount===1?"":"s"} - {slab.grade} - {slab.date || "date not recorded"}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{minWidth:62,borderRadius:10,background:C.primaryBg,padding:"8px 9px",textAlign:"center"}}>
                  <strong style={{display:"block",fontSize:17,lineHeight:1,color:C.primaryD}}>{String(slab.grade||"A").slice(0,1)}</strong>
                  <span style={{display:"block",fontSize:9.5,fontWeight:750,color:C.primary,marginTop:4}}>Quality</span>
                </div>
                <div style={{minWidth:62,borderRadius:10,background:C.primaryBg,padding:"8px 9px",textAlign:"center"}}>
                  <strong style={{display:"block",fontSize:17,lineHeight:1,color:C.primaryD}}>{exportScore}%</strong>
                  <span style={{display:"block",fontSize:9.5,fontWeight:750,color:C.primary,marginTop:4}}>Export</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{margin:"10px 4px 0",display:"flex",alignItems:"flex-start",gap:7,color:C.textMid,fontSize:11,lineHeight:1.45}}>
            <Icon name="alert" size={13} color={C.primary} style={{flex:"none",marginTop:1}}/>AI grade from seller images. Documents checked separately.
          </div>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Specifications</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
            <Field label="Dimensions" value={measurements.length&&measurements.width?`${measurements.length} x ${measurements.width} cm`:"Not recorded"}/>
            <Field label="Thickness" value={measurements.thickness?`${measurements.thickness} mm`:"Not recorded"}/>
            <Field label="Finish" value={measurements.surfaceFinish || measurements.finish || "Polished"}/>
            <Field label="Price" value={`${fmtMoney(slab.price_per_sq_ft||0)} / sqft`}/>
          </div>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Grade breakdown</h2>
            <span style={{marginLeft:"auto",fontSize:11,color:C.textDim,fontWeight:650,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{g.label}</span>
          </div>
          <Card style={{borderRadius:14,padding:18}}>
            {qualityScores.map((s,i)=><ScoreBar key={s.label} label={s.label} value={s.value} color={s.color} style={{borderTop:i?undefined:"none"}}/>)}
          </Card>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Defect analysis</h2>
            <span style={{marginLeft:"auto",fontSize:11,color:C.textDim,fontWeight:650,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{defects.length ? `${defects.length} found` : "Clear"}</span>
          </div>
          <Card style={{borderRadius:14,padding:18}}>
            <div style={{height:170,borderRadius:12,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#f6f8fb 0%,#d4dce7 46%,#edf2f7 100%)",marginBottom:14}}>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent 0 24%,rgba(0,87,168,.08) 25% 26%,transparent 27% 61%,rgba(0,151,167,.08) 62% 63%,transparent 64% 100%)"}}/>
              {defects.slice(0,3).map((d,i)=><span key={`${d}-${i}`} style={{position:"absolute",left:`${34+i*18}%`,top:`${40+(i%2)*18}%`,width:22,height:22,borderRadius:"50%",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:850,color:"#fff",transform:"translate(-50%,-50%)",boxShadow:"0 3px 8px rgba(0,0,0,.28)",zIndex:2,background:i?C.blue2:C.amber}}>{i+1}</span>)}
              <span style={{position:"absolute",left:10,bottom:10,fontSize:9.5,fontWeight:750,color:C.primaryD,background:"rgba(255,255,255,.86)",padding:"4px 9px",borderRadius:7,zIndex:2}}>Current slab map</span>
            </div>
            {defects.length?defects.map((d,i)=><div key={`${d}-${i}`} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 0",borderTop:i?`1px solid ${C.border}`:"none"}}>
              <span style={{width:9,height:9,borderRadius:"50%",background:i?C.blue2:C.amber,flex:"none"}}/>
              <span style={{flex:1,fontSize:13,fontWeight:650,color:C.primaryD,textTransform:"capitalize"}}>{d}</span>
              <span style={{fontSize:10,fontWeight:850,textTransform:"uppercase",letterSpacing:.4,padding:"3px 8px",borderRadius:6,color:i?C.blue2:C.amber,background:i?C.blue2Bg:C.amberBg}}>{i?"Trace":"Minor"}</span>
            </div>):<div style={{fontSize:13,fontWeight:700,color:C.green}}>No defects recorded</div>}
          </Card>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Batch and source</h2>
            <span style={{marginLeft:"auto",fontSize:11,color:C.textDim,fontWeight:650,fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>{batchLabel}</span>
          </div>
          <Card style={{borderRadius:14,padding:18}}>
            {[
              ["Quarry / source",trace.quarrySource || "Not recorded"],
              ["Cut and polished",trace.productionLine || "Factory record"],
              ["QR-sealed and graded",`${traceCount}/7 trace fields recorded`],
            ].map(([title,meta],i)=><div key={title} style={{position:"relative",padding:`0 0 ${i===2?0:16}px 30px`}}>
              {i<2&&<span style={{position:"absolute",left:9,top:19,bottom:-2,width:2,background:`linear-gradient(${C.primary},${C.border})`}}/>}
              <span style={{position:"absolute",left:0,top:1,width:19,height:19,borderRadius:"50%",background:C.white,border:`2px solid ${C.primary}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="check" size={10} color={C.primary}/></span>
              <span style={{fontSize:13.5,fontWeight:800,color:C.primaryD}}>{title}</span>
              <span style={{display:"inline-block",fontSize:10,fontWeight:650,color:C.primaryD,background:C.primaryBg,padding:"2px 7px",borderRadius:5,marginLeft:7}}>{meta}</span>
            </div>)}
          </Card>
        </section>

        <section style={{padding:"22px 18px 0"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"0 2px 12px"}}>
            <h2 style={{fontSize:15,fontWeight:850,color:C.primaryD,margin:0}}>Compliance for this batch</h2>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <div style={{display:"flex",alignItems:"center",gap:12,background:C.white,borderRadius:12,boxShadow:C.shadow,padding:"15px 16px",border:`1px solid ${C.border}`}}>
              <span style={{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flex:"none",background:slab.export_ready?C.greenBg:C.amberBg,color:slab.export_ready?C.green:C.amber}}><Icon name={slab.export_ready?"check":"alert"} size={17}/></span>
              <span style={{flex:1}}><span style={{display:"block",fontSize:13.5,fontWeight:800,color:C.primaryD}}>{slab.export_ready?"Export ready":"Export readiness partial"}</span><span style={{display:"block",fontSize:11.5,color:C.textMid,marginTop:1}}>{exportScore}% evidence readiness from photos, traceability, and audit fields</span></span>
              <Icon name="next" size={16} color={C.textDim}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,background:C.white,borderRadius:12,boxShadow:C.shadow,padding:"15px 16px",border:`1px solid ${C.border}`}}>
              <span style={{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flex:"none",background:auditCount>=4?C.greenBg:C.amberBg,color:auditCount>=4?C.green:C.amber}}><Icon name={auditCount>=4?"file":"alert"} size={17}/></span>
              <span style={{flex:1}}><span style={{display:"block",fontSize:13.5,fontWeight:800,color:C.primaryD}}>Document checks</span><span style={{display:"block",fontSize:11.5,color:C.textMid,marginTop:1}}>{auditCount}/6 audit fields recorded for this slab</span></span>
              <Icon name="next" size={16} color={C.textDim}/>
            </div>
          </div>
        </section>

        <div style={{margin:"24px 18px 0",fontSize:11,color:C.textMid,lineHeight:1.55,background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:12,padding:"13px 15px"}}>
          <b style={{color:C.primaryD}}>How to read this.</b> AI grade is based on seller images. Documents are checked separately. Request independent inspection before large orders.
        </div>
      </main>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:30,background:"rgba(255,255,255,.93)",backdropFilter:"blur(10px)",borderTop:`1px solid ${C.border}`,padding:"12px 16px calc(12px + env(safe-area-inset-bottom))",display:"flex",gap:10}}>
        {inqSent?<button style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:750,fontSize:14.5,padding:14,borderRadius:12,cursor:"default",border:"none",background:C.green,color:C.white,fontFamily:FONT_STACK}}><Icon name="check" size={16}/>Quote requested</button>:
        <button disabled={!canInquire} onClick={()=>document.getElementById("quality-inquiry")?.scrollIntoView({behavior:"smooth",block:"center"})} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:750,fontSize:14.5,padding:14,borderRadius:12,cursor:canInquire?"pointer":"not-allowed",border:"none",background:canInquire?C.primary:C.border,color:canInquire?C.white:C.textDim,fontFamily:FONT_STACK,boxShadow:canInquire?"0 4px 16px rgba(0,87,168,.22)":"none"}}><Icon name="message" size={16}/>Request quote</button>}
        <button onClick={()=>window.print()} aria-label="Download report" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:750,fontSize:14.5,padding:"14px 16px",borderRadius:12,cursor:"pointer",border:`1px solid ${C.border}`,background:C.white,color:C.primaryD,fontFamily:FONT_STACK}}><Icon name="download" size={16}/></button>
        <button onClick={copyReport} aria-label="Share report" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:750,fontSize:14.5,padding:"14px 16px",borderRadius:12,cursor:"pointer",border:`1px solid ${C.border}`,background:C.white,color:C.primaryD,fontFamily:FONT_STACK}}><Icon name={copied?"check":"upload"} size={16}/></button>
      </div>

      <div id="quality-inquiry" style={{maxWidth:480,margin:"0 auto",padding:"22px 18px 112px"}}>
        <Card style={{borderRadius:14,padding:18}}>
          <div style={{fontSize:15,fontWeight:850,color:C.primaryD,marginBottom:10}}>Request quote</div>
          {!canInquire?<div style={{fontSize:13,color:C.textMid,lineHeight:1.6}}>This slab is not currently marked available. Open the supplier profile for alternatives.</div>:inqSent?<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:12,padding:14,color:C.green,fontSize:13,fontWeight:750}}>Inquiry sent to {slab.factory_name}.</div>:<div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={inq.name} onChange={e=>setInq(p=>({...p,name:e.target.value}))} placeholder="Your name" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK}}/>
            <input value={inq.company} onChange={e=>setInq(p=>({...p,company:e.target.value}))} placeholder="Company (optional)" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK}}/>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
              <input value={inq.email} onChange={e=>setInq(p=>({...p,email:e.target.value}))} placeholder="Email" type="email" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,minWidth:0}}/>
              <input value={inq.phone} onChange={e=>setInq(p=>({...p,phone:e.target.value}))} placeholder="Phone" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,minWidth:0}}/>
            </div>
            <input value={inq.areaSqFt} onChange={e=>setInq(p=>({...p,areaSqFt:e.target.value.replace(/[^\d.]/g,"")}))} placeholder="Area required in sq ft (optional)" inputMode="decimal" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK}}/>
            {quoteEstimate>0&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"12px 14px",display:"flex",justifyContent:"space-between",gap:12}}><span style={{fontSize:12,fontWeight:700,color:C.green}}>Estimated value</span><span style={{fontSize:13,fontWeight:850,color:C.green}}>{fmtMoney(quoteEstimate)}</span></div>}
            <textarea value={inq.message} onChange={e=>setInq(p=>({...p,message:e.target.value}))} rows={3} placeholder="Message (quantity, timeline, destination...)" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontFamily:FONT_STACK,resize:"none"}}/>
            {inqError&&<div style={{fontSize:12,color:C.red,fontWeight:700}}>{inqError}</div>}
            <Btn full disabled={!inquiryReady||inqBusy} onClick={submitInquiry}>{inqBusy?"Sending...":"Send inquiry"}</Btn>
            <div style={{fontSize:11.5,color:C.textDim,lineHeight:1.5}}>Name and either email or phone are required.</div>
          </div>}
        </Card>
      </div>
    </div>
  );
}

```


===== FILE: src/components/SlabCertificate.jsx =====

```jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { C, gradeConf } from "../lib/domain";
import { useBP } from "../hooks/useBP";
import { Btn, Card, Loader, PBar } from "./ui";

const asList = value => Array.isArray(value) ? value : [];
const asObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const normalizePhoto = (photo,idx) => typeof photo === "string" ? {src:photo,label:idx===0?"Primary photo":`Evidence ${idx+1}`} : photo;
const invConf = status => ({
  available:{label:"Available",color:C.green,bg:C.greenBg,border:C.greenBorder},
  reserved:{label:"Reserved",color:C.amber,bg:C.amberBg,border:C.amberBorder},
  sold:{label:"Sold",color:C.red,bg:C.redBg,border:C.redBorder},
}[status]||{label:"Available",color:C.green,bg:C.greenBg,border:C.greenBorder});

function Field({label,value}) {
  return (
    <div style={{padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:12,fontWeight:600,color:C.textDim,textTransform:"uppercase",marginBottom:3}}>{label}</div>
      <div style={{fontSize:14,fontWeight:700,color:C.text}}>{value || "Not recorded"}</div>
    </div>
  );
}

function CertificateError({title,msg}) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{padding:24,maxWidth:460,textAlign:"center"}}>
        <div style={{fontSize:18,fontWeight:700,marginBottom:8,color:C.text}}>{title}</div>
        <div style={{fontSize:13,color:C.textMid,lineHeight:1.7,marginBottom:16}}>{msg}</div>
        <Btn onClick={()=>window.location.assign("/")}>Go to Epistable</Btn>
      </Card>
    </div>
  );
}

export function SlabCertificate({slabId}) {
  const [slab,setSlab]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [inq,setInq]=useState({name:"",company:"",email:"",phone:"",areaSqFt:"",message:""});
  const [inqBusy,setInqBusy]=useState(false);
  const [inqSent,setInqSent]=useState(false);
  const [inqError,setInqError]=useState("");
  const [dispute,setDispute]=useState({name:"",company:"",email:"",phone:"",category:"wrong_grade",details:""});
  const [disputeBusy,setDisputeBusy]=useState(false);
  const [disputeSent,setDisputeSent]=useState(false);
  const [disputeError,setDisputeError]=useState("");
  const [copied,setCopied]=useState(false);
  const [summaryCopied,setSummaryCopied]=useState(false);
  const [auditNoteCopied,setAuditNoteCopied]=useState(false);
  const {isMobile}=useBP();

  useEffect(()=>{
    let active=true;
    async function load(){
      setLoading(true);setError("");
      try {
        const {data,error}=await supabase.rpc("get_public_slab_certificate",{slab_id:slabId});
        if(!active)return;
        if(error){setError(error.message||"Unable to load this slab certificate.");setLoading(false);return;}
        const row=Array.isArray(data)?data[0]:data;
        if(!row){setError("No verified slab was found for this QR code.");setLoading(false);return;}
        setSlab(row);setLoading(false);
      } catch(e) {
        if(active){setError(e.message||"Unable to load this slab certificate.");setLoading(false);}
      }
    }
    load();
    return()=>{active=false;};
  },[slabId]);

  const measurements=useMemo(()=>asObject(slab?.measurements),[slab]);
  const traceability=useMemo(()=>asObject(measurements.traceability),[measurements]);
  const audit=useMemo(()=>asObject(measurements.audit),[measurements]);
  const defects=useMemo(()=>asList(slab?.defects),[slab]);
  const photos=useMemo(()=>asList(slab?.photos).map(normalizePhoto).filter(p=>p?.src),[slab]);

  if(loading)return <Loader/>;
  if(error)return <CertificateError title="Certificate unavailable" msg={error}/>;

  const g=gradeConf(slab.grade);
  const inspectedAt=[slab.date,slab.time].filter(Boolean).join(" at ");
  const photo=slab.photo || photos[0]?.src;
  const polish=measurements.polish ? Number(measurements.polish) : 0;
  const inquiryReady=inq.name.trim()&&(inq.email.trim()||inq.phone.trim());
  const disputeReady=dispute.name.trim()&&(dispute.email.trim()||dispute.phone.trim())&&dispute.details.trim();
  const certificateUrl=window.location.href;
  const inventory=invConf(slab.inventory_status||"available");
  const canInquire=(slab.inventory_status||"available")==="available";
  const areaSqFt=Number(inq.areaSqFt);
  const quoteEstimate=Number.isFinite(areaSqFt)&&areaSqFt>0 ? Math.round(areaSqFt*Number(slab.price_per_sq_ft||0)) : 0;
  const evidenceCount=photos.length || (photo ? 1 : 0);
  const traceabilityCount=["quarrySource","batchNo","blockNo","productionLine","operator","containerNo","customerRef"].filter(k=>traceability[k]).length;
  const auditCount=["calibrationChecked","checklistComplete","rootCause","correctiveAction","actionOwner","actionDue"].filter(k=>audit[k]).length;
  const readinessScore=Math.round(((traceabilityCount/7)*100+(auditCount/6)*100+(evidenceCount?100:0))/3);
  const auditReadinessLabel=readinessScore>=80?"Strong":readinessScore>=55?"Partial":"Needs attention";
  const auditGaps=[
    traceabilityCount<7&&`${7-traceabilityCount} traceability field${7-traceabilityCount===1?"":"s"} missing`,
    auditCount<6&&`${6-auditCount} audit field${6-auditCount===1?"":"s"} missing`,
    !evidenceCount&&"photo evidence missing",
    defects.length&&!audit.correctiveAction&&"defects recorded without corrective action",
  ].filter(Boolean);
  const verificationItems=[
    {label:"Live certificate",detail:"Use this page URL or QR code as the source of truth before buying."},
    {label:"Slab identity",detail:`Match certificate ID ${slab.id} with the physical slab, invoice, or factory record.`},
    {label:"Evidence trail",detail:`Review ${evidenceCount} photo${evidenceCount===1?"":"s"}, measurements, defects, inspector, and timestamp together.`},
  ];
  const certificateSummary=[
    `Epistable verified slab: ${slab.stone}`,
    `Certificate: ${slab.id}`,
    `Factory: ${slab.factory_name}${slab.factory_location ? `, ${slab.factory_location}` : ""}`,
    `Grade: ${slab.grade}`,
    `Price: Rs ${slab.price_per_sq_ft || 0}/sq ft`,
    `Status: ${inventory.label}`,
    `Evidence readiness: ${readinessScore}%`,
    `Traceability fields: ${traceabilityCount}/7`,
    `Audit fields: ${auditCount}/6`,
    traceability.quarrySource ? `Source: ${traceability.quarrySource}` : "",
    traceability.batchNo ? `Batch: ${traceability.batchNo}` : "",
    traceability.containerNo ? `Container: ${traceability.containerNo}` : "",
    audit.correctiveAction ? `Corrective action: ${audit.correctiveAction}` : "",
    defects.length ? `Defects recorded: ${defects.join(", ")}` : "Defects recorded: none",
    `Photo evidence: ${evidenceCount} photo${evidenceCount===1 ? "" : "s"}`,
    `Certificate link: ${certificateUrl}`,
  ].filter(Boolean).join("\n");
  const auditNote=[
    `Audit readiness note for ${slab.id}`,
    `Status: ${auditReadinessLabel} (${readinessScore}%)`,
    `Factory: ${slab.factory_name}`,
    `Slab: ${slab.stone} | Grade: ${slab.grade}`,
    `Traceability: ${traceabilityCount}/7 fields recorded`,
    `Audit evidence: ${auditCount}/6 fields recorded`,
    `Photo evidence: ${evidenceCount} photo${evidenceCount===1?"":"s"}`,
    defects.length?`Defects: ${defects.join(", ")}`:"Defects: none recorded",
    auditGaps.length?`Gaps: ${auditGaps.join("; ")}`:"Gaps: none flagged from current certificate data",
    `Certificate: ${certificateUrl}`,
  ].join("\n");
  const scrollTo=id=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});

  async function copyLink(){
    try {
      await navigator.clipboard.writeText(certificateUrl);
      setCopied(true);
      setTimeout(()=>setCopied(false),1600);
    } catch(e) {
      window.prompt("Copy certificate link",certificateUrl);
    }
  }

  async function copySummary(){
    try {
      await navigator.clipboard.writeText(certificateSummary);
      setSummaryCopied(true);
      setTimeout(()=>setSummaryCopied(false),1600);
    } catch(e) {
      window.prompt("Copy certificate summary",certificateSummary);
    }
  }

  async function copyAuditNote(){
    try {
      await navigator.clipboard.writeText(auditNote);
      setAuditNoteCopied(true);
      setTimeout(()=>setAuditNoteCopied(false),1600);
    } catch(e) {
      window.prompt("Copy audit readiness note",auditNote);
    }
  }

  async function submitInquiry(){
    if(!inquiryReady||inqBusy)return;
    setInqBusy(true);setInqError("");
    const message=[
      inq.areaSqFt.trim()?`Area required: ${inq.areaSqFt.trim()} sq ft`:"",
      quoteEstimate?`Estimated slab value: Rs ${quoteEstimate}`:"",
      inq.message.trim(),
      inq.phone.trim()?`Phone: ${inq.phone.trim()}`:"",
      `Certificate: ${certificateUrl}`,
    ].filter(Boolean).join("\n\n");
    const {error}=await supabase.rpc("create_public_slab_inquiry",{
      slab_id:slab.id,
      buyer_name:inq.name.trim(),
      buyer_company:inq.company.trim(),
      buyer_email:inq.email.trim(),
      buyer_message:message
    });
    if(error){setInqError(error.message||"Unable to send inquiry.");setInqBusy(false);return;}
    setInqSent(true);setInqBusy(false);
  }

  async function submitDispute(){
    if(!disputeReady||disputeBusy)return;
    setDisputeBusy(true);setDisputeError("");
    const details=[dispute.details.trim(),dispute.email.trim()?`Email: ${dispute.email.trim()}`:"",dispute.phone.trim()?`Phone: ${dispute.phone.trim()}`:""].filter(Boolean).join("\n\n");
    const {error}=await supabase.rpc("create_public_slab_dispute",{
      slab_id:slab.id,
      buyer_name:dispute.name.trim(),
      buyer_company:dispute.company.trim(),
      dispute_category:dispute.category,
      dispute_details:details
    });
    if(error){setDisputeError(error.message||"Unable to report this issue.");setDisputeBusy(false);return;}
    setDisputeSent(true);setDisputeBusy(false);
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',sans-serif",color:C.text}}>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cert-actions, .cert-interactive { display: none !important; }
          .cert-page { background: #fff !important; }
          .cert-hero { border-radius: 0 !important; margin: 0 !important; }
          .cert-main { max-width: none !important; padding: 12px 0 0 !important; }
          .cert-grid { grid-template-columns: 1.05fr 0.95fr !important; gap: 12px !important; }
          .cert-card { box-shadow: none !important; break-inside: avoid; page-break-inside: avoid; }
          .cert-photo { max-height: 250px; object-fit: cover; }
          .cert-print-footer { display: block !important; }
        }
      `}</style>
      <div className="cert-actions" style={{position:"sticky",top:0,zIndex:50,background:"rgba(255,255,255,0.96)",borderBottom:`1px solid ${C.border}`,backdropFilter:"blur(8px)"}}>
        <div style={{maxWidth:980,margin:"0 auto",padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:14}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:C.text}}>Certificate {slab.id}</div>
            <div style={{fontSize:12,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{slab.stone} · {slab.factory_name}</div>
          </div>
          <div style={{display:"flex",gap:14,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <button onClick={copySummary} style={{padding:"9px 11px",border:`1px solid ${C.border}`,borderRadius:9,background:C.white,color:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>{summaryCopied?"Summary Copied":"Copy Summary"}</button>
            <button onClick={copyAuditNote} style={{padding:"9px 11px",border:`1px solid ${C.border}`,borderRadius:9,background:C.white,color:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>{auditNoteCopied?"Audit Copied":"Copy Audit Note"}</button>
            <button onClick={copyLink} style={{padding:"9px 11px",border:`1px solid ${C.border}`,borderRadius:9,background:C.white,color:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>{copied?"Copied":"Copy Link"}</button>
            <button onClick={()=>window.print()} style={{padding:"9px 12px",border:"none",borderRadius:9,background:C.primary,color:C.white,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Print / Save PDF</button>
          </div>
        </div>
      </div>
      <div style={{background:`linear-gradient(135deg,${C.primaryD},${C.primary},${C.teal})`,color:C.white}}>
        <div className="cert-hero" style={{maxWidth:980,margin:"0 auto",padding:"18px 18px 24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:18}}>
            <div>
              <div style={{fontSize:22,fontWeight:700,letterSpacing:0}}>Epistable AI</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.72)"}}>Verified slab certificate</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:999,padding:"6px 12px",fontSize:12,fontWeight:600}}>VERIFIED</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1.2fr) minmax(220px,0.8fr)",gap:16,alignItems:"stretch"}}>
            <div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.72)",fontFamily:"monospace",marginBottom:7}}>{slab.id}</div>
              <div style={{fontSize:30,fontWeight:700,lineHeight:1.08,marginBottom:8}}>{slab.stone}</div>
              <div style={{fontSize:14,color:"rgba(255,255,255,0.78)",lineHeight:1.55}}>{slab.factory_name}{slab.factory_location ? `, ${slab.factory_location}` : ""}</div>
              <div className="cert-interactive" style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:16}}>
                <button onClick={()=>scrollTo("certificate-inquiry")} disabled={!canInquire} style={{padding:"10px 14px",border:"none",borderRadius:10,background:canInquire?C.white:"rgba(255,255,255,0.18)",color:canInquire?C.primary:"rgba(255,255,255,0.62)",fontSize:13,fontWeight:600,cursor:canInquire?"pointer":"not-allowed",fontFamily:"sans-serif"}}>{canInquire?"Interested in this slab":inventory.label}</button>
                <button onClick={()=>scrollTo("certificate-dispute")} style={{padding:"10px 14px",border:"1px solid rgba(255,255,255,0.28)",borderRadius:10,background:"rgba(255,255,255,0.1)",color:C.white,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>Report mismatch</button>
              </div>
            </div>
            <div style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:12,padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:8}}>
                <div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.68)",textTransform:"uppercase",fontWeight:600}}>Grade</div>
                  <div style={{fontSize:24,fontWeight:700,color:C.white}}>{slab.grade}</div>
                </div>
                <div style={{background:g.bg,border:`1px solid ${g.border}`,color:g.color,borderRadius:10,padding:"8px 12px",fontSize:13,fontWeight:600}}>{g.label}</div>
              </div>
              <div style={{fontSize:26,fontWeight:700}}>Rs {slab.price_per_sq_ft || 0}<span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.65)"}}> / sq ft</span></div>
              <div style={{display:"inline-flex",marginTop:14,background:inventory.bg,border:`1px solid ${inventory.border}`,borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:600,color:inventory.color}}>{inventory.label}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginTop:16}}>
                {[["Defects",defects.length||"None"],["Photos",evidenceCount],["Export",slab.export_ready ? "Ready" : "No"]].map(([label,value])=>(
                  <div key={label} style={{background:"rgba(255,255,255,0.11)",border:"1px solid rgba(255,255,255,0.16)",borderRadius:9,padding:"8px 6px",textAlign:"center"}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.white,lineHeight:1.1}}>{value}</div>
                    <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.62)",marginTop:3}}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="cert-main" style={{maxWidth:980,margin:"0 auto",padding:"16px 18px 48px"}}>
        <div className="cert-grid" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1.1fr) minmax(280px,0.9fr)",gap:16}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card style={{overflow:"hidden"}} className="cert-card">
              <div style={{aspectRatio:"16/9",background:g.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {photo?<img className="cert-photo" src={photo} alt={slab.stone} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<div style={{fontSize:18,fontWeight:700,color:g.color}}>No slab photo recorded</div>}
              </div>
            </Card>

            <Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Inspection Summary</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14,marginBottom:16}}>
                <div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.green,marginBottom:2}}>Trust Signal</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{slab.export_ready ? "Export ready" : "Factory verified"}</div>
                </div>
                <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBorder}`,borderRadius:10,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.primary,marginBottom:2}}>Evidence</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{evidenceCount} photo{evidenceCount===1 ? "" : "s"}</div>
                </div>
                <div style={{background:defects.length?C.amberBg:C.greenBg,border:`1px solid ${defects.length?C.amberBorder:C.greenBorder}`,borderRadius:10,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:defects.length?C.amber:C.green,marginBottom:2}}>Defects</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{defects.length ? `${defects.length} recorded` : "None recorded"}</div>
                </div>
              </div>
              <div style={{fontSize:14,lineHeight:1.7,color:C.textMid}}>{slab.reason || "No grading reason was recorded for this slab."}</div>
              {slab.notes&&<div style={{marginTop:16,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:12,fontSize:13,lineHeight:1.7,color:C.textMid}}>{slab.notes}</div>}
            </Card>

            <Card className="cert-card cert-interactive" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Buyer verification checklist</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:14}}>
                {[
                  ["Match slab ID",`Confirm ${slab.id} matches the physical slab or invoice.`],
                  ["Review evidence",`Check ${evidenceCount} photo${evidenceCount===1 ? "" : "s"}, defects, and measurements.`],
                  ["Request quote",canInquire?"Send area and delivery needs from this certificate.":"Ask the factory for alternatives."],
                ].map(([label,detail])=>(
                  <div key={label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px"}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.primary,marginBottom:4}}>{label}</div>
                    <div style={{fontSize:12,lineHeight:1.65,color:C.textMid}}>{detail}</div>
                  </div>
                ))}
              </div>
            </Card>

            {photos.length>1&&<Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>Photo Evidence</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:14}}>
                {photos.slice(1,7).map((p,idx)=><div key={idx} style={{position:"relative"}}>
                  <img src={p.src} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:10,border:`1px solid ${C.border}`,display:"block"}}/>
                  {p.label&&<div style={{position:"absolute",left:6,bottom:6,right:6,background:"rgba(0,0,0,0.62)",borderRadius:6,padding:"4px 6px",fontSize:12,fontWeight:600,color:"#fff",textAlign:"center"}}>{p.label}</div>}
                </div>)}
              </div>
            </Card>}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Certificate Details</div>
              <Field label="Factory" value={slab.factory_name}/>
              <Field label="Factory contact" value={slab.factory_contact_email}/>
              <Field label="Supplier" value={slab.supplier}/>
              <Field label="Inspector" value={slab.inspector}/>
              <Field label="Inspected" value={inspectedAt}/>
              <Field label="Export ready" value={slab.export_ready ? "Yes" : "No"}/>
              <Field label="Inventory status" value={inventory.label}/>
            </Card>

            <Card className="cert-card" style={{padding:20,borderColor:C.greenBorder,background:C.greenBg}}>
              <div style={{fontSize:16,fontWeight:700,color:C.green,marginBottom:8}}>How to verify this certificate</div>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {verificationItems.map(item=>(
                  <div key={item.label} style={{background:C.white,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"13px 14px"}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.green,marginBottom:3}}>{item.label}</div>
                    <div style={{fontSize:12,lineHeight:1.65,color:C.textMid}}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Measurements</div>
              <Field label="Thickness" value={measurements.thickness ? `${measurements.thickness} mm` : ""}/>
              <Field label="Size" value={measurements.length && measurements.width ? `${measurements.length} x ${measurements.width} cm` : ""}/>
              <Field label="Sound test" value={measurements.soundTest}/>
              <Field label="Edge condition" value={measurements.edgeCondition}/>
              <Field label="Surface finish" value={measurements.surfaceFinish}/>
              {polish>0&&<div style={{paddingTop:12}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,marginBottom:6}}><span>Polish level</span><span>{polish}/5</span></div>
                <PBar value={polish/5*100} color={C.primary} h={8}/>
              </div>}
            </Card>

            <Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Traceability</div>
              <div style={{background:readinessScore>=70?C.greenBg:C.amberBg,border:`1px solid ${readinessScore>=70?C.greenBorder:C.amberBorder}`,borderRadius:10,padding:"14px 16px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:600,color:readinessScore>=70?C.green:C.amber}}>Evidence readiness</span>
                  <span style={{fontSize:16,fontWeight:700,color:readinessScore>=70?C.green:C.amber}}>{readinessScore}%</span>
                </div>
                <div style={{fontSize:12,lineHeight:1.55,color:C.textMid}}>This score reflects recorded traceability, audit proof, and photo evidence for this slab. It is not a third-party certification.</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:8}}>
                <div style={{background:traceabilityCount?C.primaryBg:C.surface,border:`1px solid ${traceabilityCount?C.primaryBorder:C.border}`,borderRadius:10,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:traceabilityCount?C.primary:C.textDim,marginBottom:2}}>Trace fields</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{traceabilityCount}/7 recorded</div>
                </div>
                <div style={{background:auditCount?C.greenBg:C.surface,border:`1px solid ${auditCount?C.greenBorder:C.border}`,borderRadius:10,padding:"13px 14px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:auditCount?C.green:C.textDim,marginBottom:2}}>Audit fields</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text}}>{auditCount}/6 recorded</div>
                </div>
              </div>
              <Field label="Quarry / source" value={traceability.quarrySource}/>
              <Field label="Batch" value={traceability.batchNo}/>
              <Field label="Block" value={traceability.blockNo}/>
              <Field label="Production line" value={traceability.productionLine}/>
              <Field label="Operator" value={traceability.operator}/>
              <Field label="Container / shipment" value={traceability.containerNo}/>
              <Field label="Customer / order ref" value={traceability.customerRef}/>
            </Card>

            <Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Audit Readiness</div>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",fontSize:12,lineHeight:1.65,color:C.textMid,marginBottom:14}}>These fields help factories maintain inspection evidence for buyer QC programs, internal reviews, and certification preparation.</div>
              <div style={{background:readinessScore>=80?C.greenBg:readinessScore>=55?C.amberBg:C.redBg,border:`1px solid ${readinessScore>=80?C.greenBorder:readinessScore>=55?C.amberBorder:C.redBorder}`,borderRadius:10,padding:"14px 16px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:600,color:readinessScore>=80?C.green:readinessScore>=55?C.amber:C.red}}>{auditReadinessLabel} evidence file</span>
                  <button onClick={copyAuditNote} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:8,color:C.primary,padding:"5px 9px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"}}>{auditNoteCopied?"Copied":"Copy note"}</button>
                </div>
                <div style={{fontSize:12,lineHeight:1.55,color:C.textMid}}>{auditGaps.length?auditGaps.join("; "):"No evidence gaps are flagged from the current certificate data."}</div>
              </div>
              <Field label="Calibration" value={audit.calibrationChecked ? "Checked" : ""}/>
              <Field label="Inspection checklist" value={audit.checklistComplete ? "Complete" : ""}/>
              <Field label="Root cause" value={audit.rootCause}/>
              <Field label="Corrective action" value={audit.correctiveAction}/>
              <Field label="Action owner" value={audit.actionOwner}/>
              <Field label="Action due" value={audit.actionDue}/>
            </Card>

            <Card className="cert-card" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:14}}>Defects</div>
              {defects.length===0?<div style={{fontSize:13,color:C.green,fontWeight:600}}>No defects recorded</div>:
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                {defects.map(d=><span key={d} style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:999,padding:"5px 10px",fontSize:12,fontWeight:600,color:C.amber,textTransform:"capitalize"}}>{d}</span>)}
              </div>}
            </Card>

            <Card id="certificate-inquiry" className="cert-card cert-interactive" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Interested in this slab?</div>
              {!canInquire?<div style={{background:inventory.bg,border:`1px solid ${inventory.border}`,borderRadius:10,padding:20}}>
                <div style={{fontSize:14,fontWeight:700,color:inventory.color,marginBottom:4}}>{inventory.label}</div>
                <div style={{fontSize:13,color:C.textMid,lineHeight:1.7}}>This slab is not currently marked available. Contact the factory for alternatives.</div>
              </div>:inqSent?<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:20}}>
                <div style={{fontSize:14,fontWeight:700,color:C.green,marginBottom:4}}>Inquiry sent</div>
                <div style={{fontSize:13,color:C.textMid,lineHeight:1.7}}>The factory has received your interest in slab {slab.id}.</div>
              </div>:<div style={{display:"flex",flexDirection:"column",gap:14}}>
                <input value={inq.name} onChange={e=>setInq(p=>({...p,name:e.target.value}))} placeholder="Your name" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                <input value={inq.company} onChange={e=>setInq(p=>({...p,company:e.target.value}))} placeholder="Company (optional)" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
                  <input value={inq.email} onChange={e=>setInq(p=>({...p,email:e.target.value}))} placeholder="Email" type="email" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",minWidth:0}}/>
                  <input value={inq.phone} onChange={e=>setInq(p=>({...p,phone:e.target.value}))} placeholder="Phone" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",minWidth:0}}/>
                </div>
                <input value={inq.areaSqFt} onChange={e=>setInq(p=>({...p,areaSqFt:e.target.value.replace(/[^\d.]/g,"")}))} placeholder="Area required in sq ft (optional)" inputMode="decimal" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                {quoteEstimate>0&&<div style={{background:C.greenBg,border:`1px solid ${C.greenBorder}`,borderRadius:10,padding:"14px 16px",display:"flex",justifyContent:"space-between",gap:14}}>
                  <span style={{fontSize:12,fontWeight:600,color:C.green}}>Estimated value</span>
                  <span style={{fontSize:14,fontWeight:700,color:C.green}}>Rs {quoteEstimate}</span>
                </div>}
                <textarea value={inq.message} onChange={e=>setInq(p=>({...p,message:e.target.value}))} rows={3} placeholder="Message (quantity, timeline, destination...)" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",resize:"none"}}/>
                {inqError&&<div style={{fontSize:12,color:C.red,fontWeight:600}}>{inqError}</div>}
                <Btn full disabled={!inquiryReady||inqBusy} onClick={submitInquiry}>{inqBusy?"Sending...":"Send Inquiry"}</Btn>
                <div style={{fontSize:12,color:C.textDim,lineHeight:1.55}}>Name and either email or phone are required.</div>
              </div>}
            </Card>

            <Card id="certificate-dispute" className="cert-card cert-interactive" style={{padding:20}}>
              <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Report an issue</div>
              {disputeSent?<div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:10,padding:20}}>
                <div style={{fontSize:14,fontWeight:700,color:C.amber,marginBottom:4}}>Issue reported</div>
                <div style={{fontSize:13,color:C.textMid,lineHeight:1.7}}>The factory can now review your concern for slab {slab.id}.</div>
              </div>:<div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div style={{fontSize:12,color:C.textMid,lineHeight:1.55}}>Use this if the delivered slab does not match the certificate.</div>
                <input value={dispute.name} onChange={e=>setDispute(p=>({...p,name:e.target.value}))} placeholder="Your name" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                <input value={dispute.company} onChange={e=>setDispute(p=>({...p,company:e.target.value}))} placeholder="Company (optional)" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif"}}/>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
                  <input value={dispute.email} onChange={e=>setDispute(p=>({...p,email:e.target.value}))} placeholder="Email" type="email" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",minWidth:0}}/>
                  <input value={dispute.phone} onChange={e=>setDispute(p=>({...p,phone:e.target.value}))} placeholder="Phone" style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",minWidth:0}}/>
                </div>
                <select value={dispute.category} onChange={e=>setDispute(p=>({...p,category:e.target.value}))} style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",background:C.white}}>
                  <option value="wrong_grade">Wrong grade</option>
                  <option value="defect_missed">Defect missed</option>
                  <option value="measurement">Measurement issue</option>
                  <option value="other">Other</option>
                </select>
                <textarea value={dispute.details} onChange={e=>setDispute(p=>({...p,details:e.target.value}))} rows={3} placeholder="Describe what does not match..." style={{padding:"13px 14px",border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:"sans-serif",resize:"none"}}/>
                {disputeError&&<div style={{fontSize:12,color:C.red,fontWeight:600}}>{disputeError}</div>}
                <Btn full variant="secondary" disabled={!disputeReady||disputeBusy} onClick={submitDispute}>{disputeBusy?"Sending...":"Report Issue"}</Btn>
                <div style={{fontSize:12,color:C.textDim,lineHeight:1.55}}>Name, contact, and issue details are required.</div>
              </div>}
            </Card>
          </div>
        </div>
        <div className="cert-print-footer" style={{display:"none",marginTop:14,paddingTop:10,borderTop:`1px solid ${C.border}`,fontSize:12,color:C.textDim,lineHeight:1.55}}>
          Verified by Epistable AI · Certificate ID {slab.id} · Generated from {certificateUrl}
        </div>
      </main>
    </div>
  );
}

```


===== FILE: src/components/ui.jsx =====

```jsx
import { useState } from "react";
import { C } from "../lib/domain";
import { useBP } from "../hooks/useBP";
import { FONT_STACK, RADIUS, SHADOW, SPACE, TYPE, WEIGHT } from "../lib/tokens";
import { Icon } from "./Icon";
import { Pill } from "./Pill";

export const fontStack = FONT_STACK;

const typeStyle = key => ({
  fontFamily: FONT_STACK,
  fontSize: TYPE[key].size,
  lineHeight: TYPE[key].lineHeight,
  fontWeight: TYPE[key].weight,
  letterSpacing: TYPE[key].letterSpacing,
});

export const T = {
  body: typeStyle("body"),
  label: { ...typeStyle("label"), fontWeight: WEIGHT.medium },
  hint: typeStyle("caption"),
  control: { ...typeStyle("body"), lineHeight: 1.3, fontWeight: WEIGHT.medium },
  title: { ...typeStyle("heading"), fontWeight: WEIGHT.bold },
  pill: { ...typeStyle("caption"), lineHeight: 1.3, fontWeight: WEIGHT.medium },
};

const CONTROL_PAD = {
  sm: `${SPACE.sm + 1}px ${SPACE.base}px`,
  md: `${SPACE.md + 1}px ${SPACE.lg}px`,
  lg: `${SPACE.base}px ${SPACE.xl}px`,
};

const CONTROL_FONT = {
  sm: TYPE.label.size,
  md: TYPE.body.size,
  lg: TYPE.body.size + 1,
};

export const Card = ({children,style={},onClick,className,...props}) =>
  <div
    {...props}
    className={className}
    onClick={onClick}
    style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: RADIUS.lg,
      boxShadow: C.shadow,
      ...style,
    }}
  >
    {children}
  </div>;

export const BillPill = ({status}) => {
  const m = {
    paid: { tone: "success", label: "Paid" },
    overdue: { tone: "danger", label: "Overdue" },
    pending: { tone: "warning", label: "Pending" },
  };
  const s = m[status] || m.pending;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const StatPill = ({status}) => {
  const m = {
    active: { tone: "success", label: "Active" },
    paused: { tone: "danger", label: "Paused" },
    suspended: { tone: "danger", label: "Suspended" },
    inactive: { tone: "warning", label: "Inactive" },
    flagged: { tone: "danger", label: "Flagged" },
  };
  const s = m[status] || m.inactive;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const DisputeStatusPill = ({status}) => {
  const m = {
    open: { tone: "danger", label: "Open" },
    reviewing: { tone: "warning", label: "Reviewing" },
    resolved: { tone: "success", label: "Resolved" },
    dismissed: { tone: "neutral", label: "Dismissed" },
  };
  const s = m[status] || m.open;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const InqPill = ({status}) => {
  const m = {
    reserved: { tone: "info", label: "Reserved" },
    new: { tone: "primary", label: "New" },
    contacted: { tone: "warning", label: "Contacted" },
    closed: { tone: "success", label: "Closed" },
  };
  const s = m[status] || m.new;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const Avi = ({initials,size=36,color=C.primary,bg=C.primaryBg,border=C.primaryBorder}) =>
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: bg,
      border: `2px solid ${border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: Math.max(TYPE.caption.size, Math.round(size * 0.33)),
      fontWeight: WEIGHT.bold,
      lineHeight: 1,
      color,
      flexShrink: 0,
      fontFamily: FONT_STACK,
    }}
  >
    {initials}
  </div>;

export const PBar = ({value,color=C.primary,h=6}) => {
  const height = h || SPACE.xs + 2;
  return (
    <div style={{background:C.primaryBg,borderRadius:height,height,overflow:"hidden"}}>
      <div style={{background:color,width:`${Math.min(Math.max(value,0),100)}%`,height:"100%",borderRadius:height,transition:"width 0.4s"}}/>
    </div>
  );
};

const KPI_ICON = {
  "\u{1F4B3}": "billing",
  "\u{1F50D}": "search",
  "\u{1F3ED}": "factory",
  "\u{1F464}": "user",
  "\u{1F465}": "users",
  "\u{1F6A8}": "alert",
  "\u{23F8}": "pause",
  "\u{1F4E6}": "package",
  "\u{1F4C5}": "date",
  "\u{1F4C6}": "date",
  "\u{1F3C6}": "verified",
  Scan: "search",
  Stock: "box",
  Grade: "verified",
  Bill: "billing",
  Quote: "message",
  Won: "check",
  Reply: "message",
  New: "bell",
  Hot: "alert",
  Due: "date",
  Mill: "factory",
  Trace: "list",
  Audit: "verified",
  CAPA: "alert",
  Batch: "package",
  Vol: "chart",
  Risk: "alert",
  Sold: "check",
  Now: "alert",
};

function KpiIcon({icon,color}) {
  if (!icon) return null;
  const name = KPI_ICON[icon] || (typeof icon === "string" && icon.length < 14 ? "chart" : null);
  if (!name || typeof icon !== "string") return icon;
  return <Icon name={name} size={TYPE.display.size - 2} color={color || C.primary}/>;
}

const INPUT_ICON = {
  "\u{1F50D}": "search",
  "\u{2709}\uFE0F": "mail",
  search: "search",
  mail: "mail",
};

function InputIcon({icon}) {
  if (!icon) return null;
  const name = INPUT_ICON[icon] || icon;
  if (typeof name === "string") return <Icon name={name} size={TYPE.body.size + 1} color={C.textDim}/>;
  return name;
}

export function Btn({children,onClick,variant="primary",full,disabled,style={},size="md"}) {
  const pad = CONTROL_PAD[size] || CONTROL_PAD.md;
  const fs = CONTROL_FONT[size] || CONTROL_FONT.md;
  const vs = {
    primary: { bg: C.primary, color: C.white, border: "none" },
    secondary: { bg: C.white, color: C.textMid, border: `1px solid ${C.border}` },
    green: { bg: C.green, color: C.white, border: "none" },
    red: { bg: C.red, color: C.white, border: "none" },
    ghost: { bg: "transparent", color: C.primary, border: `1px solid ${C.primaryBorder}` },
  };
  const v = vs[variant] || vs.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: pad,
        background: v.bg,
        border: v.border,
        borderRadius: RADIUS.md,
        color: v.color,
        fontSize: fs,
        cursor: disabled ? "not-allowed" : "pointer",
        width: full ? "100%" : "auto",
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: "transparent",
        ...T.control,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Inp({label,value,onChange,type="text",placeholder,required,icon,hint}) {
  const [f,setF]=useState(false);
  const inputPad = icon
    ? `${SPACE.md + 2}px ${SPACE.base}px ${SPACE.md + 2}px ${SPACE.xxl + SPACE.sm}px`
    : `${SPACE.md + 2}px ${SPACE.base}px`;
  return (
    <div>
      {label&&<label style={{display:"block",color:C.text,marginBottom:SPACE.sm,...T.label}}>{label}{required&&<span style={{color:C.red}}> *</span>}</label>}
      <div style={{position:"relative"}}>
        {icon&&<span style={{position:"absolute",left:SPACE.base - 2,top:"50%",transform:"translateY(-50%)",fontSize:TYPE.body.size + 1,pointerEvents:"none",display:"flex",alignItems:"center"}}><InputIcon icon={icon}/></span>}
        <input
          type={type}
          value={value}
          onChange={e=>onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width:"100%",
            padding: inputPad,
            background:C.white,
            border:`1.5px solid ${f?C.primary:C.border}`,
            borderRadius:RADIUS.md,
            color:C.text,
            outline:"none",
            boxSizing:"border-box",
            ...T.body,
          }}
          onFocus={()=>setF(true)}
          onBlur={()=>setF(false)}
        />
      </div>
      {hint&&<div style={{color:C.textDim,marginTop:SPACE.sm,...T.hint}}>{hint}</div>}
    </div>
  );
}

export function Sel({label,value,onChange,options,hint}) {
  return (
    <div>
      {label&&<label style={{display:"block",color:C.text,marginBottom:SPACE.sm,...T.label}}>{label}</label>}
      <select
        value={value}
        onChange={e=>onChange(e.target.value)}
        style={{
          width:"100%",
          padding:`${SPACE.md + 2}px ${SPACE.base}px`,
          background:C.white,
          border:`1.5px solid ${C.border}`,
          borderRadius:RADIUS.md,
          color:C.text,
          outline:"none",
          WebkitAppearance:"none",
          appearance:"none",
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238a8478' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundRepeat:"no-repeat",
          backgroundPosition:`right ${SPACE.base - 2}px center`,
          ...T.body,
        }}
      >
        {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint&&<div style={{color:C.textDim,marginTop:SPACE.sm,...T.hint}}>{hint}</div>}
    </div>
  );
}

export function Modal({title,onClose,children,closeOnBackdrop=true}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={closeOnBackdrop?onClose:undefined}>
      <div style={{background:C.white,borderRadius:`${RADIUS.lg + 6}px ${RADIUS.lg + 6}px 0 0`,width:"100%",maxWidth:560,maxHeight:"92vh",overflow:"auto",boxShadow:SHADOW.modal}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:`${SPACE.md - 2}px 0 0`,display:"flex",justifyContent:"center"}}><div style={{width:SPACE.xxl + SPACE.sm,height:SPACE.xs,borderRadius:SPACE.xs / 2,background:C.border}}/></div>
        <div style={{padding:`${SPACE.base}px ${SPACE.xl}px`,display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
          <div style={{color:C.text,...T.title}}>{title}</div>
          <button onClick={onClose} style={{background:C.surface,border:"none",borderRadius:"50%",color:C.textDim,width:SPACE.xxl,height:SPACE.xxl,cursor:"pointer",fontSize:TYPE.heading.size,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent",fontFamily:FONT_STACK}}>×</button>
        </div>
        <div style={{padding:SPACE.xl}}>{children}</div>
      </div>
    </div>
  );
}

export function KpiGrid({items}) {
  const {isMobile}=useBP();
  return (
    <div style={{display:"grid",gridTemplateColumns:`repeat(${isMobile?2:Math.min(items.length,4)},1fr)`,gap:SPACE.base,marginBottom:SPACE.xl}}>
      {items.map(({label,value,color,icon})=>(
        <Card key={label} style={{padding:`${SPACE.lg}px ${SPACE.base}px`}}>
          <div style={{fontSize:TYPE.display.size - 2,marginBottom:SPACE.sm,lineHeight:1}}><KpiIcon icon={icon} color={color}/></div>
          <div style={{fontSize:TYPE.display.size - 2,fontWeight:WEIGHT.bold,color:color||C.text,lineHeight:1.2,marginBottom:SPACE.xs,letterSpacing:0}}>{value}</div>
          <div style={{color:C.textMid,fontWeight:WEIGHT.medium,...T.hint}}>{label}</div>
        </Card>
      ))}
    </div>
  );
}

export function Loader() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:SPACE.md,background:C.bg,fontFamily:FONT_STACK}}>
      <div style={{...typeStyle("display"),fontWeight:WEIGHT.bold,color:C.primary}}>Epistable</div>
      <div style={{color:C.textDim,...T.body}}>Loading...</div>
    </div>
  );
}

```


===== FILE: src/hooks/useBP.js =====

```javascript
import { useEffect, useState } from "react";

export function useBP() {
  const [w,setW]=useState(typeof window==="undefined"?1024:window.innerWidth);
  useEffect(()=>{if(typeof window==="undefined")return;const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return {isMobile:w<640,isDesktop:w>=1024};
}

```


===== FILE: src/lib/auth.js =====

```javascript
import { supabase } from "./supabase";
import { requireData } from "./supabaseSafe";

async function loadProfileForAuthUser(userId, fallbackEmail) {
  const profileRows = requireData(
    await supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
    "Could not load Epistable profile"
  );

  let profile = profileRows?.[0] || null;

  // Backward-compatible fallback for older seeded records that may not have
  // auth_user_id populated yet.
  if (!profile && fallbackEmail) {
    const fallbackRows = requireData(
      await supabase
        .from("profiles")
        .select("*")
        .eq("email", fallbackEmail.trim().toLowerCase())
        .order("created_at", { ascending: false })
        .limit(1),
      "Could not load Epistable profile"
    );
    profile = fallbackRows?.[0] || null;
  }

  if (!profile) throw new Error("No Epistable profile is linked to this login");
  if (profile.status === "suspended") throw new Error("Account suspended.");
  return profile;
}

export async function signInWithEmail(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const auth = requireData(
    await withTimeout(
      supabase.auth.signInWithPassword({ email: normalizedEmail, password }),
      "Login took too long. Please check your connection and try again."
    ),
    "Could not sign in"
  );

  const userId = auth.user?.id;
  if (!userId) throw new Error("Signed in without a user profile");

  const profile = await loadProfileForAuthUser(userId, normalizedEmail);

  return { auth, profile };
}

export async function signOut() {
  requireData(await supabase.auth.signOut(), "Could not sign out");
}

export async function getSession() {
  return requireData(await supabase.auth.getSession(), "Could not load session").session;
}

export async function getSessionProfile() {
  const session = await getSession();
  const user = session?.user;
  if (!user?.id) return null;
  return loadProfileForAuthUser(user.id, user.email);
}

export async function acceptInviteWithPassword(email, password, mode = "signup") {
  const normalizedEmail = email.trim().toLowerCase();

  if (mode === "signup") {
    const inviteResult = requireData(
      await withTimeout(
        supabase.functions.invoke("accept-invite", {
          body: { email: normalizedEmail, password }
        }),
        "Invite setup took too long. Please try again."
      ),
      "Could not create invite login"
    );
    if (!inviteResult?.profile?.id) throw new Error("No pending invite found for this email.");
  }

  const auth = requireData(
    await withTimeout(
      supabase.auth.signInWithPassword({ email: normalizedEmail, password }),
      "Supabase Auth took too long. Please try again."
    ),
    "Could not sign in"
  );

  const profile = mode === "signin"
    ? requireData(
        await withTimeout(supabase.rpc("accept_profile_invite"), "Invite linking took too long. Please try again."),
        "Could not link invite"
      )
    : await loadProfileForAuthUser(auth.user?.id, normalizedEmail);

  return { auth, profile: profile?.[0] || profile };
}

export function friendlyAuthError(error, context = "login") {
  const raw = String(error?.message || error || "").trim();
  const msg = raw.toLowerCase();
  if (!raw) return context === "invite" ? "Could not accept invite. Please try again." : "Could not sign in. Please try again.";
  if (msg.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (msg.includes("email not confirmed")) return "Your email is not confirmed yet. Open the confirmation email, then try again.";
  if (msg.includes("rate limit")) return "Too many attempts. Wait a few minutes, then try again.";
  if (msg.includes("no epistable profile") || msg.includes("no pending invite")) return context === "invite"
    ? "No pending Epistable invite was found for this email. Ask the factory admin to create access first."
    : "This login is not linked to an Epistable profile yet. Ask the admin to link this email.";
  if (msg.includes("account suspended")) return "This account is suspended. Contact your administrator.";
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("took too long")) return "Connection timed out. Check your internet and try again.";
  if (msg.includes("already registered") || msg.includes("user already registered")) return "This email already has a login. Choose “I Have Login” and enter the existing password.";
  return raw;
}

function withTimeout(promise, message, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}

```


===== FILE: src/lib/db.js =====

```javascript
import { supabase } from "./supabase";
import { maybeOne, requireData, rows } from "./supabaseSafe";

const byCreatedDesc = { ascending: false };
const byTsDesc = { ascending: false };

export const DB = {
  async getProfileByAuthUserId(authUserId) {
    return maybeOne(await supabase.from("profiles").select("*").eq("auth_user_id", authUserId).maybeSingle());
  },

  async getFac(id) {
    return maybeOne(await supabase.from("factories").select().eq("id", id).maybeSingle());
  },

  async updFac(id, updates) {
    return requireData(await supabase.from("factories").update(updates).eq("id", id).select().single());
  },

  async allFacs() {
    return rows(await supabase.from("factories").select().order("created_at", byCreatedDesc));
  },

  async facUsers(factoryId) {
    return rows(await supabase.from("profiles").select().eq("factory_id", factoryId));
  },

  async allUsers() {
    return rows(await supabase.from("profiles").select().order("created_at", byCreatedDesc));
  },

  async facInsps(factoryId) {
    return rows(await supabase.from("inspections").select().eq("factory_id", factoryId).order("ts", byTsDesc).limit(300));
  },

  async userInsps(userId) {
    return rows(await supabase.from("inspections").select().eq("user_id", userId).order("ts", byTsDesc).limit(200));
  },

  async allInsps() {
    return rows(await supabase.from("inspections").select().order("ts", byTsDesc));
  },
};

```


===== FILE: src/lib/domain.js =====

```javascript
import { COLOR, SHADOW } from "./tokens";

export const C = {
  ...COLOR,
  primaryD: COLOR.primaryMid,
  teal: COLOR.accent,
  blue2: COLOR.blue,
  blue2Bg: COLOR.blueBg,
  blue2Border: COLOR.blueBorder,
  shadow: SHADOW.card,
};

export const STONES = [
  {id:"makrana",label:"Makrana White"},{id:"black",label:"Black Granite"},
  {id:"green",label:"Rainforest Green"},{id:"yellow",label:"Jaisalmer Yellow"},
  {id:"pink",label:"Udaipur Pink"},{id:"kota",label:"Kota Brown"},
  {id:"carrara",label:"Carrara White"},{id:"red",label:"Indian Red Granite"},
];

export const DEFECTS = [
  {id:"crack",label:"Crack",color:C.red},
  {id:"stain",label:"Stain",color:C.amber},{id:"pit",label:"Pitting",color:C.red},
  {id:"chip",label:"Edge Chip",color:C.amber},{id:"vein",label:"Vein Issue",color:C.blue2},
  {id:"polish",label:"Polish Issue",color:C.amber},{id:"thin",label:"Thin Spot",color:C.purple},
];

export const GRADES = [
  {id:"Premium",label:"PREMIUM",color:C.green,bg:C.greenBg,border:C.greenBorder,emoji:"🏆",price:850},
  {id:"Standard",label:"STANDARD",color:C.amber,bg:C.amberBg,border:C.amberBorder,emoji:"✅",price:480},
  {id:"Commercial",label:"COMMERCIAL",color:C.blue2,bg:C.blue2Bg,border:C.blue2Border,emoji:"🏢",price:320},
  {id:"Rejected",label:"REJECT",color:C.red,bg:C.redBg,border:C.redBorder,emoji:"❌",price:0},
];

export const PLANS = {
  Starter:{label:"Starter",scansIncluded:100,pricePerScan:5,monthlyFee:299},
  Pro:{label:"Pro",scansIncluded:500,pricePerScan:3,monthlyFee:999},
  Enterprise:{label:"Enterprise",scansIncluded:2000,pricePerScan:1.5,monthlyFee:2999},
};

export const genId = p => p+"-"+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();
export const fmtT = ts => new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
export const fmtD = ts => new Date(ts).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
export const curMon = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };
export const fmtMoney = (n, { compact = false } = {}) => {
  const v = Number(n) || 0;
  if (compact && v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  return `₹${v.toLocaleString("en-IN")}`;
};
export const calcBill = (plan,scans) => {
  const p=PLANS[plan]||PLANS.Starter;
  const ov=Math.max(0,scans-p.scansIncluded);
  return {monthlyFee:p.monthlyFee,includedScans:p.scansIncluded,overageScans:ov,overageCharge:Math.round(ov*p.pricePerScan),pricePerScan:p.pricePerScan,total:p.monthlyFee+Math.round(ov*p.pricePerScan)};
};
export const gradeConf = g => GRADES.find(x=>x.id===g)||GRADES[1];
export const slabQrUrl = slabId => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent("https://epistable.pages.dev/slab/"+slabId)}`;

```


===== FILE: src/lib/marketplace.js =====

```javascript
import { supabase } from './supabase';

const data = (r) => { if (r.error) throw r.error; return r.data; };
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;

export const FOOD_CATEGORIES = [
  'Spices & Seasonings','Snacks','Sauces & Condiments','Ready-to-Eat / Ready-to-Cook',
  'Beverages','Bakery & Confectionery','Frozen & Processed Produce','Food Ingredients','Other Processed Foods'
];

export const FOOD_CERTIFICATIONS = [
  'FSSAI','FSSC 22000','BRCGS Food Safety','ISO 22000','HACCP','IFS Food','SQF',
  'GMP','Organic - NPOP','Organic - USDA','Organic - EU','Halal','Kosher','Non-GMO'
];

const PRODUCT_REVIEW_PATTERN = /(cure|treat|prevent)\s+(cancer|diabetes|disease|infection)|medicinal|therapeutic|miracle\s+cure|guaranteed\s+weight\s+loss|fda\s+approved/i;

export function productRequiresReview(product={}) {
  const text=[product.name,product.description,product.dietary_attributes,product.certifications]
    .flatMap(value=>Array.isArray(value)?value:[value])
    .filter(Boolean).join(' ');
  return PRODUCT_REVIEW_PATTERN.test(text);
}

export const TRADE_DOCUMENT_TYPES = [
  {value:'certificate_of_analysis',label:'Certificate of Analysis (COA)'},
  {value:'food_safety',label:'Food safety certification'},
  {value:'haccp_plan',label:'HACCP plan / certificate'},
  {value:'organic_certificate',label:'Organic certificate'},
  {value:'halal_certificate',label:'Halal certificate'},
  {value:'kosher_certificate',label:'Kosher certificate'},
  {value:'allergen_declaration',label:'Allergen declaration'},
  {value:'lab_report',label:'Laboratory / microbiology report'},
  {value:'product_specification',label:'Product specification sheet'},
  {value:'nutrition_label',label:'Nutrition / label artwork'},
  {value:'health_certificate',label:'Health / sanitary certificate'},
  {value:'origin_certificate',label:'Certificate of origin'},
  {value:'export_license',label:'Export registration / licence'},
  {value:'business_registration',label:'Business registration'},
  {value:'other',label:'Other trade evidence'}
];

export const marketplace = {
  async reviews() { return data(await supabase.from('marketplace_reviews').select('*').order('created_at',{ascending:false}).limit(100)); },
  async review(kind,targetId,decision,reason) {
    return data(await supabase.rpc('review_marketplace_record',{target_kind:kind,target_id:targetId,decision,reason}));
  },
  async context() { return data(await supabase.rpc('marketplace_context')); },
  async accounts() { return data(await supabase.rpc('marketplace_accounts')); },
  async assignAccess(targetUser,targetOrg,targetRole) {
    return data(await supabase.rpc('assign_marketplace_access',{target_user:targetUser,target_org:targetOrg,target_role:targetRole}));
  },
  async updateOrganization(organizationId,updates) {
    return data(await supabase.from('organizations').update(updates).eq('id',organizationId).select().single());
  },
  async organizations(type) {
    let q=supabase.from('organizations').select('*').order('created_at',{ascending:false});
    if(type)q=q.eq('type',type);
    return data(await q);
  },
  async createOrganization(input) {
    return data(await supabase.from('organizations').insert({id:id(input.type==='buyer'?'BUYORG':'SELORG'),...input}).select().single());
  },
  async products(filters={}) {
    let q=supabase.from('products').select('*, organizations!products_seller_org_id_fkey(*)').order('created_at',{ascending:false});
    if(filters.sellerOrgId)q=q.eq('seller_org_id',filters.sellerOrgId);
    if(filters.category)q=q.eq('category',filters.category);
    if(filters.status)q=q.eq('status',filters.status);
    if(filters.verified)q=q.eq('verification_status','verified');
    if(filters.published)q=q.eq('status','active');
    return data(await q);
  },
  async createProduct(input) {
    return data(await supabase.from('products').insert({id:id('PRD'),...input}).select().single());
  },
  async updateProduct(productId,updates) {
    return data(await supabase.from('products').update(updates).eq('id',productId).select().single());
  },
  async uploadProductImages(sellerOrgId,productId,files=[]) {
    const uploaded=[];
    for(const file of files) {
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use JPG, PNG or WebP product images.');
      if(file.size>5*1024*1024) throw new Error('Each product image must be 5 MB or smaller.');
      const ext=(file.name?.split('.').pop()||file.type.split('/')[1]||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
      const path=`${sellerOrgId}/${productId}/${crypto.randomUUID()}.${ext||'jpg'}`;
      const result=await supabase.storage.from('product-images').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
      if(result.error) throw result.error;
      const publicResult=supabase.storage.from('product-images').getPublicUrl(path);
      uploaded.push(publicResult.data.publicUrl);
    }
    return uploaded;
  },
  async removeProductImages(urls=[]) {
    const marker='/storage/v1/object/public/product-images/';
    const paths=urls.map(url=>{
      const index=String(url).indexOf(marker);
      return index<0?null:decodeURIComponent(String(url).slice(index+marker.length));
    }).filter(Boolean);
    if(!paths.length)return;
    const result=await supabase.storage.from('product-images').remove(paths);
    if(result.error) throw result.error;
  },
  async documents(organizationId,productId=null) {
    let q=supabase.from('trade_documents').select('*').order('created_at',{ascending:false});
    if(organizationId)q=q.eq('organization_id',organizationId);
    if(productId)q=q.eq('product_id',productId);
    return data(await q);
  },
  async addDocument(input) {
    return data(await supabase.from('trade_documents').insert({id:id('DOC'),...input}).select().single());
  },
  async updateDocument(documentId,updates) {
    return data(await supabase.from('trade_documents').update(updates).eq('id',documentId).select().single());
  },
  async uploadTradeEvidence(organizationId,documentId,file) {
    if(!file)throw new Error('Choose a certificate or evidence file.');
    if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use PDF, JPG, PNG or WebP evidence files.');
    if(file.size>10*1024*1024)throw new Error('Evidence files must be 10 MB or smaller.');
    const ext=(file.name?.split('.').pop()||file.type.split('/')[1]||'bin').toLowerCase().replace(/[^a-z0-9]/g,'');
    const path=`${organizationId}/${documentId}/${crypto.randomUUID()}.${ext||'bin'}`;
    const result=await supabase.storage.from('trade-evidence').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
    if(result.error)throw result.error;
    return {storage_path:path,file_name:file.name||'Evidence file',mime_type:file.type,file_size:file.size};
  },
  async removeTradeEvidence(path) {
    if(!path)return;
    const result=await supabase.storage.from('trade-evidence').remove([path]);
    if(result.error)throw result.error;
  },
  async evidenceUrl(document,expiresIn=300) {
    if(document?.storage_path){
      const result=await supabase.storage.from('trade-evidence').createSignedUrl(document.storage_path,expiresIn);
      if(result.error)throw result.error;
      return result.data.signedUrl;
    }
    if(document?.file_url?.startsWith('https://'))return document.file_url;
    throw new Error('Evidence file is unavailable.');
  },
  async rfqs({buyerOrgId,sellerOrgId}={}) {
    let q=supabase.from('rfqs').select('*, products(*)').order('created_at',{ascending:false});
    if(buyerOrgId)q=q.eq('buyer_org_id',buyerOrgId);
    if(sellerOrgId)q=q.eq('seller_org_id',sellerOrgId);
    return data(await q);
  },
  async createRfq(input) {
    return data(await supabase.from('rfqs').insert({id:id('RFQ'),...input}).select().single());
  },
  async updateRfq(rfqId,updates) {
    return data(await supabase.from('rfqs').update(updates).eq('id',rfqId).select().single());
  },
  async quotes(rfqId) {
    let q=supabase.from('trade_quotes').select('*, organizations!trade_quotes_seller_org_id_fkey(*)').order('created_at',{ascending:false});
    if(rfqId)q=q.eq('rfq_id',rfqId);
    return data(await q);
  },
  async createQuote(input) {
    return data(await supabase.from('trade_quotes').insert({id:id('TQ'),...input}).select().single());
  },
  async updateQuote(quoteId,updates) {
    return data(await supabase.from('trade_quotes').update(updates).eq('id',quoteId).select().single());
  },
  async decideQuote(quoteId,decision,message='') {
    return data(await supabase.rpc('decide_trade_quote',{target_quote_id:quoteId,decision,message}));
  },
  async reviseQuote(quoteId,values) {
    return data(await supabase.rpc('revise_trade_quote',{
      target_quote_id:quoteId,
      quote_currency:values.currency,
      quote_unit_price:values.unit_price,
      quote_quantity:values.quantity,
      quote_quantity_unit:values.quantity_unit,
      quote_incoterm:values.incoterm,
      quote_lead_time_days:values.lead_time_days,
      quote_validity_ts:values.validity_ts,
      quote_notes:values.notes||null
    }));
  },
  async orders({buyerOrgId,sellerOrgId}={}) {
    let q=supabase.from('trade_orders').select('*, rfqs(*), trade_quotes(*)').order('created_at',{ascending:false});
    if(buyerOrgId)q=q.eq('buyer_org_id',buyerOrgId);
    if(sellerOrgId)q=q.eq('seller_org_id',sellerOrgId);
    return data(await q);
  },
  async updateOrderStatus(orderId,status,note='') {
    return data(await supabase.rpc('update_trade_order_status',{target_order_id:orderId,new_status:status,note}));
  }
};

```


===== FILE: src/lib/markets.js =====

```javascript
export const EXPORT_MARKETS = [
  {value:"EU",label:"European Union",short:"EU"},
  {value:"US",label:"United States",short:"US"},
  {value:"GB",label:"United Kingdom",short:"UK"},
  {value:"AE",label:"UAE / Gulf",short:"UAE"},
  {value:"CN",label:"China",short:"China"},
  {value:"JP",label:"Japan",short:"Japan"},
  {value:"BD",label:"Bangladesh",short:"BD"},
  {value:"MV",label:"Maldives",short:"MV"},
];

export const marketConf = code => EXPORT_MARKETS.find(m=>m.value===code) || {value:code,label:code,short:code};

```


===== FILE: src/lib/readiness.js =====

```javascript
export const EXPORT_PRODUCTS = [
  {value:"any",label:"Mixed stone products"},
  {value:"granite",label:"Granite"},
  {value:"marble",label:"Marble"},
  {value:"sandstone",label:"Sandstone"},
];

export const EXPORT_CERTS = [
  {id:"iec",label:"IEC"},
  {id:"iso_9001",label:"ISO 9001"},
  {id:"lab_report",label:"Lab test reports"},
  {id:"social_audit",label:"Social / responsible sourcing audit"},
  {id:"origin_docs",label:"Origin / shipment documents"},
];

export const EVIDENCE_STATUS = {
  missing: { tone:"danger", label:"Missing", score:0 },
  pending: { tone:"warning", label:"Working on it", score:45 },
  uploaded: { tone:"info", label:"Uploaded", score:70 },
  submitted: { tone:"info", label:"Submitted", score:75 },
  verified: { tone:"success", label:"Verified", score:100 },
  expired: { tone:"danger", label:"Expired", score:20 },
  rejected: { tone:"danger", label:"Rejected", score:10 },
  not_applicable: { tone:"neutral", label:"Not applicable", score:100 },
};

export const readinessStatusConf = status => EVIDENCE_STATUS[status] || EVIDENCE_STATUS.missing;

export const READINESS_SECTIONS = [
  {id:"market_entry",label:"Market Entry",hint:"Registrations and baseline documents needed before a shipment can move."},
  {id:"product_standards",label:"Product Standards",hint:"Market-specific test reports, standards, and technical documentation."},
  {id:"quality_evidence",label:"Quality Evidence",hint:"Operational records that show consistent inspection and quality control."},
  {id:"origin_traceability",label:"Origin & Traceability",hint:"Source, supplier, batch, and origin documents buyers may ask to review."},
  {id:"packaging_shipment",label:"Packaging & Shipment",hint:"Shipment documents, packaging proof, and labelling evidence."},
  {id:"responsible_sourcing",label:"Responsible Sourcing",hint:"Social, safety, environmental, and due-diligence evidence."},
];

export const evidenceTypeFallback = type => {
  const map = {
    government_registration:"certificate_number",
    management_system_cert:"certificate_number",
    product_test_report:"lab_report",
    responsible_sourcing_audit:"external_verification",
    shipment_document:"document_upload",
    operational_record:"checklist_confirmation",
    training_record:"checklist_confirmation",
    policy_document:"document_upload",
  };
  return map[type] || "document_upload";
};

export const marketsForRequirement = r => {
  const list = Array.isArray(r.destination_markets) ? r.destination_markets : [];
  if(list.length)return list;
  return [r.destination_market || "GLOBAL"];
};

export const requirementApplies = (r,{sector,productType,market}) => {
  const reqSector = r.sector || "stone";
  const reqProduct = r.product_type || r.productCategory || r.product_category || "any";
  const reqMarkets = marketsForRequirement(r);
  return reqSector === sector
    && (reqProduct === "any" || reqProduct === productType || productType === "any")
    && (reqMarkets.includes("GLOBAL") || reqMarkets.includes("any") || reqMarkets.includes(market));
};

export const mapRequirement = r => ({
  ...r,
  requirementName:r.certification_name || r.requirement_name || r.name || r.id,
  shortName:r.certification_code || r.requirement_name || r.id,
  timelineMin:r.timeline_min_weeks ?? r.estimated_timeline_weeks_min,
  timelineMax:r.timeline_max_weeks ?? r.estimated_timeline_weeks_max,
  costMin:r.estimated_cost_min_inr,
  costMax:r.estimated_cost_max_inr,
  evidenceType:r.evidence_type || evidenceTypeFallback(r.evidence_lifecycle_type || r.certification_evidence_type),
  lifecycleType:r.evidence_lifecycle_type || r.certification_evidence_type || r.evidence_type,
});

export const sectionForRequirement = r => {
  const t=(r.requirement_type||"").toLowerCase();
  const name=(r.requirementName||r.requirement_name||"").toLowerCase();
  const evidence=(r.evidenceType||r.evidence_type||"").toLowerCase();
  const lifecycle=(r.lifecycleType||r.evidence_lifecycle_type||"").toLowerCase();
  if(t==="registration" || lifecycle==="government_registration")return "market_entry";
  if(t==="testing" || t==="standard" || evidence==="lab_report" || lifecycle==="product_test_report")return "product_standards";
  if(t==="packaging" || name.includes("packaging") || name.includes("origin") || lifecycle==="shipment_document")return "packaging_shipment";
  if(name.includes("origin") || name.includes("trace") || name.includes("quarry") || name.includes("supplier"))return "origin_traceability";
  if(t==="compliance" || lifecycle==="responsible_sourcing_audit" || name.includes("sourcing") || name.includes("silica") || name.includes("environment"))return "responsible_sourcing";
  if(t==="certification" || lifecycle==="management_system_cert")return "quality_evidence";
  return "market_entry";
};

export const scoreRequirements = (requirements,evidenceRows) => {
  const evidenceMap={};
  evidenceRows.forEach(e=>{evidenceMap[e.requirement_id]=e;});
  const mandatory=requirements.filter(r=>r.is_mandatory!==false);
  const applicable=mandatory.filter(r=>evidenceMap[r.id]?.status!=="not_applicable");
  if(!applicable.length)return {score:requirements.length?100:0,complete:0,working:0,missing:requirements.length,total:requirements.length};
  const total=applicable.reduce((sum,r)=>sum+(r.priority||50),0);
  const earned=applicable.reduce((sum,r)=>{
    const status=evidenceMap[r.id]?.status || "missing";
    return sum + ((r.priority||50) * (readinessStatusConf(status).score/100));
  },0);
  const complete=requirements.filter(r=>["verified","not_applicable"].includes(evidenceMap[r.id]?.status)).length;
  const working=requirements.filter(r=>["pending","uploaded","submitted"].includes(evidenceMap[r.id]?.status)).length;
  const missing=requirements.filter(r=>["missing","rejected","expired",undefined].includes(evidenceMap[r.id]?.status)).length;
  return {score:Math.round(earned/total*100),complete,working,missing,total:requirements.length};
};

```


===== FILE: src/lib/supabase.js =====

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://gfmrzcfajuwxishfnbur.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_rymg6uYPUH3WMferT4UpNw_BaFSnSxS";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

```


===== FILE: src/lib/supabaseSafe.js =====

```javascript
export class DbError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "DbError";
    this.cause = cause;
  }
}

export function requireData(result, fallbackMessage = "Database request failed") {
  if (result.error) {
    throw new DbError(result.error.message || fallbackMessage, result.error);
  }
  return result.data;
}

export function rows(result, fallback = []) {
  return requireData(result) || fallback;
}

export function maybeOne(result) {
  return requireData(result) || null;
}

```


===== FILE: src/lib/tokens.js =====

```javascript
// Type scale - 5 steps
export const TYPE = {
  caption: { size: 11, lineHeight: 1.5, weight: 500, letterSpacing: 0.25 },
  label: { size: 12, lineHeight: 1.5, weight: 600, letterSpacing: 0.15 },
  body: { size: 14, lineHeight: 1.65, weight: 400, letterSpacing: 0 },
  heading: { size: 18, lineHeight: 1.4, weight: 700, letterSpacing: 0 },
  display: { size: 24, lineHeight: 1.3, weight: 700, letterSpacing: 0 },
};

// Weight scale - 3 levels
export const WEIGHT = { regular: 400, medium: 600, bold: 700 };

// Spacing - 8px base
export const SPACE = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, section: 28 };

// Radius
export const RADIUS = { sm: 6, md: 10, lg: 14, pill: 999 };

// Shadow
export const SHADOW = {
  card: "0 1px 3px rgba(10, 37, 64, 0.06), 0 4px 12px rgba(10, 37, 64, 0.04)",
  raised: "0 4px 16px rgba(10, 37, 64, 0.10)",
  modal: "0 12px 48px rgba(10, 37, 64, 0.20)",
};

// Font stack
export const FONT_STACK =
  '"Inter", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

// Colors - original blue/teal Epistable palette
export const COLOR = {
  bg: "#f0f2f5",
  surface: "#f8f9fb",
  white: "#ffffff",
  border: "#e2e8f0",

  primary: "#0057a8",
  primaryMid: "#003f7a",
  primaryBg: "#e8f0fa",
  primaryBorder: "#b8d0f0",

  accent: "#0097a7",
  accentBg: "#e0f7fa",
  accentBorder: "#80deea",

  text: "#1a2533",
  textMid: "#4a5568",
  textDim: "#8896a4",

  green: "#2e7d32",
  greenBg: "#e8f5e9",
  greenBorder: "#a5d6a7",
  red: "#c62828",
  redBg: "#ffebee",
  redBorder: "#ef9a9a",
  amber: "#b45309",
  amberBg: "#fffbeb",
  amberBorder: "#fcd34d",
  blue: "#1565c0",
  blueBg: "#e3f2fd",
  blueBorder: "#90caf9",
  purple: "#6b21a8",
  purpleBg: "#f5f0ff",
  purpleBorder: "#d8b4fe",
};


```


===== FILE: src/main.jsx =====

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import MarketplaceApp from './MarketplaceApp.jsx'
import { PasswordRecovery } from './marketplace/PasswordRecovery.jsx'
import { LegacyWorkspaceNotice } from './marketplace/LegacyWorkspaceNotice.jsx'
import { MarketplaceOnboarding } from './marketplace/MarketplaceOnboarding.jsx'
import { registerServiceWorker } from './registerServiceWorker.js'
import './styles.css'

registerServiceWorker()

const path = window.location.pathname
const resetPassword = path === '/reset-password' || new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery'
const forgotPassword = path === '/forgot-password'
const joinMarketplace = path === '/join'
const legacyRoute = path.startsWith('/slab/') || path.startsWith('/quote/') || path.startsWith('/invite') || path.startsWith('/legacy')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {!resetPassword && path.startsWith('/legacy') && <LegacyWorkspaceNotice />}
    {resetPassword || forgotPassword ? <PasswordRecovery reset={resetPassword} /> : joinMarketplace ? <MarketplaceOnboarding /> : legacyRoute ? <App /> : <MarketplaceApp />}
  </React.StrictMode>
)

```


===== FILE: src/marketplace/BuyerPortal.jsx =====

```jsx
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { Avi } from "../components/ui";
import { C } from "../lib/domain";
import { FONT_STACK } from "../lib/tokens";
import { useBP } from "../hooks/useBP";
import { FOOD_CATEGORIES } from "../lib/marketplace";
import { RfqForm } from "./TradeForms";

const buttonBase = {
  fontFamily: FONT_STACK,
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

function BuyerWordmark({ compact = false }) {
  return (
    <div style={{display:"inline-flex",alignItems:"baseline",gap:compact?4:5,whiteSpace:"nowrap",lineHeight:1}}>
      <span style={{fontSize:compact?21:25,fontWeight:750,letterSpacing:-0.25,color:C.primaryD}}>Epistable</span>
      <span style={{fontSize:compact?21:25,fontWeight:750,letterSpacing:-0.25,color:C.primary}}>AI</span>
    </div>
  );
}

function Badge({children,tone="neutral"}) {
  const style=tone==="success"
    ? {color:C.green,bg:C.greenBg,border:C.greenBorder}
    : tone==="warning"
      ? {color:C.amber,bg:C.amberBg,border:C.amberBorder}
      : {color:C.textMid,bg:C.surface,border:C.border};
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 9px",borderRadius:999,border:"1px solid "+style.border,background:style.bg,color:style.color,fontSize:11,fontWeight:750,lineHeight:1.1}}>{children}</span>;
}

function productImage(product) {
  return product.cover_image_url || (Array.isArray(product.image_urls) ? product.image_urls[0] : "") || "";
}

function supplierName(product) {
  return product.organizations?.name || "Verified supplier";
}

function productSearchText(product) {
  return [
    product.name, product.category, product.description, product.ingredients, product.country_of_origin,
    supplierName(product), ...(product.packaging||[]), ...(product.certifications||[]),
    ...(product.export_markets||[]), ...(product.dietary_attributes||[])
  ].filter(Boolean).join(" ").toLowerCase();
}

function SellerTrust({product}) {
  const verified=product.organizations?.verification_status==="verified";
  return verified
    ? <Badge tone="success"><Icon name="verified" size={12}/> Verified supplier</Badge>
    : <Badge>Supplier listed</Badge>;
}

function ProductCard({product,evidenceCount,saved,onSave,onOpen,onQuote,isMobile}) {
  const image=productImage(product);
  return (
    <article className="buyer-product-card buyer-enter" style={{background:C.white,border:"1px solid "+C.border,borderRadius:isMobile?0:16,overflow:"hidden",minWidth:0,boxShadow:isMobile?"none":"0 10px 28px rgba(16,24,40,0.05)"}}>
      <div role="button" tabIndex={0} aria-label={"Open "+product.name} onClick={onOpen} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onOpen();}}} style={{display:"block",width:"100%",background:"#edf3fa",textAlign:"left",position:"relative",cursor:"pointer"}}>
        <div style={{height:isMobile?245:220,overflow:"hidden",background:"linear-gradient(135deg,#f7f9fc,#eaf0f8)"}}>
          {image
            ? <img className="buyer-image" src={image} alt={product.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
            : <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"#8da0bf"}}><Icon name="package" size={42}/></div>}
        </div>
        <div style={{position:"absolute",top:12,left:12}}><SellerTrust product={product}/></div>
        <button type="button" aria-label={saved?"Remove from saved":"Save product"} onClick={e=>{e.stopPropagation();onSave();}} style={{...buttonBase,position:"absolute",right:12,top:12,width:38,height:38,borderRadius:999,border:"1px solid rgba(255,255,255,.8)",background:"rgba(255,255,255,.94)",display:"flex",alignItems:"center",justifyContent:"center",color:saved?C.primary:C.textMid,boxShadow:"0 5px 16px rgba(16,24,40,.12)"}}><Icon name="check" size={17}/></button>
      </div>
      <div style={{padding:isMobile?"20px 20px 22px":"18px 18px 20px"}}>
        <div style={{fontSize:11,fontWeight:800,letterSpacing:.45,textTransform:"uppercase",color:C.primary,marginBottom:8}}>{product.category}</div>
        <h2 style={{margin:0,fontSize:isMobile?22:19,lineHeight:1.25,fontWeight:760,letterSpacing:-.2,color:C.text}}>{product.name}</h2>
        <div style={{fontSize:13,color:C.textDim,marginTop:7}}>{supplierName(product)} · {product.country_of_origin||"Origin not specified"}</div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:14}}>
          {product.moq!=null&&<Badge>MOQ {product.moq} {product.moq_unit||""}</Badge>}
          {product.shelf_life&&<Badge>{product.shelf_life}</Badge>}
          {evidenceCount>0&&<Badge tone="success">{evidenceCount} verified document{evidenceCount===1?"":"s"}</Badge>}
        </div>
        {Array.isArray(product.certifications)&&product.certifications.length>0&&<div style={{fontSize:12,color:C.textMid,marginTop:13,lineHeight:1.55}}>Claims: {product.certifications.slice(0,3).join(" · ")}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:18}}>
          <button className="buyer-button" onClick={onOpen} style={{...buttonBase,border:"1px solid "+C.border,background:C.white,borderRadius:10,padding:"12px 10px",color:C.textMid,fontWeight:700,fontSize:13}}>View details</button>
          <button className="buyer-button" onClick={onQuote} style={{...buttonBase,border:"1px solid "+C.primary,background:C.primary,borderRadius:10,padding:"12px 10px",color:C.white,fontWeight:750,fontSize:13}}>Request Quote</button>
        </div>
      </div>
    </article>
  );
}

function EvidenceAction({document,api}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function open(){
    setBusy(true);setError("");
    try{const url=await api.evidenceUrl(document);window.open(url,"_blank","noopener,noreferrer");}
    catch(e){setError(e.message||"Could not open evidence.");}
    finally{setBusy(false);}
  }
  if(!document.storage_path&&!document.file_url)return null;
  return <span style={{display:"inline-flex",alignItems:"center",gap:8}}><button className="buyer-button" onClick={open} disabled={busy} style={{...buttonBase,border:0,background:"transparent",padding:0,color:C.primary,fontSize:12,fontWeight:750}}>{busy?"Opening…":"Open evidence"}</button>{error&&<small style={{color:C.red}}>{error}</small>}</span>;
}

function ProductDetail({product,documents,api,onClose,onQuote,isMobile}) {
  const images=Array.isArray(product.image_urls)&&product.image_urls.length ? product.image_urls : productImage(product) ? [productImage(product)] : [];
  const evidence=documents.filter(d=>d.product_id===product.id&&d.verification_status==="verified");
  const rows=[
    ["Country of origin",product.country_of_origin],
    ["Minimum order",product.moq!=null?String(product.moq)+" "+(product.moq_unit||""):""],
    ["Monthly capacity",product.capacity!=null?String(product.capacity)+" "+(product.capacity_unit||""):""],
    ["Shelf life",product.shelf_life],
    ["Storage",product.storage_requirements],
    ["Lead time",product.lead_time_days!=null?String(product.lead_time_days)+" days":""],
    ["Packaging",Array.isArray(product.packaging)?product.packaging.join(", "):product.packaging],
    ["Ingredients",product.ingredients],
    ["Allergens",Array.isArray(product.allergens)?product.allergens.join(", "):product.allergens],
    ["Export markets",Array.isArray(product.export_markets)?product.export_markets.join(", "):product.export_markets],
  ].filter(([,value])=>value);
  return <div className="buyer-trade-overlay" style={{position:"fixed",inset:0,zIndex:300,background:"rgba(6,18,45,.52)",display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"center",padding:isMobile?0:24}} onClick={onClose}>
    <section className="buyer-sheet" onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:920,height:isMobile?"100%":"min(820px, calc(100dvh - 48px))",overflowY:"auto",background:C.white,borderRadius:isMobile?0:18,boxShadow:"0 28px 80px rgba(6,18,45,.28)"}}>
      <div style={{position:"sticky",top:0,zIndex:5,height:58,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(255,255,255,.96)",borderBottom:"1px solid "+C.border}}>
        <BuyerWordmark compact/>
        <button aria-label="Close product details" className="buyer-button" onClick={onClose} style={{...buttonBase,width:36,height:36,borderRadius:10,border:0,background:C.surface,color:C.textMid,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="close"/></button>
      </div>
      {images.length>0&&<div style={{display:"grid",gridTemplateColumns:images.length>1&&!isMobile?"2fr 1fr":"1fr",gap:4,background:"#edf3fa"}}>
        <img src={images[0]} alt={product.name} style={{width:"100%",height:isMobile?340:420,objectFit:"cover"}}/>
        {images.length>1&&!isMobile&&<div style={{display:"grid",gridTemplateRows:"1fr 1fr",gap:4}}>{images.slice(1,3).map((url,i)=><img key={url} src={url} alt={product.name+" image "+(i+2)} style={{width:"100%",height:"100%",objectFit:"cover",minHeight:0}}/>)}</div>}
      </div>}
      <div style={{padding:isMobile?"24px 20px 120px":"30px 34px 42px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><SellerTrust product={product}/><Badge>{product.category}</Badge></div>
        <h1 style={{fontSize:isMobile?31:38,lineHeight:1.12,letterSpacing:-.6,margin:"16px 0 6px",color:C.text}}>{product.name}</h1>
        <div style={{fontSize:15,color:C.textDim}}>{supplierName(product)} · {product.country_of_origin||"Origin not specified"}</div>
        {product.description&&<p style={{fontSize:15,lineHeight:1.72,color:C.textMid,maxWidth:760,marginTop:22}}>{product.description}</p>}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:0,borderTop:"1px solid "+C.border,marginTop:26}}>
          {rows.map(([label,value])=><div key={label} style={{display:"grid",gridTemplateColumns:"150px 1fr",gap:14,padding:"13px 0",borderBottom:"1px solid "+C.border,fontSize:13}}><strong style={{color:C.text}}>{label}</strong><span style={{color:C.textMid}}>{value}</span></div>)}
        </div>
        <div style={{marginTop:28}}>
          <h2 style={{fontSize:18,margin:"0 0 12px"}}>Certification & evidence</h2>
          {Array.isArray(product.certifications)&&product.certifications.length>0&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>{product.certifications.map(c=><Badge key={c}>{c} · seller claim</Badge>)}</div>}
          {evidence.length?<div style={{display:"grid",gap:8}}>{evidence.map(d=><div key={d.id} style={{padding:"12px 14px",border:"1px solid "+C.greenBorder,background:C.greenBg,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}><span style={{fontSize:13,fontWeight:700,color:C.text}}>{d.title}<span style={{display:"block",marginTop:5}}><EvidenceAction document={d} api={api}/></span></span><Badge tone="success"><Icon name="verified" size={12}/> Verified</Badge></div>)}</div>:<p style={{fontSize:13,color:C.textDim}}>No product-specific documents have been independently verified yet.</p>}
        </div>
        <button className="buyer-button" onClick={onQuote} style={{...buttonBase,width:"100%",marginTop:28,background:C.primary,border:"1px solid "+C.primary,borderRadius:12,padding:"15px 16px",color:C.white,fontSize:15,fontWeight:750}}>Request Quote</button>
      </div>
    </section>
  </div>;
}

function TradeGPT({open,onClose,prompt,setPrompt,recommendations,onOpenProduct,onApply,isMobile}) {
  if(!open)return null;
  const examples=isMobile?[]:["Halal spice suppliers","Private-label sauces for UAE","FSSC 22000 snack manufacturers","Low MOQ ready-to-eat foods"];
  return <div className="buyer-trade-overlay" style={{position:"fixed",top:0,left:0,right:0,bottom:isMobile?"calc(92px + env(safe-area-inset-bottom))":0,background:isMobile?C.white:"rgba(246,248,252,.96)",zIndex:isMobile?120:260,display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"center",padding:isMobile?0:24}} onClick={onClose}>
    <div className="buyer-trade-sheet buyer-gpt-shell" style={{width:"100%",maxWidth:760,height:isMobile?"100%":"min(760px, calc(100dvh - 48px))",background:C.white,border:isMobile?"none":"1px solid "+C.border,borderRadius:isMobile?0:18,boxShadow:isMobile?"none":"0 22px 70px rgba(16,24,40,.12)",boxSizing:"border-box",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
      <div style={{height:58,borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,padding:isMobile?"0 14px":"0 18px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
          <div style={{width:30,height:30,borderRadius:9,background:"#f2f4f7",display:"flex",alignItems:"center",justifyContent:"center",color:C.textMid,flexShrink:0}}><Icon name="bot" size={16}/></div>
          <div style={{fontSize:15,fontWeight:700,color:C.text}}>Trade GPT</div>
        </div>
        <button className="buyer-button" onClick={onClose} aria-label="Close Trade GPT" style={{...buttonBase,width:34,height:34,borderRadius:10,border:0,background:"transparent",color:C.textMid,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><Icon name="close" size={17}/></button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:isMobile?"34px 18px 18px":"30px 24px 22px"}}>
        <div style={{maxWidth:620,margin:"0 auto",display:"flex",flexDirection:"column",gap:18}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start",justifyContent:isMobile?"center":"flex-start",textAlign:isMobile?"center":"left"}}>
            {!isMobile&&<div style={{width:30,height:30,borderRadius:9,background:"#f2f4f7",display:"flex",alignItems:"center",justifyContent:"center",color:C.textMid,flexShrink:0}}><Icon name="bot" size={15}/></div>}
            <div style={{fontSize:isMobile?16:15,lineHeight:1.65,color:C.text,maxWidth:isMobile?320:540}}>
              {isMobile?"What are you looking for?":"Tell me the product, certification, market, packaging or supplier requirement you need. I can narrow the catalog for you."}
              {isMobile&&<div style={{fontSize:13,lineHeight:1.55,color:C.textDim,marginTop:8}}>Ask in plain language. I will filter the processed-food catalog.</div>}
            </div>
          </div>
          {examples.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginLeft:42}}>{examples.map(example=><button key={example} className="buyer-chip" onClick={()=>setPrompt(example)} style={{...buttonBase,background:C.white,border:"1px solid "+C.border,borderRadius:14,padding:"12px 14px",fontSize:13,lineHeight:1.35,fontWeight:600,color:C.textMid,textAlign:"left"}}>{example}</button>)}</div>}
          {prompt.trim()&&<div style={{marginTop:4}}>
            <div style={{fontSize:12,fontWeight:800,color:C.textDim,textTransform:"uppercase",letterSpacing:.4,marginBottom:10}}>Best matches</div>
            {recommendations.length?<div style={{display:"grid",gap:9}}>{recommendations.map(({product,score})=><button key={product.id} onClick={()=>onOpenProduct(product)} style={{...buttonBase,width:"100%",padding:"13px 14px",border:"1px solid "+C.border,borderRadius:12,background:C.white,textAlign:"left",display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center"}}><span><strong style={{display:"block",fontSize:14,color:C.text}}>{product.name}</strong><small style={{display:"block",marginTop:4,color:C.textDim}}>{supplierName(product)} · {product.category}</small></span><Badge tone={score>45?"success":"neutral"}>{score}% match</Badge></button>)}</div>:<p style={{fontSize:13,color:C.textDim}}>No strong matches yet. Try a product category, certification or destination market.</p>}
          </div>}
        </div>
      </div>
      <div style={{borderTop:"1px solid "+C.border,padding:isMobile?"12px 14px calc(14px + env(safe-area-inset-bottom))":"14px 18px 18px",background:C.white}}>
        <div style={{maxWidth:620,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr auto",gap:9}}>
          <input value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&prompt.trim())onApply();}} placeholder="e.g. Halal turmeric supplier for UAE" aria-label="Trade GPT request" style={{width:"100%",boxSizing:"border-box",border:"1px solid "+C.border,borderRadius:12,padding:"13px 14px",fontSize:14,fontFamily:FONT_STACK,outline:"none",color:C.text}}/>
          <button className="buyer-button" onClick={onApply} disabled={!prompt.trim()} style={{...buttonBase,border:"1px solid "+C.primary,background:prompt.trim()?C.primary:C.surface,color:prompt.trim()?C.white:C.textDim,borderRadius:12,padding:"0 16px",fontWeight:750}}>Search</button>
        </div>
      </div>
    </div>
  </div>;
}

function BuyerListView({title,subtitle,children,isMobile}) {
  return <section style={{padding:isMobile?"22px 18px 130px":"8px 0 80px"}}>
    <h1 style={{fontSize:isMobile?28:32,letterSpacing:-.5,margin:"0 0 5px",color:C.text}}>{title}</h1>
    {subtitle&&<p style={{fontSize:14,color:C.textDim,margin:"0 0 22px"}}>{subtitle}</p>}
    {children}
  </section>;
}

export function BuyerPortal({profile,access,data,api,onSaved,onLogout,signingOut}) {
  const {isMobile}=useBP();
  const [viewMode,setViewMode]=useState("all");
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("All");
  const [supplier,setSupplier]=useState("All");
  const [sortBy,setSortBy]=useState("newest");
  const [savedIds,setSavedIds]=useState([]);
  const [tradeOpen,setTradeOpen]=useState(false);
  const [tradePrompt,setTradePrompt]=useState("");
  const [tradeResultIds,setTradeResultIds]=useState([]);
  const [selectedProduct,setSelectedProduct]=useState(null);
  const [quoteProduct,setQuoteProduct]=useState(null);
  const [quoteBusy,setQuoteBusy]=useState(false);
  const [quoteError,setQuoteError]=useState("");
  const [quoteActionBusy,setQuoteActionBusy]=useState("");
  const [quoteActionError,setQuoteActionError]=useState("");

  const buyerOrg=data.organizations.find(o=>o.id===access.org);
  const products=(data.products||[]).filter(p=>p.status==="active");
  const documents=data.documents||[];
  const shortlistKey="epistable_food_shortlist_"+(profile.auth_user_id||access.org||"buyer");

  useEffect(()=>{
    try{setSavedIds(JSON.parse(localStorage.getItem(shortlistKey)||"[]"));}catch{setSavedIds([]);}
  },[shortlistKey]);

  const savedSet=useMemo(()=>new Set(savedIds),[savedIds]);
  const evidenceCount=product=>documents.filter(d=>d.product_id===product.id&&d.verification_status==="verified").length;
  const supplierOptions=useMemo(()=>["All",...Array.from(new Set(products.map(supplierName).filter(Boolean))).sort()],[products]);
  const categories=useMemo(()=>["All",...Array.from(new Set([...FOOD_CATEGORIES,...products.map(p=>p.category).filter(Boolean)]))],[products]);

  function toggleSaved(id) {
    setSavedIds(prev=>{
      const next=prev.includes(id)?prev.filter(x=>x!==id):[id,...prev];
      try{localStorage.setItem(shortlistKey,JSON.stringify(next));}catch{}
      return next;
    });
  }

  const visibleProducts=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return products.filter(p=>
      (viewMode!=="saved"||savedSet.has(p.id)) &&
      (viewMode!=="trade"||tradeResultIds.includes(p.id)) &&
      (category==="All"||p.category===category) &&
      (supplier==="All"||supplierName(p)===supplier) &&
      (!q||productSearchText(p).includes(q))
    ).sort((a,b)=>{
      if(sortBy==="moq")return Number(a.moq||Number.MAX_SAFE_INTEGER)-Number(b.moq||Number.MAX_SAFE_INTEGER);
      if(sortBy==="evidence")return evidenceCount(b)-evidenceCount(a);
      return Number(b.created_at||0)-Number(a.created_at||0);
    });
  },[products,viewMode,savedSet,tradeResultIds,category,supplier,search,sortBy,documents]);

  const featured=useMemo(()=>products.slice().sort((a,b)=>{
    const av=a.organizations?.verification_status==="verified"?1:0;
    const bv=b.organizations?.verification_status==="verified"?1:0;
    return bv-av || evidenceCount(b)-evidenceCount(a) || Number(b.created_at||0)-Number(a.created_at||0);
  }).slice(0,4),[products,documents]);

  const tradeRecommendations=useMemo(()=>{
    const text=tradePrompt.toLowerCase().trim();
    if(!text)return [];
    const words=text.split(/[^a-z0-9]+/).filter(w=>w.length>2);
    return products.map(product=>{
      const hay=productSearchText(product);
      let score=product.organizations?.verification_status==="verified"?18:0;
      score+=Math.min(20,evidenceCount(product)*8);
      words.forEach(w=>{if(hay.includes(w))score+=9;});
      if(/halal/.test(text)&&(product.certifications||[]).some(x=>String(x).toLowerCase().includes("halal")))score+=25;
      if(/organic/.test(text)&&(product.certifications||[]).some(x=>String(x).toLowerCase().includes("organic")))score+=25;
      if(/fssc/.test(text)&&(product.certifications||[]).some(x=>String(x).toLowerCase().includes("fssc")))score+=25;
      if(/brc/.test(text)&&(product.certifications||[]).some(x=>String(x).toLowerCase().includes("brc")))score+=25;
      if(/private label|private-label/.test(text)&&hay.includes("private"))score+=18;
      return {product,score:Math.min(99,score)};
    }).filter(x=>x.score>10).sort((a,b)=>b.score-a.score).slice(0,5);
  },[tradePrompt,products,documents]);

  function applyTradePrompt() {
    const ids=tradeRecommendations.map(x=>x.product.id);
    setTradeResultIds(ids);
    setViewMode("trade");
    setSearch("");
    setCategory("All");
    setSupplier("All");
    setTradeOpen(false);
  }

  async function saveRfq(values) {
    setQuoteBusy(true);setQuoteError("");
    try{
      await api.createRfq({...values,id:"RFQ_"+crypto.randomUUID(),buyer_org_id:access.org});
      setQuoteProduct(null);
      setViewMode("quotes");
      await onSaved();
    }catch(e){setQuoteError(e.message||"Could not send RFQ.");}
    finally{setQuoteBusy(false);}
  }

  async function decideQuote(quote,decision) {
    let message="";
    if(decision==="revision_requested"){
      message=window.prompt("What should the supplier revise?","")||"";
      if(!message.trim())return;
    } else if(decision==="rejected") {
      message=window.prompt("Optional reason for rejecting this quote:","")||"";
    }
    setQuoteActionBusy(quote.id);setQuoteActionError("");
    try{await api.decideQuote(quote.id,decision,message.trim());await onSaved();}
    catch(e){setQuoteActionError(e.message||"Could not update this quote.");}
    finally{setQuoteActionBusy("");}
  }

  const buyerInitials=(profile.name||profile.email||"Buyer").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
  const canSearch=["all","saved","trade"].includes(viewMode);
  const mobileNavItems=[
    {label:"Catalog",icon:"package",active:["all","trade"].includes(viewMode)&&!tradeOpen,action:()=>{setViewMode("all");setTradeOpen(false);}},
    {label:"GPT",icon:"bot",active:tradeOpen,action:()=>setTradeOpen(true)},
    {label:"Saved",icon:"check",active:viewMode==="saved"&&!tradeOpen,action:()=>{setViewMode("saved");setTradeOpen(false);}},
    {label:"Quotes",icon:"message",active:viewMode==="quotes"&&!tradeOpen,action:()=>{setViewMode("quotes");setTradeOpen(false);}},
  ];
  const activeMobileNavIndex=Math.max(0,mobileNavItems.findIndex(item=>item.active));
  const mobileNavIndicatorTransform=[
    "translateX(0)",
    "translateX(calc(100% + 7px))",
    "translateX(calc(200% + 14px))",
    "translateX(calc(300% + 21px))",
  ][activeMobileNavIndex]||"translateX(0)";

  const sidebarItems=[
    {label:"Trade GPT",icon:"bot",active:tradeOpen,action:()=>setTradeOpen(true)},
    {label:"Catalog",icon:"package",active:["all","saved","trade"].includes(viewMode)&&!tradeOpen,action:()=>{setViewMode("all");setTradeOpen(false);}},
    {label:"My Quotes",icon:"message",active:viewMode==="quotes"&&!tradeOpen,action:()=>{setViewMode("quotes");setTradeOpen(false);}},
    {label:"My Orders",icon:"truck",active:viewMode==="orders"&&!tradeOpen,action:()=>{setViewMode("orders");setTradeOpen(false);}},
    {label:"My Requirements",icon:"list",active:viewMode==="requirements"&&!tradeOpen,action:()=>{setViewMode("requirements");setTradeOpen(false);}},
    {label:"Profile",icon:"user",active:viewMode==="profile"&&!tradeOpen,action:()=>{setViewMode("profile");setTradeOpen(false);}},
  ];

  let body=null;
  if(["all","saved","trade"].includes(viewMode)) {
    const hero=featured[0];
    body=<div style={{padding:isMobile?"0 0 184px":"30px 30px 90px",maxWidth:1600,margin:"0 auto"}}>
      {isMobile&&viewMode==="all"&&hero&&<section className="buyer-featured-card buyer-enter" style={{marginBottom:28}}>
        <article className="buyer-featured-hero" style={{background:C.white,overflow:"hidden"}}>
          <button onClick={()=>setSelectedProduct(hero)} style={{...buttonBase,width:"100%",height:430,border:0,padding:0,background:"#edf3fa",position:"relative",overflow:"hidden",textAlign:"left"}}>
            {productImage(hero)?<img src={productImage(hero)} alt={hero.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>:<div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,#dce7f4,#9fb4cb)"}}/>}
            <div style={{position:"absolute",inset:"auto 0 0",padding:"110px 26px 34px",background:"linear-gradient(180deg,rgba(6,18,45,0),rgba(6,18,45,.84))",color:C.white}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.16)",border:"1px solid rgba(255,255,255,.34)",borderRadius:999,padding:"7px 14px",fontSize:12,fontWeight:800,marginBottom:14}}><Icon name="trend" size={14}/> Featured</div>
              <div style={{fontSize:40,lineHeight:1.04,fontWeight:850,letterSpacing:-.5,maxWidth:340}}>{hero.name}</div>
              <div style={{fontSize:16,lineHeight:1.45,fontWeight:600,color:"rgba(255,255,255,.88)",marginTop:14,maxWidth:350}}>{hero.category} · {supplierName(hero)}{hero.moq!=null?" · MOQ "+hero.moq+" "+(hero.moq_unit||""):""}</div>
            </div>
          </button>
        </article>
      </section>}
      {!isMobile&&viewMode==="all"&&<section className="buyer-hero buyer-enter" style={{borderRadius:20,padding:"38px 42px",minHeight:170,display:"grid",gridTemplateColumns:"1.4fr .8fr",gap:30,alignItems:"center",marginBottom:26,backgroundImage:"linear-gradient(120deg,#0b1930,#0057a8)"}}>
        <div style={{color:C.white}}>
          <Badge tone="success"><Icon name="verified" size={12}/> Verified food trade</Badge>
          <h1 style={{fontSize:38,lineHeight:1.08,letterSpacing:-.8,margin:"16px 0 10px",maxWidth:650}}>Source processed foods from verified suppliers.</h1>
          <p style={{fontSize:15,lineHeight:1.65,color:"rgba(255,255,255,.78)",maxWidth:620,margin:0}}>Search products, review supplier evidence and send RFQs from one buyer workspace.</p>
        </div>
        <button className="buyer-button" onClick={()=>setTradeOpen(true)} style={{...buttonBase,justifySelf:"end",minWidth:210,border:"1px solid rgba(255,255,255,.3)",background:"rgba(255,255,255,.12)",color:C.white,borderRadius:15,padding:"18px 20px",fontSize:15,fontWeight:750,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><Icon name="bot"/> Ask Trade GPT</button>
      </section>}
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,padding:isMobile?"0 18px":"0",marginBottom:18}}>
        <div>
          <h1 style={{fontSize:isMobile?25:30,lineHeight:1.18,letterSpacing:-.45,margin:0,color:C.text}}>{viewMode==="saved"?"Saved products":viewMode==="trade"?"Trade GPT matches":"Catalog"}</h1>
          <p style={{fontSize:13,color:C.textDim,margin:"6px 0 0"}}>{visibleProducts.length} product{visibleProducts.length===1?"":"s"} available</p>
        </div>
        {viewMode!=="all"&&<button className="buyer-button" onClick={()=>setViewMode("all")} style={{...buttonBase,border:"1px solid "+C.border,background:C.white,borderRadius:10,padding:"9px 11px",fontSize:12,fontWeight:700,color:C.textMid}}>All products</button>}
      </div>
      <div className="buyer-filter-panel" style={{margin:isMobile?"0 18px 18px":"0 0 22px",padding:12,border:"1px solid "+C.border,borderRadius:14,background:C.white,display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1.4fr 1fr 1fr",gap:9}}>
        <select aria-label="Product category" value={category} onChange={e=>setCategory(e.target.value)} style={{border:"1px solid "+C.border,borderRadius:10,padding:"11px 12px",background:C.white,color:C.text,fontFamily:FONT_STACK}}>{categories.map(x=><option key={x}>{x}</option>)}</select>
        <select aria-label="Supplier" value={supplier} onChange={e=>setSupplier(e.target.value)} style={{border:"1px solid "+C.border,borderRadius:10,padding:"11px 12px",background:C.white,color:C.text,fontFamily:FONT_STACK}}>{supplierOptions.map(x=><option key={x}>{x}</option>)}</select>
        <select aria-label="Sort products" value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{gridColumn:isMobile?"1 / -1":"auto",border:"1px solid "+C.border,borderRadius:10,padding:"11px 12px",background:C.white,color:C.text,fontFamily:FONT_STACK}}>
          <option value="newest">Newest first</option><option value="evidence">Verified evidence first</option><option value="moq">Lowest MOQ first</option>
        </select>
      </div>
      {visibleProducts.length?<div className="buyer-results-grid" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(285px,1fr))",gap:isMobile?0:18,borderTop:isMobile?"1px solid "+C.border:"none"}}>{visibleProducts.map((p,i)=><div key={p.id} style={{"--i":i}}><ProductCard product={p} evidenceCount={evidenceCount(p)} saved={savedSet.has(p.id)} onSave={()=>toggleSaved(p.id)} onOpen={()=>setSelectedProduct(p)} onQuote={()=>setQuoteProduct(p)} isMobile={isMobile}/></div>)}</div>:<div style={{margin:isMobile?"20px 18px":"20px 0",padding:"38px 22px",border:"1px dashed "+C.border,borderRadius:16,textAlign:"center",color:C.textDim}}>No products match these filters.</div>}
    </div>;
  } else if(viewMode==="quotes"||viewMode==="requirements") {
    body=<BuyerListView isMobile={isMobile} title={viewMode==="quotes"?"My Quotes":"My Requirements"} subtitle={viewMode==="quotes"?"RFQs and supplier responses in one place.":"Your active and past sourcing requirements."}>
      {quoteActionError&&<div role="alert" style={{padding:"10px 12px",background:C.redBg,border:"1px solid "+C.redBorder,color:C.red,borderRadius:10,marginBottom:12}}>{quoteActionError}</div>}
      <div style={{display:"grid",gap:12}}>{(data.rfqs||[]).length?(data.rfqs||[]).map(r=>{
        const responses=(data.quotes||[]).filter(q=>q.rfq_id===r.id);
        return <article key={r.id} style={{padding:"18px",border:"1px solid "+C.border,borderRadius:14,background:C.white}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}><div><div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",color:C.primary}}>{r.product_category||"Processed food"}</div><h2 style={{fontSize:18,margin:"5px 0"}}>{r.products?.name||r.product_category||"Sourcing request"}</h2><div style={{fontSize:13,color:C.textDim}}>{r.quantity} {r.quantity_unit} · {r.destination_country}</div></div><Badge tone={r.status==="open"?"success":"neutral"}>{r.status}</Badge></div>
          <div style={{fontSize:13,color:C.textMid,marginTop:14}}>{responses.length} supplier response{responses.length===1?"":"s"}</div>
          {viewMode==="quotes"&&responses.length>0&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit,minmax(230px,1fr))",gap:10,marginTop:14}}>
            {responses.map(q=><div key={q.id} style={{border:"1px solid "+C.border,borderRadius:12,padding:14,background:"#fbfcfe"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"flex-start"}}><strong style={{fontSize:14}}>{q.organizations?.name||"Supplier"}</strong><Badge tone={q.status==="accepted"?"success":"neutral"}>{q.status.replaceAll("_"," ")}</Badge></div>
              <div style={{fontSize:20,fontWeight:800,color:C.text,marginTop:12}}>{q.currency} {q.total_amount}</div>
              <div style={{fontSize:12,color:C.textDim,lineHeight:1.7,marginTop:7}}>{q.currency} {q.unit_price} / {q.quantity_unit}<br/>{q.quantity} {q.quantity_unit} · {q.incoterm||"Incoterm n/a"}<br/>{q.lead_time_days!=null?q.lead_time_days+" days lead time":"Lead time not specified"}{q.revision_number>1?<><br/>Revision {q.revision_number}</>:null}</div>
              {q.notes&&<div style={{fontSize:12,color:C.textMid,lineHeight:1.55,marginTop:9}}>{q.notes}</div>}
              {q.buyer_message&&<div style={{fontSize:12,color:C.textMid,lineHeight:1.55,marginTop:9}}>Buyer note: {q.buyer_message}</div>}
              {["sent","revised"].includes(q.status)&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:13}}>
                <button className="buyer-button" disabled={quoteActionBusy===q.id} onClick={()=>decideQuote(q,"accepted")} style={{...buttonBase,border:"1px solid "+C.primary,background:C.primary,color:C.white,borderRadius:9,padding:"9px 11px",fontSize:12,fontWeight:750}}>Accept</button>
                <button className="buyer-button" disabled={quoteActionBusy===q.id} onClick={()=>decideQuote(q,"revision_requested")} style={{...buttonBase,border:"1px solid "+C.border,background:C.white,color:C.textMid,borderRadius:9,padding:"9px 11px",fontSize:12,fontWeight:700}}>Request changes</button>
                <button className="buyer-button" disabled={quoteActionBusy===q.id} onClick={()=>decideQuote(q,"rejected")} style={{...buttonBase,border:"1px solid "+C.redBorder,background:C.white,color:C.red,borderRadius:9,padding:"9px 11px",fontSize:12,fontWeight:700}}>Reject</button>
              </div>}
            </div>)}
          </div>}
        </article>;
      }):<div style={{padding:"36px",border:"1px dashed "+C.border,borderRadius:14,textAlign:"center",color:C.textDim}}>No sourcing requests yet.</div>}</div>
    </BuyerListView>;
  } else if(viewMode==="orders") {
    const orders=data.orders||[];
    body=<BuyerListView isMobile={isMobile} title="My Orders" subtitle="Accepted supplier quotes progress here as trade orders.">
      <div style={{display:"grid",gap:12}}>{orders.length?orders.map(order=><article key={order.id} style={{padding:"18px",border:"1px solid "+C.border,borderRadius:14,background:C.white}}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><div><strong>{order.currency} {order.total_amount}</strong><div style={{fontSize:12,color:C.textDim,marginTop:4}}>{order.id}</div></div><Badge tone={["delivered","completed"].includes(order.status)?"success":"neutral"}>{order.status.replaceAll("_"," ")}</Badge></div><div style={{fontSize:13,color:C.textDim,marginTop:8}}>{order.quantity} {order.quantity_unit} · {order.incoterm||"Incoterm not specified"}</div>{order.status_note&&<div style={{fontSize:13,color:C.textMid,marginTop:8}}>{order.status_note}</div>}</article>):<div style={{padding:"36px",border:"1px dashed "+C.border,borderRadius:14,textAlign:"center",color:C.textDim}}>No accepted orders yet.</div>}</div>
    </BuyerListView>;
  } else if(viewMode==="profile") {
    body=<BuyerListView isMobile={isMobile} title="Profile" subtitle="Your buyer organisation details.">
      <article style={{padding:"22px",border:"1px solid "+C.border,borderRadius:16,background:C.white,maxWidth:720}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}><Avi initials={buyerInitials} size={46}/><div><h2 style={{margin:0,fontSize:20}}>{buyerOrg?.name||profile.name||"Buyer organisation"}</h2><div style={{fontSize:13,color:C.textDim,marginTop:4}}>{buyerOrg?.country||profile.email}</div></div></div>
        {buyerOrg?.description&&<p style={{fontSize:14,lineHeight:1.7,color:C.textMid,marginTop:20}}>{buyerOrg.description}</p>}
      </article>
    </BuyerListView>;
  }

  return <div className={"buyer-app"+(tradeOpen?" buyer-app-trade-open":"")} style={isMobile
    ? {position:"fixed",inset:0,width:"100%",height:"100dvh",minHeight:0,overflow:"hidden",fontFamily:FONT_STACK,color:C.text,display:"grid",gridTemplateColumns:"1fr"}
    : {minHeight:"100vh",fontFamily:FONT_STACK,color:C.text,display:"grid",gridTemplateColumns:"274px minmax(0,1fr)"}}>
    {!isMobile&&<aside className="buyer-sidebar" style={{position:"sticky",top:0,height:"100vh",padding:"28px 14px 16px",boxSizing:"border-box",display:"flex",flexDirection:"column",gap:24}}>
      <div style={{padding:"0 16px 2px"}}><BuyerWordmark/></div>
      <nav style={{display:"flex",flexDirection:"column",gap:8}}>
        {sidebarItems.map(item=><button key={item.label} className="buyer-button" onClick={item.action} style={{...buttonBase,display:"flex",alignItems:"center",gap:14,padding:"13px 16px",borderRadius:10,border:0,background:item.active?C.primaryBg:"transparent",color:item.active?C.primaryD:"#5c6678",fontSize:15,fontWeight:item.active?700:600,textAlign:"left"}}><Icon name={item.icon} size={18}/><span>{item.label}</span></button>)}
      </nav>
      <div style={{marginTop:"auto",borderTop:"1px solid "+C.border,paddingTop:18}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><Avi initials={buyerInitials} size={38}/><div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{profile.name||"Buyer"}</div><div style={{fontSize:11,color:C.textDim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{buyerOrg?.name||profile.email}</div></div></div>
        <button className="buyer-button" disabled={signingOut} onClick={onLogout} style={{...buttonBase,width:"100%",background:C.white,border:"1px solid "+C.redBorder,borderRadius:12,padding:"12px 14px",color:C.red,fontSize:14,fontWeight:700}}>{signingOut?"Logging out…":"Log out"}</button>
      </div>
    </aside>}
    <main style={isMobile
      ? {minWidth:0,minHeight:0,height:"100%",overflow:"hidden",display:"grid",gridTemplateRows:"auto minmax(0,1fr)"}
      : {minWidth:0}}>
      <div className="buyer-topbar" style={{position:isMobile?"relative":"sticky",top:0,zIndex:20,background:C.white,borderBottom:"1px solid "+C.border,boxShadow:isMobile?"0 8px 18px rgba(16,24,40,.04)":"none",padding:isMobile?"calc(14px + env(safe-area-inset-top)) 18px 14px":"15px 30px",display:"flex",alignItems:"center",gap:isMobile?10:18,flexShrink:0}}>
        {isMobile?<><div style={{flex:1,minWidth:0}}><BuyerWordmark compact/></div><button className="buyer-button" disabled={signingOut} onClick={onLogout} style={{...buttonBase,background:C.white,border:"1px solid "+C.redBorder,borderRadius:12,color:C.red,padding:"10px 14px",fontSize:13,fontWeight:700}}>{signingOut?"…":"Log out"}</button></>:<>
          <div style={{flex:"0 0 auto"}}><BuyerWordmark/></div><div style={{flex:1}}/>
          {canSearch&&<div style={{width:380,maxWidth:"48vw",position:"relative"}}><Icon name="search" size={18} color={C.textDim} style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}}/><input aria-label="Search catalog" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products, suppliers, certifications" style={{width:"100%",padding:"13px 14px 13px 42px",background:"#f9fbfe",border:"1px solid "+C.border,borderRadius:999,fontSize:15,outline:0,boxSizing:"border-box",fontFamily:FONT_STACK,color:C.text}}/></div>}
          {canSearch&&<button className="buyer-button" onClick={()=>{setSearch("");setCategory("All");setSupplier("All");setSortBy("newest");}} aria-label="Refresh catalog" style={{...buttonBase,width:50,height:50,background:C.white,border:"1px solid "+C.border,borderRadius:999,color:C.textMid,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><Icon name="refresh" size={19}/></button>}
        </>}
      </div>
      {isMobile
        ? <div className="buyer-mobile-scroll" style={{minHeight:0,overflowY:"auto",overflowX:"hidden",overscrollBehavior:"contain",WebkitOverflowScrolling:"touch"}}>
            {canSearch&&<div style={{padding:"14px 18px 0"}}><div style={{position:"relative"}}><Icon name="search" size={17} color={C.textDim} style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)"}}/><input aria-label="Search catalog" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products or suppliers" style={{width:"100%",padding:"12px 12px 12px 39px",background:C.white,border:"1px solid "+C.border,borderRadius:13,fontSize:14,outline:0,boxSizing:"border-box",fontFamily:FONT_STACK}}/></div></div>}
            {body}
          </div>
        : body}
    </main>

    {isMobile&&<nav className="buyer-mobile-nav" aria-label="Buyer navigation" style={{position:"absolute",left:0,right:0,bottom:0,zIndex:140,background:C.white,borderTop:"1px solid "+C.border,borderLeft:0,borderRight:0,borderBottom:0,borderRadius:"18px 18px 0 0",boxShadow:"0 -10px 30px rgba(16,24,40,.14)",padding:"8px 8px calc(8px + env(safe-area-inset-bottom))",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:7,overflow:"hidden"}}>
      <span className="buyer-mobile-nav-indicator" aria-hidden="true" style={{transform:mobileNavIndicatorTransform}}/>
      {mobileNavItems.map(item=><button key={item.label} className={"buyer-button buyer-mobile-nav-item"+(item.active?" is-active":"")} onClick={item.action} style={{...buttonBase,minHeight:52,background:item.active?"transparent":"#f9fbfe",border:"1px solid "+(item.active?"transparent":"#eef2f7"),borderRadius:item.active?999:12,color:item.active?C.white:"#5c6678",fontSize:11,fontWeight:700,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"6px 4px",transform:"none"}}><Icon name={item.icon} size={17}/><span>{item.label}</span></button>)}
    </nav>}

    <TradeGPT open={tradeOpen} onClose={()=>setTradeOpen(false)} prompt={tradePrompt} setPrompt={setTradePrompt} recommendations={tradeRecommendations} onOpenProduct={p=>{setTradeOpen(false);setSelectedProduct(p);}} onApply={applyTradePrompt} isMobile={isMobile}/>
    {selectedProduct&&<ProductDetail product={selectedProduct} documents={documents} api={api} onClose={()=>setSelectedProduct(null)} onQuote={()=>{setQuoteProduct(selectedProduct);setSelectedProduct(null);}} isMobile={isMobile}/>}
    {quoteProduct&&<div className="buyer-trade-overlay" style={{position:"fixed",inset:0,zIndex:320,background:"rgba(6,18,45,.52)",display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"center",padding:isMobile?0:24}} onClick={()=>!quoteBusy&&setQuoteProduct(null)}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:760,maxHeight:isMobile?"100%":"calc(100dvh - 48px)",overflowY:"auto",background:C.white,borderRadius:isMobile?0:18,padding:isMobile?"16px 16px 110px":"20px",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"flex-end"}}><button className="buyer-button" aria-label="Close RFQ" onClick={()=>setQuoteProduct(null)} style={{...buttonBase,width:36,height:36,border:0,borderRadius:10,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="close"/></button></div>
        {quoteError&&<div role="alert" style={{padding:"10px 12px",background:C.redBg,border:"1px solid "+C.redBorder,color:C.red,borderRadius:10,marginBottom:10}}>{quoteError}</div>}
        <RfqForm product={quoteProduct} onSave={saveRfq} onCancel={()=>setQuoteProduct(null)}/>
      </div>
    </div>}
  </div>;
}

```


===== FILE: src/marketplace/LegacyWorkspaceNotice.jsx =====

```jsx
import { COLOR, FONT_STACK, SPACE, TYPE, WEIGHT } from '../lib/tokens';

export function LegacyWorkspaceNotice() {
  return <aside aria-label="Legacy factory workspace" style={{background:COLOR.primaryBg,color:COLOR.text,fontFamily:FONT_STACK,fontSize:TYPE.body.size,lineHeight:TYPE.body.lineHeight,padding:SPACE.base,display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:SPACE.md}}>
    <div><strong style={{fontWeight:WEIGHT.bold}}>Legacy factory workspace</strong><div>Existing factory operations and stone records.</div></div>
    <a href="/" style={{color:COLOR.primaryMid,fontWeight:WEIGHT.medium,padding:SPACE.sm}}>Open Food &amp; Agri marketplace</a>
  </aside>;
}

```


===== FILE: src/marketplace/Login.jsx =====

```jsx
import { useState } from "react";
import { signInWithEmail, friendlyAuthError } from "../lib/auth";
import { C } from "../lib/domain";
import { Btn } from "../components/ui";
import { Icon } from "../components/Icon";
import { FONT_STACK, TYPE } from "../lib/tokens";
import { useBP } from "../hooks/useBP";

// Layout restored from main before 12 September 2026 (0a0afb2, 2 August).
// Keep marketplace authentication and Food & Agri copy independent of the legacy role router.
export function Login({onSignedIn}) {
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [showP,setShowP]=useState(false);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [focus,setFocus]=useState("");
  const {isDesktop}=useBP();

  async function submit(e) {
    e.preventDefault();
    const cleanEmail=email.trim().toLowerCase();
    if(!cleanEmail||!pass){setErr("Please enter email and password.");return;}
    setLoading(true);setErr("");
    try { await signInWithEmail(cleanEmail,pass);await onSignedIn(); }
    catch(e){setErr(friendlyAuthError(e,"login"));}
    finally{setLoading(false);}
  }

  const fieldStyle=name=>({
    width:"100%",padding:isDesktop?"15px 16px":"13px 14px",background:C.white,border:`1px solid ${C.border}`,
    borderRadius:6,color:C.text,fontSize:isDesktop?16:15,outline:"none",boxSizing:"border-box",fontFamily:FONT_STACK,
    boxShadow:focus===name?"0 0 0 3px rgba(0, 87, 168, 0.12)":"none"
  });
  const loginFields=(
    <form onSubmit={submit} aria-label="Sign in">
      <div style={{display:"flex",flexDirection:"column",gap:15,marginBottom:20}}>
        <div>
          <label htmlFor="epistable-login-email" style={{display:"block",fontSize:13,fontWeight:600,color:C.text,marginBottom:7}}>Email</label>
          <input id="epistable-login-email" aria-label="Email" required disabled={loading} type="email" value={email} onChange={e=>{setEmail(e.target.value);if(err)setErr("");}} onFocus={()=>setFocus("email")} onBlur={()=>setFocus("")} autoComplete="email" placeholder="you@example.com" style={fieldStyle("email")}/>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
            <label htmlFor="epistable-login-password" style={{fontSize:13,fontWeight:600,color:C.text}}>Password</label>
            <button type="button" onClick={()=>setShowP(p=>!p)} style={{background:"none",border:"none",padding:0,color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT_STACK}}>{showP?"Hide":"Show"}</button>
          </div>
          <input id="epistable-login-password" aria-label="Password" required disabled={loading} type={showP?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);if(err)setErr("");}} onFocus={()=>setFocus("password")} onBlur={()=>setFocus("")} autoComplete="current-password" placeholder="Enter password" style={fieldStyle("password")}/>
        </div>
      </div>
      <Btn full size="lg" disabled={loading} style={{borderRadius:6,padding:isDesktop?"15px 20px":"13px 20px",fontWeight:700,fontSize:isDesktop?15:14}}>{loading?"Signing in...":"Log In"}</Btn>
      <div style={{textAlign:"center",marginTop:16}}><a href="/forgot-password" style={{color:C.primary,fontSize:TYPE.label.size}}>Forgot password?</a></div>
    </form>
  );
  if(isDesktop)return (
    <div style={{minHeight:"100vh",background:C.bg,display:"grid",gridTemplateColumns:"minmax(360px,40%) minmax(0,1fr)",fontFamily:FONT_STACK,lineHeight:1.5}}>
      <div style={{background:`linear-gradient(160deg,${C.primary},${C.primaryD} 60%,#001f3d)`,padding:"0 56px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",minHeight:"100vh",boxSizing:"border-box",textAlign:"center"}}>
        <div style={{marginBottom:58,width:"100%",maxWidth:360}}>
          <div style={{fontSize:34,fontWeight:700,color:C.white,lineHeight:1.1,marginBottom:14}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:18,fontWeight:500,color:"rgba(255,255,255,0.95)",letterSpacing:"1px",fontFamily:FONT_STACK,marginBottom:18}}>Quality, quantified</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
            <div style={{height:1,width:30,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.85)"}}>Verified partners · Food & Agri trade</div>
          </div>
        </div>
        {["Verified seller profiles","Processed-food catalogue","Compliance evidence","Buyer discovery and RFQs","Seller quote responses","Epistable verification"].map(text=>(
          <div key={text} style={{display:"flex",alignItems:"center",gap:14,marginTop:17,width:"100%",maxWidth:290,textAlign:"left"}}>
            <div style={{width:36,height:36,borderRadius:9,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.82)",flexShrink:0}}><Icon name="check" size={16}/></div>
            <span style={{fontSize:14,color:"rgba(255,255,255,0.85)",fontWeight:400}}>{text}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"40px"}}>
        <div style={{width:"100%",maxWidth:460}}>
          <div style={{marginBottom:30,textAlign:"center"}}><div style={{fontSize:30,fontWeight:600,color:C.text,marginBottom:8}}>Welcome back</div><div style={{fontSize:15,color:C.textDim}}>Sign in with your assigned credentials</div></div>
          {err&&<div role="alert" style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:8,padding:"11px 14px",fontSize:13,color:C.red,marginBottom:16,fontWeight:500}}>{err}</div>}
          {loginFields}
          <div style={{marginTop:16,textAlign:"center",fontSize:12,color:C.textDim}}>Contact your administrator for credentials</div>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT_STACK,lineHeight:1.5,color:C.text,display:"flex",flexDirection:"column",boxSizing:"border-box"}}>
      <div style={{background:`linear-gradient(160deg,${C.primary},${C.primaryD} 62%,#001f3d)`,padding:"58px 24px 40px",color:C.white}}>
        <div style={{maxWidth:390,margin:"0 auto",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:700,lineHeight:1.15,marginBottom:14}}>Epistable <span style={{color:"#7ec8f0"}}>AI</span></div>
          <div style={{fontSize:15,fontWeight:500,color:"rgba(255,255,255,0.95)",letterSpacing:"1px",fontFamily:FONT_STACK,marginBottom:16}}>Quality, quantified</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
            <div style={{height:1,width:24,background:"rgba(255,255,255,0.25)",borderRadius:1}}/>
            <div style={{fontSize:12,lineHeight:1.65,color:"rgba(255,255,255,0.85)"}}>Verified partners · Food & Agri trade</div>
          </div>
        </div>
      </div>

      <div style={{width:"100%",maxWidth:390,margin:"0 auto",padding:"24px 20px 28px",boxSizing:"border-box",flex:1}}>
        <div style={{marginBottom:18,textAlign:"center"}}>
          <div style={{fontSize:24,fontWeight:600,color:C.text,marginBottom:5}}>Welcome back</div>
          <div style={{fontSize:14,color:C.textDim}}>Sign in with your assigned credentials</div>
        </div>
        <div style={{width:"100%",background:C.white,border:`1px solid ${C.border}`,borderRadius:8,boxShadow:"0 8px 24px rgba(26,37,51,0.08)",padding:22,boxSizing:"border-box"}}>
          {err&&<div role="alert" style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:6,padding:"13px 14px",fontSize:13,color:C.red,marginBottom:16,fontWeight:500}}>{err}</div>}
          {loginFields}
        </div>

        <div style={{width:"100%",marginTop:18,textAlign:"center"}}>
          <div style={{fontSize:12,color:C.textDim,marginBottom:18}}>Need access? Contact your administrator.</div>
          <div style={{fontSize:TYPE.caption.size,lineHeight:TYPE.caption.lineHeight,letterSpacing:TYPE.caption.letterSpacing,color:C.textDim}}>Built for cross-border Food & Agri trade</div>
        </div>
      </div>
    </div>
  );
}

```


===== FILE: src/marketplace/MarketplaceOnboarding.jsx =====

```jsx
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button, Field, Notice } from "./ui";

export function MarketplaceOnboarding() {
  const [values,setValues]=useState({type:"seller",name:"",organization_name:"",country:"",city:"",website:"",description:"",email:"",password:""});
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[submitted,setSubmitted]=useState(false);
  const change=key=>e=>setValues(v=>({...v,[key]:e.target.value}));
  async function submit(e){
    e.preventDefault();setBusy(true);setError("");
    try{
      const email=values.email.trim().toLowerCase();
      if(!email||values.password.length<8)throw new Error("Enter a valid email and a password of at least 8 characters.");
      if(!values.name.trim()||!values.organization_name.trim()||!values.country.trim())throw new Error("Name, organisation and country are required.");
      const {data,error:signupError}=await supabase.auth.signUp({
        email,
        password:values.password,
        options:{data:{
          marketplace_onboarding:"true",
          marketplace_type:values.type,
          name:values.name.trim(),
          organization_name:values.organization_name.trim(),
          country:values.country.trim(),
          city:values.city.trim(),
          website:values.website.trim(),
          description:values.description.trim()
        }}
      });
      if(signupError)throw signupError;
      setSubmitted(true);
      if(data.session)window.setTimeout(()=>window.location.assign("/"),700);
    }catch(err){setError(err.message||"Could not submit your Epistable application.");}
    finally{setBusy(false);}
  }
  if(submitted)return <div className="mp-login"><section className="mp-card" style={{maxWidth:680}}>
    <h1>Application submitted</h1>
    <p>Your organisation is now pending Epistable verification. If email confirmation is enabled, confirm your email first. Workspace access is granted automatically after the organisation is approved.</p>
    <div className="mp-actions"><Button onClick={()=>window.location.assign("/")}>Go to sign in</Button></div>
  </section></div>;

  return <div className="mp-login"><form className="mp-card mp-form" style={{maxWidth:760}} onSubmit={submit}>
    <fieldset disabled={busy}>
      <legend>Join Epistable</legend>
      <p>Create a Buyer or Seller organisation. Epistable verifies the organisation before marketplace access is activated.</p>
      <div className="mp-form-grid">
        <Field label="Account type" options={[{value:"seller",label:"Supplier / Seller"},{value:"buyer",label:"Buyer / Procurement"}]} value={values.type} onChange={change("type")}/>
        <Field label="Your name" required value={values.name} onChange={change("name")}/>
        <Field label="Organisation name" required value={values.organization_name} onChange={change("organization_name")}/>
        <Field label="Country" required value={values.country} onChange={change("country")}/>
        <Field label="City" value={values.city} onChange={change("city")}/>
        <Field label="Website" type="url" placeholder="https://…" value={values.website} onChange={change("website")}/>
        <Field label="Email" required type="email" autoComplete="email" value={values.email} onChange={change("email")}/>
        <Field label="Password" required type="password" minLength={8} autoComplete="new-password" value={values.password} onChange={change("password")}/>
      </div>
      <Field label="Organisation overview" multiline maxLength={2000} hint="Briefly describe what you manufacture, source or distribute." value={values.description} onChange={change("description")}/>
      {error&&<Notice error>{error}</Notice>}
      <div className="mp-actions"><Button type="submit" disabled={busy}>{busy?"Submitting…":"Submit for verification"}</Button><Button variant="secondary" onClick={()=>window.location.assign("/")}>Back to sign in</Button></div>
    </fieldset>
  </form></div>;
}

```


===== FILE: src/marketplace/Organisations.jsx =====

```jsx
import { useEffect, useState } from "react";
import { Button, Empty, Field, Heading, Notice, Status } from "./ui";

const blank={name:"",type:"seller",country:"",city:"",website:"",description:""};
export function OrganisationForm({initial=blank,onSave,onCancel}) {
  const [form,setForm]=useState({...blank,...initial});
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const change=key=>e=>setForm(f=>({...f,[key]:e.target.value}));
  async function submit(e){
    e.preventDefault();setError("");setBusy(true);
    try {
      const values=Object.fromEntries(Object.keys(blank).map(k=>[k,String(form[k]||"").trim()]));
      if(!values.name||!values.country)throw new Error("Organisation name and country are required.");
      if(values.website){const url=new URL(values.website);if(!["https:","http:"].includes(url.protocol))throw new Error("Use an http or https website address.");}
      await onSave(values);
    }catch(err){setError(err.message||"Could not save the organisation.");}
    finally{setBusy(false);}
  }
  return <form className="mp-card mp-form" onSubmit={submit} aria-label="Organisation details">
    <fieldset disabled={busy}><legend>Organisation details</legend>
      <div className="mp-form-grid">
        <Field label="Organisation name" required maxLength={200} value={form.name} onChange={change("name")}/>
        <Field label="Organisation type" options={[{value:"seller",label:"Seller organisation"},{value:"buyer",label:"Buyer organisation"}]} disabled={!!initial.id} value={form.type} onChange={change("type")}/>
        <Field label="Country" required maxLength={100} placeholder="e.g. India" value={form.country} onChange={change("country")}/>
        <Field label="City" maxLength={100} value={form.city} onChange={change("city")}/>
        <Field label="Website" type="url" placeholder="https://company.com" maxLength={500} value={form.website} onChange={change("website")}/>
      </div>
      <Field label="About your organisation" multiline maxLength={3000} value={form.description} onChange={change("description")} hint={form.type==="seller"?"Describe your food manufacturing or export business, processed-food categories, production capability, markets served and relevant food-safety certifications.":"Describe your sourcing business, markets served, processed-food categories purchased and key compliance requirements."}/>
      {initial.verification_status==="verified"&&<Notice>Saving profile changes returns this organisation to review. Its products will be hidden from buyers until the organisation is verified again.</Notice>}
      {error&&<Notice error>{error}</Notice>}
      <div className="mp-actions"><Button type="submit">{busy?"Saving…":"Save organisation"}</Button>{onCancel&&<Button variant="secondary" onClick={onCancel}>Cancel</Button>}</div>
    </fieldset>
  </form>;
}
export function Organisations({organizations,api,onSaved}) {
  const [creating,setCreating]=useState(false);
  async function save(values){await api.createOrganization(values);setCreating(false);await onSaved();}
  return <><Heading title="Trade organisations" description="Manage processed-food manufacturers, exporters, importers, distributors and institutional buyers participating in Epistable." action={!creating&&<Button icon="add" onClick={()=>setCreating(true)}>Add organisation</Button>}/>
    {creating?<OrganisationForm onSave={save} onCancel={()=>setCreating(false)}/>:!organizations.length?
      <Empty title="Start with your first organisation" icon="building">Add a seller or buyer, then assign an existing account from Team access.</Empty>:
      <div className="mp-grid">{organizations.map(o=><article key={o.id} className="mp-card"><div className="mp-row"><span className="mp-eyebrow">{o.type}</span><Status value={o.verification_status}/></div><h2>{o.name}</h2><p>{[o.city,o.country].filter(Boolean).join(", ")||"Location not provided"}</p><p>{o.description||"Profile details have not been added yet."}</p></article>)}</div>}
  </>;
}
export function OwnOrganisation({access,organizations,api,onSaved}) {
  const org=organizations.find(o=>o.id===access.org);
  const [saved,setSaved]=useState(false);
  if(!org)return <Empty title="Organisation unavailable" icon="building">Your organisation could not be loaded. Contact an Epistable administrator.</Empty>;
  const admin=access.role.endsWith("_admin");
  return <><Heading title="Company & trade profile" description={org.type==="seller"?"Present your food business, export capability and verification status to buyers.":"Keep your sourcing organisation and market details accurate for verified suppliers."}/>
    {saved&&<Notice>Organisation saved and submitted for review.</Notice>}
    {admin?<OrganisationForm key={org.id} initial={org} onSave={async values=>{await api.updateOrganization(org.id,{...values,verification_status:"pending"});setSaved(true);await onSaved();}}/>:
      <article className="mp-card"><Status value={org.verification_status}/><h2>{org.name}</h2><p>{org.country}</p><p>{org.description}</p><Notice>Your organisation administrator can update this profile.</Notice></article>}
  </>;
}
export function AccessManagement({organizations,api,onSaved}) {
  const [accounts,setAccounts]=useState(null),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [target,setTarget]=useState(""),[org,setOrg]=useState(""),[role,setRole]=useState("member"),[busy,setBusy]=useState(false);
  const selected=organizations.find(o=>o.id===org);
  async function load(){setError("");try{setAccounts(await api.accounts());}catch(e){setError(e.message);}}
  useEffect(()=>{let live=true;api.accounts().then(a=>{if(live)setAccounts(a);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[api]);
  async function submit(e){e.preventDefault();setBusy(true);setError("");setMessage("");try{
    if(!selected||!target)throw new Error("Choose an account and an organisation.");
    await api.assignAccess(target,org,selected.type+"_"+role);await load();await onSaved();
    setMessage("Marketplace access saved. The user can refresh their workspace to load the assignment.");
  }catch(e){setError(e.message||"Could not assign access.");}finally{setBusy(false);}}
  return <><Heading title="Team access" description="Assign an active existing account to a buyer or seller organisation."/>
    {error&&<Notice error>{error} <Button variant="secondary" onClick={load}>Retry</Button></Notice>}{message&&<Notice>{message}</Notice>}
    {!organizations.length?<Empty title="Add an organisation first" icon="building">Create a buyer or seller organisation before assigning access.</Empty>:
    <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy||!accounts}><legend>Assign organisation access</legend>
      <Field label="Account" required value={target} onChange={e=>{setTarget(e.target.value);setMessage("");}} options={[{value:"",label:"Choose an active account"},...(accounts||[]).filter(a=>a.status==="active"&&a.access_role!=="platform_admin").map(a=>({value:a.id,label:a.name+" · "+a.email}))]}/>
      <Field label="Organisation" required value={org} onChange={e=>setOrg(e.target.value)} options={[{value:"",label:"Choose an organisation"},...organizations.map(o=>({value:o.id,label:o.name+" · "+o.type}))]}/>
      <Field label="Access level" value={role} onChange={e=>setRole(e.target.value)} options={[{value:"member",label:"Team member"},{value:"admin",label:"Organisation administrator"}]}/>
      <p>Assigning a different organisation replaces this account’s previous marketplace assignment. Existing login credentials stay the same.</p>
      <Button type="submit">{busy?"Saving…":"Save access"}</Button>
    </fieldset></form>}
    <h2>Linked accounts</h2>{accounts?<div className="mp-list">{accounts.map(a=><article className="mp-card mp-row" key={a.id}><div><strong>{a.name}</strong><p>{a.email}</p><small>{organizations.find(o=>o.id===a.organization_id)?.name||"No organisation"}</small></div><div><Status value={a.status}/><p>{a.access_role?.replaceAll("_"," ")||"Not assigned"}</p></div></article>)}</div>:!error&&<p role="status">Loading accounts…</p>}
  </>;
}

```


===== FILE: src/marketplace/PasswordRecovery.jsx =====

```jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button, Field, Notice, theme } from './ui';
import './marketplace.css';

export function PasswordRecovery({ reset=false, auth=supabase.auth }) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
  useEffect(()=>{
    if(!reset)return;
    let active=true;
    auth.getUser().then(({data,error})=>{
      if(!active)return;
      if(error||!data.user)setError('This reset link is invalid or expired. Request a new link below.');
      else setReady(true);
    }).catch(()=>{if(active)setError('Could not verify your reset link. Request a new link below.');});
    return()=>{active=false;};
  },[auth,reset]);
  async function submit(e){
    e.preventDefault();setError('');
    if(reset&&password!==confirm){setError('Passwords do not match.');return;}
    setBusy(true);
    try{
      const result=reset?await auth.updateUser({password}):await auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:window.location.origin+'/reset-password'});
      if(result.error)throw result.error;
      setPassword('');setConfirm('');setDone(true);
    }catch(e){setError(e.message||'Unable to complete the request. Please try again.');}
    finally{setBusy(false);}
  }
  return <div className="mp-root" style={theme}><div className="mp-login"><section className="mp-card">
    <h1>{reset?'Choose a new password':'Reset your password'}</h1>
    {error&&<Notice error>{error}</Notice>}
    {done?<Notice>{reset?'Your password has been updated. You can open Epistable.':'If this email has an account, a password-reset link has been sent. Check your inbox and spam folder.'}</Notice>:
      reset&&!ready?<p>Open the latest password-reset email to continue.</p>:
      <form className="mp-form" onSubmit={submit}><fieldset disabled={busy}>
        <legend>{reset?'Set your Epistable password':'Receive a secure recovery link'}</legend>
        {reset?<><Field label="New password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} hint="Use at least 8 characters."/><Field label="Confirm password" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></>:
          <Field label="Email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/>}
        <Button type="submit">{busy?'Please wait…':reset?'Save new password':'Send reset link'}</Button>
      </fieldset></form>}
    {reset&&!done&&<p><a href="/forgot-password">Request a new reset link</a></p>}
    <p><a href="/">{reset&&done?'Open Epistable':'Back to Epistable'}</a></p>
  </section></div></div>;
}

```


===== FILE: src/marketplace/Shell.jsx =====

```jsx
import { useEffect, useRef, useState } from "react";
import { useBP } from "../hooks/useBP";
import { Icon } from "../components/Icon";
import { Button } from "./ui";

export const portals = {
  admin:{title:"Epistable Admin",nav:[["overview","Marketplace overview","chart"],["organizations","Trade organisations","building"],["access","Team access","users"],["products","Processed-food products","package"],["rfqs","Sourcing RFQs","mail"],["verification","Verification queue","verified"]]},
  seller:{title:"Processed Food Seller",nav:[["overview","Seller overview","chart"],["organization","Company & export profile","building"],["products","Processed-food catalogue","package"],["documents","Certifications & documents","file"],["rfqs","Buyer sourcing RFQs","mail"],["quotes","Supplier quotes","message"]]},
  buyer:{title:"Food Trade Buyer",nav:[["discover","Discover processed foods","search"],["suppliers","Verified food suppliers","building"],["organization","Buyer profile","user"],["rfqs","Sourcing RFQs","mail"],["quotes","Supplier quotes","message"]]},
};
export function portalFor(access) {
  if(access?.role==="platform_admin")return "admin";
  if(["seller_admin","seller_member"].includes(access?.role))return "seller";
  if(["buyer_admin","buyer_member"].includes(access?.role))return "buyer";
  return null;
}
export function pageFromHash(mode) {
  const [prefix,portal,page]=window.location.hash.split("/");
  return prefix==="#"&&portal===mode&&portals[mode].nav.some(n=>n[0]===page)?page:portals[mode].nav[0][0];
}
export function Shell({profile,mode,page,onNavigate,onLogout,signingOut,children}) {
  const {isMobile}=useBP();
  const [open,setOpen]=useState(false);
  const menu=useRef(null);
  useEffect(()=>{
    function escape(e){if(e.key==="Escape"){setOpen(false);menu.current?.focus();}}
    window.addEventListener("keydown",escape);
    return ()=>window.removeEventListener("keydown",escape);
  },[]);
  const config=portals[mode];
  function navigate(id){onNavigate(id);setOpen(false);requestAnimationFrame(()=>document.getElementById("marketplace-title")?.focus());}
  return <div className={"mp-shell"+(isMobile?" mp-mobile":"")}>
    <a href="#marketplace-content" className="mp-skip" onClick={e=>{e.preventDefault();document.getElementById("marketplace-content")?.focus();}}>Skip to content</a>
    <header className="mp-header">
      <div className="mp-brand"><Icon name="verified" size={24}/><strong>Epistable</strong><span>{config.title}</span></div>
      <div className="mp-header-right"><span className="mp-account" title={profile.email}>{profile.name==="Epistable Owner"&&mode==="admin"?"Epistable Admin":profile.name||profile.email}</span>
        <Button variant="secondary" disabled={signingOut} onClick={onLogout}>{signingOut?"Logging out…":"Log out"}</Button>
        {isMobile&&<button type="button" className="mp-button mp-button-secondary" ref={menu} aria-expanded={open} aria-controls="marketplace-nav" onClick={()=>setOpen(!open)}><Icon name={open?"close":"list"}/>{open?"Close menu":"Menu"}</button>}
      </div>
    </header>
    {(!isMobile||open)&&<aside className="mp-sidebar"><p className="mp-eyebrow">{config.title}</p><nav id="marketplace-nav" aria-label={config.title}>
      {config.nav.map(([id,label,icon])=><a key={id} href={"#/"+mode+"/"+id} aria-current={id===page?"page":undefined} onClick={e=>{e.preventDefault();navigate(id);}}><Icon name={icon}/>{label}</a>)}
    </nav><div className="mp-nav-logout"><Button variant="secondary" aria-label="Log out from navigation" disabled={signingOut} onClick={onLogout}>{signingOut?"Logging out…":"Log out"}</Button></div><div className="mp-sidebar-note"><Icon name="verified"/><p>Processed Foods<br/><small>Verified cross-border trade</small></p></div></aside>}
    <main id="marketplace-content" tabIndex={-1} className="mp-content">{children}</main>
  </div>;
}

```


===== FILE: src/marketplace/TradeForms.jsx =====

```jsx
import { useEffect, useState } from 'react';
import { FOOD_CATEGORIES, FOOD_CERTIFICATIONS, TRADE_DOCUMENT_TYPES, productRequiresReview } from '../lib/marketplace';
import { Button, Field, Notice } from './ui';
import { days, futureDate, INCOTERMS, list, positive, quoteTotal, UNITS } from './validation';

function useForm(initial) {
  const [values,setValues]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const change=key=>e=>setValues(v=>({...v,[key]:e.target.value}));
  const run=action=>async e=>{e.preventDefault();setBusy(true);setError('');try{await action(e);}catch(err){setError(err.message||'Could not save. Please try again.');}finally{setBusy(false);}};
  return {values,change,busy,error,run};
}
function Actions({busy,onCancel,draft,label}) {
  return <div className="mp-actions">{draft&&<Button type="submit" name="intent" value="draft" formNoValidate variant="secondary">Save draft</Button>}<Button type="submit" name="intent" value="submit">{busy?'Saving…':label}</Button><Button variant="secondary" onClick={onCancel}>Cancel</Button></div>;
}

const productBlank={name:'',category:FOOD_CATEGORIES[0],description:'',ingredients:'',country_of_origin:'',moq:'',moq_unit:'kg',capacity:'',capacity_unit:'kg',packaging:'',shelf_life:'',storage_requirements:'',lead_time_days:'',export_markets:'',certifications:'',allergens:'',dietary_attributes:''};
const arrayFields=['packaging','export_markets','certifications','allergens','dietary_attributes'];
export function ProductForm({initial,onSave,onCancel}) {
  const start={...productBlank,...initial};for(const key of arrayFields)if(Array.isArray(start[key]))start[key]=start[key].join(', ');
  const {values:v,change,busy,error,run}=useForm(start);
  const originalImages=Array.isArray(initial?.image_urls)?initial.image_urls:[];
  const [existingImages,setExistingImages]=useState(originalImages);
  const [newImages,setNewImages]=useState([]);
  const [imageError,setImageError]=useState('');
  useEffect(()=>()=>newImages.forEach(item=>item.preview&&URL.revokeObjectURL?.(item.preview)),[newImages]);
  const risk=productRequiresReview({...v,certifications:list(v.certifications),dietary_attributes:list(v.dietary_attributes)});
  const totalImages=existingImages.length+newImages.length;

  function addImages(e) {
    const files=[...(e.target.files||[])];setImageError('');
    if(totalImages+files.length>6){setImageError('Add up to 6 product images.');e.target.value='';return;}
    const invalid=files.find(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024);
    if(invalid){setImageError('Use JPG, PNG or WebP images up to 5 MB each.');e.target.value='';return;}
    setNewImages(items=>[...items,...files.map(file=>({file,preview:URL.createObjectURL?.(file)||file.name}))]);e.target.value='';
  }
  function removeNew(index){setNewImages(items=>{if(items[index].preview)URL.revokeObjectURL?.(items[index].preview);return items.filter((_,i)=>i!==index);});}
  const submit=run(async e=>{
    const publish=e.nativeEvent.submitter?.value!=='draft';
    const data=Object.fromEntries(Object.keys(productBlank).map(k=>[k,String(v[k]??'').trim()]));
    if(!data.name||!data.category)throw new Error('Product name and category are required.');
    for(const key of arrayFields)data[key]=list(v[key]);
    data.moq=v.moq?positive(v.moq,'Minimum order'):null;data.capacity=v.capacity?positive(v.capacity,'Capacity'):null;data.lead_time_days=days(v.lead_time_days);
    if(publish&&(!data.country_of_origin||!data.moq||!data.packaging.length||!data.shelf_life||!data.storage_requirements))throw new Error('Complete origin, minimum order, packaging, shelf life and storage before publishing.');
    if(publish&&totalImages===0)throw new Error('Add at least one product image before publishing.');
    const requiresReview=publish&&productRequiresReview(data);
    await onSave({
      ...data,
      status:publish&&!requiresReview?'active':'draft',
      verification_status:requiresReview?'pending':'unverified',
      risk_status:requiresReview?'review_required':'clear',
      risk_reason:requiresReview?'Health or regulated claim requires manual review before publication':null,
      __existingImages:existingImages,
      __newImages:newImages.map(item=>item.file),
      __removedImages:originalImages.filter(url=>!existingImages.includes(url))
    });
  });
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>{initial?'Edit processed-food product':'Create processed-food product'}</legend>
    <Notice>Product details are seller provided. Verified seller status and verified certification documents are shown separately to buyers.</Notice>
    {risk&&<Notice>One or more health or regulated claims need Epistable review before this listing can go live. You can still save a draft and submit it for review.</Notice>}
    <div className="mp-product-images">
      <div className="mp-row"><div><strong>Product images</strong><p>Add up to 6 clear product or packaging images. The first image is used as the cover.</p></div><small>{totalImages}/6 images</small></div>
      <input aria-label="Product images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImages}/>
      {(existingImages.length>0||newImages.length>0)&&<div className="mp-image-grid">
        {existingImages.map((url,index)=><figure className="mp-image-item" key={url}><img src={url} alt={`${v.name||'Product'} image ${index+1}`}/><figcaption>{index===0?'Cover image':'Product image'} <button type="button" onClick={()=>setExistingImages(images=>images.filter(item=>item!==url))}>Remove</button></figcaption></figure>)}
        {newImages.map((item,index)=><figure className="mp-image-item" key={item.preview}><img src={item.preview} alt={item.file.name}/><figcaption>{existingImages.length===0&&index===0?'Cover image':'New image'} <button type="button" onClick={()=>removeNew(index)}>Remove</button></figcaption></figure>)}
      </div>}
      {imageError&&<Notice error>{imageError}</Notice>}
    </div>
    <div className="mp-form-grid"><Field label="Product name" required maxLength={200} placeholder="e.g. Ground turmeric powder" value={v.name} onChange={change('name')}/><Field label="Processed-food category" options={[...new Set([...FOOD_CATEGORIES,v.category])]} value={v.category} onChange={change('category')}/><Field label="Country of origin" required value={v.country_of_origin} onChange={change('country_of_origin')}/><Field label="Minimum order quantity (MOQ)" type="number" min="0.000001" step="any" required value={v.moq??''} onChange={change('moq')}/><Field label="MOQ unit" options={UNITS} value={v.moq_unit} onChange={change('moq_unit')}/><Field label="Monthly supply capacity" type="number" min="0.000001" step="any" value={v.capacity??''} onChange={change('capacity')}/><Field label="Capacity unit" options={UNITS} value={v.capacity_unit} onChange={change('capacity_unit')}/><Field label="Production / dispatch lead time (days)" type="number" min="0" max="3650" step="1" value={v.lead_time_days??''} onChange={change('lead_time_days')}/><Field label="Packaging formats" required hint="Separate formats with commas, e.g. 500 g pouch, 5 kg food-service pack, 25 kg export carton." value={v.packaging} onChange={change('packaging')}/><Field label="Shelf life" required placeholder="e.g. 18 months from manufacture" value={v.shelf_life} onChange={change('shelf_life')}/></div>
    <Field label="Storage requirements" required placeholder="e.g. Store below 25°C in a cool, dry place" value={v.storage_requirements} onChange={change('storage_requirements')}/><Field label="Product description" multiline maxLength={5000} hint="Include format, processing method, grade, intended use and private-label capability where relevant." value={v.description} onChange={change('description')}/><Field label="Ingredients / composition" multiline hint="List ingredients in descending order and note additives or preservatives where applicable." value={v.ingredients} onChange={change('ingredients')}/>
    <div className="mp-form-grid"><Field label="Allergens" hint="Comma-separated. Examples: milk, soy, peanuts, tree nuts, gluten, sesame. Use 'None declared' only when supported." value={v.allergens} onChange={change('allergens')}/><Field label="Dietary / product attributes" hint="Examples: vegan, vegetarian, gluten-free, non-GMO, no added sugar." value={v.dietary_attributes} onChange={change('dietary_attributes')}/><Field label="Food safety & market certifications" hint={'Comma-separated. Claims are seller provided until supporting evidence is verified. Common examples: '+FOOD_CERTIFICATIONS.join(', ')+'.'} value={v.certifications} onChange={change('certifications')}/><Field label="Current / target export markets" hint="Comma-separated countries or regions where the product is already sold or prepared for export." value={v.export_markets} onChange={change('export_markets')}/></div>
    {error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} draft label={risk?'Send for review':'Publish product'}/>
  </fieldset></form>;
}
export function RfqForm({product,initial,onSave,onCancel}) {
  const {values:v,change,busy,error,run}=useForm({product_category:product?.category||FOOD_CATEGORIES[0],quantity:'',quantity_unit:product?.moq_unit||'kg',destination_country:'',destination_city:'',requirements:'',...initial,required_by:initial?.required_by?new Date(initial.required_by).toISOString().slice(0,10):''});
  const submit=run(async e=>{
    const open=e.nativeEvent.submitter?.value!=='draft';
    const quantity=v.quantity?positive(v.quantity,'Quantity'):null;
    if(open&&(!quantity||!v.destination_country.trim()))throw new Error('Quantity and destination country are required.');
    await onSave({product_id:product?.id||initial?.product_id||null,seller_org_id:product?.seller_org_id||initial?.seller_org_id||null,product_category:v.product_category,quantity,quantity_unit:v.quantity_unit,destination_country:v.destination_country.trim(),destination_city:v.destination_city.trim(),required_by:v.required_by?futureDate(v.required_by,'Required date'):null,requirements:v.requirements.trim(),status:open?'open':'draft'});
  });
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>{product?'Request a quote for '+product.name:'Create a processed-food sourcing RFQ'}</legend><p>{product?'This request goes to the verified supplier for this product.':'Open requests are visible to participating food suppliers. Include enough technical and commercial detail to receive comparable quotes.'}</p><div className="mp-form-grid"><Field label="Processed-food category" options={[...new Set([...FOOD_CATEGORIES,v.product_category])]} value={v.product_category} onChange={change('product_category')}/><Field label="Required quantity" type="number" min="0.000001" step="any" required value={v.quantity??''} onChange={change('quantity')}/><Field label="Quantity unit" options={[...new Set([...UNITS,v.quantity_unit])]} value={v.quantity_unit} onChange={change('quantity_unit')}/><Field label="Destination country" required value={v.destination_country} onChange={change('destination_country')}/><Field label="Destination city / port" value={v.destination_city} onChange={change('destination_city')}/><Field label="Required by" type="date" value={v.required_by} onChange={change('required_by')}/></div><Field label="Product, compliance & commercial requirements" multiline maxLength={5000} hint="Specify formulation or grade, pack size, private label, shelf life, allergen limits, certifications, test reports, labelling, Incoterm and any market-specific requirements." value={v.requirements} onChange={change('requirements')}/>{error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} draft label="Send RFQ"/></fieldset></form>;
}
export function QuoteForm({rfq,initial,onSave,onCancel}) {
  const {values:v,change,busy,error,run}=useForm({currency:'USD',unit_price:'',quantity:String(rfq.quantity||''),quantity_unit:rfq.quantity_unit||'kg',incoterm:'FOB',lead_time_days:'',notes:'',...initial,validity_ts:initial?.validity_ts?new Date(initial.validity_ts).toISOString().slice(0,10):''});
  let total='—';try{total=quoteTotal(v.unit_price,v.quantity);}catch{}
  const submit=run(async e=>{
    const sent=e.nativeEvent.submitter?.value!=='draft';
    const price=v.unit_price?positive(v.unit_price,'Unit price'):null,quantity=v.quantity?positive(v.quantity,'Quantity'):null;
    if(sent&&(!price||!quantity||!v.validity_ts))throw new Error('Price, quantity and validity date are required.');
    if(!/^[A-Z]{3}$/.test(v.currency))throw new Error('Enter a three-letter currency code.');
    await onSave({rfq_id:rfq.id,currency:v.currency,unit_price:price,quantity,quantity_unit:v.quantity_unit,total_amount:price&&quantity?quoteTotal(price,quantity):null,incoterm:v.incoterm,lead_time_days:days(v.lead_time_days),validity_ts:v.validity_ts?futureDate(v.validity_ts,'Quote validity'):null,notes:v.notes.trim(),status:sent?'sent':'draft'});
  });
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>Supplier quote response</legend><p>{rfq.products?.name||rfq.product_category} · {rfq.quantity} {rfq.quantity_unit} to {rfq.destination_country}</p><div className="mp-form-grid"><Field label="Currency" required maxLength={3} pattern="[A-Z]{3}" value={v.currency} onChange={change('currency')}/><Field label="Unit price" type="number" min="0.000001" step="any" required value={v.unit_price??''} onChange={change('unit_price')}/><Field label="Quoted quantity" type="number" min="0.000001" step="any" required value={v.quantity??''} onChange={change('quantity')}/><Field label="Quoted unit" options={[...new Set([...UNITS,v.quantity_unit])]} value={v.quantity_unit} onChange={change('quantity_unit')}/><Field label="Incoterm" options={INCOTERMS} value={v.incoterm} onChange={change('incoterm')}/><Field label="Production / dispatch lead time (days)" type="number" min="0" max="3650" value={v.lead_time_days??''} onChange={change('lead_time_days')}/><Field label="Valid through" type="date" required value={v.validity_ts} onChange={change('validity_ts')}/></div><p><strong>Total: {v.currency} {total}</strong></p><Field label="Commercial terms & food-trade notes" multiline maxLength={5000} hint="Include named Incoterm place or port, pack format, minimum production run, payment terms, inspection/testing conditions and any certification assumptions." value={v.notes} onChange={change('notes')}/>{error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} draft label="Send quote"/></fieldset></form>;
}
export function DocumentForm({products,initial,onSave,onCancel}) {
  const [file,setFile]=useState(null);
  const {values:v,change,busy,error,run}=useForm({title:'',document_type:'certificate_of_analysis',product_id:'',issuer:'',reference_number:'',file_url:'',visibility:'private',...initial,issued_at:initial?.issued_at?new Date(initial.issued_at).toISOString().slice(0,10):'',expires_at:initial?.expires_at?new Date(initial.expires_at).toISOString().slice(0,10):''});
  const submit=run(async()=>{
    let url=null;
    if(v.file_url?.trim()){url=new URL(v.file_url.trim());if(url.protocol!=='https:')throw new Error('Use an HTTPS evidence source.');}
    if(!file&&!initial?.storage_path&&!url)throw new Error('Upload a certificate/evidence file or provide an HTTPS source.');
    const issued=v.issued_at?Date.parse(v.issued_at+'T00:00:00Z'):null,expires=v.expires_at?futureDate(v.expires_at,'Document expiry'):null;
    if(issued&&expires&&expires<=issued)throw new Error('Expiry must follow issue date.');
    await onSave({document_type:v.document_type,issuer:v.issuer.trim(),reference_number:v.reference_number.trim(),visibility:v.visibility,title:v.title.trim(),product_id:v.product_id||null,issued_at:issued,expires_at:expires,file_url:url?.href||null,verification_status:'pending',__file:file});
  });
  const fileHint=initial?.storage_path?'Current file: '+(initial.file_name||'uploaded evidence')+'. Choose a file only to replace it.':'PDF, JPG, PNG or WebP up to 10 MB.';
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>Add certification or trade evidence</legend><p>Upload or link evidence that helps buyers assess food safety, product quality and export readiness.</p><Field label="Document title" required placeholder="e.g. FSSC 22000 Certificate - 2026" value={v.title} onChange={change('title')}/><div className="mp-form-grid"><Field label="Evidence type" options={TRADE_DOCUMENT_TYPES} value={v.document_type} onChange={change('document_type')}/><Field label="Related processed-food product" options={[{value:'',label:'Organisation-level evidence'},...products.map(p=>({value:p.id,label:p.name}))]} value={v.product_id} onChange={change('product_id')}/><Field label="Issuing body / laboratory" value={v.issuer} onChange={change('issuer')}/><Field label="Certificate / report reference" value={v.reference_number} onChange={change('reference_number')}/><Field label="Issue date" type="date" value={v.issued_at} onChange={change('issued_at')}/><Field label="Expiry date" type="date" value={v.expires_at} onChange={change('expires_at')}/></div><Field label={initial?.storage_path?"Replace uploaded evidence (optional)":"Evidence file"} type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} hint={fileHint}/><Field label="External evidence source (optional)" type="url" placeholder="https://…" value={v.file_url||''} onChange={change('file_url')} hint="Use this only when the evidence is hosted by the certification body, laboratory or another trusted source."/><Field label="Buyer visibility" options={[{value:'private',label:'Your organisation and Epistable only'},{value:'buyers',label:'Verified buyers after Epistable verification'},{value:'public',label:'Visible in signed-in buyer discovery after verification'}]} value={v.visibility} onChange={change('visibility')}/>{error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} label="Submit evidence for verification"/></fieldset></form>;
}

export function OrderStatusForm({order,onSave,onCancel}) {
  const {values:v,change,busy,error,run}=useForm({status:order.status||'confirmed',note:order.status_note||''});
  const submit=run(async()=>onSave({status:v.status,note:v.note.trim()}));
  const options=[
    {value:'confirmed',label:'Confirmed'},
    {value:'production',label:'In production'},
    {value:'inspection',label:'Inspection / quality checks'},
    {value:'ready_to_dispatch',label:'Ready to dispatch'},
    {value:'dispatched',label:'Dispatched'},
    {value:'delivered',label:'Delivered'},
    {value:'completed',label:'Completed'},
    {value:'cancelled',label:'Cancelled'}
  ];
  return <form className="mp-card mp-form" onSubmit={submit}><fieldset disabled={busy}><legend>Update order status</legend><p>{order.id} · {order.quantity} {order.quantity_unit} · {order.currency} {order.total_amount}</p><Field label="Order status" options={options} value={v.status} onChange={change('status')}/><Field label="Status note" multiline maxLength={4000} value={v.note} onChange={change('note')} hint="Optional operational note visible to the trading parties." />{error&&<Notice error>{error}</Notice>}<Actions busy={busy} onCancel={onCancel} label="Update order"/></fieldset></form>;
}

```


===== FILE: src/marketplace/Workflows.jsx =====

```jsx
import { useState } from 'react';
import { FOOD_CATEGORIES } from '../lib/marketplace';
import { Button, Empty, Field, Heading, Notice, Status } from './ui';
import { DocumentForm, OrderStatusForm, ProductForm, QuoteForm, RfqForm } from './TradeForms';

const labels={description:'Product description',ingredients:'Ingredients / composition',country_of_origin:'Country of origin',moq:'Minimum order quantity',moq_unit:'MOQ unit',capacity:'Monthly supply capacity',capacity_unit:'Capacity unit',packaging:'Packaging formats',shelf_life:'Shelf life',storage_requirements:'Storage requirements',lead_time_days:'Production / dispatch lead time (days)',export_markets:'Export markets',certifications:'Food safety & market certifications',allergens:'Allergens',dietary_attributes:'Dietary / product attributes',country:'Country',city:'City',issuer:'Issuing body / laboratory',reference_number:'Certificate / report reference',requirements:'Product, compliance & commercial requirements',destination_country:'Destination country',destination_city:'Destination city / port',quantity:'Quantity',quantity_unit:'Unit',currency:'Currency',unit_price:'Unit price',total_amount:'Total',incoterm:'Incoterm',notes:'Commercial terms',review_note:'Review reason'};
export function Details({record}) {
  return <dl className="mp-details">{Object.entries(labels).filter(([key])=>record[key]!=null&&record[key]!==''&&(!Array.isArray(record[key])||record[key].length)).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{Array.isArray(record[key])?record[key].join(', '):String(record[key])}</dd></div>)}{[['required_by','Required by'],['validity_ts','Valid through'],['issued_at','Issued'],['expires_at','Expires']].filter(([key])=>record[key]).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{new Date(record[key]).toLocaleDateString(undefined,{timeZone:'UTC'})}</dd></div>)}</dl>;
}
function Source({record,api}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  if(!record.storage_path&&!record.file_url?.startsWith('https://'))return null;
  if(!record.storage_path)return <p><a href={record.file_url} target="_blank" rel="noopener noreferrer">Open evidence source</a></p>;
  async function openEvidence(){
    setBusy(true);setError('');
    try{const url=await api.evidenceUrl(record);window.open(url,'_blank','noopener,noreferrer');}
    catch(e){setError(e.message||'Could not open evidence.');}
    finally{setBusy(false);}
  }
  return <p><Button variant="secondary" onClick={openEvidence} disabled={busy}>{busy?'Opening…':'Open evidence file'}</Button>{error&&<small className="mp-error">{error}</small>}</p>;
}
export function Verification({data,api,onSaved}) {
  const [selected,setSelected]=useState(null),[reason,setReason]=useState(''),[decision,setDecision]=useState('verified'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const queue=[...data.organizations.filter(o=>['pending','unverified'].includes(o.verification_status)).map(o=>({kind:'organization',record:o})),...data.products.filter(p=>p.verification_status==='pending').map(p=>({kind:'product',record:p})),...data.documents.filter(d=>d.verification_status==='pending').map(d=>({kind:'document',record:d}))];
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{await api.review(selected.kind,selected.record.id,decision,reason.trim());setSelected(null);await onSaved();}catch(e){setError(e.message||'Could not save review.');}finally{setBusy(false);}}
  const supporting=selected?data.documents.filter(d=>selected.kind==='product'?d.product_id===selected.record.id:selected.kind==='organization'?d.organization_id===selected.record.id:false):[];
  return <><Heading title="Epistable verification" description="Verify organisations and supporting evidence. Products enter this queue only when a higher-risk claim requires manual review."/>{selected?<><article className="mp-card"><p className="mp-eyebrow">{selected.kind}</p><h2>{selected.record.name||selected.record.title}</h2><Details record={selected.record}/><Source record={selected.record} api={api}/>{supporting.length>0&&<><h2>Supporting evidence</h2>{supporting.map(d=><div key={d.id}><strong>{d.title}</strong> <Status value={d.verification_status}/><Source record={d} api={api}/><Details record={d}/></div>)}</>}</article><form onSubmit={submit} className="mp-card mp-form"><fieldset disabled={busy}><legend>Record decision</legend><Field label="Decision" options={[{value:'verified',label:'Approve verification'},{value:'rejected',label:'Reject and request changes'}]} value={decision} onChange={e=>setDecision(e.target.value)}/><Field label="Review reason" multiline required maxLength={4000} value={reason} onChange={e=>setReason(e.target.value)} hint="Record what you checked and any required corrections. This decision is kept in review history."/>{error&&<Notice error>{error}</Notice>}<div className="mp-actions"><Button type="submit">{busy?'Saving…':'Save decision'}</Button><Button variant="secondary" onClick={()=>setSelected(null)}>Cancel</Button></div></fieldset></form></>:!queue.length?<Empty title="No reviews waiting" icon="verified">New organisation profiles, higher-risk product claims and submitted evidence will appear here.</Empty>:<div className="mp-grid">{queue.map(({kind,record})=><article className="mp-card" key={kind+record.id}><div className="mp-row"><span className="mp-eyebrow">{kind}</span><Status value={record.verification_status}/></div><h2>{record.name||record.title}</h2><p>{record.country||record.country_of_origin||record.issuer}</p><Button onClick={()=>{setSelected({kind,record});setReason('');setDecision('verified');setError('');}}>Review</Button></article>)}</div>}<h2>Review history</h2>{!data.reviews.length?<p>No decisions recorded yet.</p>:<div className="mp-list">{data.reviews.map(r=><article key={r.id} className="mp-card"><div className="mp-row"><strong>{r.snapshot?.name||r.snapshot?.title||r.target_id}</strong><Status value={r.decision}/></div><p>{r.reason||'Submitted or updated by the organisation.'}</p><small>{new Date(r.created_at).toLocaleString()} · {r.target_kind}</small></article>)}</div>}</>;
}
export function Workflows({page,mode,access,data,api,onSaved}) {
  const [selected,setSelected]=useState(null),[search,setSearch]=useState(''),[category,setCategory]=useState('');
  const names={products:'Processed-food catalogue',discover:'Discover processed foods',rfqs:mode==='seller'?'Buyer sourcing RFQs':'Your sourcing RFQs',quotes:mode==='buyer'?'Supplier quotes':'Your supplier quotes',documents:'Certifications & documents',suppliers:'Verified food suppliers'};
  const title=names[page];
  function open(type,record,extra={}){setSelected({type,record,id:crypto.randomUUID(),...extra});}
  async function saved(){setSelected(null);await onSaved();}
  if(selected?.type==='product')return <><Heading title={selected.record?'Edit product':'Add a product'} description="Verified sellers can publish complete product listings immediately. Only higher-risk claims are held for Epistable review."/><ProductForm initial={selected.record} onCancel={()=>setSelected(null)} onSave={async values=>{
    const {__existingImages=[],__newImages=[],__removedImages=[],...productValues}=values;
    const productId=selected.record?.id||'PRD_'+selected.id;
    let uploaded=[];
    try {
      if(!selected.record)await api.createProduct({...productValues,id:productId,seller_org_id:access.org,status:'draft',verification_status:productValues.verification_status==='pending'?'pending':'unverified',image_urls:[],cover_image_url:null});
      if(__newImages.length)uploaded=await api.uploadProductImages(access.org,productId,__newImages);
      const image_urls=[...__existingImages,...uploaded].slice(0,6);
      await api.updateProduct(productId,{...productValues,image_urls,cover_image_url:image_urls[0]||null});
      if(__removedImages.length)await api.removeProductImages(__removedImages);
      await saved();
    } catch(error) {
      if(uploaded.length)try{await api.removeProductImages(uploaded);}catch{}
      throw error;
    }
  }}/></>;
  if(selected?.type==='rfq')return <><Heading title="Processed-food sourcing request"/><RfqForm product={selected.product} initial={selected.record} onCancel={()=>setSelected(null)} onSave={async values=>{if(selected.record)await api.updateRfq(selected.record.id,values);else await api.createRfq({...values,id:'RFQ_'+selected.id,buyer_org_id:access.org});await saved();}}/></>;
  if(selected?.type==='quote')return <><Heading title={selected.revision?"Revise supplier quote":"Respond to buyer RFQ"}/><QuoteForm rfq={selected.rfq} initial={selected.record} onCancel={()=>setSelected(null)} onSave={async values=>{if(selected.revision)await api.reviseQuote(selected.record.id,values);else if(selected.record)await api.updateQuote(selected.record.id,values);else await api.createQuote({...values,id:'TQ_'+selected.id,seller_org_id:access.org});await saved();}}/></>;
  if(selected?.type==='order')return <><Heading title="Update trade order"/><OrderStatusForm order={selected.order} onCancel={()=>setSelected(null)} onSave={async values=>{await api.updateOrderStatus(selected.order.id,values.status,values.note);await saved();}}/></>;
  if(selected?.type==='document')return <><Heading title="Add certification or trade evidence"/><DocumentForm initial={selected.record} products={data.products} onCancel={()=>setSelected(null)} onSave={async values=>{
    const {__file,...documentValues}=values;
    const documentId=selected.record?.id||'DOC_'+selected.id;
    let uploaded=null;
    try{
      if(__file)uploaded=await api.uploadTradeEvidence(access.org,documentId,__file);
      const payload={...documentValues,...(uploaded||{})};
      if(selected.record)await api.updateDocument(documentId,payload);
      else await api.addDocument({...payload,id:documentId,organization_id:access.org});
      if(uploaded&&selected.record?.storage_path&&selected.record.storage_path!==uploaded.storage_path)try{await api.removeTradeEvidence(selected.record.storage_path);}catch{}
      await saved();
    }catch(error){
      if(uploaded?.storage_path)try{await api.removeTradeEvidence(uploaded.storage_path);}catch{}
      throw error;
    }
  }}/></>;
  if(selected?.type==='detail'){
    const isProduct=page==='discover'||page==='products';
    if(mode==='buyer'&&page==='discover')return <><Heading title={selected.record.name||selected.record.title||selected.record.products?.name||selected.record.id} action={<Button variant="secondary" onClick={()=>setSelected(null)}>Back to {title.toLowerCase()}</Button>}/><article className="mp-card"><Status value={selected.record.organizations?.verification_status==='verified'?'verified':selected.record.status}/><Details record={selected.record}/><Source record={selected.record} api={api}/><Button onClick={()=>open('rfq',null,{product:selected.record})}>Request a quote</Button></article></>;
    const verifiedEvidence=isProduct?data.documents.filter(d=>d.product_id===selected.record.id&&d.verification_status==='verified'):[];
    return <><Heading title={selected.record.name||selected.record.title||selected.record.products?.name||selected.record.id} action={<Button variant="secondary" onClick={()=>setSelected(null)}>Back to {title.toLowerCase()}</Button>}/><article className="mp-card">
      {isProduct&&Array.isArray(selected.record.image_urls)&&selected.record.image_urls.length>0&&<div className="mp-detail-images">{selected.record.image_urls.map((url,index)=><img key={url} src={url} alt={(selected.record.name||'Product')+' image '+(index+1)}/>)}</div>}
      {isProduct?<><div className="mp-row"><Status value={selected.record.risk_status==='review_required'?'pending':selected.record.status}/>{selected.record.organizations?.verification_status==='verified'&&<span><Status value="verified"/> <small>seller</small></span>}</div><Notice>Product specifications and certification claims are provided by the seller. Epistable verification applies only where a verified seller or verified document badge is shown.</Notice></>:<Status value={selected.record.verification_status||selected.record.status}/>}
      <Details record={selected.record}/><Source record={selected.record} api={api}/>
      {isProduct&&<><h2>Verified evidence</h2>{verifiedEvidence.length?<div className="mp-list">{verifiedEvidence.map(d=><div key={d.id} className="mp-row"><span>{d.title}</span><Status value="verified"/></div>)}</div>:<p>No product-specific documents have been verified yet.</p>}</>}
      {page==='discover'&&<Button onClick={()=>open('rfq',null,{product:selected.record})}>Request a quote</Button>}
    </article></>;
  }
  const products=page==='products'||page==='discover';
  const items=products?data.products:page==='suppliers'?data.organizations.filter(o=>o.type==='seller'):data[page]||[];
  const visible=items.filter(item=>(!category||item.category===category)&&[item.name,item.title,item.id,item.category,item.country_of_origin,item.country,item.product_category,item.destination_country].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase()));
  const action=page==='products'&&mode==='seller'?<Button icon="add" onClick={()=>open('product')}>Add product</Button>:page==='rfqs'&&mode==='buyer'?<Button icon="add" onClick={()=>open('rfq')}>Create RFQ</Button>:page==='documents'&&mode==='seller'?<Button icon="add" onClick={()=>open('document')}>Add evidence</Button>:null;
  return <><Heading title={title} description={page==='discover'?'Source processed-food products from verified suppliers and review product, packaging, shelf-life and certification details.':page==='products'?'Publish complete processed-food listings with images, ingredients, packaging, shelf life, allergens, export markets and certification claims.':page==='documents'?'Submit food-safety certificates, COAs, lab reports, product specifications and export evidence for verification.':page==='suppliers'?'Browse seller organisations participating in verified cross-border food trade.':page==='rfqs'?'Manage sourcing requests with quantity, destination, compliance, packaging and delivery requirements.':page==='quotes'?'Review commercial terms, Incoterms, quantities and lead times shared between buyers and food suppliers.':undefined} action={action}/><div className="mp-form-grid"><Field label={'Search '+title.toLowerCase()} type="search" value={search} onChange={e=>setSearch(e.target.value)}/>{products&&<Field label="Category filter" options={[{value:'',label:'All categories'},...new Set([...FOOD_CATEGORIES,...items.map(p=>p.category)])]} value={category} onChange={e=>setCategory(e.target.value)}/>}</div>{!visible.length?<Empty title={search||category?'No matching records':'No records yet'}>{search||category?'Try another category, country or search term.':page==='discover'?'Processed-food products from verified suppliers appear here after they are published.':'Use the available action above to get started. Shared records appear when another trade participant submits them.'}</Empty>:<div className="mp-grid">{visible.map(item=>{
    const existingQuote=page==='rfqs'?data.quotes.find(q=>q.rfq_id===item.id&&q.seller_org_id===access.org):null;
    const quoteRfq=page==='quotes'?data.rfqs.find(r=>r.id===item.rfq_id):null;
    const quoteOrder=page==='quotes'?data.orders?.find(o=>o.quote_id===item.id):null;
    const isProductCard=page==='products'||page==='discover';
    if(mode==='buyer'&&page==='discover')return <article className="mp-card" key={item.id}><div className="mp-row"><span className="mp-eyebrow">{item.category||item.id}</span><Status value={item.organizations?.verification_status==='verified'?'verified':item.status}/></div><h2>{item.name||item.id}</h2><p>{item.country_of_origin}</p>{item.organizations?.name&&<p>{item.organizations.name}</p>}{item.moq!=null&&<p>Minimum order: {item.moq} {item.moq_unit}</p>}<div className="mp-actions"><Button variant="secondary" onClick={()=>open('detail',item)}>View details</Button><Button onClick={()=>open('rfq',null,{product:item})}>Request a quote</Button></div></article>;
    const verifiedEvidence=isProductCard?data.documents.filter(d=>d.product_id===item.id&&d.verification_status==='verified').length:0;
    return <article className="mp-card" key={item.id}>{isProductCard&&item.cover_image_url&&<img className="mp-product-cover" src={item.cover_image_url} alt={item.name}/>}<div className="mp-row"><span className="mp-eyebrow">{item.category||item.product_category||item.document_type||item.type||item.id}</span>{isProductCard?<Status value={item.risk_status==='review_required'?'pending':item.status}/>:<Status value={page==='quotes'&&item.validity_ts&&item.validity_ts<Date.now()&&['sent','revised'].includes(item.status)?'expired':item.verification_status||item.status}/>}</div><h2>{item.name||item.title||item.products?.name||item.id}</h2><p>{item.country_of_origin||item.country||item.destination_country}</p>{item.organizations?.name&&<p>{item.organizations.name} {item.organizations?.verification_status==='verified'&&<><Status value="verified"/> <small>seller</small></>}</p>}{isProductCard&&<small>Product details seller provided{verifiedEvidence?' · '+verifiedEvidence+' verified evidence item'+(verifiedEvidence===1?'':'s'):''}</small>}{item.moq!=null&&<p>Minimum order: {item.moq} {item.moq_unit}</p>}{item.quantity!=null&&<p>{item.quantity} {item.quantity_unit}</p>}{item.total_amount!=null&&<p>{item.currency} {item.total_amount}</p>}{!isProductCard&&item.status&&item.verification_status&&<Status value={item.status}/>}<div className="mp-actions"><Button variant="secondary" onClick={()=>open('detail',item)}>View details</Button>{page==='discover'&&<Button onClick={()=>open('rfq',null,{product:item})}>Request a quote</Button>}{page==='documents'&&mode==='seller'&&<Button onClick={()=>open('document',item)}>Edit evidence</Button>}{page==='products'&&mode==='seller'&&<Button onClick={()=>open('product',item)}>Edit product</Button>}{page==='rfqs'&&mode==='buyer'&&item.status==='draft'&&<Button onClick={()=>open('rfq',item)}>Continue draft</Button>}{page==='rfqs'&&mode==='seller'&&item.status==='open'&&!existingQuote&&<Button onClick={()=>open('quote',null,{rfq:item})}>Respond with quote</Button>}{existingQuote&&<small>Quote {existingQuote.status.replaceAll('_',' ')}</small>}{page==='quotes'&&mode==='seller'&&item.status==='draft'&&quoteRfq?.status==='open'&&<Button onClick={()=>open('quote',item,{rfq:quoteRfq})}>Continue quote</Button>}{page==='quotes'&&mode==='seller'&&item.status==='revision_requested'&&quoteRfq&&<Button onClick={()=>open('quote',item,{rfq:quoteRfq,revision:true})}>Revise quote</Button>}{page==='quotes'&&mode==='seller'&&quoteOrder&&<><small>Order {quoteOrder.status.replaceAll('_',' ')}</small><Button variant="secondary" onClick={()=>open('order',null,{order:quoteOrder})}>Update order</Button></>}</div></article>;
  })}</div>}</>;
}

```


===== FILE: src/marketplace/ui.jsx =====

```jsx
import { useId } from "react";
import { Icon } from "../components/Icon";
import { Pill } from "../components/Pill";
import { COLOR, FONT_STACK, TYPE, SPACE, RADIUS, SHADOW, WEIGHT } from "../lib/tokens";

export const theme = {
  "--mp-font": FONT_STACK,
  ...Object.fromEntries(Object.entries(COLOR).map(([key,value])=>["--mp-"+key,value])),
  ...Object.fromEntries(Object.entries(SPACE).map(([key,value])=>["--mp-space-"+key,value+"px"])),
  ...Object.fromEntries(Object.entries(TYPE).map(([key,value])=>["--mp-type-"+key,value.size+"px"])),
  ...Object.fromEntries(Object.entries(RADIUS).map(([key,value])=>["--mp-radius-"+key,value+"px"])),
  "--mp-shadow": SHADOW.card, "--mp-medium": WEIGHT.medium, "--mp-bold": WEIGHT.bold,
};
export function Button({ children, variant="primary", icon, type="button", ...props }) {
  return <button type={type} className={"mp-button mp-button-"+variant} {...props}>{icon&&<Icon name={icon}/>}<span>{children}</span></button>;
}
export function Field({ label, hint, options, multiline, ...props }) {
  const id=useId();
  const common={id,...props,"aria-describedby":hint?id+"-hint":undefined};
  return <div className="mp-field"><label htmlFor={id}>{label}{props.required?" *":""}</label>
    {options?<select {...common}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select>:
      multiline?<textarea rows={4} {...common}/>:<input {...common}/>}
    {hint&&<small id={id+"-hint"}>{hint}</small>}</div>;
}
export function Notice({children,error=false}) { return <div className={"mp-notice"+(error?" mp-error":"")} role={error?"alert":"status"}>{children}</div>; }
export function Empty({title,children,action,icon="package"}) {
  return <section className="mp-card mp-empty"><Icon name={icon} size={32}/><h2>{title}</h2><p>{children}</p>{action}</section>;
}
export function Heading({title,description,action}) {
  return <div className="mp-heading"><div><h1 tabIndex={-1} id="marketplace-title">{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>;
}
export function Status({value}) {
  return <Pill tone={value==="verified"||value==="accepted"?"success":value==="rejected"?"danger":value==="pending"?"warning":"neutral"}>{String(value||"unverified").replaceAll("_"," ")}</Pill>;
}

```


===== FILE: src/marketplace/marketplace.css =====

```css
.mp-root {font-family:var(--mp-font);color:var(--mp-text);background:var(--mp-bg);min-height:100vh;font-size:var(--mp-type-body);line-height:1.65}
.mp-root * {box-sizing:border-box}
.mp-root h1 {font-size:var(--mp-type-display);line-height:1.3;margin:0 0 var(--mp-space-sm);font-weight:var(--mp-bold)}
.mp-root h2,.mp-root legend {font-size:var(--mp-type-heading);line-height:1.4;font-weight:var(--mp-bold)}
.mp-root h2 {margin:var(--mp-space-sm) 0}
.mp-root p {margin:var(--mp-space-sm) 0;color:var(--mp-textMid);overflow-wrap:anywhere}
.mp-root small {font-size:var(--mp-type-label);color:var(--mp-textMid)}
.mp-root a {color:var(--mp-primary)}
.mp-root button,.mp-root input,.mp-root textarea,.mp-root select {font:inherit}
.mp-root :focus-visible {outline:3px solid var(--mp-primary);outline-offset:3px}
.mp-button {display:inline-flex;gap:var(--mp-space-sm);align-items:center;justify-content:center;border:1px solid transparent;min-height:44px;padding:var(--mp-space-sm) var(--mp-space-base);border-radius:var(--mp-radius-sm);font-weight:var(--mp-medium);cursor:pointer}
.mp-button-primary {background:var(--mp-primary);color:var(--mp-white)}
.mp-button-primary:hover {background:var(--mp-primaryMid)}
.mp-button-secondary {background:var(--mp-white);color:var(--mp-primaryMid);border-color:var(--mp-primaryBorder)}
.mp-button:disabled {opacity:.6;cursor:wait}
.mp-header {position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--mp-space-base);padding:var(--mp-space-base) var(--mp-space-xl);background:var(--mp-white);border-bottom:1px solid var(--mp-border);min-height:80px}
.mp-brand,.mp-header-right,.mp-row,.mp-actions {display:flex;align-items:center;gap:var(--mp-space-md);flex-wrap:wrap}
.mp-brand {color:var(--mp-primaryMid)}
.mp-brand strong {font-size:var(--mp-type-display)}
.mp-brand span {font-size:var(--mp-type-label);color:var(--mp-textMid)}
.mp-account {max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mp-sidebar {position:absolute;width:232px;padding:var(--mp-space-xl) var(--mp-space-base)}
.mp-eyebrow {font-size:var(--mp-type-label);font-weight:var(--mp-medium);color:var(--mp-textMid);text-transform:uppercase;letter-spacing:.5px}
.mp-sidebar nav {display:grid;gap:var(--mp-space-xs)}
.mp-sidebar nav a {display:flex;align-items:center;gap:var(--mp-space-md);min-height:44px;padding:var(--mp-space-md);border-radius:var(--mp-radius-sm);color:var(--mp-textMid);text-decoration:none;font-weight:var(--mp-medium)}
.mp-sidebar nav a:hover {background:var(--mp-white)}
.mp-sidebar nav a[aria-current=page] {background:var(--mp-primaryBg);color:var(--mp-primaryMid)}
.mp-sidebar-note {border-top:1px solid var(--mp-border);margin-top:var(--mp-space-xl);padding:var(--mp-space-base) var(--mp-space-md);display:flex;align-items:center;gap:var(--mp-space-md);color:var(--mp-primary)}
.mp-content {margin-left:232px;padding:var(--mp-space-xxl);max-width:1600px;min-width:0}
.mp-heading {display:flex;align-items:flex-start;justify-content:space-between;gap:var(--mp-space-base);margin-bottom:var(--mp-space-xl);flex-wrap:wrap}
.mp-card {background:var(--mp-white);border:1px solid var(--mp-border);border-radius:var(--mp-radius-md);padding:var(--mp-space-xl);min-width:0;overflow-wrap:anywhere;box-shadow:var(--mp-shadow)}
.mp-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:var(--mp-space-base)}
.mp-list {display:grid;gap:var(--mp-space-md)}
.mp-row {justify-content:space-between}
.mp-empty {padding:var(--mp-space-xxl);text-align:center;color:var(--mp-primaryMid)}
.mp-empty p {max-width:560px;margin:var(--mp-space-md) auto var(--mp-space-xl)}
.mp-form {max-width:900px}
.mp-form fieldset {border:0;padding:0;margin:0;min-width:0}
.mp-form legend {margin-bottom:var(--mp-space-base)}
.mp-form-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:var(--mp-space-base)}
.mp-field {display:flex;flex-direction:column;gap:var(--mp-space-xs);margin-bottom:var(--mp-space-base);min-width:0}
.mp-field label {font-weight:var(--mp-medium);font-size:var(--mp-type-label)}
.mp-field input,.mp-field select,.mp-field textarea {width:100%;min-height:44px;border:1px solid var(--mp-textDim);border-radius:var(--mp-radius-sm);padding:var(--mp-space-sm) var(--mp-space-md);color:var(--mp-text);background:var(--mp-white)}
.mp-field textarea {resize:vertical}
.mp-details {display:grid;gap:var(--mp-space-md);margin:var(--mp-space-xl) 0}
.mp-details>div {display:grid;grid-template-columns:minmax(100px,1fr) minmax(0,3fr);gap:var(--mp-space-base);border-bottom:1px solid var(--mp-border);padding-bottom:var(--mp-space-sm)}
.mp-details dt {font-weight:var(--mp-medium);color:var(--mp-textMid)}
.mp-details dd {margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.mp-notice {padding:var(--mp-space-base);border:1px solid var(--mp-primaryBorder);background:var(--mp-primaryBg);border-radius:var(--mp-radius-sm);margin-bottom:var(--mp-space-base)}
.mp-error {border-color:var(--mp-redBorder);background:var(--mp-redBg);color:var(--mp-red)}
.mp-login {min-height:100vh;display:grid;place-items:center;padding:var(--mp-space-xl)}
.mp-login>section {width:100%;max-width:460px}
.mp-login .mp-brand {margin-bottom:var(--mp-space-xl)}
.mp-login .mp-button-primary {width:100%}
.mp-skip {position:absolute;top:-100px;left:16px;padding:var(--mp-space-base);background:var(--mp-white);z-index:20}
.mp-skip:focus {top:8px}
.mp-mobile .mp-header {padding:var(--mp-space-base);flex-wrap:wrap}
.mp-mobile .mp-brand span,.mp-mobile .mp-account {display:none}
.mp-mobile .mp-header-right {gap:var(--mp-space-sm)}
.mp-mobile .mp-content {margin-left:0;padding:var(--mp-space-base)}
.mp-mobile .mp-sidebar {position:static;width:100%;background:var(--mp-white);border-bottom:1px solid var(--mp-border);padding:var(--mp-space-base)}
.mp-mobile .mp-sidebar-note {display:none}
@media(max-width:639px) {.mp-form-grid {grid-template-columns:1fr}.mp-card {padding:var(--mp-space-base)}.mp-login {padding:var(--mp-space-base)}}

.mp-header-right {flex-shrink:0}
.mp-nav-logout {margin-top:var(--mp-space-xl)}
.mp-nav-logout .mp-button {width:100%}

.mp-product-images {margin:0 0 var(--mp-space-xl);padding:var(--mp-space-base);border:1px dashed var(--mp-primaryBorder);border-radius:var(--mp-radius-md);background:var(--mp-primaryBg)}
.mp-product-images input[type=file] {width:100%;margin:var(--mp-space-sm) 0 var(--mp-space-base)}
.mp-image-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:var(--mp-space-md)}
.mp-image-item {margin:0;border:1px solid var(--mp-border);border-radius:var(--mp-radius-sm);overflow:hidden;background:var(--mp-white)}
.mp-image-item img {display:block;width:100%;aspect-ratio:1/1;object-fit:cover}
.mp-image-item figcaption {display:flex;justify-content:space-between;gap:var(--mp-space-sm);align-items:center;padding:var(--mp-space-sm);font-size:var(--mp-type-label);color:var(--mp-textMid)}
.mp-image-item button {border:0;background:none;color:var(--mp-red);cursor:pointer;padding:4px}
.mp-product-cover {display:block;width:calc(100% + (2 * var(--mp-space-xl)));height:190px;object-fit:cover;margin:calc(-1 * var(--mp-space-xl)) calc(-1 * var(--mp-space-xl)) var(--mp-space-base);border-radius:var(--mp-radius-md) var(--mp-radius-md) 0 0}
.mp-detail-images {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:var(--mp-space-md);margin-bottom:var(--mp-space-xl)}
.mp-detail-images img {display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--mp-radius-sm);border:1px solid var(--mp-border)}
@media(max-width:639px) {.mp-product-cover {width:calc(100% + (2 * var(--mp-space-base)));margin:calc(-1 * var(--mp-space-base)) calc(-1 * var(--mp-space-base)) var(--mp-space-base);height:170px}.mp-image-grid {grid-template-columns:repeat(2,minmax(0,1fr))}}

```


===== FILE: src/marketplace/portal.test.jsx =====

```jsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Shell, portalFor } from './Shell';
import { OrganisationForm } from './Organisations';
import MarketplaceApp, { Workspace, Login } from '../MarketplaceApp';
import { getSessionProfile, signInWithEmail, signOut } from '../lib/auth';
import { marketplace } from '../lib/marketplace';

vi.mock('../lib/auth',()=>({getSessionProfile:vi.fn(),signInWithEmail:vi.fn(),signOut:vi.fn(),friendlyAuthError:e=>e.message}));
vi.mock('../lib/marketplace',()=>({FOOD_CATEGORIES:['Spices & Seasonings'],FOOD_CERTIFICATIONS:['FSSAI','FSSC 22000'],TRADE_DOCUMENT_TYPES:[{value:'certificate_of_analysis',label:'Certificate of Analysis (COA)'}],productRequiresReview:()=>false,marketplace:{context:vi.fn(),organizations:vi.fn().mockResolvedValue([]),products:vi.fn().mockResolvedValue([]),rfqs:vi.fn().mockResolvedValue([]),quotes:vi.fn().mockResolvedValue([]),documents:vi.fn().mockResolvedValue([]),reviews:vi.fn().mockResolvedValue([]),orders:vi.fn().mockResolvedValue([])}}));
vi.mock('../lib/supabase',()=>({supabase:{auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe:vi.fn()}}})}}}));
beforeEach(()=>vi.clearAllMocks());
const profile={name:'Test User',email:'qa@example.invalid',auth_user_id:'user-1',role:'owner'};
const api=()=>({organizations:vi.fn().mockResolvedValue([]),products:vi.fn().mockResolvedValue([]),rfqs:vi.fn().mockResolvedValue([]),quotes:vi.fn().mockResolvedValue([]),documents:vi.fn().mockResolvedValue([]),orders:vi.fn().mockResolvedValue([])});

describe.each([375,1280])('portal navigation at %ipx',width=>{
  it.each(['admin','buyer','seller'])('%s exposes navigation and sign out',async mode=>{
    Object.defineProperty(window,'innerWidth',{configurable:true,value:width});
    const onNavigate=vi.fn(),onLogout=vi.fn();
    render(<Shell profile={profile} mode={mode} page={mode==='buyer'?'discover':'overview'} onNavigate={onNavigate} onLogout={onLogout}><h1 id="marketplace-title" tabIndex={-1}>Content</h1></Shell>);
    const user=userEvent.setup();
    if(width<640){expect(screen.queryByRole('navigation')).toBeNull();await user.click(screen.getByRole('button',{name:'Menu'}));}
    expect(screen.getByRole('navigation')).toBeTruthy();
    await user.click(screen.getByRole('button',{name:'Log out from navigation'}));
    expect(onLogout).toHaveBeenCalledOnce();onLogout.mockClear();
    await user.click(screen.getByRole('link',{name:mode==='admin'?'Trade organisations':mode==='buyer'?'Sourcing RFQs':'Processed-food catalogue'}));
    expect(onNavigate).toHaveBeenCalledOnce();
    if(width<640)expect(screen.queryByRole('navigation')).toBeNull();
    await user.click(screen.getByRole('button',{name:'Log out'}));expect(onLogout).toHaveBeenCalledOnce();
  });
});
it('Escape closes the mobile menu and restores focus',async()=>{
  Object.defineProperty(window,'innerWidth',{configurable:true,value:375});
  render(<Shell profile={profile} mode="seller" page="overview" onNavigate={()=>{}} onLogout={()=>{}}/>);
  const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Menu'}));await user.keyboard('{Escape}');
  expect(screen.queryByRole('navigation')).toBeNull();expect(document.activeElement).toBe(screen.getByRole('button',{name:'Menu'}));
});
it('legacy roles never grant marketplace access',async()=>{
  expect(portalFor({role:'owner'})).toBeNull();expect(portalFor({role:'admin'})).toBeNull();
  getSessionProfile.mockResolvedValue(profile);marketplace.context.mockResolvedValue(null);
  render(<MarketplaceApp/>);expect(await screen.findByText('Marketplace access needed')).toBeTruthy();expect(screen.queryByRole('navigation')).toBeNull();
});
it('database failure is distinct from an empty dashboard and can retry',async()=>{
  const client=api();client.products.mockRejectedValueOnce(new Error('Connection failed'));
  render(<Workspace profile={profile} access={{role:'seller_admin',org:'seller-1'}} api={client} onLogout={()=>{}}/>);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Connection failed');expect(screen.queryByText('No records yet')).toBeNull();
  await userEvent.click(screen.getByRole('button',{name:'Retry loading'}));expect(await screen.findByRole('heading',{name:'Processed-food seller overview'})).toBeTruthy();
  expect(client.products).toHaveBeenLastCalledWith({sellerOrgId:'seller-1'});
});
it('buyer workspace uses the restored catalog shell and published products',async()=>{
  Object.defineProperty(window,'innerWidth',{configurable:true,value:375});
  const client=api();render(<Workspace profile={profile} access={{role:'buyer_member',org:'buyer-1'}} api={client} onLogout={()=>{}}/>);
  await screen.findByRole('heading',{name:'Catalog'});
  expect(client.products).toHaveBeenCalledWith({published:true});expect(client.rfqs).toHaveBeenCalledWith({buyerOrgId:'buyer-1'});
  const buyerNav=screen.getByRole('navigation',{name:'Buyer navigation'});
  expect(buyerNav).toBeTruthy();
  expect(buyerNav.style.position).toBe('absolute');
  expect(buyerNav.style.bottom).toBe('0px');
  expect(buyerNav.style.left).toBe('0px');
  expect(buyerNav.style.right).toBe('0px');
  const topbar=document.querySelector('.buyer-topbar');
  const scrollArea=document.querySelector('.buyer-mobile-scroll');
  expect(topbar.style.position).toBe('relative');
  expect(scrollArea.style.overflowY).toBe('auto');
  expect(scrollArea.style.overscrollBehavior).toBe('contain');
  expect(screen.getByRole('button',{name:'Catalog'}).style.transform).toBe('none');
  await userEvent.click(screen.getByRole('button',{name:'GPT'}));
  expect(screen.getByText('Trade GPT')).toBeTruthy();
  expect(screen.getByLabelText('Trade GPT request')).toBeTruthy();
});
it('failed organisation save keeps entered values and supports retry',async()=>{
  const save=vi.fn().mockRejectedValueOnce(new Error('Save failed')).mockResolvedValueOnce({});
  render(<OrganisationForm onSave={save}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Organisation name *'),'Food Company');await user.type(screen.getByLabelText('Country *'),'India');
  await user.click(screen.getByRole('button',{name:'Save organisation'}));expect(await screen.findByRole('alert')).toHaveProperty('textContent','Save failed');expect(screen.getByLabelText('Organisation name *').value).toBe('Food Company');
  await user.click(screen.getByRole('button',{name:'Save organisation'}));await waitFor(()=>expect(save).toHaveBeenCalledTimes(2));
});
it.each([375,1280])('login at %ipx submits by Enter and retains a readable failure',async width=>{
  Object.defineProperty(window,'innerWidth',{configurable:true,value:width});
  signInWithEmail.mockRejectedValue(new Error('Email or password is incorrect.'));
  render(<Login onSignedIn={vi.fn()}/>);const user=userEvent.setup();await user.type(screen.getByLabelText('Email'),'qa@example.invalid');await user.type(screen.getByLabelText('Password'),'test-only{Enter}');
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Email or password is incorrect.');expect(signInWithEmail).toHaveBeenCalledWith('qa@example.invalid','test-only');
});

it('admin logout ends the session and returns to login',async()=>{
  getSessionProfile.mockResolvedValue(profile);marketplace.context.mockResolvedValue({role:'platform_admin',org:null});signOut.mockResolvedValue(undefined);
  render(<MarketplaceApp/>);await screen.findByRole('heading',{name:'Food trade marketplace overview'});
  await userEvent.click(screen.getByRole('button',{name:'Log out',exact:true}));
  expect(signOut).toHaveBeenCalledOnce();expect(await screen.findByRole('form',{name:'Sign in'})).toBeTruthy();expect(screen.queryByRole('navigation')).toBeNull();
});
it('failed admin logout keeps the session visible with an error',async()=>{
  getSessionProfile.mockResolvedValue(profile);marketplace.context.mockResolvedValue({role:'platform_admin',org:null});signOut.mockRejectedValue(new Error('Unable to sign out. Try again.'));
  render(<MarketplaceApp/>);await screen.findByRole('heading',{name:'Food trade marketplace overview'});
  await userEvent.click(screen.getByRole('button',{name:'Log out',exact:true}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Unable to sign out. Try again.');expect(screen.getByRole('navigation')).toBeTruthy();
});

```


===== FILE: src/marketplace/recovery.test.jsx =====

```jsx
import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordRecovery } from './PasswordRecovery';

it('does not expose password update without a validated session',async()=>{
  const auth={getUser:vi.fn().mockResolvedValue({data:{user:null},error:new Error('Expired')}),updateUser:vi.fn()};
  render(<PasswordRecovery reset auth={auth}/>);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','This reset link is invalid or expired. Request a new link below.');
  expect(screen.queryByLabelText('New password *')).toBeNull();expect(auth.updateUser).not.toHaveBeenCalled();
});
it('requests recovery with the app callback and a neutral success message',async()=>{
  const auth={resetPasswordForEmail:vi.fn().mockResolvedValue({error:null})};
  render(<PasswordRecovery auth={auth}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Email *'),'Owner@example.invalid');
  await user.click(screen.getByRole('button',{name:'Send reset link'}));
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('owner@example.invalid',{redirectTo:window.location.origin+'/reset-password'});
  expect(await screen.findByRole('status')).toHaveProperty('textContent',expect.stringContaining('If this email has an account'));
});
it('validates confirmation and retains the form when Supabase rejects a password',async()=>{
  const auth={getUser:vi.fn().mockResolvedValue({data:{user:{id:'test'}}}),updateUser:vi.fn().mockResolvedValue({error:new Error('Password does not meet requirements')})};
  render(<PasswordRecovery reset auth={auth}/>);const user=userEvent.setup();
  await user.type(await screen.findByLabelText('New password *'),'test-only-password');
  await user.type(screen.getByLabelText('Confirm password *'),'different-password');
  await user.click(screen.getByRole('button',{name:'Save new password'}));
  expect(auth.updateUser).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toBe('Passwords do not match.');
  await user.clear(screen.getByLabelText('Confirm password *'));await user.type(screen.getByLabelText('Confirm password *'),'test-only-password');
  await user.click(screen.getByRole('button',{name:'Save new password'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Password does not meet requirements');
  expect(screen.getByRole('button',{name:'Save new password'})).toBeTruthy();
});

```


===== FILE: src/marketplace/test-setup.js =====

```javascript
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(()=>{cleanup();window.location.hash='';});

```


===== FILE: src/marketplace/trade.test.jsx =====

```jsx
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm, RfqForm, QuoteForm, DocumentForm } from './TradeForms';
import { quoteTotal, positive } from './validation';
import { Verification, Workflows } from './Workflows';

it('calculates quote totals with exact decimal rounding',()=>{
  expect(quoteTotal('1.005','1')).toBe('1.01');expect(quoteTotal('0.1','0.2')).toBe('0.02');expect(quoteTotal('12.34','1000')).toBe('12340.00');
  expect(()=>positive('-1','Quantity')).toThrow();expect(()=>positive('NaN','Quantity')).toThrow();expect(()=>positive('1e9','Quantity')).toThrow();
});
it('seller can save an incomplete named product draft',async()=>{
  const save=vi.fn().mockResolvedValue({});render(<ProductForm onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Product name *'),'Mango chutney');
  // jsdom does not implement submitter.formNoValidate; dispatch the browser's SubmitEvent.
  const draft=screen.getByRole('button',{name:'Save draft'});expect(draft.formNoValidate).toBe(true);
  fireEvent(draft.form,new SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:draft}));
  await waitFor(()=>expect(save).toHaveBeenCalledOnce());expect(save.mock.calls[0][0]).toMatchObject({name:'Mango chutney',status:'draft',verification_status:'unverified',moq:null});
});
it('complete processed food publishes with structured fields and an image',async()=>{
  const save=vi.fn();render(<ProductForm onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  for(const [label,value] of [['Product name *','Chilli sauce'],['Country of origin *','India'],['Minimum order quantity (MOQ) *','100'],['Packaging formats *','500ml bottle, 12 bottle carton'],['Shelf life *','12 months'],['Storage requirements *','Store in a cool dry place']])await user.type(screen.getByLabelText(label),value);
  const file=new File(['image'],'sauce.jpg',{type:'image/jpeg'});await user.upload(screen.getByLabelText('Product images'),file);
  await user.click(screen.getByRole('button',{name:'Publish product'}));await waitFor(()=>expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0]).toMatchObject({verification_status:'unverified',status:'active',packaging:['500ml bottle','12 bottle carton'],moq:'100'});
  expect(save.mock.calls[0][0].__newImages).toHaveLength(1);
});
it('higher-risk health claims are held for Epistable review',async()=>{
  const save=vi.fn();render(<ProductForm onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  for(const [label,value] of [['Product name *','Herbal drink'],['Country of origin *','India'],['Minimum order quantity (MOQ) *','100'],['Packaging formats *','500ml bottle'],['Shelf life *','12 months'],['Storage requirements *','Store cool'],['Product description','A medicinal drink to cure cancer']])await user.type(screen.getByLabelText(label),value);
  const file=new File(['image'],'drink.jpg',{type:'image/jpeg'});await user.upload(screen.getByLabelText('Product images'),file);
  await user.click(screen.getByRole('button',{name:'Send for review'}));await waitFor(()=>expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0]).toMatchObject({verification_status:'pending',status:'draft',risk_status:'review_required'});
});
it('buyer RFQ preserves the selected product and seller',async()=>{
  const save=vi.fn();render(<RfqForm product={{id:'p1',seller_org_id:'seller1',name:'Sauce',category:'Sauces & Condiments',moq_unit:'carton'}} onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Required quantity *'),'200');await user.type(screen.getByLabelText('Destination country *'),'Brazil');await user.click(screen.getByRole('button',{name:'Send RFQ'}));
  await waitFor(()=>expect(save).toHaveBeenCalledOnce());expect(save.mock.calls[0][0]).toMatchObject({product_id:'p1',seller_org_id:'seller1',quantity:'200',quantity_unit:'carton',destination_country:'Brazil',status:'open'});
});
it('seller sends exact commercial terms and handles a failed send',async()=>{
  const save=vi.fn().mockRejectedValue(new Error('RFQ is no longer open'));render(<QuoteForm rfq={{id:'r1',quantity:100,quantity_unit:'kg',destination_country:'Brazil'}} onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();
  await user.type(screen.getByLabelText('Unit price *'),'1.005');await user.type(screen.getByLabelText('Valid through *'),'2099-12-01');await user.click(screen.getByRole('button',{name:'Send quote'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','RFQ is no longer open');expect(save.mock.calls[0][0]).toMatchObject({total_amount:'100.50',rfq_id:'r1',status:'sent'});expect(screen.getByLabelText('Unit price *').value).toBe('1.005');
});
it('evidence rejects an insecure source without writing',async()=>{
  const save=vi.fn();render(<DocumentForm products={[]} onSave={save} onCancel={()=>{}}/>);const user=userEvent.setup();await user.type(screen.getByLabelText('Document title *'),'Food safety certificate');await user.type(screen.getByLabelText('External evidence source (optional)'),'http://example.invalid/doc');await user.click(screen.getByRole('button',{name:'Submit evidence for verification'}));expect(await screen.findByRole('alert')).toHaveProperty('textContent','Use an HTTPS evidence source.');expect(save).not.toHaveBeenCalled();
});
it('admin review requires a reason and records the selected target',async()=>{
  const api={review:vi.fn()},saved=vi.fn();render(<Verification data={{organizations:[],documents:[],reviews:[],products:[{id:'p1',name:'Sauce',verification_status:'pending'}]}} api={api} onSaved={saved}/>);const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Review'}));await user.click(screen.getByRole('button',{name:'Save decision'}));expect(api.review).not.toHaveBeenCalled();await user.type(screen.getByLabelText('Review reason *'),'Checked specification');await user.click(screen.getByRole('button',{name:'Save decision'}));await waitFor(()=>expect(api.review).toHaveBeenCalledWith('product','p1','verified','Checked specification'));
});

it('buyer discovery keeps the previous compact marketplace card layout',()=>{
  const data={
    products:[{id:'p1',name:'Turmeric Powder',category:'Spices & Seasonings',country_of_origin:'India',moq:500,moq_unit:'kg',status:'active',cover_image_url:'https://example.invalid/turmeric.jpg',organizations:{name:'Demo Foods',verification_status:'verified'}}],
    organizations:[],documents:[],rfqs:[],quotes:[]
  };
  render(<Workflows page="discover" mode="buyer" access={{org:'buyer-1',role:'buyer_member'}} data={data} api={{}} onSaved={()=>{}}/>);
  expect(screen.getByRole('heading',{name:'Turmeric Powder'})).toBeTruthy();
  expect(screen.queryByRole('img',{name:'Turmeric Powder'})).toBeNull();
  expect(screen.getByText('Demo Foods')).toBeTruthy();
  expect(screen.getByText('verified')).toBeTruthy();
  expect(screen.getByRole('button',{name:'View details'})).toBeTruthy();
  expect(screen.getByRole('button',{name:'Request a quote'})).toBeTruthy();
});

```


===== FILE: src/marketplace/validation.js =====

```javascript
export const UNITS=['kg','tonne','carton','unit','litre'];
export const INCOTERMS=['EXW','FCA','CPT','CIP','DAP','DPU','DDP','FAS','FOB','CFR','CIF'];
export const list=value=>String(value||'').split(',').map(v=>v.trim()).filter(Boolean);
export function positive(value,label) {
  const raw=String(value).trim();
  if(!/^\d+(\.\d{1,6})?$/.test(raw)||Number(raw)<=0||Number(raw)>=1e12)throw new Error(label+' must be greater than zero, below one trillion, with at most six decimal places.');
  return raw;
}
export function quoteTotal(price,quantity) {
  const scaled=value=>{const [whole,fraction='']=positive(value,'Amount').split('.');return BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));};
  const cents=(scaled(price)*scaled(quantity)+5000000000n)/10000000000n;
  return (cents/100n).toString()+'.'+(cents%100n).toString().padStart(2,'0');
}
export function futureDate(value,label) {
  const timestamp=Date.parse(value+'T23:59:59.999Z');
  if(!Number.isFinite(timestamp)||timestamp<=Date.now())throw new Error(label+' must be in the future.');
  return timestamp;
}
export function days(value) {
  if(value==='')return null;
  const n=Number(value);if(!Number.isInteger(n)||n<0||n>3650)throw new Error('Lead time must be a whole number from 0 to 3650 days.');return n;
}

```


===== FILE: src/screens/ExportReadiness.jsx =====

```jsx
﻿import { useEffect, useMemo, useState } from "react";
import { C, fmtD, fmtMoney } from "../lib/domain";
import { FONT_STACK, SPACE } from "../lib/tokens";
import { EXPORT_MARKETS, marketConf } from "../lib/markets";
import {
  EXPORT_CERTS,
  EXPORT_PRODUCTS,
  READINESS_SECTIONS,
  readinessStatusConf,
  scoreRequirements,
  sectionForRequirement,
} from "../lib/readiness";
import { EvidenceUploadModal } from "../components/EvidenceUploadModal";
import { ExportReadinessOnboarding } from "./ExportReadinessOnboarding";
import { Icon } from "../components/Icon";
import { OverflowMenu } from "../components/OverflowMenu";
import { Pill } from "../components/Pill";
import { Btn, Card, KpiGrid, Loader, Modal, Sel, T } from "../components/ui";

const TEXT = {
  pageTitle: {...T.title,marginBottom:18,fontWeight:700},
  pageHeader: {...T.title,fontWeight:700},
  heroTitle: {fontSize:20,lineHeight:1.2,fontWeight:700,letterSpacing:0},
  panelTitle: {fontSize:14,lineHeight:1.55,fontWeight:700,letterSpacing:0},
  itemTitle: {fontSize:13,lineHeight:1.55,fontWeight:600,letterSpacing:0},
  meta: {...T.hint,color:C.textDim},
  tinyMeta: {fontSize:12,lineHeight:1.55,color:C.textDim,letterSpacing:0},
  emptyTitle: {fontSize:15,lineHeight:1.55,fontWeight:700,letterSpacing:0},
};

export function ExportReadiness({fac,user,DB}) {
  const [profile,setProfile]=useState(null);
  const [requirements,setRequirements]=useState([]);
  const [requirementsByMarket,setRequirementsByMarket]=useState({});
  const [bodiesByReq,setBodiesByReq]=useState({});
  const [evidence,setEvidence]=useState([]);
  const [activeMarket,setActiveMarket]=useState("EU");
  const [showAddMarket,setShowAddMarket]=useState(false);
  const [uploadReq,setUploadReq]=useState(null);
  const [naReq,setNaReq]=useState(null);
  const [naReason,setNaReason]=useState("");
  const [form,setForm]=useState({
    sector:"stone",
    productType:"any",
    markets:["EU"],
    exportStatus:"planning",
    companySize:"",
    currentCertifications:[],
  });
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");
  const [usageStats,setUsageStats]=useState({inspectionsLast90Days:0,registeredSuppliers:0,inspectionsWithBatchNo:0});

  const evidenceByReq=useMemo(()=>{
    const map={};
    evidence.forEach(e=>{map[e.requirement_id]=e;});
    return map;
  },[evidence]);
  const markets=form.markets?.length?form.markets:["EU"];
  const activeRequirements=requirementsByMarket[activeMarket]||requirements;
  const scored=activeRequirements.map(r=>{
    const status=evidenceByReq[r.id]?.status || "missing";
    const conf=readinessStatusConf(status);
    return {...r,status,score:conf.score};
  });
  const missing=scored.filter(r=>["missing","rejected","expired"].includes(r.status));
  const working=scored.filter(r=>["pending","uploaded","submitted"].includes(r.status));
  const complete=scored.filter(r=>["verified","not_applicable"].includes(r.status));
  const activeStats=scoreRequirements(activeRequirements,evidence);
  const readinessScore=activeStats.score;
  const marketScores=useMemo(()=>{
    const out={};
    markets.forEach(m=>{out[m]=scoreRequirements(requirementsByMarket[m]||[],evidence).score;});
    return out;
  },[markets,requirementsByMarket,evidence]);
  const grouped=useMemo(()=>{
    const groups=Object.fromEntries(READINESS_SECTIONS.map(s=>[s.id,[]]));
    scored.forEach(r=>{groups[sectionForRequirement(r)]?.push(r);});
    return groups;
  },[scored]);

  async function fetchRequirements(next) {
    const targetMarkets=next.markets?.length?next.markets:["EU"];
    const pairs=await Promise.all(targetMarkets.map(async market=>[market,await DB.exportRequirements({sector:next.sector,productType:next.productType,market})]));
    const byMarket=Object.fromEntries(pairs);
    setRequirementsByMarket(byMarket);
    setRequirements(byMarket[targetMarkets[0]] || []);
    const ids=[...new Set(pairs.flatMap(([,reqs])=>reqs.map(r=>r.id)))];
    setBodiesByReq(await DB.readinessBodies(ids));
  }

  async function load(nextForm=form) {
    if(!fac?.id)return;
    setLoading(true);setErr("");
    try {
      const p=await DB.getExportReadinessProfile(fac.id);
      const destinationMarkets=p?.destination_markets?.length?p.destination_markets:[nextForm.markets?.[0]||"EU"];
      const merged=p?{
        sector:p.sector||"stone",
        productType:p.product_type||"any",
        markets:destinationMarkets,
        exportStatus:p.export_status||"planning",
        companySize:p.company_size||"",
        currentCertifications:p.current_certifications||[],
      }:nextForm;
      setProfile(p);setForm(merged);setActiveMarket(destinationMarkets[0]||"EU");
      await fetchRequirements(merged);
      setEvidence(p?.id?await DB.readinessEvidence(p.id):[]);
      setUsageStats(await DB.factoryUsageStats(fac.id));
    } catch(e) {
      console.error("Export readiness load failed",e);
      setErr(e.message||"Could not load export readiness data.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{load();},[fac?.id]);

  async function saveProfile(next=form) {
    if(!fac?.id||saving)return null;
    setSaving(true);setErr("");
    const destinationMarkets=next.markets?.length?next.markets:[activeMarket||"EU"];
    try {
      const saved=await DB.saveExportReadinessProfile(profile,{
        factoryId:fac.id,
        userId:user.id,
        sector:next.sector,
        productType:next.productType,
        destinationMarkets,
        currentCertifications:next.currentCertifications,
        companySize:next.companySize,
        exportStatus:next.exportStatus,
        onboardingInputs:{markets:destinationMarkets,productType:next.productType,exportStatus:next.exportStatus,companySize:next.companySize},
      });
      const merged={...next,markets:destinationMarkets};
      setProfile(saved);setForm(merged);
      if(!destinationMarkets.includes(activeMarket))setActiveMarket(destinationMarkets[0]);
      await fetchRequirements(merged);
      setEvidence(await DB.readinessEvidence(saved.id));
      return saved;
    } catch(e) {
      console.error("Export readiness save failed",e);
      setErr(e.message||"Could not save readiness profile.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  function updateForm(patch) {
    setForm(prev=>({...prev,...patch}));
  }
  function toggleCert(id) {
    const set=new Set(form.currentCertifications);
    if(set.has(id))set.delete(id);else set.add(id);
    updateForm({currentCertifications:Array.from(set)});
  }
  async function addMarket(code) {
    const next={...form,markets:[...new Set([...(form.markets||[]),code])]};
    setForm(next);setActiveMarket(code);setShowAddMarket(false);
    await saveProfile(next);
  }
  async function removeMarket(code) {
    if(markets.length<=1)return;
    const nextMarkets=markets.filter(m=>m!==code);
    const next={...form,markets:nextMarkets};
    setForm(next);
    if(activeMarket===code)setActiveMarket(nextMarkets[0]);
    await saveProfile(next);
  }
  async function persistEvidence(req,patch) {
    let activeProfile=profile;
    if(!activeProfile?.id)activeProfile=await saveProfile(form);
    if(!activeProfile?.id)return;
    setSaving(true);setErr("");
    try {
      await DB.setReadinessEvidence({
        factoryId:fac.id,
        profileId:activeProfile.id,
        requirementId:req.id,
        evidenceType:req.evidenceType,
        evidenceLifecycleType:req.lifecycleType,
        userId:user.id,
        ...patch,
      });
      setEvidence(await DB.readinessEvidence(activeProfile.id));
      setUploadReq(null);setNaReq(null);setNaReason("");
    } catch(e) {
      console.error("Readiness evidence update failed",e);
      setErr(e.message||"Could not update requirement status.");
    } finally {
      setSaving(false);
    }
  }

  const scoreTone=readinessScore>=75?"success":readinessScore>=45?"warning":"danger";
  if(loading)return <Loader/>;
  if(!profile || !profile.onboarding_completed_at) {
    return <ExportReadinessOnboarding profile={profile} onSave={saveProfile} onComplete={()=>load()} saving={saving}/>;
  }
  return (
    <div>
      {uploadReq&&<EvidenceUploadModal req={uploadReq} evidence={evidenceByReq[uploadReq.id]} bodies={bodiesByReq[uploadReq.id]||[]} factoryId={fac?.id} saving={saving} onClose={()=>setUploadReq(null)} onSave={patch=>persistEvidence(uploadReq,patch)}/>}
      {naReq&&<Modal title="Mark not applicable" onClose={()=>setNaReq(null)}>
        <div style={{display:"grid",gap:14}}>
          <div style={{fontSize:13,lineHeight:1.65,color:C.textMid}}>Use this only when the requirement genuinely does not apply to your product, market, or shipment route.</div>
          <textarea value={naReason} onChange={e=>setNaReason(e.target.value)} rows={3} placeholder="Why does this not apply?" style={{width:"100%",padding:12,border:`1.5px solid ${C.border}`,borderRadius:10,boxSizing:"border-box",fontFamily:FONT_STACK,fontSize:14,color:C.text,resize:"vertical"}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Btn variant="secondary" onClick={()=>setNaReq(null)} disabled={saving}>Cancel</Btn>
            <Btn onClick={()=>persistEvidence(naReq,{status:"not_applicable",notes:`Not applicable: ${naReason}`})} disabled={saving||!naReason.trim()}>Save reason</Btn>
          </div>
        </div>
      </Modal>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:18,flexWrap:"wrap"}}>
        <div>
          <div style={TEXT.pageHeader}>Export Readiness</div>
          <div style={{...TEXT.tinyMeta,marginTop:4,maxWidth:680}}>Track what each market needs, submit third-party evidence, and build a buyer-audit-ready profile. Epistable organises evidence; it does not issue certifications.</div>
        </div>
        <Pill tone={scoreTone} style={{fontSize:13,padding:"6px 12px"}}>{readinessScore}% ready for {marketConf(activeMarket).short}</Pill>
      </div>
      {err&&<div style={{background:C.redBg,border:`1px solid ${C.redBorder}`,borderRadius:10,padding:"12px 14px",fontSize:13,color:C.red,marginBottom:16}}>{err}</div>}
      <KpiGrid items={[
        {label:"Requirements",value:activeStats.total,icon:"Trace",color:C.primary},
        {label:"Complete",value:activeStats.complete,icon:"Won",color:C.green},
        {label:"Submitted / Working",value:activeStats.working,icon:"Now",color:C.amber},
        {label:"Missing",value:activeStats.missing,icon:"Risk",color:C.red},
      ]}/>
      <Card style={{padding:20,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16}}>
          <div>
            <div style={TEXT.panelTitle}>Readiness profile</div>
            <div style={TEXT.tinyMeta}>Pick the markets you are targeting. Each market gets its own readiness score.</div>
          </div>
          <Btn size="sm" onClick={()=>saveProfile(form)} disabled={saving}>{profile?"Save":"Create profile"}</Btn>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:16}}>
          <Sel label="Product" value={form.productType} onChange={v=>updateForm({productType:v})} options={EXPORT_PRODUCTS}/>
          <Sel label="Current Status" value={form.exportStatus} onChange={v=>updateForm({exportStatus:v})} options={[
            {value:"planning",label:"Planning first export"},
            {value:"first_export",label:"Preparing first shipment"},
            {value:"active_exporter",label:"Already exporting"},
            {value:"expanding_markets",label:"Expanding markets"},
          ]}/>
          <Sel label="Company Size" value={form.companySize} onChange={v=>updateForm({companySize:v})} options={[
            {value:"",label:"Select size"},
            {value:"small",label:"Small factory"},
            {value:"mid",label:"Mid-size exporter"},
            {value:"large",label:"Large exporter"},
          ]}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:14}}>
          {markets.map(code=>{
            const m=marketConf(code);
            const active=code===activeMarket;
            const s=marketScores[code]||0;
            const tone=s>=75?"success":s>=45?"warning":"danger";
            return <button key={code} onClick={()=>setActiveMarket(code)} style={{display:"inline-flex",alignItems:"center",gap:8,background:active?C.primaryBg:C.white,border:`1px solid ${active?C.primaryBorder:C.border}`,borderRadius:999,padding:"8px 10px",cursor:"pointer",fontFamily:FONT_STACK,color:active?C.primary:C.textMid,whiteSpace:"nowrap",boxShadow:active?C.shadow:"none"}}>
              <span style={{fontSize:13,fontWeight:700}}>{m.short}</span><Pill tone={tone} size="sm">{s}%</Pill>
              {markets.length>1&&<span onClick={e=>{e.stopPropagation();removeMarket(code);}} style={{display:"inline-flex",color:C.textDim}}><Icon name="close" size={13}/></span>}
            </button>;
          })}
          <button onClick={()=>setShowAddMarket(v=>!v)} style={{display:"inline-flex",alignItems:"center",gap:6,background:C.surface,border:`1px dashed ${C.primaryBorder}`,borderRadius:999,padding:"8px 11px",cursor:"pointer",fontFamily:FONT_STACK,color:C.primary,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}><Icon name="add" size={14}/> Add market</button>
        </div>
        {showAddMarket&&<div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 14px"}}>
          {EXPORT_MARKETS.filter(m=>!markets.includes(m.value)).map(m=><Btn key={m.value} size="sm" variant="secondary" onClick={()=>addMarket(m.value)}>{m.label}</Btn>)}
          {EXPORT_MARKETS.filter(m=>!markets.includes(m.value)).length===0&&<div style={TEXT.tinyMeta}>All available markets are already selected.</div>}
        </div>}
        <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:8}}>What do you already have?</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {EXPORT_CERTS.map(cert=>{
            const active=form.currentCertifications.includes(cert.id);
            return <button key={cert.id} onClick={()=>toggleCert(cert.id)} style={{border:`1px solid ${active?C.greenBorder:C.border}`,background:active?C.greenBg:C.white,color:active?C.green:C.textMid,borderRadius:999,padding:"7px 11px",fontFamily:FONT_STACK,fontSize:12,fontWeight:600,cursor:"pointer"}}>{active?"âœ“ ":""}{cert.label}</button>;
          })}
        </div>
      </Card>
      <Card style={{padding:16,marginBottom:18,borderColor:C.primaryBorder,background:C.primaryBg}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <Pill tone="primary">{marketConf(activeMarket).label}</Pill>
          <div style={{fontSize:13,lineHeight:1.6,color:C.textMid}}>{form.productType==="any"?"Mixed stone products":EXPORT_PRODUCTS.find(p=>p.value===form.productType)?.label} Â· {activeStats.complete} of {activeStats.total} items complete Â· Submitted evidence should be reviewed before it is shown as verified to buyers.</div>
        </div>
      </Card>
      <Card style={{padding:20,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:14}}>
          <div>
            <div style={TEXT.panelTitle}>Roadmap sections for {marketConf(activeMarket).label}</div>
            <div style={TEXT.tinyMeta}>Grouped by buyer-audit theme. Submit evidence against each requirement as you collect it.</div>
          </div>
          {!profile&&<Pill tone="warning">Save profile first</Pill>}
        </div>
        {activeRequirements.length===0?<div style={{padding:"30px 12px",textAlign:"center",color:C.textDim,fontSize:13}}>No configured requirements found for this selection yet.</div>:
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {READINESS_SECTIONS.map(section=>{
            const sectionReqs=grouped[section.id]||[];
            if(!sectionReqs.length)return null;
            const sectionStats=scoreRequirements(sectionReqs,evidence);
            return (
              <div key={section.id} style={{border:`1px solid ${C.border}`,borderRadius:14,padding:14,background:C.surface}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{section.label}</div>
                    <div style={TEXT.tinyMeta}>{section.hint}</div>
                  </div>
                  <Pill tone={sectionStats.complete===sectionStats.total?"success":"neutral"}>{sectionStats.complete} of {sectionStats.total}</Pill>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {section.id==="quality_evidence"&&usageStats.inspectionsLast90Days>10&&(
                    <Card style={{padding:SPACE.md,background:C.surface,display:"flex",gap:SPACE.sm,alignItems:"flex-start"}}>
                      <Icon name="check" size={16} color={C.green}/>
                      <div style={{fontSize:12,lineHeight:1.5,color:C.textMid}}>
                        You have <strong style={{color:C.text}}>{usageStats.inspectionsLast90Days} inspections</strong> recorded in the last 90 days. This counts as operational evidence of QC capability - share it alongside formal certifications.
                      </div>
                    </Card>
                  )}
                  {section.id==="origin_traceability"&&(usageStats.registeredSuppliers>0||usageStats.inspectionsWithBatchNo>5)&&(
                    <Card style={{padding:SPACE.md,background:C.surface,display:"flex",gap:SPACE.sm,alignItems:"flex-start"}}>
                      <Icon name="check" size={16} color={C.green}/>
                      <div style={{fontSize:12,lineHeight:1.5,color:C.textMid}}>
                        You're tracking {usageStats.registeredSuppliers>0?`${usageStats.registeredSuppliers} registered suppliers`:""}
                        {usageStats.registeredSuppliers>0&&usageStats.inspectionsWithBatchNo>5?" and ":""}
                        {usageStats.inspectionsWithBatchNo>5?`batch numbers on ${usageStats.inspectionsWithBatchNo} scans`:""}.
                        This strengthens your origin and traceability story.
                      </div>
                    </Card>
                  )}
                  {sectionReqs.map(req=>{
                    const conf=readinessStatusConf(req.status);
                    const ev=evidenceByReq[req.id];
                    const timeline=req.timelineMin||req.timelineMax?`${req.timelineMin||0}-${req.timelineMax||req.timelineMin} weeks`:"Timeline varies";
                    const cost=req.costMin||req.costMax?`${fmtMoney(req.costMin||0)}-${fmtMoney(req.costMax||req.costMin||0)}`:"Cost varies";
                    const bodies=bodiesByReq[req.id]||[];
                    const primaryAction=req.status==="expired"
                      ? {label:"Upload renewal",variant:"red",onClick:()=>setUploadReq(req)}
                      : req.status==="verified"
                        ? {label:"View evidence",variant:"secondary",onClick:()=>setUploadReq(req)}
                        : ["submitted","uploaded"].includes(req.status)
                          ? {label:"Edit evidence",variant:"secondary",onClick:()=>setUploadReq(req)}
                          : req.status==="not_applicable"
                            ? {label:"Restore",variant:"secondary",onClick:()=>persistEvidence(req,{status:"missing",notes:"Restored during readiness assessment."})}
                            : {label:"Submit evidence",variant:"secondary",onClick:()=>setUploadReq(req)};
                    const overflowItems=[
                      {label:"Mark as working on it",disabled:saving,onClick:()=>persistEvidence(req,{status:"pending",notes:"Work started during readiness assessment."})},
                      {label:"Mark as missing",disabled:saving,tone:"danger",onClick:()=>persistEvidence(req,{status:"missing",notes:"Marked missing during readiness assessment."})},
                      {label:"Mark not applicable",disabled:saving,onClick:()=>{setNaReq(req);setNaReason(ev?.notes?.replace(/^Not applicable:\s*/,"")||"");}},
                    ];
                    return (
                      <div key={req.id} style={{border:`1px solid ${C.border}`,borderRadius:12,padding:14,background:C.white}}>
                        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:8}}>
                          <div style={{minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{req.requirementName}</div>
                              <Pill tone={req.is_mandatory===false?"neutral":"primary"} size="sm">{req.is_mandatory===false?"Recommended":"Required"}</Pill>
                            </div>
                            <div style={{fontSize:12,lineHeight:1.6,color:C.textMid}}>{req.description}</div>
                          </div>
                          <Pill tone={conf.tone}>{conf.label}</Pill>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,margin:"10px 0"}}>
                          <div style={{fontSize:12,color:C.textDim}}>Evidence: <strong style={{color:C.text}}>{(req.evidence_instructions||req.evidenceType||"Document").slice(0,70)}</strong></div>
                          <div style={{fontSize:12,color:C.textDim}}>Timeline: <strong style={{color:C.text}}>{timeline}</strong></div>
                          <div style={{fontSize:12,color:C.textDim}}>Cost: <strong style={{color:C.text}}>{cost}</strong></div>
                        </div>
                        {!!bodies.length&&<div style={{fontSize:12,color:C.textDim,marginBottom:10}}>Possible bodies: <strong style={{color:C.text}}>{bodies.slice(0,3).map(b=>b.name).join(", ")}</strong></div>}
                        {ev&&req.status!=="missing"&&<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:10,marginBottom:10,fontSize:12,lineHeight:1.6,color:C.textMid}}>
                          {ev.certificate_number&&<div>Reference: <strong style={{color:C.text}}>{ev.certificate_number}</strong></div>}
                          {ev.issued_at&&<div>Issued: <strong style={{color:C.text}}>{fmtD(ev.issued_at)}</strong></div>}
                          {ev.expires_at&&<div>Valid until: <strong style={{color:C.text}}>{fmtD(ev.expires_at)}</strong></div>}
                          {ev.file_url&&<div><button type="button" onClick={async()=>{const url=await DB.evidenceFileUrl(ev.file_url);if(url)window.open(url,"_blank","noopener,noreferrer");}} style={{background:"transparent",border:"none",color:C.primary,fontWeight:600,fontFamily:FONT_STACK,cursor:"pointer",padding:0,fontSize:12}}>Open evidence file</button></div>}
                          {ev.notes&&<div>{ev.notes}</div>}
                        </div>}
                        <div style={{display:"flex",gap:8,alignItems:"center",paddingTop:8,borderTop:`1px solid ${C.border}`}}>
                          <Btn size="sm" variant={primaryAction.variant} disabled={saving} onClick={primaryAction.onClick}>{primaryAction.label}</Btn>
                          <OverflowMenu items={overflowItems}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>}
      </Card>
      <Card style={{padding:20,borderColor:C.primaryBorder,background:C.primaryBg}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <Icon name="verified" size={22} color={C.primary}/>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.primary,marginBottom:4}}>Next best action</div>
            <div style={{fontSize:13,lineHeight:1.65,color:C.textMid}}>
              {missing[0]?`Start with ${missing[0].requirementName}. It is the highest-priority missing item for ${marketConf(activeMarket).short}.`:"Keep the evidence fresh and prepare a buyer-ready packet before sending profiles to international buyers."}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}


```


===== FILE: src/screens/ExportReadinessOnboarding.jsx =====

```jsx
import { useState } from "react";
import { C } from "../lib/domain";
import { EXPORT_MARKETS } from "../lib/markets";
import { EXPORT_PRODUCTS } from "../lib/readiness";
import { SPACE } from "../lib/tokens";
import { Btn, Card, Sel, T } from "../components/ui";
import { Pill } from "../components/Pill";

const STATUS_OPTIONS = [
  {value:"planning",label:"Planning my first export"},
  {value:"first_export",label:"Preparing my first shipment"},
  {value:"active_exporter",label:"Already exporting"},
  {value:"expanding_markets",label:"Expanding to new markets"},
];

export function ExportReadinessOnboarding({profile,onComplete,onSave,saving=false}) {
  const [step,setStep]=useState(0);
  const [form,setForm]=useState({
    markets:profile?.destination_markets?.length?profile.destination_markets:["EU"],
    productType:profile?.product_type||"granite",
    exportStatus:profile?.export_status||"planning",
  });
  const [err,setErr]=useState("");
  const canContinue=step>0 || form.markets.length>0;

  const toggleMarket=code=>{
    setForm(prev=>{
      const set=new Set(prev.markets);
      if(set.has(code))set.delete(code);else set.add(code);
      return {...prev,markets:Array.from(set)};
    });
  };
  const submit=async()=>{
    if(!form.markets.length){setErr("Pick at least one market to continue.");return;}
    setErr("");
    const saved=await onSave?.({
      sector:"stone",
      productType:form.productType,
      markets:form.markets,
      exportStatus:form.exportStatus,
      companySize:profile?.company_size||"",
      currentCertifications:profile?.current_certifications||[],
    });
    if(saved)onComplete?.();
  };

  return (
    <div style={{display:"grid",gap:SPACE.lg,maxWidth:760,margin:"0 auto"}}>
      <div>
        <div style={{...T.title,fontWeight:700,marginBottom:SPACE.xs}}>Export Readiness</div>
        <div style={{...T.hint,color:C.textDim}}>Let's set up your first readiness view around the markets you care about.</div>
      </div>
      <Card style={{padding:SPACE.xl}}>
        {step===0&&(
          <div style={{display:"grid",gap:SPACE.lg}}>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:SPACE.xs}}>Let's get started.</div>
              <div style={{fontSize:14,lineHeight:1.65,color:C.textMid}}>Which markets are you currently targeting, or want to target?</div>
            </div>
            <div style={{display:"flex",gap:SPACE.sm,flexWrap:"wrap"}}>
              {EXPORT_MARKETS.map(m=>{
                const active=form.markets.includes(m.value);
                return (
                  <button key={m.value} type="button" onClick={()=>toggleMarket(m.value)} style={{background:active?C.primaryBg:C.white,border:`1.5px solid ${active?C.primary:C.border}`,borderRadius:999,padding:"9px 13px",fontSize:13,fontWeight:600,color:active?C.primary:C.textMid,cursor:"pointer"}}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {step===1&&(
          <div style={{display:"grid",gap:SPACE.lg}}>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:SPACE.xs}}>What's your primary product?</div>
              <div style={{fontSize:14,lineHeight:1.65,color:C.textMid}}>You can adjust this later as your export plan changes.</div>
            </div>
            <Sel label="Primary product" value={form.productType} onChange={v=>setForm(p=>({...p,productType:v}))} options={EXPORT_PRODUCTS}/>
          </div>
        )}
        {step===2&&(
          <div style={{display:"grid",gap:SPACE.lg}}>
            <div>
              <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:SPACE.xs}}>Where are you today?</div>
              <div style={{fontSize:14,lineHeight:1.65,color:C.textMid}}>This helps us order the readiness work around your current stage.</div>
            </div>
            <div style={{display:"grid",gap:SPACE.sm}}>
              {STATUS_OPTIONS.map(opt=>{
                const active=form.exportStatus===opt.value;
                return (
                  <button key={opt.value} type="button" onClick={()=>setForm(p=>({...p,exportStatus:opt.value}))} style={{textAlign:"left",background:active?C.primaryBg:C.white,border:`1.5px solid ${active?C.primary:C.border}`,borderRadius:10,padding:"12px 14px",fontSize:14,fontWeight:600,color:active?C.primary:C.text,cursor:"pointer"}}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {err&&<div style={{marginTop:SPACE.md,color:C.red,fontSize:13}}>{err}</div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:SPACE.md,marginTop:SPACE.xl}}>
          <Pill tone="neutral">Step {step+1} of 3</Pill>
          <div style={{display:"flex",gap:SPACE.sm}}>
            {step>0&&<Btn variant="secondary" onClick={()=>setStep(s=>s-1)} disabled={saving}>Back</Btn>}
            {step<2&&<Btn onClick={()=>setStep(s=>s+1)} disabled={!canContinue||saving}>Continue</Btn>}
            {step===2&&<Btn onClick={submit} disabled={saving}>Create readiness view</Btn>}
          </div>
        </div>
      </Card>
    </div>
  );
}

```


===== FILE: src/screens/SellerDocuments.jsx =====

```jsx
import { useEffect, useMemo, useState } from "react";
import { C, fmtD } from "../lib/domain";
import { SPACE } from "../lib/tokens";
import { EXPORT_PRODUCTS, readinessStatusConf, scoreRequirements, sectionForRequirement } from "../lib/readiness";
import { EXPORT_MARKETS, marketConf } from "../lib/markets";
import { EvidenceUploadModal } from "../components/EvidenceUploadModal";
import { Icon } from "../components/Icon";
import { Pill } from "../components/Pill";
import { Btn, Card, Loader, Sel, T } from "../components/ui";

const DOC_SECTIONS = [
  { id: "business", label: "Business documents", readinessIds: ["market_entry"], hint: "Start here. These are the registrations buyers expect before export conversations get serious." },
  { id: "product", label: "Product test reports", readinessIds: ["product_standards"], hint: "Lab reports, CE/EN/ASTM evidence, and technical product documents." },
  { id: "factory", label: "Factory certificates", readinessIds: ["quality_evidence", "responsible_sourcing"], hint: "Factory-level certificates, social audit evidence, safety, and environmental records." },
  { id: "shipment", label: "Shipment documents", readinessIds: ["packaging_shipment"], hint: "Origin, packing, labelling, fumigation, and shipment proof." },
  { id: "slab", label: "Slab evidence", readinessIds: ["origin_traceability"], hint: "Auto-filled from scans where possible: slab certificates, inspection photos, supplier and batch data." },
];

const DEFAULT_FORM = {
  sector: "stone",
  productType: "any",
  markets: ["EU"],
  exportStatus: "planning",
  companySize: "",
  currentCertifications: [],
};

const TEXT = {
  title: { ...T.title, fontWeight: 700 },
  meta: { ...T.hint, color: C.textDim },
};

function docSectionForRequirement(req) {
  const section = sectionForRequirement(req);
  const found = DOC_SECTIONS.find(s => s.readinessIds.includes(section));
  return found?.id || "business";
}

function evidenceSummary(ev) {
  if (!ev) return null;
  const parts = [];
  if (ev.certificate_number) parts.push(`Ref ${ev.certificate_number}`);
  if (ev.expires_at) parts.push(`Valid until ${fmtD(ev.expires_at)}`);
  if (ev.file_url) parts.push("File added");
  if (!parts.length && ev.notes) parts.push(ev.notes.slice(0, 90));
  return parts.join(" · ");
}

export function SellerDocuments({ fac, user, DB, insps = [] }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [market, setMarket] = useState("EU");
  const [requirements, setRequirements] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [bodiesByReq, setBodiesByReq] = useState({});
  const [uploadReq, setUploadReq] = useState(null);
  const [showAllSections, setShowAllSections] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const evidenceByReq = useMemo(() => {
    const out = {};
    evidence.forEach(e => { out[e.requirement_id] = e; });
    return out;
  }, [evidence]);

  const scored = useMemo(() => requirements.map(r => ({
    ...r,
    status: evidenceByReq[r.id]?.status || "missing",
  })), [requirements, evidenceByReq]);

  const stats = scoreRequirements(requirements, evidence);
  const firstMissing = scored.find(r => ["missing", "expired", "rejected"].includes(r.status));
  const scanStats = useMemo(() => {
    const withPhoto = insps.filter(i => i.photo || (Array.isArray(i.photos) && i.photos.length)).length;
    const withBatch = insps.filter(i => i.measurements?.traceability?.batchNo).length;
    const exportReady = insps.filter(i => i.exportReady).length;
    return { total: insps.length, withPhoto, withBatch, exportReady };
  }, [insps]);

  async function fetchRequirements(nextForm, nextMarket) {
    const reqs = await DB.exportRequirements({
      sector: nextForm.sector,
      productType: nextForm.productType,
      market: nextMarket,
    });
    setRequirements(reqs);
    setBodiesByReq(await DB.readinessBodies(reqs.map(r => r.id)));
  }

  async function load() {
    if (!fac?.id) return;
    setLoading(true); setErr("");
    try {
      const p = await DB.getExportReadinessProfile(fac.id);
      const next = p ? {
        sector: p.sector || "stone",
        productType: p.product_type || "any",
        markets: p.destination_markets?.length ? p.destination_markets : ["EU"],
        exportStatus: p.export_status || "planning",
        companySize: p.company_size || "",
        currentCertifications: p.current_certifications || [],
      } : DEFAULT_FORM;
      const nextMarket = next.markets[0] || "EU";
      setProfile(p);
      setForm(next);
      setMarket(nextMarket);
      await fetchRequirements(next, nextMarket);
      setEvidence(p?.id ? await DB.readinessEvidence(p.id) : []);
    } catch (e) {
      console.error("Seller documents load failed", e);
      setErr(e.message || "Could not load seller documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [fac?.id]);

  async function saveProfile(nextForm = form) {
    setSaving(true); setErr("");
    try {
      const saved = await DB.saveExportReadinessProfile(profile, {
        factoryId: fac.id,
        userId: user.id,
        sector: nextForm.sector,
        productType: nextForm.productType,
        destinationMarkets: nextForm.markets?.length ? nextForm.markets : [market],
        currentCertifications: nextForm.currentCertifications,
        companySize: nextForm.companySize,
        exportStatus: nextForm.exportStatus,
        onboardingInputs: { source: "seller_documents", productType: nextForm.productType, markets: nextForm.markets },
      });
      setProfile(saved);
      setEvidence(await DB.readinessEvidence(saved.id));
      return saved;
    } catch (e) {
      console.error("Seller documents profile save failed", e);
      setErr(e.message || "Could not prepare document profile.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function changeProfile(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    if (patch.markets?.length) setMarket(patch.markets[0]);
    await saveProfile(next);
    await fetchRequirements(next, patch.markets?.[0] || market);
  }

  async function saveEvidence(req, patch) {
    let activeProfile = profile;
    if (!activeProfile?.id) activeProfile = await saveProfile(form);
    if (!activeProfile?.id) return;
    setSaving(true); setErr("");
    try {
      await DB.setReadinessEvidence({
        factoryId: fac.id,
        profileId: activeProfile.id,
        requirementId: req.id,
        evidenceType: req.evidenceType,
        evidenceLifecycleType: req.lifecycleType,
        userId: user.id,
        ...patch,
      });
      setEvidence(await DB.readinessEvidence(activeProfile.id));
      setUploadReq(null);
    } catch (e) {
      console.error("Seller document save failed", e);
      setErr(e.message || "Could not save document.");
    } finally {
      setSaving(false);
    }
  }

  async function markWorking(req) {
    await saveEvidence(req, { status: "pending", notes: "Working on this document." });
  }

  async function openEvidence(ev) {
    const url = await DB.evidenceFileUrl(ev?.file_url);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  const grouped = useMemo(() => {
    const out = Object.fromEntries(DOC_SECTIONS.map(s => [s.id, []]));
    scored.forEach(req => { out[docSectionForRequirement(req)].push(req); });
    return out;
  }, [scored]);
  const nextSectionId = firstMissing ? docSectionForRequirement(firstMissing) : null;
  const visibleSections = useMemo(() => {
    if (showAllSections || !nextSectionId) return DOC_SECTIONS;
    return DOC_SECTIONS.filter(section =>
      section.id === nextSectionId ||
      (grouped[section.id] || []).some(req => evidenceByReq[req.id])
    );
  }, [showAllSections, nextSectionId, grouped, evidenceByReq]);

  if (loading) return <Loader />;

  return (
    <div>
      {uploadReq && (
        <EvidenceUploadModal
          req={uploadReq}
          evidence={evidenceByReq[uploadReq.id]}
          bodies={bodiesByReq[uploadReq.id] || []}
          factoryId={fac?.id}
          saving={saving}
          onClose={() => setUploadReq(null)}
          onSave={patch => saveEvidence(uploadReq, patch)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: SPACE.base, alignItems: "flex-start", marginBottom: SPACE.lg, flexWrap: "wrap" }}>
        <div>
          <div style={TEXT.title}>Documents</div>
          <div style={{ ...TEXT.meta, marginTop: 4, maxWidth: 680 }}>
            Add the proof buyers ask for. Start with the missing items, one file or number at a time.
          </div>
        </div>
        <Pill tone={stats.score >= 75 ? "success" : stats.score >= 45 ? "warning" : "danger"} style={{ fontSize: 13, padding: "6px 12px" }}>
          {marketConf(market).short} ready: {stats.complete} of {stats.total}
        </Pill>
      </div>

      {err && (
        <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: C.red, marginBottom: SPACE.base }}>
          {err}
        </div>
      )}

      <Card style={{ padding: SPACE.lg, marginBottom: SPACE.base }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: SPACE.md, alignItems: "end" }}>
          <Sel
            label="Market"
            value={market}
            onChange={async v => {
              setMarket(v);
              const next = { ...form, markets: [v] };
              setForm(next);
              await saveProfile(next);
              await fetchRequirements(next, v);
            }}
            options={EXPORT_MARKETS}
          />
          <Sel
            label="Product"
            value={form.productType}
            onChange={v => changeProfile({ productType: v })}
            options={EXPORT_PRODUCTS}
          />
          <div style={{ display: "flex", gap: SPACE.sm, alignItems: "center", flexWrap: "wrap" }}>
            <Pill tone="success">{stats.complete} added</Pill>
            <Pill tone="warning">{stats.working} working</Pill>
            <Pill tone="danger">{stats.missing} missing</Pill>
          </div>
        </div>
      </Card>

      <Card style={{ padding: SPACE.lg, marginBottom: SPACE.base, background: firstMissing ? C.primaryBg : C.greenBg, borderColor: firstMissing ? C.primaryBorder : C.greenBorder }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.md, flexWrap: "wrap" }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name={firstMissing ? "upload" : "check"} size={20} color={firstMissing ? C.primary : C.green} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>
              {firstMissing ? `Next: add ${firstMissing.requirementName}` : "Core documents added"}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: C.textMid }}>
              {firstMissing ? firstMissing.evidence_instructions || "Upload the document or add the reference number when you have it." : "Keep expiry dates current before sharing evidence with buyers."}
            </div>
          </div>
          {firstMissing && <Btn size="sm" onClick={() => setUploadReq(firstMissing)}>Add document</Btn>}
        </div>
      </Card>

      {!showAllSections && nextSectionId && visibleSections.length < DOC_SECTIONS.length && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: SPACE.md, alignItems: "center", marginBottom: SPACE.base, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: C.textMid }}>
            Showing the next useful section first. The full readiness checklist is still available when needed.
          </div>
          <Btn size="sm" variant="secondary" onClick={() => setShowAllSections(true)}>View all document sections</Btn>
        </div>
      )}

      <div style={{ display: "grid", gap: SPACE.base }}>
        {visibleSections.map(section => {
          const rows = grouped[section.id] || [];
          const sectionStats = scoreRequirements(rows, evidence);
          return (
            <Card key={section.id} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: SPACE.lg, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", gap: SPACE.md, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{section.label}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: C.textMid, marginTop: 2 }}>{section.hint}</div>
                </div>
                <Pill tone={sectionStats.complete === sectionStats.total && sectionStats.total ? "success" : "neutral"}>
                  {sectionStats.complete} of {sectionStats.total}
                </Pill>
              </div>

              {section.id === "slab" && (
                <div style={{ padding: `${SPACE.md}px ${SPACE.lg}px`, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: SPACE.sm }}>
                  {[
                    ["Scans", scanStats.total],
                    ["With photos", scanStats.withPhoto],
                    ["With batch no.", scanStats.withBatch],
                    ["Export ready", scanStats.exportReady],
                  ].map(([label, value]) => (
                    <div key={label} style={{ fontSize: 12, color: C.textMid }}>
                      <strong style={{ display: "block", fontSize: 18, color: C.text, lineHeight: 1.1 }}>{value}</strong>
                      {label}
                    </div>
                  ))}
                </div>
              )}

              {!rows.length ? (
                <div style={{ padding: SPACE.lg, color: C.textDim, fontSize: 13 }}>No required documents in this section for the selected market.</div>
              ) : rows.map((req, index) => {
                const ev = evidenceByReq[req.id];
                const conf = readinessStatusConf(req.status);
                const summary = evidenceSummary(ev);
                return (
                  <div key={req.id} style={{ padding: SPACE.lg, borderTop: index ? `1px solid ${C.border}` : "none", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: SPACE.md, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: SPACE.sm, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <div style={{ fontSize: 14, lineHeight: 1.35, fontWeight: 700, color: C.text }}>{req.requirementName}</div>
                        {req.is_mandatory === false && <Pill tone="neutral" size="sm">Optional</Pill>}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: C.textMid, maxWidth: 760 }}>
                        {req.evidence_instructions || req.description || "Add the document, certificate number, or supporting note."}
                      </div>
                      {summary && (
                        <div style={{ fontSize: 12, lineHeight: 1.5, color: C.textDim, marginTop: 6 }}>
                          {summary}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: SPACE.sm, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <Pill tone={conf.tone}>{conf.label}</Pill>
                      {ev?.file_url && <Btn size="sm" variant="ghost" onClick={() => openEvidence(ev)}>Open</Btn>}
                      <Btn size="sm" variant={ev ? "secondary" : "primary"} disabled={saving} onClick={() => setUploadReq(req)}>
                        {ev ? "Edit" : "Add document"}
                      </Btn>
                      {!ev && <Btn size="sm" variant="ghost" disabled={saving} onClick={() => markWorking(req)}>Working on it</Btn>}
                    </div>
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

```


===== FILE: src/styles.css =====

```css
:root {
  font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", Arial, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html {
  line-height: 1.5;
  text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  font-family: inherit;
  line-height: 1.5;
  letter-spacing: 0;
}

button,
input,
textarea,
select {
  font: inherit;
  letter-spacing: 0;
}

button {
  line-height: 1.2;
}

input,
textarea,
select {
  line-height: 1.35;
}

.buyer-app {
  --buyer-accent: #0057a8;
  --buyer-ink: #06122d;
  --buyer-muted: #667085;
  --buyer-panel: #ffffff;
  --buyer-line: #e3e8f1;
  --buyer-soft: #f6f8fc;
  background: #f6f8fc;
}

.buyer-button,
.buyer-chip,
.buyer-featured-card,
.buyer-product-card,
.buyer-trade-sheet {
  -webkit-tap-highlight-color: transparent;
}

.buyer-sidebar {
  background: #ffffff;
  border-right: 1px solid var(--buyer-line);
}

.buyer-topbar,
.buyer-filter-panel,
.buyer-product-card,
.buyer-surface-card {
  box-shadow: 0 10px 28px rgba(16, 24, 40, 0.05);
}

.buyer-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background-color: #121826;
  background-size: cover;
  background-position: center;
}

.buyer-enter {
  animation: buyer-enter 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--i, 0) * 24ms);
}

.buyer-skeleton {
  background: linear-gradient(90deg, #f4f7fb 0%, #e9eef6 42%, #f4f7fb 84%);
  background-size: 220% 100%;
  animation: buyer-skeleton 1100ms ease-in-out infinite;
}

@keyframes buyer-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes buyer-skeleton {
  from {
    background-position: 120% 0;
  }
  to {
    background-position: -80% 0;
  }
}

@keyframes buyer-results-focus {
  from {
    opacity: 0.92;
    transform: translateY(4px);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes buyer-evidence-in {
  from {
    transform: scaleX(0.08);
  }
  to {
    transform: scaleX(var(--buyer-readiness-scale));
  }
}

.buyer-product-card,
.buyer-action-card,
.buyer-chip,
.buyer-button,
.buyer-evidence-fill {
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    background 180ms cubic-bezier(0.22, 1, 0.36, 1),
    color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.buyer-button:focus-visible,
.buyer-chip:focus-visible,
.buyer-product-card:focus-visible,
.buyer-topbar input:focus-visible,
.buyer-filter-panel select:focus-visible {
  outline: 2px solid rgba(17, 24, 95, 0.45);
  outline-offset: 2px;
}

.buyer-button:active,
.buyer-chip:active,
.buyer-action-card:active {
  transform: scale(0.98);
}

.buyer-image {
  transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

.buyer-results-grid {
  animation: buyer-results-focus 210ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.buyer-evidence-fill {
  transform-origin: left center;
  animation: buyer-evidence-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
  will-change: transform;
}

.buyer-mobile-nav {
  isolation: isolate;
}

.buyer-mobile-nav-indicator {
  position: absolute;
  left: 8px;
  top: 8px;
  bottom: 7px;
  width: calc((100% - 37px) / 4);
  border-radius: 999px;
  background: linear-gradient(135deg, #0067c5, #004987);
  box-shadow: 0 12px 26px rgba(0, 87, 168, 0.28);
  transition:
    transform 220ms cubic-bezier(0.32, 0.72, 0, 1),
    box-shadow 220ms cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 0;
  pointer-events: none;
}

.buyer-mobile-nav-item {
  position: relative;
  z-index: 1;
}

.buyer-mobile-nav-item.is-active svg,
.buyer-mobile-nav-item.is-active span {
  transform: translateY(-1px);
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.buyer-app-trade-open main > .buyer-topbar,
.buyer-app-trade-open main > div {
  filter: blur(1px);
  opacity: 0.68;
  transform: translateY(-2px);
  transition:
    opacity 180ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 180ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.buyer-sheet {
  animation: buyer-sheet 320ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

.buyer-trade-overlay {
  animation: buyer-overlay-in 160ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

.buyer-trade-sheet {
  transform-origin: bottom center;
  animation: buyer-trade-sheet-in 230ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

@keyframes buyer-sheet {
  from {
    opacity: 0;
    transform: translateY(18px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes buyer-overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes buyer-trade-sheet-in {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@media (max-width: 900px) {
  .buyer-sidebar {
    display: none !important;
  }

  .buyer-topbar {
    padding-top: calc(12px + env(safe-area-inset-top)) !important;
  }
}

@media (hover: hover) and (pointer: fine) {
  .buyer-product-card:hover,
  .buyer-action-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 44px rgba(16, 24, 40, 0.12);
  }

  .buyer-product-card:hover .buyer-image {
    transform: scale(1.035);
  }

}

@media (prefers-reduced-motion: reduce) {
  .buyer-enter,
  .buyer-results-grid,
  .buyer-evidence-fill,
  .buyer-skeleton,
  .buyer-sheet,
  .buyer-trade-overlay,
  .buyer-trade-sheet {
    animation-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
  }

  .buyer-product-card,
  .buyer-action-card,
  .buyer-chip,
  .buyer-button,
  .buyer-image,
  .buyer-evidence-fill {
    transition-duration: 0.01ms !important;
  }

  .buyer-mobile-nav-indicator,
  .buyer-mobile-nav-item,
  .buyer-mobile-nav-item.is-active svg,
  .buyer-mobile-nav-item.is-active span,
  .buyer-app-trade-open main > .buyer-topbar,
  .buyer-app-trade-open main > div {
    transition-duration: 0.01ms !important;
  }

  .buyer-product-card:hover,
  .buyer-action-card:hover,
  .buyer-product-card:hover .buyer-image,
  .buyer-app-trade-open main > .buyer-topbar,
  .buyer-app-trade-open main > div {
    transform: none !important;
    filter: none !important;
    opacity: 1 !important;
  }
}

```


===== FILE: supabase/config.toml =====

```toml
[functions.accept-invite]
verify_jwt = false

```


===== FILE: supabase/functions/accept-invite/index.ts =====

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type InviteBody = {
  email?: string;
  password?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Invite service is not configured" }, 500);

  let body: InviteBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return json({ error: "Email and password are required" }, 400);
  if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("email", email)
    .in("status", ["pending", "inactive", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) return json({ error: profileError.message }, 500);
  if (!profile) return json({ error: "No pending invite found for this email" }, 404);
  if (profile.status === "suspended") return json({ error: "Account suspended." }, 403);

  let authUserId = profile.auth_user_id as string | null;

  if (authUserId) {
    const { error: updateError } = await admin.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true
    });
    if (updateError) return json({ error: updateError.message }, 400);
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        epistable_profile_id: profile.id,
        role: profile.role,
        factory_id: profile.factory_id
      }
    });

    if (createError) {
      return json({
        error: createError.message.includes("already")
          ? "A login already exists for this email. Choose 'I Have Login' instead."
          : createError.message
      }, 400);
    }

    authUserId = created.user?.id || null;
  }

  if (!authUserId) return json({ error: "Could not create login" }, 500);

  const { data: linkedProfile, error: linkError } = await admin
    .from("profiles")
    .update({
      auth_user_id: authUserId,
      status: "active",
      last_active: Date.now()
    })
    .eq("id", profile.id)
    .select()
    .single();

  if (linkError) return json({ error: linkError.message }, 500);

  return json({ profile: linkedProfile });
});

```


===== FILE: supabase/functions/admin-invite/index.ts =====

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Invite service is not configured" }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const caller = userData?.user;
  if (userError || !caller) return json({ error: "Unauthorized" }, 401);

  const { data: callerProfile, error: callerProfileError } = await admin
    .from("profiles")
    .select("id, role, status")
    .eq("auth_user_id", caller.id)
    .maybeSingle();

  if (callerProfileError) return json({ error: "Unable to verify caller" }, 500);
  if (!callerProfile || callerProfile.status !== "active" || !["owner", "admin"].includes(callerProfile.role)) {
    return json({ error: "Forbidden" }, 403);
  }

  let body: { email?: string; name?: string; role?: string; factory_id?: string | null; factory_name?: string | null; redirect_to?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim() || "Epistable User";
  const role = body.role?.trim() || "buyer";
  const allowedRoles = ["owner", "admin", "manager", "inspector", "buyer"];

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Valid email is required" }, 400);
  if (!allowedRoles.includes(role)) return json({ error: "Invalid role" }, 400);

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (existingProfileError) return json({ error: existingProfileError.message }, 500);
  if (existingProfile?.status === "suspended") return json({ error: "Account suspended" }, 403);
  if (existingProfile?.auth_user_id) return json({ error: "A login already exists for this email" }, 409);

  let profile = existingProfile;
  if (!profile) {
    const id = crypto.randomUUID();
    const { data, error } = await admin
      .from("profiles")
      .insert({
        id,
        name,
        email,
        role,
        factory_id: body.factory_id ?? null,
        factory_name: body.factory_name ?? null,
        status: "pending",
        created_at: Date.now(),
      })
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    profile = data;
  } else {
    const { data, error } = await admin
      .from("profiles")
      .update({
        name,
        role,
        factory_id: body.factory_id ?? existingProfile.factory_id ?? null,
        factory_name: body.factory_name ?? existingProfile.factory_name ?? null,
        status: "pending",
      })
      .eq("id", existingProfile.id)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    profile = data;
  }

  const options: Record<string, unknown> = {
    data: {
      epistable_profile_id: profile.id,
      role: profile.role,
      factory_id: profile.factory_id,
    },
  };
  if (body.redirect_to) options.redirectTo = body.redirect_to;

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, options);
  if (inviteError) return json({ error: inviteError.message }, 400);

  const invitedUserId = inviteData?.user?.id;
  if (!invitedUserId) return json({ error: "Invite sent but user id was not returned" }, 500);

  const { data: linkedProfile, error: linkError } = await admin
    .from("profiles")
    .update({ auth_user_id: invitedUserId, status: "pending" })
    .eq("id", profile.id)
    .select()
    .single();

  if (linkError) return json({ error: linkError.message }, 500);

  return json({
    ok: true,
    invited: true,
    profile: {
      id: linkedProfile.id,
      email: linkedProfile.email,
      role: linkedProfile.role,
      status: linkedProfile.status,
      auth_user_id: linkedProfile.auth_user_id,
    },
  });
});

```


===== FILE: supabase/tests/marketplace_access.sql =====

```sql
-- Run after the marketplace access migration, as postgres. All fixtures roll back.
begin;

-- Complete trade fixtures; these defaults and all records are rolled back.
alter table public.products alter country_of_origin set default 'India', alter moq set default 1, alter moq_unit set default 'kg', alter packaging set default '["1kg pouch"]'::jsonb, alter shelf_life set default '12 months', alter storage_requirements set default 'Cool and dry';
alter table public.rfqs alter quantity set default 1, alter quantity_unit set default 'kg', alter destination_country set default 'India';
alter table public.trade_quotes alter quantity set default 1, alter quantity_unit set default 'kg', alter unit_price set default 1, alter total_amount set default 1, alter incoterm set default 'FOB', alter validity_ts set default (extract(epoch from now()+interval '30 days')*1000)::bigint;


create temporary table test_actors(label text,id uuid default gen_random_uuid());
insert into test_actors(label) values ('seller_a'),('seller_b'),('buyer_a'),('buyer_b'),('legacy_admin'),('pending'),('suspended'),('platform');
insert into auth.users(id,email) select id,'phase0-'||id||'@example.invalid' from test_actors;
insert into public.profiles(id,auth_user_id,name,email,role,status)
select id::text,id,'Phase 0 test','phase0-'||id||'@example.invalid','admin',
case label when 'pending' then 'pending' when 'suspended' then 'suspended' else 'active' end from test_actors;
insert into public.organizations(id,type,name,verification_status) values
('phase0_sa','seller','Test seller A','verified'),('phase0_sb','seller','Test seller B','unverified'),
('phase0_ba','buyer','Test buyer A','unverified'),('phase0_bb','buyer','Test buyer B','unverified');
insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
select id,case when label in ('seller_a','pending','suspended') then 'phase0_sa' when label='seller_b' then 'phase0_sb' when label='buyer_a' then 'phase0_ba' when label='buyer_b' then 'phase0_bb' end,
case when label='platform' then 'platform_admin' when label like 'buyer%' then 'buyer_admin' else 'seller_admin' end
from test_actors where label<>'legacy_admin';
insert into public.products(id,seller_org_id,name,category,status,verification_status) values
('phase0_pa','phase0_sa','Verified','Spices','active','verified'),
('phase0_draft','phase0_sa','Draft','Spices','draft','unverified'),
('phase0_pb','phase0_sb','Other seller','Spices','active','verified');
insert into public.trade_documents(id,organization_id,product_id,document_type,title,visibility,verification_status,expires_at) values
('phase0_doc','phase0_sa','phase0_pa','coa','Verified','buyers','verified',null),
('phase0_private','phase0_sa','phase0_pa','coa','Private','private','verified',null),
('phase0_expired','phase0_sa','phase0_pa','coa','Expired','buyers','verified',1);
insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values
('phase0_r','phase0_ba','phase0_sa','phase0_pa','open'),
('phase0_r2','phase0_bb','phase0_sb','phase0_pb','open'),
('phase0_rd','phase0_ba','phase0_sa','phase0_pa','draft'),
('phase0_ro','phase0_ba',null,null,'open');
insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values
('phase0_q','phase0_r','phase0_sa','sent'),('phase0_qd','phase0_r','phase0_sa','draft'),
('phase0_qb','phase0_ro','phase0_sb','sent');

create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.denied(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when insufficient_privilege or check_violation then return true; end $$;
grant select on test_actors to authenticated,anon;

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='buyer_a'),true);
set local role authenticated;
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=1), 'buyer sees only verified active products of verified sellers');
select pg_temp.assert_true(((select count(*) from public.trade_documents where id like 'phase0_%')=1), 'private and expired documents hidden');
select pg_temp.assert_true(((select count(*) from public.rfqs where id like 'phase0_%')=3), 'buyer sees own RFQs');
select pg_temp.assert_true(((select count(*) from public.trade_quotes where id like 'phase0_%')=2), 'buyer sees received quotes but no drafts');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.rfqs(id,buyer_org_id,status) values ('phase0_bad','phase0_bb','open')$q$)), 'cannot forge buyer');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.products(id,seller_org_id,name,category) values ('phase0_badp','phase0_sa','Bad','Spices')$q$)), 'buyer cannot create seller product');
insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values ('phase0_created','phase0_ba','phase0_sa','phase0_pa','open');
select pg_temp.assert_true(((select count(*) from public.rfqs where id='phase0_created')=1), 'own RFQ insert works');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=2), 'seller sees own drafts only');
select pg_temp.assert_true(((select count(*) from public.trade_documents where id like 'phase0_%')=3), 'seller sees own private evidence');
select pg_temp.assert_true(((select count(*) from public.rfqs where id='phase0_r2')=0), 'other targeted RFQ hidden');
select pg_temp.assert_true(((select count(*) from public.rfqs where id='phase0_rd')=0), 'buyer draft hidden');
select pg_temp.assert_true(((select count(*) from public.trade_quotes where id='phase0_qb')=0), 'competitor quote hidden on open RFQ');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.products(id,seller_org_id,name,category,verification_status) values ('phase0_fake','phase0_sa','Fake','Spices','verified')$q$)), 'seller cannot self verify');
select pg_temp.assert_true((pg_temp.denied($q$update public.organizations set verification_status='verified' where id='phase0_sa'$q$)), 'seller cannot approve organization');
select pg_temp.assert_true((pg_temp.denied($q$update public.products set seller_org_id='phase0_sb',status='draft',verification_status='pending' where id='phase0_pa'$q$)), 'seller cannot reassign product');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values ('phase0_badq','phase0_r2','phase0_sa','sent')$q$)), 'seller cannot quote another seller targeted RFQ');
select pg_temp.assert_true((pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values ('phase0_badq','phase0_r','phase0_sa','accepted')$q$)), 'seller cannot forge accepted quote');
insert into public.products(id,seller_org_id,name,category) values ('phase0_newp','phase0_sa','New','Spices');
select pg_temp.assert_true(((select count(*) from public.products where id='phase0_newp')=1), 'own product insert works');
insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values ('phase0_newq','phase0_created','phase0_sa','draft');
update public.trade_quotes set status='sent' where id='phase0_newq';
select pg_temp.assert_true(((select status from public.trade_quotes where id='phase0_newq')='sent'), 'seller can submit draft quote');
update public.trade_quotes set notes='tampered' where id='phase0_newq';
select pg_temp.assert_true(((select notes from public.trade_quotes where id='phase0_newq') is null), 'sent quote immutable for seller');
select pg_temp.assert_true((pg_temp.denied($q$insert into epistable_private.marketplace_access(auth_user_id,access_role) values (auth.uid(),'platform_admin')$q$)), 'membership privilege escalation blocked');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
set local role authenticated;
select pg_temp.assert_true((public.marketplace_context() is null), 'legacy_admin no context');
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=0), 'legacy_admin no product access');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='pending'),true);
set local role authenticated;
select pg_temp.assert_true((public.marketplace_context() is null), 'pending no context');
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=0), 'pending no product access');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='suspended'),true);
set local role authenticated;
select pg_temp.assert_true((public.marketplace_context() is null), 'suspended no context');
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=0), 'suspended no product access');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='buyer_b'),true);
set local role authenticated;
select pg_temp.assert_true(((select count(*) from public.rfqs where id='phase0_r')=0), 'buyer tenant isolation');
select pg_temp.assert_true(((select count(*) from public.trade_quotes where id='phase0_q')=0), 'buyer cannot read other quotes');

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
set local role authenticated;
select pg_temp.assert_true(((select count(*) from public.products where id like 'phase0_%')=4), 'platform admin sees all products');
update public.products set status='active',verification_status='verified' where id='phase0_newp';
select pg_temp.assert_true(((select verification_status from public.products where id='phase0_newp')='verified'), 'platform admin verifies');
reset role;
set local role anon;
select pg_temp.assert_true((pg_temp.denied('select * from public.products')), 'anonymous table access denied');
select pg_temp.assert_true((pg_temp.denied('select public.marketplace_context()')), 'anonymous context denied');
reset role;


reset role;
update public.profiles set organization_id='phase0_sa',organization_role='platform_admin' where auth_user_id=(select id from test_actors where label='legacy_admin');
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
select set_config('request.jwt.claims','{"user_metadata":{"role":"platform_admin","organization_id":"phase0_sa"}}',true);
set local role authenticated;
select pg_temp.assert_true(public.marketplace_context() is null,'profile fields and editable metadata cannot grant marketplace access');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$update public.trade_documents set verification_status='verified' where id='phase0_private'$q$),'seller cannot verify evidence');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_documents(id,organization_id,product_id,document_type,title) values ('phase0_crossdoc','phase0_sa','phase0_pb','coa','Invalid')$q$),'cross organization product document link blocked');
update public.products set name='tampered' where id='phase0_pb';
delete from public.products where id='phase0_newp';
select pg_temp.assert_true((select count(*) from public.products where id='phase0_newp')=1,'seller cannot delete evidence');
reset role;
select pg_temp.assert_true((select name from public.products where id='phase0_pb')='Other seller','cross tenant update affects zero rows');
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select pg_temp.assert_true(public.marketplace_context() is null,'authenticated database role without user identity has no authority');
reset role;

rollback;

```


===== FILE: supabase/tests/marketplace_organisations.sql =====

```sql
-- Run after the marketplace access migration, as postgres. All fixtures roll back.
begin;

-- Complete trade fixtures; these defaults and all records are rolled back.
alter table public.products alter country_of_origin set default 'India', alter moq set default 1, alter moq_unit set default 'kg', alter packaging set default '["1kg pouch"]'::jsonb, alter shelf_life set default '12 months', alter storage_requirements set default 'Cool and dry';
alter table public.rfqs alter quantity set default 1, alter quantity_unit set default 'kg', alter destination_country set default 'India';
alter table public.trade_quotes alter quantity set default 1, alter quantity_unit set default 'kg', alter unit_price set default 1, alter total_amount set default 1, alter incoterm set default 'FOB', alter validity_ts set default (extract(epoch from now()+interval '30 days')*1000)::bigint;


create temporary table test_actors(label text,id uuid default gen_random_uuid());
insert into test_actors(label) values ('seller_a'),('seller_b'),('buyer_a'),('buyer_b'),('legacy_admin'),('pending'),('suspended'),('platform');
insert into auth.users(id,email) select id,'phase0-'||id||'@example.invalid' from test_actors;
insert into public.profiles(id,auth_user_id,name,email,role,status)
select id::text,id,'Phase 0 test','phase0-'||id||'@example.invalid','admin',
case label when 'pending' then 'pending' when 'suspended' then 'suspended' else 'active' end from test_actors;
insert into public.organizations(id,type,name,verification_status) values
('phase0_sa','seller','Test seller A','verified'),('phase0_sb','seller','Test seller B','unverified'),
('phase0_ba','buyer','Test buyer A','unverified'),('phase0_bb','buyer','Test buyer B','unverified');
insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
select id,case when label in ('seller_a','pending','suspended') then 'phase0_sa' when label='seller_b' then 'phase0_sb' when label='buyer_a' then 'phase0_ba' when label='buyer_b' then 'phase0_bb' end,
case when label='platform' then 'platform_admin' when label like 'buyer%' then 'buyer_admin' else 'seller_admin' end
from test_actors where label<>'legacy_admin';
insert into public.products(id,seller_org_id,name,category,status,verification_status) values
('phase0_pa','phase0_sa','Verified','Spices','active','verified'),
('phase0_draft','phase0_sa','Draft','Spices','draft','unverified'),
('phase0_pb','phase0_sb','Other seller','Spices','active','verified');
insert into public.trade_documents(id,organization_id,product_id,document_type,title,visibility,verification_status,expires_at) values
('phase0_doc','phase0_sa','phase0_pa','coa','Verified','buyers','verified',null),
('phase0_private','phase0_sa','phase0_pa','coa','Private','private','verified',null),
('phase0_expired','phase0_sa','phase0_pa','coa','Expired','buyers','verified',1);
insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values
('phase0_r','phase0_ba','phase0_sa','phase0_pa','open'),
('phase0_r2','phase0_bb','phase0_sb','phase0_pb','open'),
('phase0_rd','phase0_ba','phase0_sa','phase0_pa','draft'),
('phase0_ro','phase0_ba',null,null,'open');
insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values
('phase0_q','phase0_r','phase0_sa','sent'),('phase0_qd','phase0_r','phase0_sa','draft'),
('phase0_qb','phase0_ro','phase0_sb','sent');

create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.denied(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when insufficient_privilege or check_violation then return true; end $$;
grant select on test_actors to authenticated,anon;

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied('select public.marketplace_accounts()'),'legacy admin cannot list accounts');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access(auth.uid(),'phase0_sa','seller_admin')$q$),'legacy admin cannot self assign');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied('select public.marketplace_accounts()'),'seller cannot list accounts');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access(auth.uid(),'phase0_sb','seller_admin')$q$),'seller cannot move self');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
set local role authenticated;
select pg_temp.assert_true(jsonb_array_length(public.marketplace_accounts())>=8,'platform can list linked accounts');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access((select id from test_actors where label='legacy_admin'),'phase0_sa','buyer_admin')$q$),'mismatched org role blocked');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access((select id from test_actors where label='legacy_admin'),'phase0_sa','platform_admin')$q$),'cannot grant platform role');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access((select id from test_actors where label='pending'),'phase0_sa','seller_member')$q$),'pending account blocked');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access(auth.uid(),'phase0_sa','seller_admin')$q$),'platform assignment protected');
select public.assign_marketplace_access((select id from test_actors where label='legacy_admin'),'phase0_sa','seller_member');
reset role;
select pg_temp.assert_true((select role from public.profiles where auth_user_id=(select id from test_actors where label='legacy_admin'))='admin','legacy role unchanged');
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
set local role authenticated;
select pg_temp.assert_true(public.marketplace_context()->>'role'='seller_member','assigned member gets context');
select pg_temp.assert_true(pg_temp.denied($q$update public.organizations set name='Tampered',verification_status='pending' where id='phase0_sa'$q$) or (select name from public.organizations where id='phase0_sa')='Test seller A','member cannot edit org');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
set local role authenticated;
select public.assign_marketplace_access((select id from test_actors where label='legacy_admin'),'phase0_ba','buyer_admin');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='legacy_admin'),true);
set local role authenticated;
select pg_temp.assert_true(public.marketplace_context()->>'org'='phase0_ba','reassignment replaces old org');
select pg_temp.assert_true((select count(*) from public.products where id='phase0_draft')=0,'old seller draft access revoked');
reset role;
set local role anon;
select pg_temp.assert_true(pg_temp.denied('select public.marketplace_accounts()'),'anonymous list denied');
select pg_temp.assert_true(pg_temp.denied($q$select public.assign_marketplace_access(null,null,null)$q$),'anonymous assignment denied');
reset role;
rollback;

```


===== FILE: supabase/tests/marketplace_trade_workflows.sql =====

```sql
-- Run after the marketplace access migration, as postgres. All fixtures roll back.
begin;

-- Complete trade fixtures; these defaults and all records are rolled back.
alter table public.products alter country_of_origin set default 'India', alter moq set default 1, alter moq_unit set default 'kg', alter packaging set default '["1kg pouch"]'::jsonb, alter shelf_life set default '12 months', alter storage_requirements set default 'Cool and dry';
alter table public.rfqs alter quantity set default 1, alter quantity_unit set default 'kg', alter destination_country set default 'India';
alter table public.trade_quotes alter quantity set default 1, alter quantity_unit set default 'kg', alter unit_price set default 1, alter total_amount set default 1, alter incoterm set default 'FOB', alter validity_ts set default (extract(epoch from now()+interval '30 days')*1000)::bigint;


create temporary table test_actors(label text,id uuid default gen_random_uuid());
insert into test_actors(label) values ('seller_a'),('seller_b'),('buyer_a'),('buyer_b'),('legacy_admin'),('pending'),('suspended'),('platform');
insert into auth.users(id,email) select id,'phase0-'||id||'@example.invalid' from test_actors;
insert into public.profiles(id,auth_user_id,name,email,role,status)
select id::text,id,'Phase 0 test','phase0-'||id||'@example.invalid','admin',
case label when 'pending' then 'pending' when 'suspended' then 'suspended' else 'active' end from test_actors;
insert into public.organizations(id,type,name,verification_status) values
('phase0_sa','seller','Test seller A','verified'),('phase0_sb','seller','Test seller B','unverified'),
('phase0_ba','buyer','Test buyer A','unverified'),('phase0_bb','buyer','Test buyer B','unverified');
insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
select id,case when label in ('seller_a','pending','suspended') then 'phase0_sa' when label='seller_b' then 'phase0_sb' when label='buyer_a' then 'phase0_ba' when label='buyer_b' then 'phase0_bb' end,
case when label='platform' then 'platform_admin' when label like 'buyer%' then 'buyer_admin' else 'seller_admin' end
from test_actors where label<>'legacy_admin';
insert into public.products(id,seller_org_id,name,category,status,verification_status) values
('phase0_pa','phase0_sa','Verified','Spices','active','verified'),
('phase0_draft','phase0_sa','Draft','Spices','draft','unverified'),
('phase0_pb','phase0_sb','Other seller','Spices','active','verified');
insert into public.trade_documents(id,organization_id,product_id,document_type,title,visibility,verification_status,expires_at) values
('phase0_doc','phase0_sa','phase0_pa','coa','Verified','buyers','verified',null),
('phase0_private','phase0_sa','phase0_pa','coa','Private','private','verified',null),
('phase0_expired','phase0_sa','phase0_pa','coa','Expired','buyers','verified',1);
insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values
('phase0_r','phase0_ba','phase0_sa','phase0_pa','open'),
('phase0_r2','phase0_bb','phase0_sb','phase0_pb','open'),
('phase0_rd','phase0_ba','phase0_sa','phase0_pa','draft'),
('phase0_ro','phase0_ba',null,null,'open');
insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values
('phase0_q','phase0_r','phase0_sa','sent'),('phase0_qd','phase0_r','phase0_sa','draft'),
('phase0_qb','phase0_ro','phase0_sb','sent');

create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.denied(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when insufficient_privilege or check_violation or unique_violation then return true; end $$;
grant select on test_actors to authenticated,anon;


reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$insert into public.products(id,seller_org_id,name,category,moq) values('phase0_negative','phase0_sa','Invalid','Spices',-1)$q$),'negative minimum order blocked');
select pg_temp.assert_true(pg_temp.denied($q$update public.products set country_of_origin=null,verification_status='pending',status='draft' where id='phase0_draft'$q$),'incomplete product submission blocked');
update public.products set verification_status='pending',review_note='I verified myself' where id='phase0_draft';
select pg_temp.assert_true((select review_note from public.products where id='phase0_draft') is null,'member cannot forge review reason');
select pg_temp.assert_true((select count(*) from public.marketplace_reviews where target_id='phase0_draft' and decision='pending')=1,'submission history recorded');
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('product','phase0_draft','verified','Self approval')$q$),'seller review RPC denied');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status,total_amount) values('phase0_badtotal','phase0_ro','phase0_sa','sent',900)$q$),'incorrect quote total blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status,total_amount) values('phase0_nulltotal','phase0_ro','phase0_sa','sent',null)$q$),'missing quote total blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status,validity_ts) values('phase0_oldquote','phase0_ro','phase0_sa','sent',1)$q$),'expired quote submission blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_quotes(id,rfq_id,seller_org_id,status) values('phase0_duplicate','phase0_r','phase0_sa','sent')$q$),'duplicate submitted seller quote blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.trade_documents(id,organization_id,document_type,title,file_url) values('phase0_badurl','phase0_sa','coa','Unsafe','javascript:alert(1)')$q$),'unsafe evidence URL blocked');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='buyer_a'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$insert into public.rfqs(id,buyer_org_id,status,quantity) values('phase0_zero','phase0_ba','open',0)$q$),'zero RFQ quantity blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.rfqs(id,buyer_org_id,status,destination_country) values('phase0_missingdest','phase0_ba','open',null)$q$),'missing destination blocked');
select pg_temp.assert_true(pg_temp.denied($q$insert into public.rfqs(id,buyer_org_id,seller_org_id,product_id,status) values('phase0_hiddenproduct','phase0_ba','phase0_sb','phase0_pb','open')$q$),'buyer cannot target hidden product');
select pg_temp.assert_true((select count(*) from public.marketplace_reviews where target_id='phase0_draft')=0,'buyer cannot read seller review history');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
set local role authenticated;
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('product','phase0_draft','verified',' ')$q$),'review reason required');
select public.review_marketplace_record('product','phase0_draft','verified','Checked product specification and supporting evidence');
select pg_temp.assert_true((select status='active' and verification_status='verified' from public.products where id='phase0_draft'),'approval publishes product');
select pg_temp.assert_true((select count(*) from public.marketplace_reviews where target_id='phase0_draft' and decision='verified' and reason='Checked product specification and supporting evidence')=1,'approval history persisted');
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('product','phase0_draft','rejected','Stale decision')$q$),'stale review rejected');
select pg_temp.assert_true(pg_temp.denied($q$update public.marketplace_reviews set reason='Tampered' where target_id='phase0_draft'$q$),'review history immutable even for platform client');
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('document','phase0_expired','verified','Expired evidence')$q$),'expired document approval blocked');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='seller_a'),true);
set local role authenticated;
update public.products set name='Edited food',status='draft',verification_status='pending' where id='phase0_draft';
select pg_temp.assert_true((select review_note from public.products where id='phase0_draft') is null,'editing clears old review reason');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='buyer_a'),true);
set local role authenticated;
select pg_temp.assert_true((select count(*) from public.products where id='phase0_draft')=0,'edited product hidden until reviewed again');
reset role;
set local role anon;
select pg_temp.assert_true(pg_temp.denied('select * from public.marketplace_reviews'),'anonymous history denied');
select pg_temp.assert_true(pg_temp.denied($q$select public.review_marketplace_record('product','phase0_draft','verified','Anonymous')$q$),'anonymous review denied');
reset role;
rollback;

```


===== FILE: supabase/migrations/202605030001_auth_rls_hardening.sql =====

```sql
-- Epistable Auth/RLS hardening draft
-- Review in Supabase SQL editor before applying. This is intentionally additive first.

create table if not exists public.profiles (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('owner', 'admin', 'manager', 'inspector', 'buyer')),
  factory_id text references public.factories(id),
  factory_name text,
  company text,
  avatar text,
  status text not null default 'active',
  scans_total integer not null default 0,
  last_active bigint,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists profiles_factory_id_idx on public.profiles(factory_id);
create index if not exists profiles_auth_user_id_idx on public.profiles(auth_user_id);

alter table public.factories enable row level security;
alter table public.inspections enable row level security;
alter table public.suppliers enable row level security;
alter table public.disputes enable row level security;
alter table public.inquiries enable row level security;
alter table public.notifications enable row level security;
alter table public.profiles enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.current_profile_factory_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select factory_id from public.profiles where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'owner'
$$;

create or replace function public.same_factory(factory_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_owner() or public.current_profile_factory_id() = factory_id
$$;

-- Profiles
create policy "profiles read own factory" on public.profiles
  for select using (public.is_owner() or auth_user_id = auth.uid() or public.same_factory(factory_id));

create policy "profiles owner writes" on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

-- Factories
create policy "factories read own" on public.factories
  for select using (public.is_owner() or public.same_factory(id));

create policy "factories owner writes" on public.factories
  for all using (public.is_owner()) with check (public.is_owner());

create policy "factories admins update own" on public.factories
  for update using (public.current_profile_role() in ('admin', 'manager') and public.same_factory(id))
  with check (public.current_profile_role() in ('admin', 'manager') and public.same_factory(id));

-- Inspections
create policy "inspections read own factory" on public.inspections
  for select using (public.is_owner() or public.same_factory(factory_id));

create policy "inspections create own factory" on public.inspections
  for insert with check (public.current_profile_role() in ('admin', 'manager', 'inspector') and public.same_factory(factory_id));

create policy "inspections update own factory" on public.inspections
  for update using (public.current_profile_role() in ('admin', 'manager') and public.same_factory(factory_id))
  with check (public.current_profile_role() in ('admin', 'manager') and public.same_factory(factory_id));

-- Factory-scoped tables
create policy "suppliers own factory" on public.suppliers
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "disputes own factory" on public.disputes
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "inquiries own factory" on public.inquiries
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "notifications own user" on public.notifications
  for all using (public.is_owner() or user_id in (select id from public.profiles where auth_user_id = auth.uid()))
  with check (public.is_owner() or user_id in (select id from public.profiles where auth_user_id = auth.uid()));

-- After creating Supabase Auth users and migrating rows into profiles, remove plaintext password columns:
-- alter table public.users drop column if exists password;
-- alter table public.buyers drop column if exists password;

```


===== FILE: supabase/migrations/202605030002_public_slab_certificate.sql =====

```sql
-- Public one-slab certificate lookup for QR codes.
-- This keeps table RLS closed while allowing anonymous visitors to view a single scanned slab by ID.

create or replace function public.get_public_slab_certificate(slab_id text)
returns table (
  id text,
  factory_id text,
  factory_name text,
  factory_location text,
  factory_contact_email text,
  inspector text,
  stone text,
  supplier text,
  grade text,
  reason text,
  price_per_sq_ft numeric,
  export_ready boolean,
  measurements jsonb,
  defects jsonb,
  notes text,
  photo text,
  photos jsonb,
  ts bigint,
  date text,
  "time" text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    f.location as factory_location,
    f.contact_email as factory_contact_email,
    i.inspector,
    i.stone,
    i.supplier,
    i.grade,
    i.reason,
    i.price_per_sq_ft::numeric,
    i.export_ready,
    coalesce(to_jsonb(i.measurements), '{}'::jsonb) as measurements,
    coalesce(to_jsonb(i.defects), '[]'::jsonb) as defects,
    i.notes,
    i.photo,
    coalesce(to_jsonb(i.photos), '[]'::jsonb) as photos,
    i.ts,
    i.date,
    i."time"
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1
$$;

grant execute on function public.get_public_slab_certificate(text) to anon, authenticated;

```


===== FILE: supabase/migrations/202605040001_public_slab_inquiry.sql =====

```sql
-- Public slab inquiry creation for certificate pages.
-- Keeps inquiries RLS closed while allowing anonymous QR viewers to submit interest for a real slab.

create or replace function public.create_public_slab_inquiry(
  slab_id text,
  buyer_name text,
  buyer_company text default '',
  buyer_email text default '',
  buyer_message text default ''
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  slab record;
  new_id text;
  clean_name text := nullif(trim(buyer_name), '');
  clean_email text := lower(nullif(trim(buyer_email), ''));
begin
  if clean_name is null then
    raise exception 'Buyer name is required';
  end if;

  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    i.stone,
    i.grade,
    i.price_per_sq_ft
  into slab
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1;

  if slab.id is null then
    raise exception 'Slab not found';
  end if;

  new_id := 'INQ-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into public.inquiries (
    id,
    slab_id,
    stone,
    grade,
    price_per_sq_ft,
    factory_id,
    factory_name,
    buyer_name,
    buyer_company,
    buyer_email,
    message,
    created_at,
    status
  ) values (
    new_id,
    slab.id,
    slab.stone,
    slab.grade,
    slab.price_per_sq_ft,
    slab.factory_id,
    slab.factory_name,
    clean_name,
    coalesce(nullif(trim(buyer_company), ''), ''),
    coalesce(clean_email, ''),
    coalesce(nullif(trim(buyer_message), ''), ''),
    (extract(epoch from now()) * 1000)::bigint,
    'new'
  );

  return new_id;
end;
$$;

grant execute on function public.create_public_slab_inquiry(text, text, text, text, text) to anon, authenticated;

```


===== FILE: supabase/migrations/202605050001_public_slab_dispute.sql =====

```sql
-- Public slab dispute creation for certificate pages.
-- Keeps disputes RLS closed while allowing anonymous QR viewers to report a problem with a real slab.

create or replace function public.create_public_slab_dispute(
  slab_id text,
  buyer_name text,
  buyer_company text default '',
  dispute_category text default 'other',
  dispute_details text default ''
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  slab record;
  new_id text;
  clean_name text := nullif(trim(buyer_name), '');
  clean_details text := nullif(trim(dispute_details), '');
  clean_category text := coalesce(nullif(trim(dispute_category), ''), 'other');
begin
  if clean_name is null then
    raise exception 'Buyer name is required';
  end if;

  if clean_details is null then
    raise exception 'Dispute details are required';
  end if;

  if clean_category not in ('wrong_grade', 'defect_missed', 'measurement', 'other') then
    clean_category := 'other';
  end if;

  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    i.stone,
    i.grade
  into slab
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1;

  if slab.id is null then
    raise exception 'Slab not found';
  end if;

  new_id := 'DSP-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into public.disputes (
    id,
    slab_id,
    stone,
    grade,
    category,
    details,
    factory_id,
    factory_name,
    buyer_name,
    buyer_company,
    created_at,
    status
  ) values (
    new_id,
    slab.id,
    slab.stone,
    slab.grade,
    clean_category,
    clean_details,
    slab.factory_id,
    slab.factory_name,
    clean_name,
    coalesce(nullif(trim(buyer_company), ''), ''),
    (extract(epoch from now()) * 1000)::bigint,
    'open'
  );

  return new_id;
end;
$$;

grant execute on function public.create_public_slab_dispute(text, text, text, text, text) to anon, authenticated;

```


===== FILE: supabase/migrations/202605090001_profile_access_management.sql =====

```sql
-- Allow factory admins/managers to manage access for profiles in their own factory.
-- Owners keep full profile access through the existing owner policy.

drop policy if exists "profiles factory admins insert own" on public.profiles;
drop policy if exists "profiles factory admins update own" on public.profiles;

create policy "profiles factory admins insert own" on public.profiles
  for insert
  with check (
    public.current_profile_role() in ('admin', 'manager')
    and public.same_factory(factory_id)
    and role in ('admin', 'manager', 'inspector', 'buyer')
  );

create policy "profiles factory admins update own" on public.profiles
  for update
  using (
    public.current_profile_role() in ('admin', 'manager')
    and public.same_factory(factory_id)
    and role <> 'owner'
  )
  with check (
    public.current_profile_role() in ('admin', 'manager')
    and public.same_factory(factory_id)
    and role in ('admin', 'manager', 'inspector', 'buyer')
  );

```


===== FILE: supabase/migrations/202605090002_activity_logs.sql =====

```sql
-- Activity log foundation for admin actions.

create table if not exists public.activity_logs (
  id text primary key,
  ts bigint not null,
  action text not null,
  actor_id text,
  actor_name text not null default '',
  factory_id text references public.factories(id),
  factory_name text default '',
  target_type text not null,
  target_id text not null,
  target_name text default '',
  details jsonb not null default '{}'::jsonb
);

create index if not exists activity_logs_ts_idx on public.activity_logs(ts desc);
create index if not exists activity_logs_factory_id_ts_idx on public.activity_logs(factory_id, ts desc);
create index if not exists activity_logs_target_idx on public.activity_logs(target_type, target_id);

alter table public.activity_logs enable row level security;

drop policy if exists "activity logs read own factory" on public.activity_logs;
drop policy if exists "activity logs create own factory" on public.activity_logs;

create policy "activity logs read own factory" on public.activity_logs
  for select
  using (public.is_owner() or public.same_factory(factory_id));

create policy "activity logs create own factory" on public.activity_logs
  for insert
  with check (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  );

```


===== FILE: supabase/migrations/202605090003_invite_acceptance.sql =====

```sql
-- Let invited users link their Supabase Auth account to a pending Epistable profile.

create or replace function public.accept_profile_invite()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_profile public.profiles;
  user_email text := lower(auth.email());
begin
  if auth.uid() is null or user_email is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set
    auth_user_id = auth.uid(),
    status = 'active',
    last_active = extract(epoch from now())::bigint * 1000
  where lower(email) = user_email
    and coalesce(status, 'pending') in ('pending', 'inactive', 'active')
    and (auth_user_id is null or auth_user_id = auth.uid())
  returning * into invited_profile;

  if invited_profile.id is null then
    raise exception 'No pending invite found for this email';
  end if;

  return invited_profile;
end;
$$;

grant execute on function public.accept_profile_invite() to authenticated;

```


===== FILE: supabase/migrations/202605100001_inventory_status.sql =====

```sql
-- Track whether a verified slab is available to buyers.

alter table public.inspections
  add column if not exists inventory_status text not null default 'available';

alter table public.inspections
  drop constraint if exists inspections_inventory_status_check;

alter table public.inspections
  add constraint inspections_inventory_status_check
  check (inventory_status in ('available', 'reserved', 'sold'));

create or replace function public.get_public_slab_certificate(slab_id text)
returns table (
  id text,
  factory_id text,
  factory_name text,
  factory_location text,
  factory_contact_email text,
  inspector text,
  stone text,
  supplier text,
  grade text,
  reason text,
  price_per_sq_ft numeric,
  export_ready boolean,
  inventory_status text,
  measurements jsonb,
  defects jsonb,
  notes text,
  photo text,
  photos jsonb,
  ts bigint,
  date text,
  "time" text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    f.location as factory_location,
    f.contact_email as factory_contact_email,
    i.inspector,
    i.stone,
    i.supplier,
    i.grade,
    i.reason,
    i.price_per_sq_ft::numeric,
    i.export_ready,
    coalesce(i.inventory_status, 'available') as inventory_status,
    coalesce(to_jsonb(i.measurements), '{}'::jsonb) as measurements,
    coalesce(to_jsonb(i.defects), '[]'::jsonb) as defects,
    i.notes,
    i.photo,
    coalesce(to_jsonb(i.photos), '[]'::jsonb) as photos,
    i.ts,
    i.date,
    i."time"
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1
$$;

grant execute on function public.get_public_slab_certificate(text) to anon, authenticated;

create or replace function public.create_public_slab_inquiry(
  slab_id text,
  buyer_name text,
  buyer_company text default '',
  buyer_email text default '',
  buyer_message text default ''
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  slab record;
  new_id text;
  clean_name text := nullif(trim(buyer_name), '');
  clean_email text := lower(nullif(trim(buyer_email), ''));
begin
  if clean_name is null then
    raise exception 'Buyer name is required';
  end if;

  select
    i.id,
    i.factory_id,
    coalesce(i.factory_name, f.name) as factory_name,
    i.stone,
    i.grade,
    i.price_per_sq_ft,
    coalesce(i.inventory_status, 'available') as inventory_status
  into slab
  from public.inspections i
  left join public.factories f on f.id = i.factory_id
  where i.id = slab_id
  limit 1;

  if slab.id is null then
    raise exception 'Slab not found';
  end if;

  if slab.inventory_status <> 'available' then
    raise exception 'This slab is not currently available';
  end if;

  new_id := 'INQ-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into public.inquiries (
    id,
    slab_id,
    stone,
    grade,
    price_per_sq_ft,
    factory_id,
    factory_name,
    buyer_name,
    buyer_company,
    buyer_email,
    message,
    created_at,
    status
  ) values (
    new_id,
    slab.id,
    slab.stone,
    slab.grade,
    slab.price_per_sq_ft,
    slab.factory_id,
    slab.factory_name,
    clean_name,
    coalesce(nullif(trim(buyer_company), ''), ''),
    coalesce(clean_email, ''),
    coalesce(nullif(trim(buyer_message), ''), ''),
    (extract(epoch from now()) * 1000)::bigint,
    'new'
  );

  return new_id;
end;
$$;

grant execute on function public.create_public_slab_inquiry(text, text, text, text, text) to anon, authenticated;

```


===== FILE: supabase/migrations/202605100002_inquiry_followups.sql =====

```sql
-- Lightweight sales follow-up fields for buyer inquiries.

alter table public.inquiries
  add column if not exists priority text not null default 'warm',
  add column if not exists factory_notes text,
  add column if not exists follow_up_at bigint;

alter table public.inquiries
  drop constraint if exists inquiries_priority_check;

alter table public.inquiries
  add constraint inquiries_priority_check
  check (priority in ('hot', 'warm', 'low'));

create index if not exists inquiries_factory_follow_up_idx
  on public.inquiries (factory_id, follow_up_at)
  where follow_up_at is not null;

```


===== FILE: supabase/migrations/202605100003_quotes.sql =====

```sql
-- Quotes/proforma records generated from buyer inquiries.

create table if not exists public.quotes (
  id text primary key,
  inquiry_id text references public.inquiries(id) on delete set null,
  slab_id text references public.inspections(id) on delete set null,
  factory_id text references public.factories(id) on delete cascade,
  factory_name text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  stone text,
  grade text,
  price_per_sq_ft numeric,
  area_sq_ft numeric,
  total_amount numeric,
  validity_ts bigint,
  notes text,
  status text not null default 'sent',
  created_at bigint not null,
  updated_at bigint
);

alter table public.quotes enable row level security;

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'expired'));

drop policy if exists "quotes own factory" on public.quotes;

create policy "quotes own factory" on public.quotes
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create index if not exists quotes_factory_created_idx
  on public.quotes (factory_id, created_at desc);

create or replace function public.get_public_quote(quote_id text)
returns table (
  id text,
  inquiry_id text,
  slab_id text,
  factory_id text,
  factory_name text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  stone text,
  grade text,
  price_per_sq_ft numeric,
  area_sq_ft numeric,
  total_amount numeric,
  validity_ts bigint,
  notes text,
  status text,
  created_at bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id,
    q.inquiry_id,
    q.slab_id,
    q.factory_id,
    q.factory_name,
    q.buyer_name,
    q.buyer_company,
    q.buyer_email,
    q.stone,
    q.grade,
    q.price_per_sq_ft,
    q.area_sq_ft,
    q.total_amount,
    q.validity_ts,
    q.notes,
    q.status,
    q.created_at
  from public.quotes q
  where q.id = quote_id
  limit 1
$$;

grant execute on function public.get_public_quote(text) to anon, authenticated;

```


===== FILE: supabase/migrations/202605100004_quote_decisions.sql =====

```sql
-- Buyer decisions on public quote links.

alter table public.quotes
  add column if not exists buyer_message text,
  add column if not exists buyer_decided_at bigint;

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'revision_requested', 'expired'));

drop function if exists public.get_public_quote(text);

create function public.get_public_quote(quote_id text)
returns table (
  id text,
  inquiry_id text,
  slab_id text,
  factory_id text,
  factory_name text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  stone text,
  grade text,
  price_per_sq_ft numeric,
  area_sq_ft numeric,
  total_amount numeric,
  validity_ts bigint,
  notes text,
  status text,
  buyer_message text,
  buyer_decided_at bigint,
  created_at bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id,
    q.inquiry_id,
    q.slab_id,
    q.factory_id,
    q.factory_name,
    q.buyer_name,
    q.buyer_company,
    q.buyer_email,
    q.stone,
    q.grade,
    q.price_per_sq_ft,
    q.area_sq_ft,
    q.total_amount,
    q.validity_ts,
    q.notes,
    q.status,
    q.buyer_message,
    q.buyer_decided_at,
    q.created_at
  from public.quotes q
  where q.id = quote_id
  limit 1
$$;

create or replace function public.respond_to_quote(
  quote_id text,
  decision text,
  message text default null
)
returns table (
  id text,
  inquiry_id text,
  slab_id text,
  factory_id text,
  factory_name text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  stone text,
  grade text,
  price_per_sq_ft numeric,
  area_sq_ft numeric,
  total_amount numeric,
  validity_ts bigint,
  notes text,
  status text,
  buyer_message text,
  buyer_decided_at bigint,
  created_at bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  if decision not in ('accepted', 'revision_requested') then
    raise exception 'Invalid quote decision';
  end if;

  next_status := decision;

  update public.quotes q
  set
    status = next_status,
    buyer_message = nullif(trim(message), ''),
    buyer_decided_at = (extract(epoch from now()) * 1000)::bigint,
    updated_at = (extract(epoch from now()) * 1000)::bigint
  where q.id = quote_id
    and q.status = 'sent'
    and (q.validity_ts is null or q.validity_ts >= (extract(epoch from now()) * 1000)::bigint);

  if not found then
    raise exception 'Quote is not available for decision';
  end if;

  return query
    select *
    from public.get_public_quote(quote_id);
end;
$$;

grant execute on function public.get_public_quote(text) to anon, authenticated;
grant execute on function public.respond_to_quote(text, text, text) to anon, authenticated;

```


===== FILE: supabase/migrations/202605100005_quote_revisions.sql =====

```sql
-- Quote revision tracking.

alter table public.quotes
  add column if not exists parent_quote_id text references public.quotes(id) on delete set null,
  add column if not exists revision_number integer not null default 1;

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'revision_requested', 'revised', 'expired'));

create index if not exists quotes_parent_quote_idx
  on public.quotes (parent_quote_id, revision_number);

```


===== FILE: supabase/migrations/202605100006_quote_notifications.sql =====

```sql
-- Notifications for quote decisions and revised quotes.

create or replace function public.notify_factory_quote_decision(
  quote_id text,
  decision text,
  buyer_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.quotes;
  notification_title text;
  notification_msg text;
begin
  select * into q
  from public.quotes
  where id = quote_id;

  if not found then
    return;
  end if;

  notification_title := case
    when decision = 'accepted' then 'Quote accepted'
    when decision = 'revision_requested' then 'Quote changes requested'
    else 'Quote updated'
  end;

  notification_msg := concat(
    coalesce(q.buyer_company, q.buyer_name, 'Buyer'),
    case
      when decision = 'accepted' then ' accepted '
      when decision = 'revision_requested' then ' requested changes to '
      else ' updated '
    end,
    'quote ',
    q.id,
    ' for ',
    coalesce(q.stone, 'a slab'),
    '.',
    case when nullif(trim(buyer_note), '') is not null then concat(' Note: ', trim(buyer_note)) else '' end
  );

  insert into public.notifications (id, user_id, title, msg, icon, ts, read)
  select
    'N-' || upper(substr(md5(random()::text || clock_timestamp()::text || p.id), 1, 12)),
    p.id,
    notification_title,
    notification_msg,
    case when decision = 'accepted' then 'Won' else 'Edit' end,
    (extract(epoch from now()) * 1000)::bigint,
    false
  from public.profiles p
  where p.factory_id = q.factory_id
    and p.role in ('admin', 'manager')
    and p.status = 'active';
end;
$$;

create or replace function public.notify_buyer_revised_quote(quote_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.quotes;
begin
  select * into q
  from public.quotes
  where id = quote_id;

  if not found then
    return;
  end if;

  if not (public.is_owner() or public.same_factory(q.factory_id)) then
    raise exception 'Not allowed';
  end if;

  insert into public.notifications (id, user_id, title, msg, icon, ts, read)
  select
    'N-' || upper(substr(md5(random()::text || clock_timestamp()::text || p.id), 1, 12)),
    p.id,
    'Revised quote sent',
    concat(coalesce(q.factory_name, 'Factory'), ' sent a revised quote ', q.id, ' for ', coalesce(q.stone, 'your slab'), '.'),
    'Quote',
    (extract(epoch from now()) * 1000)::bigint,
    false
  from public.profiles p
  where p.factory_id = q.factory_id
    and lower(p.email) = lower(q.buyer_email)
    and p.role = 'buyer'
    and p.status = 'active';
end;
$$;

create or replace function public.respond_to_quote(
  quote_id text,
  decision text,
  message text default null
)
returns table (
  id text,
  inquiry_id text,
  slab_id text,
  factory_id text,
  factory_name text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  stone text,
  grade text,
  price_per_sq_ft numeric,
  area_sq_ft numeric,
  total_amount numeric,
  validity_ts bigint,
  notes text,
  status text,
  buyer_message text,
  buyer_decided_at bigint,
  created_at bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  if decision not in ('accepted', 'revision_requested') then
    raise exception 'Invalid quote decision';
  end if;

  next_status := decision;

  update public.quotes q
  set
    status = next_status,
    buyer_message = nullif(trim(message), ''),
    buyer_decided_at = (extract(epoch from now()) * 1000)::bigint,
    updated_at = (extract(epoch from now()) * 1000)::bigint
  where q.id = quote_id
    and q.status = 'sent'
    and (q.validity_ts is null or q.validity_ts >= (extract(epoch from now()) * 1000)::bigint);

  if not found then
    raise exception 'Quote is not available for decision';
  end if;

  perform public.notify_factory_quote_decision(quote_id, decision, message);

  return query
    select *
    from public.get_public_quote(quote_id);
end;
$$;

revoke execute on function public.notify_factory_quote_decision(text, text, text) from public;
grant execute on function public.notify_buyer_revised_quote(text) to authenticated;
grant execute on function public.respond_to_quote(text, text, text) to anon, authenticated;

```


===== FILE: supabase/migrations/202605150001_quote_fulfillment_status.sql =====

```sql
-- Quote fulfillment tracking after a buyer accepts a quote.

alter table public.quotes
  add column if not exists fulfillment_status text not null default 'not_started';

alter table public.quotes
  drop constraint if exists quotes_fulfillment_status_check;

alter table public.quotes
  add constraint quotes_fulfillment_status_check
  check (fulfillment_status in (
    'not_started',
    'payment_pending',
    'payment_received',
    'dispatch_scheduled',
    'dispatched',
    'delivered',
    'sold'
  ));

update public.quotes
set fulfillment_status = 'payment_pending'
where status = 'accepted'
  and fulfillment_status = 'not_started';

drop function if exists public.respond_to_quote(text, text, text);
drop function if exists public.get_public_quote(text);

create function public.get_public_quote(quote_id text)
returns table (
  id text,
  inquiry_id text,
  slab_id text,
  factory_id text,
  factory_name text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  stone text,
  grade text,
  price_per_sq_ft numeric,
  area_sq_ft numeric,
  total_amount numeric,
  validity_ts bigint,
  notes text,
  status text,
  fulfillment_status text,
  buyer_message text,
  buyer_decided_at bigint,
  created_at bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id,
    q.inquiry_id,
    q.slab_id,
    q.factory_id,
    q.factory_name,
    q.buyer_name,
    q.buyer_company,
    q.buyer_email,
    q.stone,
    q.grade,
    q.price_per_sq_ft,
    q.area_sq_ft,
    q.total_amount,
    q.validity_ts,
    q.notes,
    q.status,
    q.fulfillment_status,
    q.buyer_message,
    q.buyer_decided_at,
    q.created_at
  from public.quotes q
  where q.id = quote_id
  limit 1
$$;

create function public.respond_to_quote(
  quote_id text,
  decision text,
  message text default null
)
returns table (
  id text,
  inquiry_id text,
  slab_id text,
  factory_id text,
  factory_name text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  stone text,
  grade text,
  price_per_sq_ft numeric,
  area_sq_ft numeric,
  total_amount numeric,
  validity_ts bigint,
  notes text,
  status text,
  fulfillment_status text,
  buyer_message text,
  buyer_decided_at bigint,
  created_at bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  if decision not in ('accepted', 'revision_requested') then
    raise exception 'Invalid quote decision';
  end if;

  next_status := decision;

  update public.quotes q
  set
    status = next_status,
    fulfillment_status = case when decision = 'accepted' then 'payment_pending' else 'not_started' end,
    buyer_message = nullif(trim(message), ''),
    buyer_decided_at = (extract(epoch from now()) * 1000)::bigint,
    updated_at = (extract(epoch from now()) * 1000)::bigint
  where q.id = quote_id
    and q.status = 'sent'
    and (q.validity_ts is null or q.validity_ts >= (extract(epoch from now()) * 1000)::bigint);

  if not found then
    raise exception 'Quote is not available for decision';
  end if;

  perform public.notify_factory_quote_decision(quote_id, decision, message);

  return query
    select *
    from public.get_public_quote(quote_id);
end;
$$;

grant execute on function public.get_public_quote(text) to anon, authenticated;
grant execute on function public.respond_to_quote(text, text, text) to anon, authenticated;

```


===== FILE: supabase/migrations/202605150002_quote_fulfillment_notifications.sql =====

```sql
-- Notify buyers when factories update accepted quote fulfillment stages.

create or replace function public.update_quote_fulfillment(
  quote_id text,
  next_fulfillment_status text
)
returns table (
  id text,
  inquiry_id text,
  slab_id text,
  factory_id text,
  factory_name text,
  buyer_name text,
  buyer_company text,
  buyer_email text,
  stone text,
  grade text,
  price_per_sq_ft numeric,
  area_sq_ft numeric,
  total_amount numeric,
  validity_ts bigint,
  notes text,
  status text,
  fulfillment_status text,
  buyer_message text,
  buyer_decided_at bigint,
  created_at bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.quotes;
  stage_label text;
  stage_message text;
begin
  if next_fulfillment_status not in (
    'payment_pending',
    'payment_received',
    'dispatch_scheduled',
    'dispatched',
    'delivered',
    'sold'
  ) then
    raise exception 'Invalid fulfillment status';
  end if;

  select * into q
  from public.quotes
  where quotes.id = quote_id;

  if not found then
    raise exception 'Quote not found';
  end if;

  if not (public.is_owner() or public.same_factory(q.factory_id)) then
    raise exception 'Not allowed';
  end if;

  if q.status <> 'accepted' then
    raise exception 'Only accepted quotes can enter fulfillment';
  end if;

  stage_label := case next_fulfillment_status
    when 'payment_pending' then 'Payment pending'
    when 'payment_received' then 'Payment received'
    when 'dispatch_scheduled' then 'Dispatch scheduled'
    when 'dispatched' then 'Dispatched'
    when 'delivered' then 'Delivered'
    when 'sold' then 'Sold'
    else 'Quote updated'
  end;

  stage_message := concat(
    coalesce(q.factory_name, 'Factory'),
    ' updated quote ',
    q.id,
    ' for ',
    coalesce(q.stone, 'your slab'),
    ': ',
    stage_label,
    '.'
  );

  update public.quotes
  set
    fulfillment_status = next_fulfillment_status,
    updated_at = (extract(epoch from now()) * 1000)::bigint
  where quotes.id = quote_id;

  insert into public.notifications (id, user_id, title, msg, icon, ts, read)
  select
    'N-' || upper(substr(md5(random()::text || clock_timestamp()::text || p.id), 1, 12)),
    p.id,
    concat('Quote update: ', stage_label),
    stage_message,
    case
      when next_fulfillment_status = 'payment_received' then 'Paid'
      when next_fulfillment_status in ('dispatch_scheduled', 'dispatched') then 'Ship'
      when next_fulfillment_status in ('delivered', 'sold') then 'Done'
      else 'Quote'
    end,
    (extract(epoch from now()) * 1000)::bigint,
    false
  from public.profiles p
  where p.factory_id = q.factory_id
    and lower(p.email) = lower(q.buyer_email)
    and p.role = 'buyer'
    and p.status = 'active';

  return query
    select *
    from public.get_public_quote(quote_id);
end;
$$;

grant execute on function public.update_quote_fulfillment(text, text) to authenticated;

```


===== FILE: supabase/migrations/202605170001_inspection_query_indexes.sql =====

```sql
-- Speed up inspection reads used by factory dashboards, buyer inventory, and scan history.

create index if not exists inspections_factory_ts_idx
  on public.inspections (factory_id, ts desc);

create index if not exists inspections_user_ts_idx
  on public.inspections (user_id, ts desc);

create index if not exists inspections_factory_inventory_grade_ts_idx
  on public.inspections (factory_id, inventory_status, grade, ts desc);

create index if not exists inspections_supplier_ts_idx
  on public.inspections (supplier_id, ts desc)
  where supplier_id is not null;

```


===== FILE: supabase/migrations/202605200001_sector_foundation_fields.sql =====

```sql
-- Add lightweight sector-agnostic foundation fields.
-- Current stone workflows can keep using existing columns, while future sectors
-- can use template keys and JSONB attributes without core schema changes.

alter table public.factories
  add column if not exists sector text not null default 'stone';

alter table public.inspections
  add column if not exists template_key text not null default 'stone_qc_basic',
  add column if not exists attributes jsonb not null default '{}'::jsonb,
  add column if not exists compliance jsonb not null default '{}'::jsonb,
  add column if not exists ai_review jsonb not null default '{}'::jsonb,
  add column if not exists evidence_summary jsonb not null default '{}'::jsonb;

create index if not exists factories_sector_idx
  on public.factories (sector);

create index if not exists inspections_template_key_idx
  on public.inspections (template_key);

create index if not exists inspections_attributes_gin_idx
  on public.inspections using gin (attributes);

create index if not exists inspections_compliance_gin_idx
  on public.inspections using gin (compliance);

comment on column public.factories.sector is
  'Business sector for configurable workflows, for example stone, ceramics, textiles, or metal.';

comment on column public.inspections.template_key is
  'Inspection/compliance template key used to interpret sector-specific attributes.';

comment on column public.inspections.attributes is
  'Sector-specific inspection attributes. Avoid adding new sector-specific core columns when this can hold the data.';

comment on column public.inspections.compliance is
  'Template-driven compliance/readiness answers and computed requirement state.';

comment on column public.inspections.ai_review is
  'Normalized AI review metadata such as suggested grade, final grade, override reason, and reviewed timestamp.';

comment on column public.inspections.evidence_summary is
  'Normalized evidence coverage summary such as photo slots, traceability completeness, and audit readiness.';

```


===== FILE: supabase/migrations/202605200002_compliance_template_foundation.sql =====

```sql
-- Template foundation for sector-agnostic compliance and inspection readiness.
-- Application logic can gradually move from hardcoded stone checks to these templates.

create table if not exists public.compliance_templates (
  id text primary key,
  sector text not null,
  name text not null,
  description text,
  version integer not null default 1,
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  requirements jsonb not null default '[]'::jsonb,
  scoring jsonb not null default '{}'::jsonb,
  report_sections jsonb not null default '[]'::jsonb,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists compliance_templates_sector_status_idx
  on public.compliance_templates (sector, status);

insert into public.compliance_templates (
  id,
  sector,
  name,
  description,
  requirements,
  scoring,
  report_sections
) values (
  'stone_qc_basic',
  'stone',
  'Stone QC Basic',
  'Starter template for stone slab quality evidence, buyer-audit readiness, and certification-readiness preparation.',
  '[
    {"id":"photo_front","type":"photo","label":"Full slab photo","required":true},
    {"id":"photo_surface","type":"photo","label":"Surface close-up photo","required":true},
    {"id":"photo_edge","type":"photo","label":"Edge/corner photo","required":true},
    {"id":"trace_batch","type":"traceability","label":"Batch number","required":true},
    {"id":"trace_source","type":"traceability","label":"Source or supplier","required":true},
    {"id":"audit_calibration","type":"audit","label":"Calibration checked","required":true},
    {"id":"audit_checklist","type":"audit","label":"Inspection checklist complete","required":true},
    {"id":"capa_corrective_action","type":"capa","label":"Corrective action for defects","required_when":"defects_present"}
  ]'::jsonb,
  '{"photo":30,"traceability":30,"audit":25,"capa":15}'::jsonb,
  '[
    {"id":"certificate","label":"Slab certificate"},
    {"id":"traceability","label":"Traceability summary"},
    {"id":"defects","label":"Defect and CAPA summary"},
    {"id":"ai_review","label":"AI review summary"}
  ]'::jsonb
) on conflict (id) do update set
  sector=excluded.sector,
  name=excluded.name,
  description=excluded.description,
  requirements=excluded.requirements,
  scoring=excluded.scoring,
  report_sections=excluded.report_sections,
  updated_at=(extract(epoch from now()) * 1000)::bigint;

comment on table public.compliance_templates is
  'Configurable sector templates for inspection requirements, readiness scoring, and report sections.';

comment on column public.compliance_templates.requirements is
  'JSON array of required evidence, traceability, audit, and CAPA requirements interpreted by template-aware application code.';

```


===== FILE: supabase/migrations/202605200003_compliance_template_rls.sql =====

```sql
-- RLS for compliance templates.
-- Active templates are readable by authenticated users; owners can manage templates.

alter table public.compliance_templates enable row level security;

create policy "compliance templates read active" on public.compliance_templates
  for select using (
    status = 'active'
    or public.is_owner()
  );

create policy "compliance templates owner writes" on public.compliance_templates
  for all using (public.is_owner())
  with check (public.is_owner());

```


===== FILE: supabase/migrations/202605200004_inspection_integrity_fields.sql =====

```sql
-- Lightweight inspection integrity fields for future audit controls.
-- Current workflows remain unchanged until application code starts using these fields.

alter table public.inspections
  add column if not exists finalized_at bigint,
  add column if not exists finalized_by text,
  add column if not exists locked_at bigint,
  add column if not exists locked_by text,
  add column if not exists revision integer not null default 1,
  add column if not exists revision_note text;

create index if not exists inspections_finalized_at_idx
  on public.inspections (finalized_at desc)
  where finalized_at is not null;

create index if not exists inspections_locked_at_idx
  on public.inspections (locked_at desc)
  where locked_at is not null;

comment on column public.inspections.finalized_at is
  'Timestamp when an inspection was marked final for buyer/audit evidence.';

comment on column public.inspections.locked_at is
  'Timestamp when an inspection was locked against silent edits.';

comment on column public.inspections.revision is
  'Revision counter for future edited-record and audit trail workflows.';

comment on column public.inspections.revision_note is
  'Human-readable reason for the latest inspection revision.';

```


===== FILE: supabase/migrations/202605200005_backfill_generic_inspection_fields.sql =====

```sql
-- Backfill generic inspection fields from existing stone inspection data.
-- Run after 202605200001_sector_foundation_fields.sql.

update public.inspections
set
  template_key = coalesce(nullif(template_key, ''), 'stone_qc_basic'),
  attributes = coalesce(attributes, '{}'::jsonb)
    || jsonb_build_object(
      'stone', stone,
      'supplier', supplier,
      'grade', grade,
      'price_per_sq_ft', price_per_sq_ft,
      'export_ready', export_ready,
      'measurements', coalesce(measurements, '{}'::jsonb),
      'defects', coalesce(defects, '[]'::jsonb)
    ),
  compliance = coalesce(compliance, '{}'::jsonb)
    || jsonb_build_object(
      'calibration_checked', (lower(coalesce(measurements->'audit'->>'calibrationChecked', 'false')) = 'true'),
      'checklist_complete', (lower(coalesce(measurements->'audit'->>'checklistComplete', 'false')) = 'true'),
      'root_cause', measurements->'audit'->>'rootCause',
      'corrective_action', measurements->'audit'->>'correctiveAction',
      'action_owner', measurements->'audit'->>'actionOwner',
      'action_due', measurements->'audit'->>'actionDue'
    ),
  ai_review = coalesce(ai_review, '{}'::jsonb)
    || coalesce(measurements->'aiReview', '{}'::jsonb),
  evidence_summary = coalesce(evidence_summary, '{}'::jsonb)
    || jsonb_build_object(
      'photo_count', case
        when jsonb_typeof(photos) = 'array' then jsonb_array_length(photos)
        when photo is not null then 1
        else 0
      end,
      'traceability_fields', (
        select count(*)
        from jsonb_each_text(coalesce(measurements->'traceability', '{}'::jsonb)) as t(key, value)
        where nullif(value, '') is not null
      ),
      'audit_fields', (
        select count(*)
        from jsonb_each_text(coalesce(measurements->'audit', '{}'::jsonb)) as a(key, value)
        where nullif(value, '') is not null
      )
    )
where template_key = 'stone_qc_basic'
  or attributes = '{}'::jsonb
  or compliance = '{}'::jsonb
  or ai_review = '{}'::jsonb
  or evidence_summary = '{}'::jsonb;

```


===== FILE: supabase/migrations/202605200006_compliance_template_lifecycle.sql =====

```sql
-- Add lifecycle metadata for sector-agnostic compliance templates.
-- This keeps future template changes auditable without changing current app behavior.

alter table public.compliance_templates
  add column if not exists effective_from bigint,
  add column if not exists retired_at bigint,
  add column if not exists supersedes_template_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists compliance_templates_lifecycle_idx
  on public.compliance_templates (sector, status, effective_from, retired_at);

comment on column public.compliance_templates.effective_from is
  'Unix epoch milliseconds when this template version becomes valid for new inspections.';

comment on column public.compliance_templates.retired_at is
  'Unix epoch milliseconds when this template should stop being used for new inspections.';

comment on column public.compliance_templates.supersedes_template_id is
  'Optional template id that this template replaces or supersedes.';

comment on column public.compliance_templates.metadata is
  'Template authoring metadata such as source standard, owner, rollout notes, or sector-specific display hints.';


```


===== FILE: supabase/migrations/202605200007_activity_log_evidence_fields.sql =====

```sql
-- Extend activity logs for audit-ready evidence trails.
-- Existing app inserts continue to work because all fields are nullable or defaulted.

alter table public.activity_logs
  add column if not exists event_source text not null default 'app',
  add column if not exists severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  add column if not exists entity_version integer,
  add column if not exists evidence_hash text,
  add column if not exists snapshot jsonb not null default '{}'::jsonb;

create index if not exists activity_logs_action_ts_idx
  on public.activity_logs (action, ts desc);

create index if not exists activity_logs_severity_ts_idx
  on public.activity_logs (severity, ts desc);

comment on column public.activity_logs.event_source is
  'Source of the event such as app, migration, worker, import, or integration.';

comment on column public.activity_logs.severity is
  'Audit severity used to highlight warning or critical compliance events.';

comment on column public.activity_logs.entity_version is
  'Optional version number of the affected entity at the time of the event.';

comment on column public.activity_logs.evidence_hash is
  'Optional hash or checksum for exported evidence packets, certificates, or immutable snapshots.';

comment on column public.activity_logs.snapshot is
  'Optional JSON snapshot of key fields at the time of the event for later audit review.';


```


===== FILE: supabase/migrations/202605200008_evidence_packets.sql =====

```sql
-- Evidence packet foundation for buyer-audit-ready exports.
-- Current app exports can remain client-side; this table supports future saved/shared packets.

create table if not exists public.evidence_packets (
  id text primary key,
  factory_id text not null references public.factories(id),
  title text not null,
  packet_type text not null default 'audit' check (packet_type in ('audit', 'buyer', 'pilot', 'internal')),
  status text not null default 'draft' check (status in ('draft', 'shared', 'revoked', 'archived')),
  created_by text references public.profiles(id),
  created_by_name text not null default '',
  entity_refs jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  evidence_hash text,
  file_url text,
  public_token text,
  shared_at bigint,
  expires_at bigint,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists evidence_packets_factory_status_idx
  on public.evidence_packets (factory_id, status, created_at desc);

create index if not exists evidence_packets_type_idx
  on public.evidence_packets (packet_type, created_at desc);

create unique index if not exists evidence_packets_public_token_idx
  on public.evidence_packets (public_token)
  where public_token is not null;

alter table public.evidence_packets enable row level security;

drop policy if exists "evidence packets read own factory" on public.evidence_packets;
drop policy if exists "evidence packets manage own factory" on public.evidence_packets;

create policy "evidence packets read own factory" on public.evidence_packets
  for select using (
    public.is_owner()
    or public.same_factory(factory_id)
  );

create policy "evidence packets manage own factory" on public.evidence_packets
  for all using (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  )
  with check (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  );

comment on table public.evidence_packets is
  'Saved buyer, audit, pilot, and internal evidence packets assembled from inspections, certificates, quotes, and traceability records.';

comment on column public.evidence_packets.entity_refs is
  'JSON array of packet entities such as inspection ids, quote ids, supplier ids, batch ids, or certificate links.';

comment on column public.evidence_packets.summary is
  'JSON summary of readiness score, gaps, selected slabs, defects, CAPA status, and packet metadata.';

comment on column public.evidence_packets.evidence_hash is
  'Optional hash/checksum for the generated evidence packet artifact.';


```


===== FILE: supabase/migrations/202605200009_capa_actions.sql =====

```sql
-- CAPA foundation for corrective and preventive action tracking.
-- Existing embedded inspection CAPA notes remain valid; this table supports future workflow depth.

create table if not exists public.capa_actions (
  id text primary key,
  factory_id text not null references public.factories(id),
  inspection_id text references public.inspections(id),
  source_type text not null default 'inspection' check (source_type in ('inspection', 'supplier', 'audit', 'buyer', 'internal')),
  title text not null,
  issue text not null default '',
  root_cause text not null default '',
  corrective_action text not null default '',
  preventive_action text not null default '',
  owner_id text references public.profiles(id),
  owner_name text not null default '',
  due_at bigint,
  closed_at bigint,
  verified_at bigint,
  verified_by text references public.profiles(id),
  status text not null default 'open' check (status in ('open', 'in_progress', 'blocked', 'closed', 'verified', 'dismissed')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  evidence_refs jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists capa_actions_factory_status_idx
  on public.capa_actions (factory_id, status, due_at);

create index if not exists capa_actions_inspection_idx
  on public.capa_actions (inspection_id);

create index if not exists capa_actions_owner_idx
  on public.capa_actions (owner_id, status);

alter table public.capa_actions enable row level security;

drop policy if exists "capa actions read own factory" on public.capa_actions;
drop policy if exists "capa actions manage own factory" on public.capa_actions;

create policy "capa actions read own factory" on public.capa_actions
  for select using (
    public.is_owner()
    or public.same_factory(factory_id)
  );

create policy "capa actions manage own factory" on public.capa_actions
  for all using (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  )
  with check (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  );

comment on table public.capa_actions is
  'Corrective and preventive actions linked to inspections, suppliers, audits, buyer feedback, or internal quality reviews.';

comment on column public.capa_actions.evidence_refs is
  'JSON array of supporting evidence references such as inspection ids, photo slots, certificate links, or evidence packet ids.';


```


===== FILE: supabase/migrations/202605200010_production_batches.sql =====

```sql
-- Sector-safe production batch foundation for traceability.
-- Stone-specific source/block/shipment data can live in attributes until app workflows mature.

create table if not exists public.production_batches (
  id text primary key,
  factory_id text not null references public.factories(id),
  sector text not null default 'stone',
  batch_ref text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'shipped', 'archived')),
  supplier_id text references public.suppliers(id),
  supplier_name text not null default '',
  production_date bigint,
  customer_ref text not null default '',
  shipment_ref text not null default '',
  attributes jsonb not null default '{}'::jsonb,
  evidence_summary jsonb not null default '{}'::jsonb,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists production_batches_factory_status_idx
  on public.production_batches (factory_id, status, updated_at desc);

create index if not exists production_batches_ref_idx
  on public.production_batches (factory_id, batch_ref);

create index if not exists production_batches_supplier_idx
  on public.production_batches (supplier_id, updated_at desc);

alter table public.production_batches enable row level security;

drop policy if exists "production batches read own factory" on public.production_batches;
drop policy if exists "production batches manage own factory" on public.production_batches;

create policy "production batches read own factory" on public.production_batches
  for select using (
    public.is_owner()
    or public.same_factory(factory_id)
  );

create policy "production batches manage own factory" on public.production_batches
  for all using (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  )
  with check (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  );

comment on table public.production_batches is
  'Sector-safe production or source batches used to group inspections, traceability evidence, customer/export references, and shipment context.';

comment on column public.production_batches.attributes is
  'Sector-specific batch attributes such as quarry source, block number, slab bundle, firing lot, textile lot, or metal heat number.';

comment on column public.production_batches.evidence_summary is
  'Computed or copied batch evidence summary such as scan count, readiness gaps, defect mix, and packet references.';


```


===== FILE: supabase/migrations/202605200011_batch_inspection_links.sql =====

```sql
-- Link inspections to production batches without changing existing inspection rows.

create table if not exists public.batch_inspection_links (
  id text primary key,
  factory_id text not null references public.factories(id),
  batch_id text not null references public.production_batches(id) on delete cascade,
  inspection_id text not null references public.inspections(id) on delete cascade,
  link_type text not null default 'member' check (link_type in ('member', 'sample', 'representative', 'exception')),
  notes text not null default '',
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique (batch_id, inspection_id)
);

create index if not exists batch_inspection_links_factory_idx
  on public.batch_inspection_links (factory_id, created_at desc);

create index if not exists batch_inspection_links_inspection_idx
  on public.batch_inspection_links (inspection_id);

alter table public.batch_inspection_links enable row level security;

drop policy if exists "batch inspection links read own factory" on public.batch_inspection_links;
drop policy if exists "batch inspection links manage own factory" on public.batch_inspection_links;

create policy "batch inspection links read own factory" on public.batch_inspection_links
  for select using (
    public.is_owner()
    or public.same_factory(factory_id)
  );

create policy "batch inspection links manage own factory" on public.batch_inspection_links
  for all using (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  )
  with check (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  );

comment on table public.batch_inspection_links is
  'Many-to-many links between production batches and inspection evidence records.';

comment on column public.batch_inspection_links.link_type is
  'How the inspection relates to the batch, for example member, sample, representative, or exception.';


```


===== FILE: supabase/migrations/202605200012_calibration_records.sql =====

```sql
-- Calibration evidence foundation for audit-readiness.

create table if not exists public.calibration_records (
  id text primary key,
  factory_id text not null references public.factories(id),
  equipment_id text not null,
  equipment_name text not null,
  equipment_type text not null default '',
  calibration_date bigint not null,
  next_due_at bigint,
  status text not null default 'valid' check (status in ('valid', 'due_soon', 'overdue', 'failed', 'retired')),
  performed_by text not null default '',
  certificate_ref text not null default '',
  evidence_refs jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists calibration_records_factory_status_idx
  on public.calibration_records (factory_id, status, next_due_at);

create index if not exists calibration_records_equipment_idx
  on public.calibration_records (factory_id, equipment_id, calibration_date desc);

alter table public.calibration_records enable row level security;

drop policy if exists "calibration records read own factory" on public.calibration_records;
drop policy if exists "calibration records manage own factory" on public.calibration_records;

create policy "calibration records read own factory" on public.calibration_records
  for select using (
    public.is_owner()
    or public.same_factory(factory_id)
  );

create policy "calibration records manage own factory" on public.calibration_records
  for all using (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  )
  with check (
    public.is_owner()
    or (
      public.current_profile_role() in ('admin', 'manager')
      and public.same_factory(factory_id)
    )
  );

comment on table public.calibration_records is
  'Calibration evidence for equipment, gauges, scales, tools, or inspection devices used in quality workflows.';

comment on column public.calibration_records.evidence_refs is
  'JSON array of evidence references such as certificate files, activity logs, inspection ids, or evidence packet ids.';


```


===== FILE: supabase/migrations/202605230001_traceability_schema_hardening.sql =====

```sql
-- Hardening for traceability, evidence packets, and calibration readiness.
-- Additive migration: do not rewrite previous migration history.

-- Batch references should be unique inside a factory. This prevents retry-created
-- duplicate lots from splitting traceability evidence across ghost batches.
create unique index if not exists production_batches_factory_batch_ref_uidx
  on public.production_batches (factory_id, batch_ref);

-- Link rows carry factory_id for RLS, but that value must match both referenced
-- records. Enforce it in a trigger so a privileged user cannot create a
-- cross-factory link by supplying their own factory_id on the link row.
create or replace function public.enforce_batch_inspection_link_factory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  batch_factory text;
  inspection_factory text;
begin
  select factory_id into batch_factory
  from public.production_batches
  where id = new.batch_id;

  select factory_id into inspection_factory
  from public.inspections
  where id = new.inspection_id;

  if batch_factory is null then
    raise exception 'Batch % does not exist', new.batch_id;
  end if;

  if inspection_factory is null then
    raise exception 'Inspection % does not exist', new.inspection_id;
  end if;

  if new.factory_id is distinct from batch_factory then
    raise exception 'Link factory_id % does not match batch factory_id %', new.factory_id, batch_factory;
  end if;

  if new.factory_id is distinct from inspection_factory then
    raise exception 'Link factory_id % does not match inspection factory_id %', new.factory_id, inspection_factory;
  end if;

  return new;
end;
$$;

drop trigger if exists batch_inspection_links_factory_guard on public.batch_inspection_links;
create trigger batch_inspection_links_factory_guard
  before insert or update of factory_id, batch_id, inspection_id
  on public.batch_inspection_links
  for each row
  execute function public.enforce_batch_inspection_link_factory();

-- Shared evidence packet tokens should be consumed through this function/view so
-- expiry is always evaluated at read time, not only when a row is edited.
create or replace function public.revoke_expired_evidence_packets()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.evidence_packets
  set status = 'revoked',
      public_token = null,
      updated_at = (extract(epoch from now()) * 1000)::bigint
  where status = 'shared'
    and expires_at is not null
    and expires_at <= (extract(epoch from now()) * 1000)::bigint;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace view public.live_evidence_packets
with (security_invoker = true) as
select *
from public.evidence_packets
where status = 'shared'
  and public_token is not null
  and (
    expires_at is null
    or expires_at > (extract(epoch from now()) * 1000)::bigint
  );

create or replace function public.get_live_evidence_packet(token text)
returns setof public.evidence_packets
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.live_evidence_packets
  where public_token = token
  limit 1;
$$;

-- Calibration has time-dependent status. Preserve the human-entered status but
-- expose an objective effective status for dashboards and audit reports.
create or replace function public.calibration_effective_status(
  input_status text,
  next_due_at bigint
)
returns text
language sql
stable
as $$
  select case
    when input_status in ('failed', 'retired') then input_status
    when next_due_at is not null
      and next_due_at <= (extract(epoch from now()) * 1000)::bigint then 'overdue'
    when next_due_at is not null
      and next_due_at <= ((extract(epoch from now()) * 1000)::bigint + 7 * 86400000) then 'due_soon'
    else input_status
  end;
$$;

create or replace view public.calibration_records_with_effective_status
with (security_invoker = true) as
select
  c.*,
  public.calibration_effective_status(c.status, c.next_due_at) as effective_status
from public.calibration_records c;

comment on index public.production_batches_factory_batch_ref_uidx is
  'Prevents duplicate batch references inside a factory, preserving deterministic traceability.';

comment on function public.enforce_batch_inspection_link_factory() is
  'Ensures batch_inspection_links.factory_id matches both the referenced batch and inspection factory.';

comment on function public.revoke_expired_evidence_packets() is
  'Revokes shared evidence packets whose expires_at has passed. Can be called manually or by a scheduler.';

comment on view public.live_evidence_packets is
  'Evidence packets whose public token is currently live after expiry evaluation.';

comment on view public.calibration_records_with_effective_status is
  'Calibration records with time-aware effective_status for audit-readiness dashboards.';

```


===== FILE: supabase/migrations/202605240001_export_readiness_foundation.sql =====

```sql
-- Export readiness foundation.
-- Additive, parallel module: factories remain the exporter anchor for now.

create table if not exists public.export_readiness_profiles (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  sector text not null default 'stone',
  product_type text not null,
  destination_markets text[] not null default '{}'::text[],
  current_certifications text[] not null default '{}'::text[],
  company_size text,
  export_status text not null default 'planning'
    check (export_status in ('planning', 'first_export', 'active_exporter', 'expanding_markets')),
  readiness_stage text not null default 'draft'
    check (readiness_stage in ('draft', 'profile_complete', 'roadmap_ready', 'documents_in_progress', 'buyer_ready')),
  onboarding_inputs jsonb not null default '{}'::jsonb,
  onboarding_completed_at bigint,
  last_reviewed_at bigint,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.export_requirements (
  id text primary key,
  sector text not null,
  product_type text not null default 'any',
  destination_market text not null default 'any',
  requirement_type text not null
    check (requirement_type in ('registration', 'certification', 'standard', 'documentation', 'compliance', 'packaging', 'testing')),
  requirement_name text not null,
  description text not null,
  is_mandatory boolean not null default true,
  priority integer not null default 50 check (priority between 1 and 100),
  estimated_cost_min_inr integer,
  estimated_cost_max_inr integer,
  estimated_timeline_weeks_min integer,
  estimated_timeline_weeks_max integer,
  evidence_type text not null
    check (evidence_type in ('document_upload', 'certificate_number', 'lab_report', 'photo_evidence', 'checklist_confirmation', 'external_verification', 'factory_declaration')),
  evidence_instructions text,
  renewal_period_months integer,
  documents_required jsonb not null default '[]'::jsonb,
  evidence_examples jsonb not null default '[]'::jsonb,
  source_notes text,
  active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.certification_bodies (
  id text primary key,
  name text not null,
  body_type text not null default 'certification_body'
    check (body_type in ('certification_body', 'testing_lab', 'export_council', 'consultant', 'government_portal')),
  description text,
  accreditations jsonb not null default '[]'::jsonb,
  locations jsonb not null default '[]'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  website text,
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  featured_label text,
  commercial_disclosure text,
  response_sla_days integer,
  pricing_notes text,
  active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.certification_body_requirements (
  body_id text not null references public.certification_bodies(id) on delete cascade,
  requirement_id text not null references public.export_requirements(id) on delete cascade,
  scope_notes text,
  primary key (body_id, requirement_id)
);

create table if not exists public.certification_body_sectors (
  body_id text not null references public.certification_bodies(id) on delete cascade,
  sector text not null,
  product_types text[] not null default '{}'::text[],
  primary key (body_id, sector)
);

create table if not exists public.certification_body_markets (
  body_id text not null references public.certification_bodies(id) on delete cascade,
  destination_market text not null,
  scope_notes text,
  primary key (body_id, destination_market)
);

create table if not exists public.readiness_roadmaps (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  profile_id text not null references public.export_readiness_profiles(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'generated', 'in_progress', 'complete', 'archived')),
  generated_by text not null default 'manual'
    check (generated_by in ('manual', 'claude', 'imported')),
  model text,
  summary text,
  steps jsonb not null default '[]'::jsonb,
  gap_list jsonb not null default '[]'::jsonb,
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  generated_at bigint,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.readiness_evidence (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  profile_id text not null references public.export_readiness_profiles(id) on delete cascade,
  requirement_id text not null references public.export_requirements(id),
  roadmap_id text references public.readiness_roadmaps(id) on delete set null,
  evidence_type text not null
    check (evidence_type in ('document_upload', 'certificate_number', 'lab_report', 'photo_evidence', 'checklist_confirmation', 'external_verification', 'factory_declaration')),
  status text not null default 'missing'
    check (status in ('missing', 'pending', 'uploaded', 'submitted', 'verified', 'rejected', 'expired', 'not_applicable')),
  file_url text,
  certificate_number text,
  issuing_body_id text references public.certification_bodies(id) on delete set null,
  issued_at bigint,
  expires_at bigint,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.readiness_documents (
  id text primary key,
  factory_id text not null references public.factories(id) on delete cascade,
  profile_id text not null references public.export_readiness_profiles(id) on delete cascade,
  requirement_id text references public.export_requirements(id),
  evidence_id text references public.readiness_evidence(id) on delete set null,
  document_name text not null,
  document_type text not null default 'document',
  status text not null default 'needed'
    check (status in ('needed', 'uploaded', 'submitted', 'verified', 'rejected', 'expired', 'not_applicable')),
  file_url text,
  notes text,
  created_by text references public.profiles(id),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists export_readiness_profiles_factory_idx on public.export_readiness_profiles(factory_id);
create index if not exists export_readiness_profiles_sector_product_idx on public.export_readiness_profiles(sector, product_type);
create index if not exists export_requirements_lookup_idx on public.export_requirements(sector, product_type, destination_market, active, priority);
create index if not exists export_requirements_type_idx on public.export_requirements(requirement_type, evidence_type);
create index if not exists certification_bodies_active_featured_idx on public.certification_bodies(active, is_featured, is_verified);
create index if not exists readiness_roadmaps_factory_profile_idx on public.readiness_roadmaps(factory_id, profile_id, status);
create index if not exists readiness_evidence_factory_profile_idx on public.readiness_evidence(factory_id, profile_id, status);
create index if not exists readiness_evidence_requirement_idx on public.readiness_evidence(requirement_id, status);
create index if not exists readiness_documents_factory_profile_idx on public.readiness_documents(factory_id, profile_id, status);

alter table public.export_readiness_profiles enable row level security;
alter table public.export_requirements enable row level security;
alter table public.certification_bodies enable row level security;
alter table public.certification_body_requirements enable row level security;
alter table public.certification_body_sectors enable row level security;
alter table public.certification_body_markets enable row level security;
alter table public.readiness_roadmaps enable row level security;
alter table public.readiness_evidence enable row level security;
alter table public.readiness_documents enable row level security;

create policy "export readiness profiles own factory" on public.export_readiness_profiles
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "export requirements read active" on public.export_requirements
  for select using (active or public.is_owner());

create policy "export requirements owner writes" on public.export_requirements
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "certification bodies read active" on public.certification_bodies
  for select using (active or public.is_owner());

create policy "certification bodies owner writes" on public.certification_bodies
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "certification body requirements read active" on public.certification_body_requirements
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.certification_bodies b
      where b.id = certification_body_requirements.body_id and b.active
    )
  );

create policy "certification body requirements owner writes" on public.certification_body_requirements
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "certification body sectors read active" on public.certification_body_sectors
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.certification_bodies b
      where b.id = certification_body_sectors.body_id and b.active
    )
  );

create policy "certification body sectors owner writes" on public.certification_body_sectors
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "certification body markets read active" on public.certification_body_markets
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.certification_bodies b
      where b.id = certification_body_markets.body_id and b.active
    )
  );

create policy "certification body markets owner writes" on public.certification_body_markets
  for all using (public.is_owner())
  with check (public.is_owner());

create policy "readiness roadmaps own factory" on public.readiness_roadmaps
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "readiness evidence own factory" on public.readiness_evidence
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

create policy "readiness documents own factory" on public.readiness_documents
  for all using (public.is_owner() or public.same_factory(factory_id))
  with check (public.is_owner() or public.same_factory(factory_id));

insert into public.export_requirements (
  id, sector, product_type, destination_market, requirement_type, requirement_name,
  description, is_mandatory, priority, estimated_cost_min_inr, estimated_cost_max_inr,
  estimated_timeline_weeks_min, estimated_timeline_weeks_max, evidence_type,
  evidence_instructions, renewal_period_months, documents_required, evidence_examples, source_notes
) values
  (
    'stone_any_any_iec',
    'stone', 'any', 'any', 'registration', 'Importer Exporter Code (IEC)',
    'DGFT registration required for Indian businesses to import or export goods.',
    true, 95, 500, 2000, 1, 2, 'certificate_number',
    'Enter IEC number and upload the DGFT IEC certificate or acknowledgement.',
    null,
    '["IEC certificate","PAN/GST details","bank details used for IEC"]'::jsonb,
    '["IEC number","DGFT certificate PDF"]'::jsonb,
    'Exporter should verify latest DGFT process before application.'
  ),
  (
    'stone_any_any_iso_9001',
    'stone', 'any', 'any', 'certification', 'ISO 9001 Quality Management System',
    'Quality management system certification commonly requested by international buyers and larger procurement teams.',
    false, 80, 120000, 300000, 8, 16, 'certificate_number',
    'Upload ISO 9001 certificate, certificate number, issuing body, issue date, and expiry date.',
    36,
    '["ISO 9001 certificate","audit report or scope statement","quality manual or process evidence"]'::jsonb,
    '["valid certificate","scope covering stone processing/export operations"]'::jsonb,
    'Scope, accreditation, and expiry must be checked with the issuing body.'
  ),
  (
    'stone_granite_us_astm',
    'stone', 'granite', 'US', 'testing', 'ASTM Dimensional Stone Test Evidence',
    'US buyers often request ASTM-based material test evidence for dimensional stone performance and suitability.',
    true, 85, 25000, 90000, 2, 6, 'lab_report',
    'Upload relevant ASTM lab reports for the stone type and buyer specification.',
    null,
    '["ASTM lab test report","sample identification","test method references"]'::jsonb,
    '["compressive strength report","absorption/density report","abrasion or flexural test where requested"]'::jsonb,
    'Exact ASTM methods depend on buyer specification and product application.'
  ),
  (
    'stone_marble_us_astm',
    'stone', 'marble', 'US', 'testing', 'ASTM Dimensional Stone Test Evidence',
    'US buyers often request ASTM-based material test evidence for marble performance and suitability.',
    true, 85, 25000, 90000, 2, 6, 'lab_report',
    'Upload relevant ASTM lab reports for marble and the buyer specification.',
    null,
    '["ASTM lab test report","sample identification","test method references"]'::jsonb,
    '["absorption/density report","flexural strength report","abrasion report where requested"]'::jsonb,
    'Exact ASTM methods depend on buyer specification and product application.'
  ),
  (
    'stone_any_eu_en_ce_evidence',
    'stone', 'any', 'EU', 'standard', 'EN / CE Evidence for Construction Stone',
    'EU construction buyers may require EN standard evidence and CE-related documentation depending on product use and harmonised requirements.',
    true, 90, 40000, 150000, 4, 10, 'lab_report',
    'Upload EN test reports, declaration/performance documentation where applicable, and any buyer-specific compliance pack.',
    null,
    '["EN lab reports","Declaration of Performance if applicable","product technical data sheet"]'::jsonb,
    '["EN test report","DoP or technical declaration","traceable sample reference"]'::jsonb,
    'Applicability depends on product category, use case, and current EU rules; verify with an accredited advisor or notified body where needed.'
  ),
  (
    'stone_any_eu_responsible_sourcing',
    'stone', 'any', 'EU', 'compliance', 'Responsible Sourcing and Due Diligence Evidence',
    'EU buyers increasingly ask for origin, social, environmental, and ethical sourcing evidence for stone supply chains.',
    true, 75, 10000, 120000, 2, 12, 'external_verification',
    'Upload quarry/source details, supplier declarations, social audit evidence, and traceability records.',
    12,
    '["supplier declaration","quarry/source record","social audit or due diligence evidence","traceability sheet"]'::jsonb,
    '["source map","audit report","signed supplier declaration","batch traceability export"]'::jsonb,
    'Specific due diligence expectations vary by buyer and jurisdiction.'
  ),
  (
    'stone_any_any_silica_environment',
    'stone', 'any', 'any', 'compliance', 'Silica Dust and Environmental Compliance',
    'Factories should maintain worker safety, dust-control, water/waste, and environmental compliance evidence for buyer audits.',
    true, 70, 10000, 200000, 2, 16, 'document_upload',
    'Upload relevant safety/environment registrations, monitoring records, SOPs, PPE evidence, and corrective actions.',
    12,
    '["dust-control SOP","PPE records","environmental consent or local compliance evidence","water/waste records"]'::jsonb,
    '["PPE checklist","dust extraction maintenance log","water recycling or waste record"]'::jsonb,
    'Local legal requirements and buyer audit criteria should be verified for each factory.'
  ),
  (
    'stone_any_any_origin_gsp',
    'stone', 'any', 'any', 'documentation', 'Certificate of Origin / Preferential Origin Documents',
    'Export shipments usually need origin documentation; some markets may require preferential origin or GSP-related documents where applicable.',
    true, 65, 1000, 10000, 1, 3, 'document_upload',
    'Upload sample Certificate of Origin, chamber/export council documentation, or shipment-specific origin documents.',
    null,
    '["Certificate of Origin","invoice","packing list","shipping bill references"]'::jsonb,
    '["CoO PDF","shipment document pack"]'::jsonb,
    'Exact document route depends on shipment, destination, and scheme eligibility.'
  ),
  (
    'stone_any_any_packaging_labeling',
    'stone', 'any', 'any', 'packaging', 'Export Packaging and Labelling Requirements',
    'Stone exports need buyer-appropriate packing, labelling, handling marks, and wood-packaging compliance where relevant.',
    true, 60, 5000, 60000, 1, 4, 'photo_evidence',
    'Upload packaging photos, crate labels, packing list, and fumigation or ISPM-15 evidence where wooden packaging is used.',
    null,
    '["packing list","crate label photo","packaging photos","fumigation/ISPM-15 evidence if applicable"]'::jsonb,
    '["label photo","crate photo","packing list","fumigation certificate"]'::jsonb,
    'Destination and buyer packaging requirements should be checked before shipment.'
  )
on conflict (id) do update set
  sector=excluded.sector,
  product_type=excluded.product_type,
  destination_market=excluded.destination_market,
  requirement_type=excluded.requirement_type,
  requirement_name=excluded.requirement_name,
  description=excluded.description,
  is_mandatory=excluded.is_mandatory,
  priority=excluded.priority,
  estimated_cost_min_inr=excluded.estimated_cost_min_inr,
  estimated_cost_max_inr=excluded.estimated_cost_max_inr,
  estimated_timeline_weeks_min=excluded.estimated_timeline_weeks_min,
  estimated_timeline_weeks_max=excluded.estimated_timeline_weeks_max,
  evidence_type=excluded.evidence_type,
  evidence_instructions=excluded.evidence_instructions,
  renewal_period_months=excluded.renewal_period_months,
  documents_required=excluded.documents_required,
  evidence_examples=excluded.evidence_examples,
  source_notes=excluded.source_notes,
  active=true,
  updated_at=(extract(epoch from now()) * 1000)::bigint;

insert into public.certification_bodies (
  id, name, body_type, description, accreditations, locations, contact, website,
  is_verified, is_featured, featured_label, commercial_disclosure, response_sla_days, pricing_notes
) values
  (
    'body_dgft',
    'DGFT',
    'government_portal',
    'Government portal for Importer Exporter Code and foreign trade services.',
    '[]'::jsonb,
    '[{"country":"India","mode":"online"}]'::jsonb,
    '{"channel":"online portal"}'::jsonb,
    'https://www.dgft.gov.in',
    true, false, null, 'Government portal; not a paid placement.', null, 'Government fees and consultant charges vary.'
  ),
  (
    'body_sgs',
    'SGS',
    'certification_body',
    'Global testing, inspection, and certification organisation. Verify current local scope and accreditation before engagement.',
    '[{"note":"Verify current accreditation and India scope before use."}]'::jsonb,
    '[{"country":"India"},{"country":"Global"}]'::jsonb,
    '{"channel":"website"}'::jsonb,
    'https://www.sgs.com',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current quotation and scope confirmation.'
  ),
  (
    'body_bureau_veritas',
    'Bureau Veritas',
    'certification_body',
    'Global testing, inspection, and certification organisation. Verify current local scope and accreditation before engagement.',
    '[{"note":"Verify current accreditation and India scope before use."}]'::jsonb,
    '[{"country":"India"},{"country":"Global"}]'::jsonb,
    '{"channel":"website"}'::jsonb,
    'https://www.bureauveritas.com',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current quotation and scope confirmation.'
  ),
  (
    'body_intertek',
    'Intertek',
    'certification_body',
    'Global testing, inspection, and certification organisation. Verify current local scope and accreditation before engagement.',
    '[{"note":"Verify current accreditation and India scope before use."}]'::jsonb,
    '[{"country":"India"},{"country":"Global"}]'::jsonb,
    '{"channel":"website"}'::jsonb,
    'https://www.intertek.com',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current quotation and scope confirmation.'
  ),
  (
    'body_tuv_nord',
    'TUV NORD',
    'certification_body',
    'Testing, inspection, and certification organisation. Verify current local scope and accreditation before engagement.',
    '[{"note":"Verify current accreditation and India scope before use."}]'::jsonb,
    '[{"country":"India"},{"country":"Global"}]'::jsonb,
    '{"channel":"website"}'::jsonb,
    'https://www.tuv-nord.com',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current quotation and scope confirmation.'
  ),
  (
    'body_cdos_jaipur',
    'CDOS Jaipur',
    'testing_lab',
    'Stone-sector testing and development organisation in Jaipur. Verify current test scope and accreditation status before use.',
    '[{"note":"Verify current test scope and accreditation status before use."}]'::jsonb,
    '[{"city":"Jaipur","state":"Rajasthan","country":"India"}]'::jsonb,
    '{"channel":"website / direct inquiry"}'::jsonb,
    null,
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Request current test quotation and sample requirements.'
  ),
  (
    'body_capexil',
    'CAPEXIL',
    'export_council',
    'Export promotion council relevant to stone and mineral product exporters. Verify membership and documentation routes directly.',
    '[]'::jsonb,
    '[{"country":"India"}]'::jsonb,
    '{"channel":"website / direct inquiry"}'::jsonb,
    'https://capexil.org',
    false, false, null, 'Neutral directory listing; not a paid placement.', null, 'Membership and document fees vary.'
  )
on conflict (id) do update set
  name=excluded.name,
  body_type=excluded.body_type,
  description=excluded.description,
  accreditations=excluded.accreditations,
  locations=excluded.locations,
  contact=excluded.contact,
  website=excluded.website,
  is_verified=excluded.is_verified,
  is_featured=excluded.is_featured,
  featured_label=excluded.featured_label,
  commercial_disclosure=excluded.commercial_disclosure,
  response_sla_days=excluded.response_sla_days,
  pricing_notes=excluded.pricing_notes,
  active=true,
  updated_at=(extract(epoch from now()) * 1000)::bigint;

insert into public.certification_body_sectors (body_id, sector, product_types) values
  ('body_dgft', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_sgs', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_bureau_veritas', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_intertek', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_tuv_nord', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_cdos_jaipur', 'stone', '{"granite","marble","sandstone"}'::text[]),
  ('body_capexil', 'stone', '{"granite","marble","sandstone"}'::text[])
on conflict (body_id, sector) do update set product_types=excluded.product_types;

insert into public.certification_body_markets (body_id, destination_market, scope_notes) values
  ('body_dgft', 'any', 'IEC and exporter registration route for Indian exporters.'),
  ('body_sgs', 'EU', 'Potential testing/certification support; verify current scope.'),
  ('body_sgs', 'US', 'Potential testing/certification support; verify current scope.'),
  ('body_bureau_veritas', 'EU', 'Potential testing/certification support; verify current scope.'),
  ('body_bureau_veritas', 'US', 'Potential testing/certification support; verify current scope.'),
  ('body_intertek', 'EU', 'Potential testing/certification support; verify current scope.'),
  ('body_intertek', 'US', 'Potential testing/certification support; verify current scope.'),
  ('body_tuv_nord', 'EU', 'Potential testing/certification support; verify current scope.'),
  ('body_cdos_jaipur', 'any', 'Stone testing support; verify current scope and accepted standards.'),
  ('body_capexil', 'any', 'Export promotion, membership, and document guidance; verify route directly.')
on conflict (body_id, destination_market) do update set scope_notes=excluded.scope_notes;

insert into public.certification_body_requirements (body_id, requirement_id, scope_notes) values
  ('body_dgft', 'stone_any_any_iec', 'Official IEC route.'),
  ('body_sgs', 'stone_any_any_iso_9001', 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_bureau_veritas', 'stone_any_any_iso_9001', 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_intertek', 'stone_any_any_iso_9001', 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_tuv_nord', 'stone_any_any_iso_9001', 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_cdos_jaipur', 'stone_granite_us_astm', 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_cdos_jaipur', 'stone_marble_us_astm', 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_cdos_jaipur', 'stone_any_eu_en_ce_evidence', 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_sgs', 'stone_any_eu_en_ce_evidence', 'Potential EU evidence support; verify scope.'),
  ('body_bureau_veritas', 'stone_any_eu_en_ce_evidence', 'Potential EU evidence support; verify scope.'),
  ('body_intertek', 'stone_any_eu_en_ce_evidence', 'Potential EU evidence support; verify scope.'),
  ('body_capexil', 'stone_any_any_origin_gsp', 'Potential origin/export documentation guidance; verify route.')
on conflict (body_id, requirement_id) do update set scope_notes=excluded.scope_notes;

comment on table public.export_readiness_profiles is
  'Exporter readiness profile anchored to factories. Captures product, target markets, certifications, and onboarding status.';

comment on table public.export_requirements is
  'Market-aware, category-aware export readiness requirements. UI and AI roadmap generation should read from this table instead of hardcoding certification logic.';

comment on column public.export_requirements.evidence_type is
  'Defines how readiness is proven: document, certificate number, lab report, photo, checklist, external verification, or declaration.';

comment on table public.certification_bodies is
  'Directory of certification bodies, labs, councils, portals, and advisors. Paid placement must be separated using is_featured and commercial_disclosure.';

comment on table public.readiness_evidence is
  'Evidence attached to export requirements, including files, certificate numbers, issuing bodies, validity dates, and verification status.';

comment on table public.readiness_roadmaps is
  'Generated or manual export-readiness roadmap linked to an exporter profile.';

```


===== FILE: supabase/migrations/202605240002_export_readiness_schema_hardening.sql =====

```sql
-- Export readiness schema hardening.
-- Adds reusable certification specs, multi-market requirements, roadmap history,
-- and renewal hooks without rewriting the previous foundation migration.

create table if not exists public.certifications (
  id text primary key,
  code text not null unique,
  name text not null,
  description text,
  evidence_type text not null
    check (evidence_type in (
      'government_registration',
      'management_system_cert',
      'product_test_report',
      'responsible_sourcing_audit',
      'shipment_document',
      'operational_record',
      'training_record',
      'policy_document'
    )),
  renewal_period_months integer,
  scope_description text,
  issuing_authority_type text not null default 'external'
    check (issuing_authority_type in ('government', 'accredited_body', 'lab', 'export_council', 'self', 'external')),
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

alter table public.certifications enable row level security;

create policy "certifications read active" on public.certifications
  for select using (active or public.is_owner());

create policy "certifications owner writes" on public.certifications
  for all using (public.is_owner())
  with check (public.is_owner());

alter table public.export_requirements
  add column if not exists certification_id text references public.certifications(id),
  add column if not exists destination_markets text[] not null default '{}'::text[],
  add column if not exists evidence_lifecycle_type text,
  add column if not exists product_category text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.readiness_evidence
  add column if not exists evidence_lifecycle_type text,
  add column if not exists verification_reason text,
  add column if not exists next_check_at bigint;

alter table public.readiness_roadmaps
  add column if not exists model_version text,
  add column if not exists input_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists output jsonb not null default '{}'::jsonb,
  add column if not exists is_current boolean not null default true,
  add column if not exists superseded_by text references public.readiness_roadmaps(id) on delete set null,
  add column if not exists generation_cost_usd numeric(8,4),
  add column if not exists generation_duration_ms integer;

alter table public.certification_bodies
  add column if not exists slug text,
  add column if not exists legal_name text,
  add column if not exists accreditation_number text,
  add column if not exists accreditation_authority text,
  add column if not exists hq_country text,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive', 'pending_review')),
  add column if not exists featured_until bigint;

update public.certification_bodies
set slug = lower(regexp_replace(id, '^body_', ''))
where slug is null;

create unique index if not exists certifications_code_uidx on public.certifications(code);
create unique index if not exists certification_bodies_slug_uidx on public.certification_bodies(slug) where slug is not null;
create index if not exists certifications_active_type_idx on public.certifications(active, evidence_type);
create index if not exists export_requirements_certification_idx on public.export_requirements(certification_id, active);
create index if not exists export_requirements_destination_markets_gin_idx on public.export_requirements using gin(destination_markets);
create index if not exists readiness_evidence_next_check_idx on public.readiness_evidence(factory_id, next_check_at, status);
create index if not exists readiness_roadmaps_current_profile_idx on public.readiness_roadmaps(profile_id, is_current) where is_current = true;

insert into public.certifications (
  id, code, name, description, evidence_type, renewal_period_months,
  scope_description, issuing_authority_type, metadata
) values
  (
    'cert_iec',
    'iec',
    'Importer Exporter Code (IEC)',
    'DGFT-issued registration required for Indian import/export activity.',
    'government_registration',
    null,
    'Exporter registration for India.',
    'government',
    '{"authority":"DGFT","country":"India"}'::jsonb
  ),
  (
    'cert_iso_9001',
    'iso_9001',
    'ISO 9001 Quality Management System',
    'Quality management system certification used by buyers to assess process maturity.',
    'management_system_cert',
    36,
    'Factory or company quality management system scope.',
    'accredited_body',
    '{"standard_family":"ISO"}'::jsonb
  ),
  (
    'cert_astm_stone',
    'astm_stone_test_report',
    'ASTM Dimensional Stone Test Report',
    'Product test evidence for dimensional stone supplied to ASTM-oriented buyers.',
    'product_test_report',
    null,
    'Material/sample test report for stone type and buyer specification.',
    'lab',
    '{"market_family":"US","sector":"stone"}'::jsonb
  ),
  (
    'cert_en_ce_stone',
    'en_ce_stone_evidence',
    'EN / CE Evidence for Construction Stone',
    'EN standard evidence and CE-related documentation where applicable for construction stone products.',
    'product_test_report',
    null,
    'Product technical evidence, test reports, and declaration/performance documentation where applicable.',
    'lab',
    '{"market_family":"EU","sector":"stone"}'::jsonb
  ),
  (
    'cert_responsible_sourcing',
    'responsible_sourcing_due_diligence',
    'Responsible Sourcing and Due Diligence Evidence',
    'Social, origin, and ethical sourcing evidence requested by many international buyers.',
    'responsible_sourcing_audit',
    12,
    'Supply-chain, quarry/source, social-audit, or buyer due-diligence evidence.',
    'external',
    '{"themes":["origin","social","ethical sourcing"]}'::jsonb
  ),
  (
    'cert_silica_environment',
    'silica_environmental_compliance',
    'Silica Dust and Environmental Compliance Evidence',
    'Operational evidence for worker safety, dust control, water/waste, and environmental compliance.',
    'operational_record',
    12,
    'Factory operational records and local compliance evidence.',
    'self',
    '{"themes":["worker safety","environment","operations"]}'::jsonb
  ),
  (
    'cert_origin_gsp',
    'certificate_of_origin_gsp',
    'Certificate of Origin / Preferential Origin Documents',
    'Shipment or exporter documentation proving origin and, where applicable, preferential origin eligibility.',
    'shipment_document',
    null,
    'Per-shipment origin documentation.',
    'export_council',
    '{"themes":["shipment documentation","origin"]}'::jsonb
  ),
  (
    'cert_packaging_labeling',
    'export_packaging_labeling',
    'Export Packaging and Labelling Evidence',
    'Packing, labelling, handling, and wood-packaging evidence for export shipments.',
    'shipment_document',
    null,
    'Packaging photos, packing list, crate labels, and fumigation/ISPM evidence where applicable.',
    'self',
    '{"themes":["packaging","shipment readiness"]}'::jsonb
  )
on conflict (id) do update set
  code=excluded.code,
  name=excluded.name,
  description=excluded.description,
  evidence_type=excluded.evidence_type,
  renewal_period_months=excluded.renewal_period_months,
  scope_description=excluded.scope_description,
  issuing_authority_type=excluded.issuing_authority_type,
  metadata=excluded.metadata,
  active=true,
  updated_at=(extract(epoch from now()) * 1000)::bigint;

update public.export_requirements
set
  certification_id = case id
    when 'stone_any_any_iec' then 'cert_iec'
    when 'stone_any_any_iso_9001' then 'cert_iso_9001'
    when 'stone_granite_us_astm' then 'cert_astm_stone'
    when 'stone_marble_us_astm' then 'cert_astm_stone'
    when 'stone_any_eu_en_ce_evidence' then 'cert_en_ce_stone'
    when 'stone_any_eu_responsible_sourcing' then 'cert_responsible_sourcing'
    when 'stone_any_any_silica_environment' then 'cert_silica_environment'
    when 'stone_any_any_origin_gsp' then 'cert_origin_gsp'
    when 'stone_any_any_packaging_labeling' then 'cert_packaging_labeling'
    else certification_id
  end,
  destination_markets = case
    when destination_market is null or destination_market = 'any' then '{"GLOBAL"}'::text[]
    else array[destination_market]
  end,
  evidence_lifecycle_type = case id
    when 'stone_any_any_iec' then 'government_registration'
    when 'stone_any_any_iso_9001' then 'management_system_cert'
    when 'stone_granite_us_astm' then 'product_test_report'
    when 'stone_marble_us_astm' then 'product_test_report'
    when 'stone_any_eu_en_ce_evidence' then 'product_test_report'
    when 'stone_any_eu_responsible_sourcing' then 'responsible_sourcing_audit'
    when 'stone_any_any_silica_environment' then 'operational_record'
    when 'stone_any_any_origin_gsp' then 'shipment_document'
    when 'stone_any_any_packaging_labeling' then 'shipment_document'
    else evidence_lifecycle_type
  end,
  product_category = case
    when sector = 'stone' then 'dimensional_stone'
    else product_category
  end
where certification_id is null
   or destination_markets = '{}'::text[]
   or evidence_lifecycle_type is null
   or product_category is null;

update public.readiness_evidence e
set
  evidence_lifecycle_type = coalesce(e.evidence_lifecycle_type, r.evidence_lifecycle_type),
  next_check_at = coalesce(
    e.next_check_at,
    case
      when e.expires_at is not null and e.issued_at is not null
        then greatest(e.issued_at, e.expires_at - 60 * 86400000)
      when e.expires_at is not null
        then e.expires_at - 60 * 86400000
      else null
    end
  )
from public.export_requirements r
where r.id = e.requirement_id;

create table if not exists public.certification_body_certifications (
  body_id text not null references public.certification_bodies(id) on delete cascade,
  certification_id text not null references public.certifications(id) on delete cascade,
  is_primary boolean not null default false,
  scope_notes text,
  primary key (body_id, certification_id)
);

alter table public.certification_body_certifications enable row level security;

create policy "certification body certifications read active" on public.certification_body_certifications
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.certification_bodies b
      where b.id = certification_body_certifications.body_id
        and b.active
        and b.status = 'active'
    )
  );

create policy "certification body certifications owner writes" on public.certification_body_certifications
  for all using (public.is_owner())
  with check (public.is_owner());

insert into public.certification_body_certifications (body_id, certification_id, is_primary, scope_notes) values
  ('body_dgft', 'cert_iec', true, 'Official IEC route.'),
  ('body_sgs', 'cert_iso_9001', true, 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_bureau_veritas', 'cert_iso_9001', true, 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_intertek', 'cert_iso_9001', true, 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_tuv_nord', 'cert_iso_9001', true, 'Possible ISO 9001 certification support; verify accreditation and scope.'),
  ('body_cdos_jaipur', 'cert_astm_stone', true, 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_cdos_jaipur', 'cert_en_ce_stone', true, 'Potential stone lab testing route; confirm accepted methods.'),
  ('body_sgs', 'cert_en_ce_stone', false, 'Potential EU evidence support; verify scope.'),
  ('body_bureau_veritas', 'cert_en_ce_stone', false, 'Potential EU evidence support; verify scope.'),
  ('body_intertek', 'cert_en_ce_stone', false, 'Potential EU evidence support; verify scope.'),
  ('body_capexil', 'cert_origin_gsp', true, 'Potential origin/export documentation guidance; verify route.')
on conflict (body_id, certification_id) do update set
  is_primary=excluded.is_primary,
  scope_notes=excluded.scope_notes;

create or replace view public.export_requirement_catalog
with (security_invoker = true) as
select
  r.*,
  c.code as certification_code,
  c.name as certification_name,
  c.evidence_type as certification_evidence_type,
  c.renewal_period_months as certification_renewal_period_months,
  c.issuing_authority_type
from public.export_requirements r
left join public.certifications c on c.id = r.certification_id
where r.active;

comment on table public.certifications is
  'Reusable master records for certifications, registrations, lab reports, shipment documents, and operational compliance evidence.';

comment on column public.export_requirements.certification_id is
  'Reusable certification/specification referenced by this applicability rule.';

comment on column public.export_requirements.destination_markets is
  'Markets where this requirement applies. GLOBAL means market-independent.';

comment on column public.export_requirements.evidence_lifecycle_type is
  'Lifecycle category used by UI, AI roadmaps, renewal reminders, and verification workflows.';

comment on column public.readiness_evidence.next_check_at is
  'Future reminder/check timestamp, usually before expires_at, for renewal workflows.';

comment on table public.certification_body_certifications is
  'Normalized mapping from certification bodies/labs/portals to reusable certification specs.';

comment on view public.export_requirement_catalog is
  'Joined active export requirements with reusable certification metadata for UI and AI roadmap generation.';

```


===== FILE: supabase/migrations/202605240005_revert_out_of_scope_readiness.sql =====

```sql
-- Reversal of out-of-scope migrations 202605240003 and 202605240004.
-- These objects were created in PRs that violated the original Export Readiness
-- brief scope. They can be reintroduced later in dedicated, scoped PRs.

-- 202605240004_exporter_profile_leads.sql
drop function if exists public.create_public_exporter_profile_lead(
  text,
  text,
  text,
  text,
  text[],
  text
);

drop policy if exists "exporter profile leads own factory read" on public.exporter_profile_leads;
drop policy if exists "exporter profile leads own factory update" on public.exporter_profile_leads;
drop policy if exists "exporter profile leads owner delete" on public.exporter_profile_leads;

alter table if exists public.exporter_profile_leads disable row level security;

drop index if exists public.exporter_profile_leads_factory_status_idx;
drop table if exists public.exporter_profile_leads;

-- 202605240003_public_exporter_readiness.sql
drop function if exists public.get_public_exporter_readiness(text);

```


===== FILE: supabase/migrations/202605240006_factory_evidence_storage.sql =====

```sql
-- Factory Evidence storage bucket for Export Readiness uploads.
-- File path convention: {factory_id}/{requirement_id}/{timestamp}-{sanitized_filename}
-- Bucket is private. Reads happen via short-lived signed URLs generated by the app.

-- ── Bucket ────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'factory_evidence',
  'factory_evidence',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── Policies on storage.objects (scoped by bucket_id) ─────────────────────

drop policy if exists "factory_evidence read" on storage.objects;
drop policy if exists "factory_evidence insert" on storage.objects;
drop policy if exists "factory_evidence update" on storage.objects;
drop policy if exists "factory_evidence delete" on storage.objects;

create policy "factory_evidence read"
  on storage.objects for select
  using (
    bucket_id = 'factory_evidence'
    and (
      public.is_owner()
      or public.same_factory((storage.foldername(name))[1])
    )
  );

create policy "factory_evidence insert"
  on storage.objects for insert
  with check (
    bucket_id = 'factory_evidence'
    and (
      public.is_owner()
      or (
        public.current_profile_role() in ('admin', 'manager')
        and public.same_factory((storage.foldername(name))[1])
      )
    )
  );

create policy "factory_evidence update"
  on storage.objects for update
  using (
    bucket_id = 'factory_evidence'
    and (
      public.is_owner()
      or (
        public.current_profile_role() in ('admin', 'manager')
        and public.same_factory((storage.foldername(name))[1])
      )
    )
  )
  with check (
    bucket_id = 'factory_evidence'
    and (
      public.is_owner()
      or (
        public.current_profile_role() in ('admin', 'manager')
        and public.same_factory((storage.foldername(name))[1])
      )
    )
  );

create policy "factory_evidence delete"
  on storage.objects for delete
  using (
    bucket_id = 'factory_evidence'
    and (
      public.is_owner()
      or (
        public.current_profile_role() in ('admin', 'manager')
        and public.same_factory((storage.foldername(name))[1])
      )
    )
  );

comment on policy "factory_evidence read" on storage.objects is
  'Factory members read their own factory evidence files. Platform owner reads all.';
comment on policy "factory_evidence insert" on storage.objects is
  'Admin and manager roles in the same factory can upload. Owner can upload anywhere.';

```


===== FILE: supabase/migrations/20260913142135_processed_foods_marketplace_core.sql =====

```sql
create table if not exists public.organizations (
  id text primary key,
  type text not null check (type in ('buyer','seller')),
  name text not null,
  country text,
  city text,
  website text,
  description text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create table if not exists public.products (
  id text primary key,
  seller_org_id text not null references public.organizations(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  ingredients text,
  country_of_origin text,
  moq numeric,
  moq_unit text,
  capacity numeric,
  capacity_unit text,
  packaging jsonb not null default '[]'::jsonb,
  shelf_life text,
  storage_requirements text,
  lead_time_days integer,
  export_markets jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  allergens jsonb not null default '[]'::jsonb,
  dietary_attributes jsonb not null default '[]'::jsonb,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  status text not null default 'draft' check (status in ('draft','active','inactive')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create table if not exists public.trade_documents (
  id text primary key,
  organization_id text not null references public.organizations(id) on delete cascade,
  product_id text references public.products(id) on delete cascade,
  document_type text not null,
  title text not null,
  issuer text,
  reference_number text,
  issued_at bigint,
  expires_at bigint,
  file_url text,
  visibility text not null default 'buyers' check (visibility in ('public','buyers','private')),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','expired')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create table if not exists public.rfqs (
  id text primary key,
  buyer_org_id text not null references public.organizations(id),
  seller_org_id text references public.organizations(id),
  product_id text references public.products(id),
  product_category text,
  quantity numeric,
  quantity_unit text,
  destination_country text,
  destination_city text,
  required_by bigint,
  requirements text,
  status text not null default 'open' check (status in ('draft','open','quoted','negotiating','accepted','closed','cancelled')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

create table if not exists public.trade_quotes (
  id text primary key,
  rfq_id text not null references public.rfqs(id) on delete cascade,
  seller_org_id text not null references public.organizations(id),
  currency text not null default 'USD',
  unit_price numeric,
  quantity numeric,
  quantity_unit text,
  total_amount numeric,
  incoterm text,
  lead_time_days integer,
  validity_ts bigint,
  notes text,
  status text not null default 'sent' check (status in ('draft','sent','accepted','revision_requested','revised','expired','rejected')),
  created_at bigint not null default ((extract(epoch from now())*1000)::bigint)
);

alter table public.profiles add column if not exists organization_id text references public.organizations(id);
alter table public.profiles add column if not exists organization_role text;

alter table public.organizations enable row level security;
alter table public.products enable row level security;
alter table public.trade_documents enable row level security;
alter table public.rfqs enable row level security;
alter table public.trade_quotes enable row level security;

create index if not exists products_seller_org_idx on public.products(seller_org_id);
create index if not exists products_category_idx on public.products(category);
create index if not exists rfqs_buyer_org_idx on public.rfqs(buyer_org_id);
create index if not exists rfqs_seller_org_idx on public.rfqs(seller_org_id);
create index if not exists trade_quotes_rfq_idx on public.trade_quotes(rfq_id);

```


===== FILE: supabase/migrations/20260913154327_marketplace_access_foundation.sql =====

```sql
-- Marketplace authority is explicit; legacy profile.role and editable JWT metadata
-- never grant marketplace privileges. Existing auth and legacy policies are untouched.
create schema epistable_private;
revoke all on schema epistable_private from public, anon, authenticated;
grant usage on schema epistable_private to authenticated;
create table epistable_private.marketplace_access (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id text references public.organizations(id),
  access_role text not null check (access_role in ('platform_admin','seller_admin','seller_member','buyer_admin','buyer_member')),
  check ((access_role = 'platform_admin') = (organization_id is null))
);
alter table epistable_private.marketplace_access enable row level security;
revoke all on epistable_private.marketplace_access from public, anon, authenticated;
create index marketplace_access_org_idx on epistable_private.marketplace_access(organization_id);

-- One-time bootstrap; later owner/admin invites do not confer marketplace access.
insert into epistable_private.marketplace_access(auth_user_id,access_role)
select auth_user_id,'platform_admin' from public.profiles
where role='owner' and status='active' and auth_user_id is not null;

-- Narrow read-only helper avoids recursion through legacy profile policies.
create function epistable_private.context()
returns jsonb language sql stable security definer set search_path = ''
as $$
 select jsonb_build_object('org',a.organization_id,'role',a.access_role)
 from epistable_private.marketplace_access a
 join public.profiles p on p.auth_user_id=a.auth_user_id
 left join public.organizations o on o.id=a.organization_id
 where auth.uid() is not null and a.auth_user_id=auth.uid() and p.status='active'
 and (a.access_role='platform_admin'
   or (a.access_role like 'seller_%' and o.type='seller')
   or (a.access_role like 'buyer_%' and o.type='buyer'))
$$;
revoke all on function epistable_private.context() from public, anon, authenticated;
grant execute on function epistable_private.context() to authenticated;

-- Safe session description for Phase 1 clients. Invoker only, no input identity.
create function public.marketplace_context()
returns jsonb language sql stable security invoker set search_path = ''
as $$ select epistable_private.context() $$;
revoke all on function public.marketplace_context() from public, anon;
grant execute on function public.marketplace_context() to authenticated;

-- These five tables previously had no policies. Preserve default deny for anon.
revoke all on public.organizations,public.products,public.trade_documents,public.rfqs,public.trade_quotes from public,anon,authenticated;
grant select,insert,update,delete on public.organizations,public.products,public.trade_documents,public.rfqs,public.trade_quotes to authenticated;

create policy marketplace_org_read on public.organizations for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or id=(select epistable_private.context()->>'org')
 or ((select epistable_private.context()->>'role') like 'buyer_%' and type='seller' and verification_status='verified')
);
create policy marketplace_org_insert on public.organizations for insert to authenticated with check (
 (select epistable_private.context()->>'role')='platform_admin'
);
create policy marketplace_org_update on public.organizations for update to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or (id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') in ('seller_admin','buyer_admin'))
) with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') in ('seller_admin','buyer_admin'))
);

create policy marketplace_product_read on public.products for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or seller_org_id=(select epistable_private.context()->>'org')
 or ((select epistable_private.context()->>'role') like 'buyer_%' and status='active' and verification_status='verified'
 and exists(select 1 from public.organizations o where o.id=seller_org_id and o.type='seller' and o.verification_status='verified'))
);
create policy marketplace_product_insert on public.products for insert to authenticated with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%'
 and verification_status in ('unverified','pending') and status='draft')
);
create policy marketplace_product_update on public.products for update to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%')
) with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%'
 and verification_status in ('unverified','pending') and status in ('draft','inactive'))
);

create policy marketplace_document_read on public.trade_documents for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or organization_id=(select epistable_private.context()->>'org')
 or ((select epistable_private.context()->>'role') like 'buyer_%' and visibility in ('buyers','public')
 and verification_status='verified' and (expires_at is null or expires_at > extract(epoch from now())*1000)
 and exists(select 1 from public.organizations o where o.id=organization_id and o.type='seller' and o.verification_status='verified')
 and (product_id is null or exists(select 1 from public.products p where p.id=product_id)))
);
create policy marketplace_document_insert on public.trade_documents for insert to authenticated with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (organization_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%' and verification_status='pending')
);
create policy marketplace_document_update on public.trade_documents for update to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or (organization_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%')
) with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (organization_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%' and verification_status='pending')
);

create policy marketplace_rfq_read on public.rfqs for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or buyer_org_id=(select epistable_private.context()->>'org')
 or ((select epistable_private.context()->>'role') like 'seller_%' and status not in ('draft','cancelled')
 and (seller_org_id=(select epistable_private.context()->>'org') or (seller_org_id is null and status='open')))
);
create policy marketplace_rfq_insert on public.rfqs for insert to authenticated with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (buyer_org_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'buyer_%' and status in ('draft','open'))
);
-- Submitted RFQs and quote decisions need controlled transition APIs in Phase 5.
create policy marketplace_rfq_update on public.rfqs for update to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or (buyer_org_id=(select epistable_private.context()->>'org') and status='draft')
) with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (buyer_org_id=(select epistable_private.context()->>'org') and status in ('draft','open','cancelled'))
);

create policy marketplace_quote_read on public.trade_quotes for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or seller_org_id=(select epistable_private.context()->>'org')
 or (status<>'draft' and exists(select 1 from public.rfqs r where r.id=rfq_id and r.buyer_org_id=(select epistable_private.context()->>'org')))
);
create policy marketplace_quote_insert on public.trade_quotes for insert to authenticated with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%'
 and status in ('draft','sent') and exists(select 1 from public.rfqs r where r.id=rfq_id and r.status='open'
 and (r.seller_org_id is null or r.seller_org_id=trade_quotes.seller_org_id)))
);
create policy marketplace_quote_update on public.trade_quotes for update to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and status='draft')
) with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and status in ('draft','sent')
 and exists(select 1 from public.rfqs r where r.id=rfq_id and r.status='open' and (r.seller_org_id is null or r.seller_org_id=trade_quotes.seller_org_id)))
);
-- No DELETE policy: preserve trade evidence; status changes provide archival.
-- Row ownership and review metadata must not be reassigned by members.
create function epistable_private.guard_marketplace_update()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 if (epistable_private.context()->>'role') is distinct from 'platform_admin' then
   if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
     raise exception 'Record identity is immutable' using errcode='42501';
   end if;
   if TG_TABLE_NAME='organizations' then
     if new.type is distinct from old.type then raise exception 'Organization type is immutable' using errcode='42501'; end if;
     if new.verification_status not in ('unverified','pending') then
       raise exception 'Profile changes require verification review' using errcode='42501';
     end if;
   elsif TG_TABLE_NAME='products' then
     if new.seller_org_id is distinct from old.seller_org_id then raise exception 'Seller is immutable' using errcode='42501'; end if;
   elsif TG_TABLE_NAME='trade_documents' then
     if new.organization_id is distinct from old.organization_id then raise exception 'Organization is immutable' using errcode='42501'; end if;
   elsif TG_TABLE_NAME='rfqs' then
     if new.buyer_org_id is distinct from old.buyer_org_id then raise exception 'Buyer is immutable' using errcode='42501'; end if;
   elsif TG_TABLE_NAME='trade_quotes' then
     if new.seller_org_id is distinct from old.seller_org_id or new.rfq_id is distinct from old.rfq_id then raise exception 'Quote parties are immutable' using errcode='42501'; end if;
   end if;
 end if;
 return new;
end
$$;
revoke all on function epistable_private.guard_marketplace_update() from public,anon,authenticated;

create trigger marketplace_update_guard before update on public.organizations for each row execute function epistable_private.guard_marketplace_update();

create trigger marketplace_update_guard before update on public.products for each row execute function epistable_private.guard_marketplace_update();

create trigger marketplace_update_guard before update on public.trade_documents for each row execute function epistable_private.guard_marketplace_update();

create trigger marketplace_update_guard before update on public.rfqs for each row execute function epistable_private.guard_marketplace_update();

create trigger marketplace_update_guard before update on public.trade_quotes for each row execute function epistable_private.guard_marketplace_update();

-- Enforce relationships even for platform admins; FK alone only checks existence.
create function epistable_private.validate_marketplace_links()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 if TG_TABLE_NAME='products' then
   if not exists(select 1 from public.organizations where id=new.seller_org_id and type='seller') then raise exception 'Product needs a seller organization' using errcode='23514'; end if;
 elsif TG_TABLE_NAME='trade_documents' then
   if new.product_id is not null and not exists(select 1 from public.products where id=new.product_id and seller_org_id=new.organization_id) then raise exception 'Document product must belong to its organization' using errcode='23514'; end if;
 elsif TG_TABLE_NAME='rfqs' then
   if not exists(select 1 from public.organizations where id=new.buyer_org_id and type='buyer') then raise exception 'RFQ needs a buyer organization' using errcode='23514'; end if;
   if new.seller_org_id is not null and not exists(select 1 from public.organizations where id=new.seller_org_id and type='seller') then raise exception 'RFQ seller must be a seller organization' using errcode='23514'; end if;
   if new.product_id is not null and (new.seller_org_id is null or not exists(select 1 from public.products where id=new.product_id and seller_org_id=new.seller_org_id)) then raise exception 'RFQ product must belong to target seller' using errcode='23514'; end if;
 end if;
 return new;
end
$$;
revoke all on function epistable_private.validate_marketplace_links() from public,anon,authenticated;

create trigger marketplace_link_guard before insert or update on public.products for each row execute function epistable_private.validate_marketplace_links();

create trigger marketplace_link_guard before insert or update on public.trade_documents for each row execute function epistable_private.validate_marketplace_links();

create trigger marketplace_link_guard before insert or update on public.rfqs for each row execute function epistable_private.validate_marketplace_links();

create index if not exists profiles_organization_id_idx on public.profiles(organization_id);
create index if not exists trade_documents_organization_id_idx on public.trade_documents(organization_id);
create index if not exists trade_documents_product_id_idx on public.trade_documents(product_id);
create index if not exists rfqs_product_id_idx on public.rfqs(product_id);
create index if not exists trade_quotes_seller_org_id_idx on public.trade_quotes(seller_org_id);
grant usage on schema epistable_private to service_role;
grant select,insert,update,delete on epistable_private.marketplace_access to service_role;

```


===== FILE: supabase/migrations/20260913161333_marketplace_organisation_management.sql =====

```sql
-- Organization administration uses existing Auth users; it never sends invitations.
create function epistable_private.marketplace_accounts()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
 if auth.uid() is null or (epistable_private.context()->>'role') is distinct from 'platform_admin' then
  raise exception 'Platform administrator required' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
  'id',p.auth_user_id,'name',p.name,'email',p.email,'status',p.status,
  'organization_id',a.organization_id,'access_role',a.access_role) order by p.name)
 from public.profiles p left join epistable_private.marketplace_access a on a.auth_user_id=p.auth_user_id
 where p.auth_user_id is not null),'[]'::jsonb);
end $$;

create function epistable_private.assign_marketplace_access(target_user uuid,target_org text,target_role text)
returns void language plpgsql security definer set search_path=''
as $$
declare org_type text;
begin
 if auth.uid() is null or (epistable_private.context()->>'role') is distinct from 'platform_admin' then
  raise exception 'Platform administrator required' using errcode='42501';
 end if;
 if exists(select 1 from epistable_private.marketplace_access where auth_user_id=target_user and access_role='platform_admin') then
  raise exception 'Platform administrator access cannot be changed here' using errcode='42501';
 end if;
 if not exists(select 1 from public.profiles where auth_user_id=target_user and status='active') then
  raise exception 'Choose an active linked account' using errcode='23514';
 end if;
 select type into org_type from public.organizations where id=target_org;
 if org_type is null or target_role is null or target_role not in ('seller_admin','seller_member','buyer_admin','buyer_member')
   or split_part(target_role,'_',1)<>org_type then
  raise exception 'Role must match the organisation type' using errcode='23514';
 end if;
 insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
 values(target_user,target_org,target_role)
 on conflict(auth_user_id) do update set organization_id=excluded.organization_id,access_role=excluded.access_role;
 -- Compatibility fields: marketplace policies continue to trust ONLY the private access table.
 update public.profiles set organization_id=target_org,organization_role=target_role where auth_user_id=target_user;
end $$;
revoke all on function epistable_private.marketplace_accounts() from public,anon,authenticated;
revoke all on function epistable_private.assign_marketplace_access(uuid,text,text) from public,anon,authenticated;
grant execute on function epistable_private.marketplace_accounts() to authenticated;
grant execute on function epistable_private.assign_marketplace_access(uuid,text,text) to authenticated;

create function public.marketplace_accounts()
returns jsonb language sql stable security invoker set search_path=''
as $$ select epistable_private.marketplace_accounts() $$;
create function public.assign_marketplace_access(target_user uuid,target_org text,target_role text)
returns void language sql security invoker set search_path=''
as $$ select epistable_private.assign_marketplace_access(target_user,target_org,target_role) $$;
revoke all on function public.marketplace_accounts() from public,anon;
revoke all on function public.assign_marketplace_access(uuid,text,text) from public,anon;
grant execute on function public.marketplace_accounts() to authenticated;
grant execute on function public.assign_marketplace_access(uuid,text,text) to authenticated;

```


===== FILE: supabase/migrations/20260913163014_marketplace_trade_workflows.sql =====

```sql
-- Marketplace-only validation and immutable verification history.
alter table public.organizations add column review_note text;
alter table public.products add column review_note text;
alter table public.trade_documents add column review_note text;

alter table public.products add constraint products_positive_trade_values check (
 (moq is null or (moq>0 and moq<1e12)) and (capacity is null or (capacity>0 and capacity<1e12)) and
 (lead_time_days is null or lead_time_days between 0 and 3650));
alter table public.rfqs add constraint rfqs_valid_quantity check (
 (quantity is null or (quantity>0 and quantity<1e12)) and
 (status='draft' or status='cancelled' or (quantity is not null and nullif(trim(quantity_unit),'') is not null and nullif(trim(destination_country),'') is not null)));
alter table public.trade_quotes add constraint trade_quotes_valid_terms check (
 (quantity is null or (quantity>0 and quantity<1e12)) and
 (unit_price is null or (unit_price>0 and unit_price<1e12)) and
 (total_amount is null or (total_amount>0 and total_amount<1e24)) and
 (lead_time_days is null or lead_time_days between 0 and 3650) and
 (status='draft' or (quantity is not null and unit_price is not null and total_amount is not null and currency is not null and incoterm is not null and total_amount=round(quantity*unit_price,2)
  and currency ~ '^[A-Z]{3}$' and nullif(trim(quantity_unit),'') is not null and validity_ts is not null
  and incoterm in ('EXW','FCA','CPT','CIP','DAP','DPU','DDP','FAS','FOB','CFR','CIF'))));
create unique index trade_quotes_one_per_seller_rfq on public.trade_quotes(rfq_id,seller_org_id) where status<>'draft';

create table public.marketplace_reviews (
 id uuid primary key default gen_random_uuid(),
 organization_id text not null references public.organizations(id),
 target_kind text not null check(target_kind in ('organization','product','document')),
 target_id text not null,
 decision text not null,
 reason text,
 reviewer_id uuid references auth.users(id),
 snapshot jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.marketplace_reviews enable row level security;
revoke all on public.marketplace_reviews from public,anon,authenticated;
grant select on public.marketplace_reviews to authenticated;
create policy marketplace_reviews_read on public.marketplace_reviews for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin' or organization_id=(select epistable_private.context()->>'org'));
create index marketplace_reviews_org_created on public.marketplace_reviews(organization_id,created_at desc);
create index marketplace_reviews_reviewer on public.marketplace_reviews(reviewer_id);

create function epistable_private.validate_trade_submission() returns trigger language plpgsql security invoker set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
begin
 if tg_table_name in ('organizations','products','trade_documents') and ctx->>'role' is distinct from 'platform_admin' then
  new.review_note := null;
 end if;
 if tg_table_name='products' then
  if new.verification_status in ('pending','verified') and
   (nullif(trim(new.name),'') is null or nullif(trim(new.category),'') is null or nullif(trim(new.country_of_origin),'') is null
    or new.moq is null or new.packaging is null or nullif(trim(new.moq_unit),'') is null or jsonb_array_length(new.packaging)=0
    or nullif(trim(new.shelf_life),'') is null or nullif(trim(new.storage_requirements),'') is null) then
   raise exception 'Complete origin, minimum order, packaging, shelf life and storage before submitting a product' using errcode='23514';
  end if;
 elsif tg_table_name='rfqs' then
  if new.status='open' and (tg_op='INSERT' or old.status='draft') then
   if new.required_by is not null and new.required_by<=extract(epoch from now())*1000 then
    raise exception 'Required date must be in the future' using errcode='23514';
   end if;
   if ctx->>'role' in ('buyer_admin','buyer_member') and new.product_id is not null and not exists(
    select 1 from public.products p join public.organizations o on o.id=p.seller_org_id
    where p.id=new.product_id and p.status='active' and p.verification_status='verified' and o.verification_status='verified') then
    raise exception 'Choose an active verified product from a verified seller' using errcode='23514';
   end if;
  end if;
 elsif tg_table_name='trade_quotes' then
  if new.status='sent' and ctx->>'role' in ('seller_admin','seller_member') and not exists(select 1 from public.organizations where id=new.seller_org_id and verification_status='verified') then
   raise exception 'Your organisation must be verified before sending quotes' using errcode='23514';
  end if;
  if new.status='sent' and (tg_op='INSERT' or old.status='draft') and
   (new.validity_ts is null or new.validity_ts<=extract(epoch from now())*1000) then
   raise exception 'Quote validity must be in the future' using errcode='23514';
  end if;
 elsif tg_table_name='trade_documents' then
  if new.file_url is not null and new.file_url !~ '^https://' then
   raise exception 'Evidence source must be an HTTPS URL' using errcode='23514';
  end if;
  if new.expires_at is not null and new.issued_at is not null and new.expires_at<=new.issued_at then
   raise exception 'Expiry must follow issue date' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
revoke all on function epistable_private.validate_trade_submission() from public,anon,authenticated;
create trigger validate_trade_submission before insert or update on public.organizations for each row execute function epistable_private.validate_trade_submission();
create trigger validate_trade_submission before insert or update on public.products for each row execute function epistable_private.validate_trade_submission();
create trigger validate_trade_submission before insert or update on public.trade_documents for each row execute function epistable_private.validate_trade_submission();
create trigger validate_trade_submission before insert or update on public.rfqs for each row execute function epistable_private.validate_trade_submission();
create trigger validate_trade_submission before insert or update on public.trade_quotes for each row execute function epistable_private.validate_trade_submission();

create function epistable_private.record_marketplace_review() returns trigger language plpgsql security definer set search_path=''
as $$
begin
 -- Ordinary writes still pass table RLS. The trigger can only append history.
 if auth.uid() is null then return new; end if;
 if tg_op='INSERT' or new.verification_status is distinct from old.verification_status then
  insert into public.marketplace_reviews(organization_id,target_kind,target_id,decision,reason,reviewer_id,snapshot)
  values(case tg_table_name when 'organizations' then new.id when 'products' then to_jsonb(new)->>'seller_org_id' else to_jsonb(new)->>'organization_id' end,
  case tg_table_name when 'organizations' then 'organization' when 'products' then 'product' else 'document' end,
  new.id,new.verification_status,new.review_note,auth.uid(),to_jsonb(new));
 end if;
 return new;
end $$;
revoke all on function epistable_private.record_marketplace_review() from public,anon,authenticated;
create trigger record_marketplace_review after insert or update on public.organizations for each row execute function epistable_private.record_marketplace_review();
create trigger record_marketplace_review after insert or update on public.products for each row execute function epistable_private.record_marketplace_review();
create trigger record_marketplace_review after insert or update on public.trade_documents for each row execute function epistable_private.record_marketplace_review();

create function public.review_marketplace_record(target_kind text,target_id text,decision text,reason text)
returns void language plpgsql security invoker set search_path=''
as $$
declare changed integer;
begin
 if auth.uid() is null or (epistable_private.context()->>'role') is distinct from 'platform_admin' then
  raise exception 'Platform administrator required' using errcode='42501';
 end if;
 if decision is null or decision not in ('verified','rejected') or nullif(trim(reason),'') is null or length(reason)>4000 then
  raise exception 'Choose approve or reject and give a review reason' using errcode='23514';
 end if;
 if target_kind='organization' then
  update public.organizations set verification_status=decision,review_note=trim(reason) where id=target_id
   and verification_status in ('pending','unverified')
   and (decision='rejected' or nullif(trim(country),'') is not null);
 elsif target_kind='product' then
  update public.products p set verification_status=decision,review_note=trim(reason),status=case when decision='verified' then 'active' else 'draft' end
   where p.id=target_id and p.verification_status='pending'
   and (decision='rejected' or exists(select 1 from public.organizations o where o.id=p.seller_org_id and o.verification_status='verified'));
 elsif target_kind='document' then
  update public.trade_documents set verification_status=decision,review_note=trim(reason)
   where id=target_id and verification_status='pending'
   and (decision='rejected' or (file_url ~ '^https://' and (expires_at is null or expires_at>extract(epoch from now())*1000)));
 else raise exception 'Unknown review target' using errcode='23514';
 end if;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Record changed or is not ready for this review. Refresh and check its details.' using errcode='23514'; end if;
end $$;
revoke all on function public.review_marketplace_record(text,text,text,text) from public,anon;
grant execute on function public.review_marketplace_record(text,text,text,text) to authenticated;

```


===== FILE: supabase/migrations/20260919170000_seller_publish_product_images.sql =====

```sql
-- Seller self-publishing, product images, and risk-based review for processed foods.

alter table public.products
  add column if not exists image_urls jsonb not null default '[]'::jsonb,
  add column if not exists cover_image_url text,
  add column if not exists risk_status text not null default 'clear',
  add column if not exists risk_reason text;

alter table public.products drop constraint if exists products_risk_status_check;
alter table public.products add constraint products_risk_status_check
  check (risk_status in ('clear','review_required','blocked'));

alter table public.products drop constraint if exists products_image_urls_array;
alter table public.products add constraint products_image_urls_array
  check (jsonb_typeof(image_urls)='array' and jsonb_array_length(image_urls)<=6);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists product_images_insert on storage.objects;
drop policy if exists product_images_update on storage.objects;
drop policy if exists product_images_delete on storage.objects;
drop policy if exists product_images_select on storage.objects;

create policy product_images_select on storage.objects
for select to authenticated using (bucket_id='product-images');

create policy product_images_insert on storage.objects
for insert to authenticated with check (
  bucket_id='product-images'
  and (select public.marketplace_context()->>'role') in ('seller_admin','seller_member')
  and (storage.foldername(name))[1]=(select public.marketplace_context()->>'org')
);

create policy product_images_update on storage.objects
for update to authenticated using (
  bucket_id='product-images'
  and (select public.marketplace_context()->>'role') in ('seller_admin','seller_member')
  and (storage.foldername(name))[1]=(select public.marketplace_context()->>'org')
) with check (
  bucket_id='product-images'
  and (storage.foldername(name))[1]=(select public.marketplace_context()->>'org')
);

create policy product_images_delete on storage.objects
for delete to authenticated using (
  bucket_id='product-images'
  and (select public.marketplace_context()->>'role') in ('seller_admin','seller_member')
  and (storage.foldername(name))[1]=(select public.marketplace_context()->>'org')
);

create or replace function epistable_private.product_requires_review(
  product_name text,
  product_description text,
  dietary jsonb,
  certifications jsonb
) returns boolean
language sql immutable set search_path=''
as $$
  select lower(
    coalesce(product_name,'') || ' ' ||
    coalesce(product_description,'') || ' ' ||
    coalesce(dietary::text,'') || ' ' ||
    coalesce(certifications::text,'')
  ) ~ '(cure|treat|prevent)[[:space:]]+(cancer|diabetes|disease|infection)|medicinal|therapeutic|miracle[[:space:]]+cure|guaranteed[[:space:]]+weight[[:space:]]+loss|fda[[:space:]]+approved';
$$;
revoke all on function epistable_private.product_requires_review(text,text,jsonb,jsonb) from public,anon,authenticated;

drop policy if exists marketplace_product_read on public.products;
create policy marketplace_product_read on public.products for select to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or seller_org_id=(select epistable_private.context()->>'org')
 or ((select epistable_private.context()->>'role') like 'buyer_%' and status='active'
 and exists(select 1 from public.organizations o where o.id=seller_org_id and o.type='seller' and o.verification_status='verified'))
);

drop policy if exists marketplace_product_insert on public.products;
create policy marketplace_product_insert on public.products for insert to authenticated with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (
   seller_org_id=(select epistable_private.context()->>'org')
   and (select epistable_private.context()->>'role') like 'seller_%'
   and verification_status in ('unverified','pending')
   and status in ('draft','active')
 )
);

drop policy if exists marketplace_product_update on public.products;
create policy marketplace_product_update on public.products for update to authenticated using (
 (select epistable_private.context()->>'role')='platform_admin'
 or (seller_org_id=(select epistable_private.context()->>'org') and (select epistable_private.context()->>'role') like 'seller_%')
) with check (
 (select epistable_private.context()->>'role')='platform_admin'
 or (
   seller_org_id=(select epistable_private.context()->>'org')
   and (select epistable_private.context()->>'role') like 'seller_%'
   and verification_status in ('unverified','pending')
   and status in ('draft','active','inactive')
 )
);

create or replace function epistable_private.validate_trade_submission() returns trigger
language plpgsql security invoker set search_path=''
as $$
declare ctx jsonb := epistable_private.context();
declare seller_is_verified boolean;
begin
 if tg_table_name in ('organizations','products','trade_documents') and ctx->>'role' is distinct from 'platform_admin' then
  new.review_note := null;
 end if;

 if tg_table_name='products' then
  if new.verification_status in ('pending','verified') or new.status='active' then
   if nullif(trim(new.name),'') is null or nullif(trim(new.category),'') is null or nullif(trim(new.country_of_origin),'') is null
    or new.moq is null or new.packaging is null or nullif(trim(new.moq_unit),'') is null or jsonb_array_length(new.packaging)=0
    or nullif(trim(new.shelf_life),'') is null or nullif(trim(new.storage_requirements),'') is null then
    raise exception 'Complete origin, minimum order, packaging, shelf life and storage before publishing a product' using errcode='23514';
   end if;
  end if;

  if ctx->>'role' in ('seller_admin','seller_member') and new.status='active' then
   select verification_status='verified' into seller_is_verified from public.organizations where id=new.seller_org_id;
   if coalesce(seller_is_verified,false) is not true then
    raise exception 'Your seller organisation must be verified before publishing products' using errcode='23514';
   end if;
   if jsonb_array_length(coalesce(new.image_urls,'[]'::jsonb))=0 then
    raise exception 'Add at least one product image before publishing' using errcode='23514';
   end if;
   if epistable_private.product_requires_review(new.name,new.description,new.dietary_attributes,new.certifications) then
    raise exception 'This listing contains a health or regulated claim that needs Epistable review before publication' using errcode='23514';
   end if;
   new.verification_status := 'unverified';
   new.risk_status := 'clear';
   new.risk_reason := null;
  elsif new.verification_status='pending' and epistable_private.product_requires_review(new.name,new.description,new.dietary_attributes,new.certifications) then
   new.risk_status := 'review_required';
   new.risk_reason := 'Health or regulated claim requires manual review before publication';
  end if;

 elsif tg_table_name='rfqs' then
  if new.status='open' and (tg_op='INSERT' or old.status='draft') then
   if new.required_by is not null and new.required_by<=extract(epoch from now())*1000 then
    raise exception 'Required date must be in the future' using errcode='23514';
   end if;
   if ctx->>'role' in ('buyer_admin','buyer_member') and new.product_id is not null and not exists(
    select 1 from public.products p join public.organizations o on o.id=p.seller_org_id
    where p.id=new.product_id and p.status='active' and o.verification_status='verified') then
    raise exception 'Choose a published product from a verified seller' using errcode='23514';
   end if;
  end if;
 elsif tg_table_name='trade_quotes' then
  if new.status='sent' and ctx->>'role' in ('seller_admin','seller_member') and not exists(select 1 from public.organizations where id=new.seller_org_id and verification_status='verified') then
   raise exception 'Your organisation must be verified before sending quotes' using errcode='23514';
  end if;
  if new.status='sent' and (tg_op='INSERT' or old.status='draft') and
   (new.validity_ts is null or new.validity_ts<=extract(epoch from now())*1000) then
   raise exception 'Quote validity must be in the future' using errcode='23514';
  end if;
 elsif tg_table_name='trade_documents' then
  if new.file_url is not null and new.file_url !~ '^https://' then
   raise exception 'Evidence source must be an HTTPS URL' using errcode='23514';
  end if;
  if new.expires_at is not null and new.issued_at is not null and new.expires_at<=new.issued_at then
   raise exception 'Expiry must follow issue date' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
revoke all on function epistable_private.validate_trade_submission() from public,anon,authenticated;

create or replace function public.review_marketplace_record(target_kind text,target_id text,decision text,reason text)
returns void language plpgsql security invoker set search_path=''
as $$
declare changed integer;
begin
 if auth.uid() is null or (epistable_private.context()->>'role') is distinct from 'platform_admin' then
  raise exception 'Platform administrator required' using errcode='42501';
 end if;
 if decision is null or decision not in ('verified','rejected') or nullif(trim(reason),'') is null or length(reason)>4000 then
  raise exception 'Choose approve or reject and give a review reason' using errcode='23514';
 end if;
 if target_kind='organization' then
  update public.organizations set verification_status=decision,review_note=trim(reason) where id=target_id
   and verification_status in ('pending','unverified')
   and (decision='rejected' or nullif(trim(country),'') is not null);
 elsif target_kind='product' then
  update public.products p set
    verification_status=decision,
    review_note=trim(reason),
    status=case when decision='verified' then 'active' else 'draft' end,
    risk_status=case when decision='verified' then 'clear' else 'blocked' end,
    risk_reason=case when decision='verified' then null else trim(reason) end
   where p.id=target_id and p.verification_status='pending'
   and (decision='rejected' or exists(select 1 from public.organizations o where o.id=p.seller_org_id and o.verification_status='verified'));
 elsif target_kind='document' then
  update public.trade_documents set verification_status=decision,review_note=trim(reason)
   where id=target_id and verification_status='pending'
   and (decision='rejected' or (file_url ~ '^https://' and (expires_at is null or expires_at>extract(epoch from now())*1000)));
 else raise exception 'Unknown review target' using errcode='23514';
 end if;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Record changed or is not ready for this review. Refresh and check its details.' using errcode='23514'; end if;
end $$;
revoke all on function public.review_marketplace_record(text,text,text,text) from public,anon;
grant execute on function public.review_marketplace_record(text,text,text,text) to authenticated;

```
