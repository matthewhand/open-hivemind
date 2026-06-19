# Data Directories & Filesystem Layout

> Where Open-Hivemind reads and writes **runtime** files — configuration, persistent
> state, the database, secrets, logs — and the environment variables that relocate them.
> This is the canonical reference; other docs (deployment, maintenance, backups) link here
> instead of re-listing paths.
>
> For *build/tooling* config files (`package.json`, `tsconfig`, `Dockerfile`, …) see
> [Technical Configuration Reference](configuration-files.md). For the **proposed** XDG /
> path-resolver refactor, jump to [Proposed: XDG-aware paths](#proposed-xdg-aware-paths).

## Current layout

By default everything is rooted at the process working directory (`process.cwd()`), under
two top-level dirs — `config/` and `data/` — plus `logs/`:

| Path (default) | Class | Holds | Source anchor |
|---|---|---|---|
| `config/` | **config** | bot/persona/profile JSON, provider config | `src/config/profileUtils.ts`, `botCrudOperations.ts`, providers |
| `config/user/` | **state** | user-edited `custom-bots.json`, `custom-personas.json`, `user-config.json` | `BotManager.ts`, `PersonaManager.ts:133`, `UserConfigStore.ts` |
| `config/secure/`, `config/.key` | **secrets** | encrypted secret store + encryption key | `SecureConfigManager.ts:37-39`, `EncryptionService.ts:36` |
| `config/backups/` | **state** | config backup archives | `SecureConfigManager.ts:38` |
| `config/trusted-mcp-repos.json`, `config/mcpServers*` | **config** | MCP trust/registry | `trustedMcpRepos.ts`, `mcpServerProfiles.ts` |
| `data/hivemind.db` | **state** | SQLite DB — users, refresh tokens, audit log, decisions, metrics | `databaseConfig.ts` (`DATABASE_PATH`) |
| `data/greeting-state.json` | **state** | greeting bookkeeping | `GreetingStateManager.ts:26` |
| `logs/`, `logs/traces.ndjson` | **logs** | performance logs, trace export | `PerformanceProfiler.ts:259`, `TraceExporter.ts` |
| `~/.hivemind/plugins/` | **data** | installed community plugins | `PluginLoader.ts:27` (`HIVEMIND_PLUGINS_DIR`) |
| `os.tmpdir()/hivemind-import-*` | **cache/temp** | transient import staging | `routes/admin/backup.ts:118` |

### The four classes (why the split matters)

- **config** — declarative, hand-editable, safe to version/commit (sans secrets).
- **state/data** — *must persist and be backed up*: the SQLite DB, refresh tokens, audit
  log, and user-edited bots/personas. Losing this is not the same as losing config.
- **secrets** — `.key` and `config/secure/`; want the tightest permissions and ideally
  **not** co-located with backups.
- **cache/temp** — regenerable; safe to wipe; should not be backed up.

> Today these classes are largely **co-mingled under `config/`** (secrets + backups +
> declarative config + user state all live together). The
> [proposed refactor](#proposed-xdg-aware-paths) separates them.

## Environment overrides (today)

| Variable | Effect | Default | Honored consistently? |
|---|---|---|---|
| `NODE_CONFIG_DIR` | base config directory | `./config` | ⚠️ **Partial** — ~23 modules honor it, ~26 hardcode `process.cwd()/config` and ignore it |
| `DATABASE_PATH` | SQLite file (relative → joined to cwd); auth user/refresh stores default to it | `data/hivemind.db` | ✅ |
| `HIVEMIND_PLUGINS_DIR` | plugin install dir | `~/.hivemind/plugins` | ✅ |
| `TRACE_LOG_FILE` | trace ndjson export path | `logs/traces.ndjson` | ✅ |

> **Known gap.** Because only some modules read `NODE_CONFIG_DIR`, pointing config at a
> non-default location only *half* works today — several stores
> (`PersonaManager`, `BotManager`, `SecureConfigManager`, `mcpServerProfiles`,
> `trustedMcpRepos`, `UserConfigStore`, `EncryptionService`) still resolve against
> `process.cwd()/config`. Fixing this is the core of the proposed refactor below.

## Deployment guidance

### Docker

Mount the **must-persist** state separately from read-only config:

```yaml
volumes:
  - ./config:/app/config        # config + user state (rw if edited via WebUI)
  - ./data:/app/data            # SQLite DB + state — back this up
  - ./logs:/app/logs            # logs (optional)
```

> The shipped `docker-compose.yml` mounts `./config:ro`; if you create/edit bots,
> personas, or profiles **through the WebUI**, that dir must be writable (the user-state
> files live under `config/user/`). Keep `data/` writable and backed up regardless.

### systemd

Prefer the FHS server analog of XDG via unit directives, which the
[proposed resolver](#proposed-xdg-aware-paths) honors cleanly:

```ini
ConfigurationDirectory=open-hivemind   # → /etc/open-hivemind
StateDirectory=open-hivemind           # → /var/lib/open-hivemind   (DB, tokens, audit)
CacheDirectory=open-hivemind           # → /var/cache/open-hivemind
LogsDirectory=open-hivemind            # → /var/log/open-hivemind
```

## What to back up

Back up the **state class**: `data/` (the SQLite DB is the system of record for users,
tokens, audit, decisions) plus `config/user/` and `config/secure/` + `config/.key` (or
your secrets manager). Declarative `config/*.json` is reproducible; `logs/`, caches, and
`os.tmpdir()` staging are not worth backing up. See
[Maintenance](../operations/maintenance.md) for backup/restore procedures.

---

## Proposed: XDG-aware paths

> **Status: proposed (not yet implemented).** Captured here so the direction is documented
> alongside the current state. Tracked in [ROADMAP.md](../../ROADMAP.md).

Open-Hivemind would benefit less from literally adopting `~/.config` and more from
adopting the **XDG taxonomy + a single path resolver**. The highest-leverage change is to
replace ~50 duplicated `process.env.NODE_CONFIG_DIR || path.join(process.cwd(),'config')`
and hardcoded `process.cwd()/{config,data,logs}` call sites with one module.

### Sketch — `src/config/paths.ts`

A single resolver exporting `configDir()`, `dataDir()`, `stateDir()`, `cacheDir()`,
`secretsDir()`, `logsDir()`, `backupsDir()`, each with the precedence:

```
OPEN_HIVEMIND_<X>_DIR              # explicit per-class override (highest)
  → NODE_CONFIG_DIR               # config only — keep the node-config contract
  → $XDG_<X>_HOME/open-hivemind   # XDG when running as a user service
  → ./config  |  ./data           # today's defaults (unchanged) — lowest
```

| Resolver | XDG var | systemd | Today's default |
|---|---|---|---|
| `configDir()` | `XDG_CONFIG_HOME` | `ConfigurationDirectory` | `./config` |
| `dataDir()` / `stateDir()` | `XDG_DATA_HOME` / `XDG_STATE_HOME` | `StateDirectory` | `./data` |
| `cacheDir()` | `XDG_CACHE_HOME` | `CacheDirectory` | `os.tmpdir()` / `./cache` |
| `secretsDir()` | (under config, chmod 700) | `CredentialsDirectory` | `config/secure` |
| `logsDir()` | `XDG_STATE_HOME` | `LogsDirectory` | `./logs` |

### Why / what it buys

1. **Fixes the real bug** — consistent `NODE_CONFIG_DIR` handling across all modules.
2. **Separates the four classes** so ops can mount/permission/back-up them independently
   (config RO, data RW + backed up, cache wipeable, secrets chmod 700, not next to backups).
3. **Cleaner Docker/systemd** boundaries without literal `~/.config`.

### Backward compatibility

With no env set, every resolver returns today's `./config` / `./data` paths — existing
installs and Docker bind-mounts are unaffected. XDG/`$XDG_*` paths apply only when set (or
behind an opt-in flag). An optional one-shot migration can relocate an existing `./config`.

### When it's *not* worth much

Pure-Docker deployments with bind mounts gain little from literal XDG paths — but still
benefit from the single resolver and the four-class separation (cleaner volumes). Don't
break the `config` npm package / `NODE_CONFIG_DIR` convention.

---

## See also

- [Technical Configuration Reference](configuration-files.md) — build/tooling config files
- [Deployment](../operations/deployment.md) · [Maintenance](../operations/maintenance.md)
- [Configuration Overview](../configuration/overview.md)
- [ROADMAP.md](../../ROADMAP.md) — status of the path-resolver refactor
