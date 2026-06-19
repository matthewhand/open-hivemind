# UX / UI Roadmap

Generated from a full-app page-by-page audit (structure, layout, aesthetic, workflow,
accessibility, consistency). Items are grouped by priority. `[verify]` marks a claim from
the audit that has **not** yet been confirmed against runtime (treat as a hypothesis until
checked — several "undefined identifier / crash" claims are likely false because the client
`tsc` passes clean).

Severity: **P0** = broken/incorrect behavior or silent no-op props · **P1** = high-impact UX/IA
· **P2** = consistency/polish.

---

## P0 — INFRA: client source is never type-checked (root cause of the bug cluster below)

The client `tsc --noEmit` (default `tsconfig.json`) checks **zero** `src/` files — `tsconfig.json`
extends the server root config whose `rootDir` defeats the `include` glob (`tsc --listFilesOnly`
shows only `global.d.ts`). The build (`tsc && vite build`) therefore type-checks nothing client-side,
and Vite/esbuild strips types without checking. The real config `tsconfig.app.json` is never run and
has **643 errors** (263 are a single missing flag — it lacks `esModuleInterop`/`allowSyntheticDefaultImports`
so every `import React from 'react'` errors TS1259; ~111 more cascade from that). **Action:** add the
React interop flag to `tsconfig.app.json` (clears ~370), then burn down the remaining real errors, then
wire `tsc -p tsconfig.app.json --noEmit` into the build/CI so client type errors stop shipping. This is
why the defects below (undefined `Collapse`, `Column`, `expandedRows`, etc.) reached production — do this
first or they'll recur. (Large; do as a dedicated type-debt pass, not mid-feature — flipping it fails the build until burned down.)

## ✅ Fixed in this pass (verified real, corrected)

- Pagination wrong props (SpecsPage, GuardsPage, PluginSecurityPage, demos) → `currentPage`/`totalItems`/`variant`.
- Badge `color`→`variant` (PluginSecurityPage ×9, WelcomeSplash, HelpPage ×4) — colors now render.
- Alert `type`→`status` (PersonasPage) — errors now red, not blue.
- Purged dynamic Tailwind classes → static maps (ProviderHealthPage borders, MarketplaceCard icon colors).
- CreateBotWizard missing `Collapse` import (crashed AI-draft path) — imported.
- MCPServersPage `handleRefreshTools`/`refreshingId` undefined (crashed drawer dock) — wired to `fetchServers`.
- AuditPage `expandedRows`/`toggleRow` undefined + missing `AuditEvent` fields — added.
- ExportPage `Column` not imported → `RDVColumn`; two setState calls missing `message`.
- PluginSecurityPage `ConfirmModal onCancel`→`onClose` (cancel now works); Button `variant="outline"`→`buttonStyle="outline"`.
- **Onboarding now persists** — DoneStep wired to `handleFinish` (saves config + creates bot + marks complete); added the missing LLM API-key input.
- **MCP tool categories are real now** — `categorizeTool()` derives search/filesystem/git/database/network/ai/utility from tool name+description (was hardcoded `'utility'`); category filter + per-category badge colors are live (also greens `crud-mcp-tools:198`, the last failing milestone test).
- MaintenanceTab rendered literal `**irreversible**` on the factory-reset screen → `<strong>`.

## P0 — Confirmed bugs (silent prop no-ops & purged classes)

These were verified against component render logic: the component reads a specific prop name,
so the wrong-named prop is accepted but ignored at runtime.

- **Pagination wrong props** — `Pagination` requires `currentPage`/`totalItems`/`onPageChange` and
  styles via `variant`. Misuses render NaN pages or default style:
  - `SpecsPage.tsx:241` passes `current`/`total` → pagination broken (NaN). → `currentPage`/`totalItems`/`pageSize`.
  - `GuardsPage.tsx:772` & `PluginSecurityPage.tsx:428` pass `style="standard"` → ignored. → `variant`.
- **Badge `color` → `variant`** — `Badge` styles via `badge-${variant}` (default neutral); `color` is
  ignored. `PluginSecurityPage.tsx:160-174` renders all trust/signature badges grey. Security
  color-coding is dead. (Same pattern worth grepping app-wide.)
- **Alert `type` → `status`** — `Alert` uses `status||variant||'info'`; `type` is ignored.
  `PersonasPage/index.tsx:151` renders errors as blue "info" instead of red.
