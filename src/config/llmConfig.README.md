# LLM Configuration

The LLM configuration module manages settings for the Language Model provider used by the application.

## Configuration Options

### LLM_PROVIDER
- **Description**: Specifies which LLM provider to use
- **Type**: String
- **Default**: `'openai'`
- **Environment Variable**: `LLM_PROVIDER`
- **Valid Values**: Any supported LLM provider (e.g., 'openai', 'flowise', 'openwebui')

### LLM_PARALLEL_EXECUTION
- **Description**: Whether to allow parallel execution of LLM requests
- **Type**: Boolean
- **Default**: `false`
- **Environment Variable**: `LLM_PARALLEL_EXECUTION`

## Usage

```typescript
import llmConfig from './llmConfig';

const provider = llmConfig.get('LLM_PROVIDER');
const parallelExecution = llmConfig.get('LLM_PARALLEL_EXECUTION');
```

## Configuration Sources

The configuration values can be set in the following order of precedence:
1. Environment variables
2. JSON config file (`config/providers/llm.json`)
3. Default values

## Example Configuration File

```json
{
  "LLM_PROVIDER": "openai",
  "LLM_PARALLEL_EXECUTION": false
}