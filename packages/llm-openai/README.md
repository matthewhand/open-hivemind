# @hivemind/llm-openai

OpenAI LLM provider — wraps the official `openai` SDK to provide chat completions and embeddings to Open Hivemind. Works with the OpenAI API and any OpenAI-compatible endpoint (Azure-style proxies, local LLMs exposing the OpenAI shape, etc.).

## Exports

- `OpenAiProvider` — provider class
- `openAiService`, `OpenAiService` — service wrapper
- `schema` — UI/config schema descriptor
- `manifest` — `{ displayName: 'OpenAI', type: 'llm', ... }`
- `create(config?)` — factory used by the PluginLoader (accepts `apiKey`, `baseUrl`, `model`, `timeout`, `organization`, `temperature`, `maxTokens`)

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | yes (unless passed via config) | Your OpenAI API key. |
| `OPENAI_BASE_URL` | optional | Override the API base URL (default: OpenAI). |
| `OPENAI_MODEL` | optional | Default model name (e.g. `gpt-4o-mini`). |

Per-bot overrides via `config` always take precedence over env.

## Usage

```ts
import { create as createOpenAi } from '@hivemind/llm-openai';

const provider = createOpenAi({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
});
const reply = await provider.generateChatCompletion('Summarise our last sprint', []);
```

## Tests

`npm test` is a stub. Functional tests for this provider live in `tests/llm/openai/` in the main app.
