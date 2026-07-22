# Agent Guidelines for open-hivemind

## Running the Project

- **Always use `npm run dev`** to start the server. This runs TypeScript directly via `tsx` with Vite hot-reloading for the frontend — no build step required.
- **Do NOT run `npm run build`** or `npm start`. The `dist/` directory is not maintained and should not be relied upon.
- Workspace packages (`packages/*`) do not need compiled `dist/` output; `tsx` resolves them via pnpm workspace symlinks (`node_modules/@hivemind/*`); falls back to package `src/` since `dist/` is absent.
- To verify the server starts correctly: `timeout 30 npm run dev` — look for `🎉 Open Hivemind Server startup complete!` in the output.

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `HTTP_ENABLED` | `true` | Enable the HTTP server and WebUI |
| `SKIP_MESSENGERS` | `false` | Skip messenger service initialization |
| `WEBHOOK_ENABLED` | `false` | Enable the webhook service |
| `USE_LEGACY_HANDLER` | `false` | Revert to the legacy monolithic `handleMessage()` instead of the 5-stage pipeline. The pipeline is the default message processing path. |
| `ENABLE_VITE_DEV` | `true` | Enable Vite dev middleware (hot reload) inside the server process. Defaults to `true` when `NODE_ENV=development`; set to `false` to opt out. |
| `ENABLE_WELCOME_MESSAGE` | `false` | Send a welcome message to the default channel on bot startup |
| `WELCOME_MESSAGE_TEXT` | `''` | Text of the startup welcome message (requires `ENABLE_WELCOME_MESSAGE=true`) |
| `DATABASE_PATH` | `data/hivemind.db` | Path to the SQLite database file |
| `ENABLE_MOCK_PROVIDER_HEALTH` | `false` | Serve simulated data from `/api/admin/provider-health` (demo only). When unset the endpoint returns 501 and the Provider Health nav entry is hidden (experimental tier). |
| `ANOMALY_DETECTION_ENABLED` | `true` | Run the AnomalyDetectionService detection interval (always skipped when `NODE_ENV=test`) |

## Session & Auth Env Vars

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_SECRET` | _(none)_ | Secret used to sign session cookies. **Required in production** (must be ≥32 chars); a short value logs a warning and the app refuses to start without it in production. |
| `SESSION_COOKIE_NAME` | `hivemind.sid` | Name of the session cookie. |
| `SESSION_MAX_AGE` | `86400000` (24h) | Session cookie lifetime, in milliseconds. |
| `SESSION_IDLE_TIMEOUT` | `1800000` (30m) | Idle timeout, in milliseconds; sessions are invalidated after this much inactivity. |
| `SESSION_STORE_MAX_SESSIONS` | `10000` | Max sessions retained in the in-memory store. |
| `SESSION_STORE_CLEANUP_INTERVAL_MS` | `300000` (5m) | Interval, in milliseconds, for purging expired sessions. |

## Slack Typing Env Vars

| Variable | Default | Description |
|----------|---------|-------------|
| `SLACK_FAKE_TYPING` | `true` | When RTM is unavailable (Socket Mode / Web API), post a transient "is typing..." placeholder message to simulate typing. Set to `false` to disable. No effect when an RTM client (native typing indicator) is available. |

## Tracing / Span Export Env Vars

A console span exporter is always active. The following enable additional exporters; each is opt-in and activated only when set.

| Variable | Default | Description |
|----------|---------|-------------|
| `TRACE_LOG_FILE` | _(unset)_ | Path to a file that trace spans are appended to as JSON lines; enables the JSON file span exporter. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | _(unset)_ | OTLP collector endpoint; enables the OTLP span exporter. |

## Webhook Env Vars

| Variable | Default | Description |
|----------|---------|-------------|
| `WEBHOOK_IP_WHITELIST` | _(empty → default-deny)_ | Comma-separated list of **exact** IPv4/IPv6 addresses **or CIDR ranges** (e.g. `10.0.0.0/8`) allowed to call webhook endpoints. Exact entries match by string equality; entries containing `/` are checked via CIDR membership. An empty value **blocks all** requests. IPv4-mapped IPv6 (`::ffff:a.b.c.d`) is normalized to its IPv4 form before matching. |

## Screenshot Convention

### Directory roles

| Path | Purpose |
|------|---------|
| `docs/screenshots/<name>.png` | **Current state** (after) — the canonical screenshots that docs reference. |
| `archive/screenshots/<name>.png` | **Previous state** (before) — the version before the most recent update. |
| `/*.png` (repo root) | Gitignored. Never commit here. |

Both directories use the **same plain kebab-case filenames**. The directory conveys whether it is the current or previous version — not the filename.

### Workflow when updating a screenshot

```bash
# Archive the current version (becomes the "before")
git mv docs/screenshots/foo.png archive/screenshots/foo.png

# Place the new version (becomes the "after" / current)
cp /path/to/new.png docs/screenshots/foo.png
git add docs/screenshots/foo.png archive/screenshots/foo.png
```

### Workflow when adding a brand-new screenshot

```bash
# Place the screenshot in docs (no archive copy until it gets updated later)
cp /path/to/new.png docs/screenshots/foo.png
git add docs/screenshots/foo.png
```

Then add an entry to `docs/screenshots/README.md` with a description.

### Reference pages

Both directories have a `README.md` that lists every screenshot with a description:
- `docs/screenshots/README.md` — user-guide-style reference with descriptions and embedded images.
- `archive/screenshots/README.md` — index of archived (previous) versions.

When adding or renaming a screenshot, update both READMEs accordingly.

### Rules
- Filenames must be **plain kebab-case** with NO suffixes — no `-before`, `-after`, `-v2`, `-YYYYMMDD`.
- `archive/` filenames must match `docs/` filenames exactly — same name, different folder.
- The same filename **will** exist in both `docs/` and `archive/` — that is intentional (current vs previous version).
- Root `*.png` files are gitignored; delete them after use.
- Screenshots in any other location (`docs/images/`, `.jules/`, repo root, `src/`) should not be committed.

### Reviewing screenshots

When asked to review a screenshot — whether new, updated, or as part of a periodic audit — **do not stop at "does the image match the README caption."** The README caption is the *intended* demonstration; the image may match the caption while still revealing real UI defects. Always do **two passes**:

1. **Caption-match pass.** Confirm the image shows the feature/state the README describes.
2. **Defect pass.** Scrutinise the image itself for issues. Specifically check:
   - **Internal contradictions on the same page** (e.g. a service marked `Down` in one card while another card on the same page reports "all systems operational").
   - **Uninitialised / empty-state KPIs in screenshots that are supposed to demonstrate a feature** (a tracing waterfall surrounded by `0 bots / 0ms / status: unknown` undercuts the screenshot's point).
   - **Visual rendering bugs** (radial-progress rings invisible against the theme, sidebar overlapping the title, truncated text where the page should clearly fit).
   - **Sloppy demo fixtures** (chat timestamps out of chronological order, stats that don't add up, dates in the future, lorem ipsum where real-looking content is expected).
   - **Layout drift between screenshots** (different sidebars, theme inconsistency where parity is expected) — flag for re-shoot if you can't tell whether it's intentional.

Report findings as a table per batch: `file | README claim | match? | defects found`. Don't claim "all match" without having looked for defects — that masks bugs we're paying screenshot-storage costs to surface.
