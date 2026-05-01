# @hivemind/llm-flowise

LLM provider that talks to a [Flowise](https://flowiseai.com) chatflow over its REST API. Loaded by Open Hivemind's `PluginLoader` as an `llm`-type plugin.

## Exports

- `FlowiseProvider` — class implementing the LLM provider contract
- `flowiseProvider` — default singleton (re-exported)
- `schema` — UI/config schema descriptor
- `manifest` — `{ displayName: 'Flowise', type: 'llm', ... }`
- `create(config?)` — factory used by the PluginLoader

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `FLOWISE_BASE_URL` | yes | Base URL of the Flowise instance (e.g. `https://flowise.example.com`). |
| `FLOWISE_API_KEY` | yes | API key issued by Flowise for the chatflow. |

Configuration may also be supplied through the bot config object — fields in `config` take precedence over env.

## Usage

```ts
import { create as createFlowise } from '@hivemind/llm-flowise';

const provider = createFlowise();
const reply = await provider.generateChatCompletion('Hello, world', []);
console.log(reply);
```

## Tests

`npm test` is a stub. Functional coverage lives in the main app's test suite under `tests/llm/flowise/`.
