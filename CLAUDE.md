# Agent Guidelines for open-hivemind

## Screenshot Convention

### Directory roles

| Path | Purpose |
|------|---------|
| `docs/screenshots/<name>.png` | Canonical screenshots — what docs reference. Plain names only, no suffixes. |
| `archive/screenshots/<name>.png` | Previous versions of canonical screenshots. Same filename, different folder. |
| `/*.png` (repo root) | Gitignored. Never commit here. |

### Workflow when updating a screenshot

```bash
# Archive the old canonical (same filename, moved to archive/)
git mv docs/screenshots/foo.png archive/screenshots/foo.png

# Place the new canonical screenshot
cp /path/to/new.png docs/screenshots/foo.png
git add docs/screenshots/foo.png archive/screenshots/foo.png
```

### Rules
- `docs/screenshots/` filenames must be plain kebab-case with NO suffixes of any kind — no `-before`, `-after`, `-v2`, `-YYYYMMDD`.
- `archive/screenshots/` filenames must match the canonical name exactly — same filename, no date stamps.
- Never use `-before`, `-after`, or date suffixes anywhere in screenshot filenames.
- Never duplicate a file between `docs/` and `archive/` — once archived, remove from `docs/`.
- Root `*.png` files are gitignored; delete them after use.
