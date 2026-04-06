# Community Packages

## Overview

The Community Packages page lets users discover, install, and manage plugins for Open-Hivemind. Packages come from three sources with different trust levels.

## Package Sources

| Source | Status | Trusted | How it gets there |
|--------|--------|---------|-------------------|
| Built-in (`/packages/` dir) | `built-in` | ✅ Yes | Ships with the repo, filtered by `config/community.json` |
| Installed from `matthewhand/open-hivemind` | `installed` | ✅ Yes | Installed via GitHub URL from the official repo |
| Installed from other GitHub repos | `installed` | ❌ No | Installed via GitHub URL — shows "Community" badge + warning |
| GitHub repos with `open-hivemind-plugin` topic | `available` | Depends on repo | Discovered via GitHub Search API |

## Trust Model

- **Trusted**: Packages from the `matthewhand/open-hivemind` repository. No warning badge.
- **Community**: Packages from any other GitHub repository. Shows a yellow "Community" badge and a warning banner: *"Community packages are untested and unverified."*

Only the specific repo `matthewhand/open-hivemind` is trusted — other repos under the same owner are treated as community.

## Visibility Control: `config/community.json`

Controls which built-in packages appear in the UI:

```json
{
  "description": "Packages listed here appear in the Community Packages page.",
  "packages": [
    "llm-openai",
    "message-discord",
    "memory-mem0"
  ]
}
```

- **Listed** → visible in the UI
- **Not listed** → hidden (WIP packages)
- **Already installed** plugins → always shown (so they can be uninstalled)
- **File missing** → all built-in packages shown (backwards compatible)

## GitHub Discovery

The backend searches GitHub for repos tagged with the `open-hivemind-plugin` topic:

```
GET https://api.github.com/search/repositories?q=topic:open-hivemind-plugin
```

- No authentication needed (public API)
- Results cached for 5 minutes
- Rate limit: 10 requests/minute (unauthenticated)
- Local packages (built-in/installed) take priority over GitHub results

### Making a Package Discoverable

1. Create a GitHub repo with your plugin code
2. Add the topic `open-hivemind-plugin` in the repo's Settings → Topics
3. Include a `package.json` with name, version, and description
4. The repo will appear in the Community Packages page within 5 minutes

### Package Naming Convention

The package type is inferred from the repo name prefix:

| Prefix | Type |
|--------|------|
| `llm-*` | LLM Provider |
| `message-*` | Message Provider |
| `memory-*` | Memory Provider |
| `tool-*` | Tool Provider |
| Other | Tool (default) |

## Installation Flow

1. User clicks "Install" on an available package (or enters a GitHub URL manually)
2. Backend git-clones the repo with `--depth 1`
3. Runs `pnpm install --prod --ignore-scripts`
4. Validates the plugin manifest (type must match name prefix)
5. Registers in `~/.hivemind/plugins/registry.json`
6. Package appears as "Installed" in the UI

## Plugin Manifest

Each plugin must export a manifest from its main module:

```typescript
interface PluginManifest {
  displayName: string;
  description: string;
  type: 'llm' | 'message' | 'memory' | 'tool';
  minVersion?: string;
}
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/marketplace/packages` | Any | List all packages (built-in + installed + GitHub) |
| GET | `/api/marketplace/packages/:name` | Any | Get single package details |
| POST | `/api/marketplace/install` | Admin | Install from GitHub URL |
| POST | `/api/marketplace/update/:name` | Admin | Update installed plugin |
| POST | `/api/marketplace/uninstall/:name` | Admin | Uninstall plugin |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                Community Packages UI                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │ Built-in │ │Installed │ │ GitHub (available)    │ │
│  │ trusted  │ │ trusted/ │ │ trusted/community    │ │
│  │          │ │community │ │                      │ │
│  └────┬─────┘ └────┬─────┘ └──────────┬───────────┘ │
│       │            │                   │             │
│       ▼            ▼                   ▼             │
│  ┌──────────────────────────────────────────────┐   │
│  │         /api/marketplace/packages             │   │
│  │  community.json filter → merge → deduplicate  │   │
│  └──────────────────────────────────────────────┘   │
│       │            │                   │             │
│       ▼            ▼                   ▼             │
│  /packages/   ~/.hivemind/     GitHub Search API    │
│  (local)      plugins/         (topic: open-        │
│               registry.json     hivemind-plugin)    │
└─────────────────────────────────────────────────────┘
```