- **Dynamic Tailwind classes are purged** (JIT can't see interpolated class names):
  - `ProviderHealthPage.tsx:130` `border-${statusCfg.badge}/30` → card borders never render. Use a static map.
  - `MarketplaceCard.tsx:94-95` `bg-${color}/10` / `text-${color}` → type-color icons render colorless. Static map.

## P0 — Needs verification (claimed code defects; tsc is clean so likely false or subtler)

- `[verify]` CreateBotWizard `Collapse` used but not imported (CreateBotWizard.tsx:740) — would crash AI-draft render.
- `[verify]` MCPServersPage `handleRefreshTools`/`refreshingId` undefined (index.tsx:276) — drawer dock ReferenceError.
- `[verify]` AuditPage `expandedRows`/`toggleRow` undefined (AuditPage.tsx:107) — row-expand broken.
- `[verify]` ExportPage `Column<Backup>[]` without importing `Column` (ExportPage.tsx:217).
- `[verify]` PluginSecurityPage `ConfirmModal onCancel` (no such prop; only `onClose`) — confirm can't be cancelled.
- `[verify]` Onboarding never persists: `handleFinish` dead, DoneStep navigates without saving; LLM step has no API-key input (OnboardingPage.tsx:461,569,580). **First-run wizard may be non-functional — verify urgently.**

## P1 — High-impact UX / information architecture

- **Observability IA is duplicated.** `SystemHealth` renders on the Overview tab, inside
  MonitoringDashboard's health tab (tab-within-a-tab), AND on AdminHealthPage; Analytics overlaps
  too. Define one canonical home per panel; flatten the nesting (OverviewPage embeds a full
  standalone `Dashboard` with its own title/refresh/background → duplicated chrome).
- **Two divergent bot-create flows.** Modal `CreateBotWizard` (guards + persona + AI) vs full-page
  `BotCreatePage` (system-instruction + MCP + platform tiles) reached from different entry points,
  different field sets. Converge on one canonical flow.
- **"Use Template" is a no-op** — BotTemplatesPage passes `state.template`; BotCreatePage ignores
  `location.state`. Prefill from it. `[verify]`
- **Provider pages diverge hard.** LLM+Message use rich `ProviderConfigModal` (schema, validation,
  test-connection); Memory+Tool use a bare inline modal with no validation/test. LLM uses native
  `window.confirm`/`alert` for delete/errors. Health/status shown on Memory+Message but not LLM+Tool.
  → Extract one `<SchemaProviderPage>` and unify add/edit/test/status. (Highest-leverage refactor.)
- **Three bot-card components** (BotConfigCard / DashboardBotCard / BotStatusCard) with divergent
  status labels, badge sizes, and dead/faked buttons ("Details" no-op, fake 1s refresh). Consolidate
  to one card with variants.
- **Dead/misleading controls** — BulkActionBar shows with 0 selected (BotsPage); wizard "+ provider"
  & "Create New Persona" buttons no-op; MarketplaceCard star ratings are local-only (never persisted).
- **MCP tools category UX is dead** — all tools hardcoded `category:'utility'`; the category filter,
  per-category colors, and badges are non-functional (`crud-mcp-tools:198` fails on this). Derive real
  categories from server/tool metadata, or hide the category UX until they exist.
- **Form-builder gaps** — MCP run-tool form only handles string/number/boolean (array/object/enum
  fall back to a text box); no required-field validation before run.
- **Login first impression** — placeholder advertises `admin` default credential + "check logs for
  password" in all modes; gate behind `isServerless`. Add branding; `aria-live` on the error.
- **Activity page** — two competing view-mode switchers (Conversations only reachable from one);
  3-stacked filter bars push data below the fold; the "Message Flow Replay" pipeline is fabricated
  client-side from heuristics but presented as telemetry → label as estimated.
- **Density coverage** (from this session) — `--density-scale` now reflows card/modal padding; extend
  to tables, list rows, sidebar, and main content for a true density control.

## P2 — Consistency / polish

- Adopt the shared `PageHeader` everywhere (BotsPage, GuardsPage, Overview hand-roll headers; Overview
  has none). Adopt shared `EmptyState` (GuardsPage, SpecsPage, AnalyticsDashboard hand-roll).
- Use the `Button`/`Badge` `variant` API instead of raw `className="btn-primary"` (SpecsPage,
  SpecDetailPage) and instead of `color=`.
- One icon system — lucide-react vs @heroicons/react are mixed (MCP tools), plus emoji icons in
  SystemManagement/MaintenanceTab/ResponseProfiles.
- MaintenanceTab renders literal `**irreversible**` (markdown asterisks) on the factory-reset
  screen — use `<strong>`. Rename "Yes, Nuke Everything" → explicit "Permanently Delete All Data".
- Keyboard a11y: clickable cards are `<div onClick>` without role/tabindex/key handlers
  (Personas, Guards, MCP servers). DetailDrawer has no focus trap / focus-restore.
- Double-debounce: `SearchFilterBar` (300ms) + `useUrlParams` search (300ms) = ~600ms filter lag.
- Settings save model is mixed (some fields auto-save incl. service-affecting Maintenance Mode;
  others need explicit Save) — unify or mark auto-save fields.
- ApiDocs "Live Testing" fires real authenticated POST/PUT/DELETE against the backend from a docs
  page — gate behind a confirm / read-only default.

## Pending user decisions (not auto-fixed)

- `/admin/chat` page (cross-page-state tests) — rebuild vs remove tests.
- "Community Packages" → "Marketplace" rename (community-packages:99).
- Onboarding-redirect gate (crud-overview:72 + onboarding-wizard:215).

---
*Method: 6 parallel read-only audit agents over all ~30 pages + shared components. Re-audit after
each implementation pass (rinse & repeat).*
