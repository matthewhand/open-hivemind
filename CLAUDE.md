# Agent Guidelines for open-hivemind

## Running the Project

- **Always use `npm run dev`** to start the server. This runs TypeScript directly via `tsx` with Vite hot-reloading for the frontend — no build step required.
- **Do NOT run `npm run build`** or `npm start`. The `dist/` directory is not maintained and should not be relied upon.
- Workspace packages (`packages/*`) do not need compiled `dist/` output; `tsx` resolves their source via tsconfig path aliases at runtime.
- To verify the server starts correctly: `timeout 30 npm run dev` — look for `🎉 Open Hivemind Server startup complete!` in the output.

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `HTTP_ENABLED` | `true` | Enable the HTTP server and WebUI |
| `SKIP_MESSENGERS` | `false` | Skip messenger service initialization |
| `WEBHOOK_ENABLED` | `false` | Enable the webhook service |
| `USE_LEGACY_HANDLER` | `false` | Revert to the legacy monolithic `handleMessage()` instead of the 5-stage pipeline. The pipeline is the default message processing path. |

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
