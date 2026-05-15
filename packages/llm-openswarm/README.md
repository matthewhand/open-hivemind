# @hivemind/llm-openswarm

LLM provider for [OpenSwarm](https://github.com/openai/swarm) — multi-agent orchestration accessed through an OpenAI-compatible REST endpoint exposed by an OpenSwarm WebUI / server.

## Exports

- `OpenSwarmProvider` — provider class
- `SwarmInstaller` — helper that installs / launches the local OpenSwarm WebUI
- `schema` — UI/config schema descriptor
- `manifest` — `{ displayName: 'OpenSwarm', type: 'llm', ... }`
- `create(_config?)` — factory used by the PluginLoader (config is currently ignored — env vars drive it)

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `OPENSWARM_BASE_URL` | `http://localhost:8000/v1` | Base URL of the OpenSwarm OpenAI-compatible API. |
| `OPENSWARM_API_KEY` | `dummy-key` | API key sent to the server. Local installs typically don't need a real key. |
| `OPENSWARM_WEBUI_URL` | `http://localhost:8002` | URL the `SwarmInstaller` opens / pings for the WebUI. |

## Usage

```ts
import { create as createOpenSwarm } from '@hivemind/llm-openswarm';

const provider = createOpenSwarm();
const reply = await provider.generateChatCompletion('Plan a release for v2', []);
```

## Tests

`npm test` is a stub. Integration coverage is in `tests/llm/openswarm/` in the main app.
