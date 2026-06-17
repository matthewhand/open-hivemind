# Serverless Preview Deployments (Netlify & Vercel)

Netlify and Vercel host **stateless preview deployments** of Open Hivemind: the
built WebUI is served from the CDN and the real Express API runs inside a
single serverless function in **demo mode** (`DEMO_MODE=true`,
`SKIP_MESSENGERS=true`). Previews show the admin dashboard with simulated
bots and activity. Fly.io / Docker remain the targets for full production
deployments (messengers, websockets, persistent SQLite).

## Shared architecture

Both adapters wrap the same app factory:

- `src/server/serverlessApp.ts` — builds the Express app (same middleware and
  routes as `src/index.ts`) without `listen()`, without messengers/websocket
  timers, and with serverless env defaults (SQLite at `/tmp/hivemind.db`,
  ephemeral secrets, demo mode). Initialization is memoized per warm container.
- `scripts/bundle-serverless.mjs` — esbuild-bundles the function entry at
  build time, resolving the tsconfig path aliases (`@src/*`,
  `@hivemind/* → packages/*/src`) that no serverless runtime can resolve on
  its own. Native modules (`better-sqlite3`, `bcrypt`) stay external and are
  packaged from `node_modules` by each platform's tracer.

## Netlify

- Entry: `src/netlify/functions/server.ts` (wraps the app with
  `serverless-http`).
- Build: `pnpm run build:netlify` (`scripts/build-netlify.sh`) — vite-builds
  the WebUI to `dist/client` (published) and bundles the function to
  `dist/netlify/functions/server.js`.
- Routing (`netlify.toml`): `/api/*` and `/health` → the function; everything
  else falls back to `/index.html` (SPA). Security and cache headers are
  defined in the same file.

Local verification:

```bash
npx netlify-cli build --offline   # full build incl. function packaging
```

## Vercel

- Entry: `src/vercel/index.ts` (exports the app as a Node request handler).
- Build: `pnpm run build:vercel` (`scripts/build-vercel.mjs`) — emits the
  [Build Output API v3](https://vercel.com/docs/build-output-api/v3) layout to
  `.vercel/output/`: `static/` (WebUI), `functions/api.func/` (bundled app +
  `@vercel/nft`-traced native deps) and `config.json` (routing: `/api/*` and
  `/health` → function, SPA fallback otherwise).
- `vercel.json` only sets install/build commands; routing lives in the
  generated `config.json`.

Local verification:

```bash
pnpm run build:vercel
node -e "
const http = require('http');
const h = require('./.vercel/output/functions/api.func/index.js').default;
http.createServer((req, res) => h(req, res)).listen(3032);
"
curl http://localhost:3032/health
```

## Environment variables (optional overrides)

All defaults below are applied by `applyServerlessEnvDefaults()` and can be
overridden in the platform dashboard:

| Variable | Serverless default | Notes |
|----------|--------------------|-------|
| `SKIP_MESSENGERS` | `true` | Messengers can never run in a function |
| `DEMO_MODE` | `true` | Dashboard shows simulated data |
| `DATABASE_PATH` | `/tmp/hivemind.db` | Only writable path; wiped on cold start |
| `HTTP_ALLOW_ALL_IPS` | `true` | Platform proxy IPs would fail the local-IP guard |
| `SESSION_SECRET` / `JWT_SECRET` / `JWT_REFRESH_SECRET` | random per cold start | Set real values to keep sessions valid across cold starts |
| `ADMIN_PASSWORD` | _(unset)_ | Set it to be able to log in to the preview dashboard |

## Known limitations

- **No WebSockets** — Netlify/Vercel functions are stateless; real-time
  features degrade to polling or stay empty.
- **No persistence** — SQLite lives in `/tmp` and is lost on every cold start.
- **No messengers/LLM calls** — demo mode only; configure secrets and use
  Fly/Docker for a real deployment.
- **Login requires `ADMIN_PASSWORD`** — the auto-generated admin password is
  only printed to function logs and changes per cold start.
