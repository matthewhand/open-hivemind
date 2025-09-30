# Development & Startup Modes

This document explains the available startup modes, what code paths they exercise, and how routing behaves for each.

## Summary Table

| Mode | Command | Serves Frontend? | HMR? | Port(s) | Needs Frontend Build? | Notes |
|------|---------|------------------|------|---------|-----------------------|-------|
| Unified Dev | `make start-dev` | Yes (if build present or auto-built) | No | 3028 (default) | Auto-builds if missing | Single process (Express + static) |
| Node Dev Launcher | `npm run dev` | Yes (if build present) | No | 3028 (default) | Builds backend first | Cross-platform Node starter |
| Dev w/ HMR | `make start-dev-hmr` | Yes (via Vite) | Yes | 3028 (API) / 5173 (UI) | No (Vite in-memory) | Two processes (backend + Vite) |
| Production  | `make start-prod` | Yes | No | 3028 (if set) or env PORT | Requires full build | Uses compiled JS + dist assets |
| Backend Only Dev (deprecated) | `npm run dev:backend` | Only if pre-built | No | 3028 (default) | Yes | Redundant; use unified launcher |
| Legacy Shim | `./dev-start.sh dev` | Depends | Maybe | 3028/5173 | Yes | Calls Node launcher; retained for compatibility |
| Vite Only | `npm run dev:frontend` | Yes | Yes | 5173 | No | Backend APIs unavailable unless started separately |

## How Frontend Resolution Works

In `src/index.ts`, the function `resolveFrontendDistPath()` checks these locations in order:

1. `dist/client/dist`
2. `src/client/dist`

The first existing directory becomes `frontendDistPath`. The server then:

- Serves `/` from `${frontendDistPath}/index.html`
- Serves assets from `${frontendDistPath}/assets` under `/assets`
- Exposes the entire directory statically

If no build exists (e.g. fresh repo + `make start-dev`), the enhanced `start-dev` target will build the frontend automatically.

## Routing Layers (Express)

Order matters:

1. Health & middleware (`/health`)
2. Root route `/` → tries to serve `index.html`
3. Static: `public/` and `frontendDistPath`
4. Namespaced routers (examples):
   - `/api/swarm`
   - `/dashboard`
   - `/webui/api` (auth protected)
   - `/webui` (bots, config, etc.)
   - `/admin` (static + JSON 404 for unknown)
5. Fallback `app.get('*')`:
   - Returns JSON 404 if path starts with: `/api/`, `/dashboard/`, `/webui/`, `/health`, `/admin/`
   - Otherwise serves SPA `index.html`

### Implication

- Only "root-level" non-namespaced client routes (e.g. `/bots`, `/settings`, `/xyz`) get SPA fallback.
- Paths under `/webui/*` and `/admin/*` DO NOT currently fallback to SPA—they return JSON 404 if not matched by a router or static asset.

## Mode Details

### 1. `make start-dev`

- Cleans prior processes & ports (3028, 5173)
- Ensures `src/client/dist/index.html` exists (auto builds if missing)
- Starts `nodemon` + `ts-node` with `tsconfig-paths/register`
- Does NOT run Vite; static assets are from the last build
- Default port forced to 3028 if not set (`PORT` can override)

### 2. `make start-dev-hmr`

- Runs backend (ts-node) on PORT (default 3028)
- Starts Vite dev server on 5173 with live HMR
- Frontend bundle is in-memory; `src/client/dist` not required
- Visit <http://localhost:5173> for the dev UI
- Backend still serves static build if one exists, but usually you use Vite directly

### 3. `make start-prod`

- Runs `make build` (frontend + backend)
- Launches compiled server: `node dist/src/index.js`
- Uses `_moduleAliases` for production path mapping
- Serves frontend from `dist/client/dist`

### 4. Deprecated Commands

- `npm run dev:backend`, `npm run dev:frontend`, `start:dev`, etc. -> Prefer `npm run dev` or `make start-dev`.
- `./dev-start.sh dev` -> Thin shim that calls the Node launcher; kept for backward compatibility only.
- These can cause divergent states (missing builds, port drift, etc.)

## Port Strategy

- Standardized dev + prod port: 3028
- Vite dev server (HMR mode): 5173
- If server not responding on 3028: verify `PORT` environment variable or ensure process started.

## Common Issues & Fixes

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| 404 at `/` in dev | No frontend build yet | Run `make start-dev` (auto builds) or `npm run build:frontend` |
| Curl to 3028 refused | Server using default 5005 | Export `PORT=3028` or rely on Makefile default |
| JSON 404 under `/webui/route` | SPA fallback disabled for `/webui` | Decide if `/webui` should become SPA and adjust routing |
| Module alias errors in dev | module-alias pointing at dist/ | Fixed by conditional require + tsconfig-paths |

## Adding SPA Fallback for /webui (Optional)

Replace the current 404 handler with:

```ts
app.use('/webui/*', (req, res) => {
   res.sendFile(path.join(frontendDistPath, 'index.html'));
});
```

Be sure it comes AFTER API route mounts but BEFORE final JSON 404 logic.

## Recommendations

1. Remove deprecated npm scripts once confident.
2. Consider adding an `.env.development` with `PORT=3028`.
3. Decide if `/webui` should support client-side routing fallback.
4. Use `start-dev-hmr` when actively iterating on React components.

## Future Enhancements (Suggested)

- Add a banner log line printing resolved `frontendDistPath`
- Add health check for frontend readiness (serve 503 until built)
- Add `make front-watch` for isolated frontend rebuild loops

---
Generated automatically to reflect current repository state.
