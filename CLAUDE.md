# Agent Guidelines for open-hivemind

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
