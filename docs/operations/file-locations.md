# File & Directory Locations

Where Open-Hivemind reads and writes data at runtime — what to back up, what's disposable, and how to
relocate it. This is the single source of truth for paths; other docs link here rather than repeat it.

## Where things live today

All runtime paths resolve **relative to the working directory of the server process** (`process.cwd()`)
unless an environment override is set. There is no central path resolver yet — see
[Proposed: XDG support](#proposed-xdg-base-directory-support).

| Purpose | Default location | Override | Back up? |
|---|---|---|---|
| App config (convict + per-provider config) | `config/` | `NODE_CONFIG_DIR` | yes |
| User-editable config (bots, personas) | `config/user/` — `custom-bots.json`, `custom-personas.json`, `persona-order.json` | — | **yes** |
| Database (SQLite) | `data/hivemind.db` | `DATABASE_PATH` (absolute or cwd-relative) | **yes** |
| Other state | `data/` — `greeting-state.json`, `agents.json`, onboarding data | — | yes |
| Config backups | `config/backups/` | — | (these *are* the backups) |
| Logs | `logs/` | — | optional |
| Runtime cache | _none on disk_ — caching is in-memory only (e.g. `SwarmCoordinator`'s TTL cache) | — | n/a |
| Bundled program assets | `src/client/dist`, `packages/`, `specs/` | — | no — install-relative program files, not data |

### Operational gotcha

Because most paths are resolved from `process.cwd()` (not the install directory), **run the server
from the project root** — or set `DATABASE_PATH` / `NODE_CONFIG_DIR` to absolute paths — so config and
data resolve consistently across restarts and deployment methods. In Docker, mount a volume over
`data/` (and `config/` if you edit config on disk) to persist across container rebuilds.

## Proposed: XDG Base Directory support

> **Status: proposed, not yet implemented.** Today the paths above are cwd-relative. This section
> records the intended direction; track it in [ROADMAP.md](../../ROADMAP.md).

For system-service / per-user daemon deployments on Linux, writing into the install/working directory
is awkward (the install dir may be read-only). The plan is a single path resolver with this
precedence — **explicit env override → XDG → cwd-relative default** — so existing dev and Docker
setups keep working unchanged while XDG becomes available opt-in:

| Concern | XDG base | Example |
|---|---|---|
| Config (`config/`, `config/user/`) | `$XDG_CONFIG_HOME` | `~/.config/open-hivemind/` |
| State (DB, logs, backups) | `$XDG_STATE_HOME` | `~/.local/state/open-hivemind/` |
| Disposable cache (future) | `$XDG_CACHE_HOME` | `~/.cache/open-hivemind/` |

The DB, logs, and backups are treated as machine-local **state** rather than portable data. Adopting
this would also consolidate the ~30 scattered `process.cwd()` call sites behind one module — the
larger maintainability win independent of XDG itself.

## See also

- [Backups & System Data](../admin/export.md) — creating/restoring backups via the WebUI
- [Maintenance Guide](maintenance.md) — operational routines
- [Configuration Overview](../configuration/overview.md) — what the config values mean
