# @hivemind/llm-openwebui

LLM provider for a self-hosted [Open WebUI](https://openwebui.com) instance. Supports both API-key and password (session) authentication and is exposed as a stateless singleton.

## Exports

- `openWebUIProvider` — singleton `ILlmProvider`
- `generateChatCompletion` — lower-level helper from `runInference`
- `schema` — UI/config schema descriptor
- `manifest` — `{ displayName: 'OpenWebUI', type: 'llm', ... }`
- `create(_config?)` — factory; returns the singleton

## Environment variables

Configured via `convict` in `openWebUIConfig.ts`:

| Variable | Default | Purpose |
|---|---|---|
| `OPEN_WEBUI_API_URL` | `http://host.docker.internal:3000/api/` | Base URL of the Open WebUI API. |
| `OPEN_WEBUI_AUTH_METHOD` | `password` | `password` or `apiKey`. |
| `OPEN_WEBUI_USERNAME` | `''` | Username (when `authMethod=password`). |
| `OPEN_WEBUI_PASSWORD` | `''` | Password (when `authMethod=password`). |
| `OPEN_WEBUI_API_KEY` | `''` | API key (when `authMethod=apiKey`). |
| `OPEN_WEBUI_MODEL` | `llama3.2` | Default model. |
| `OPEN_WEBUI_KNOWLEDGE_FILE` | `''` | Optional path to a knowledge file to upload at boot. |

## Usage

```ts
import { openWebUIProvider } from '@hivemind/llm-openwebui';

const reply = await openWebUIProvider.generateChatCompletion(
  'Summarise the latest engineering update',
  [],
);
```

## Tests

`npm test` is a stub. The provider is exercised in `tests/llm/openwebui/` in the main app.
