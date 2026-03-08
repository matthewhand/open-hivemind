# Agent Guidelines for open-hivemind

## Screenshot Convention

### Directory roles

| Path | Purpose |
|------|---------|
| `docs/screenshots/<name>.png` | Canonical screenshots — what docs reference. Plain names only, no suffixes. |
| `archive/screenshots/<name>-before-<YYYYMMDD>.png` | Timestamped history snapshots before a UI change. |
| `/*.png` (repo root) | Gitignored. Never commit here. |

### Workflow when updating a screenshot

```bash
# Archive the old one with a date stamp
git mv docs/screenshots/foo.png archive/screenshots/foo-before-$(date +%Y%m%d).png

# Place the new canonical screenshot
cp /path/to/new.png docs/screenshots/foo.png
git add docs/screenshots/foo.png archive/screenshots/foo-before-*.png
```

### Rules
- `docs/screenshots/` filenames must be plain kebab-case with no `-before`/`-after`/`-v2` suffixes.
- `archive/screenshots/` filenames must include a `-before-YYYYMMDD` timestamp.
- Never duplicate a file between `docs/` and `archive/` — once archived, remove from `docs/`.
- Root `*.png` files are gitignored; delete them after use.
