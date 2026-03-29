# LLM Provider Models API

## Overview

The LLM Models API provides endpoints to retrieve available models for different LLM providers with detailed metadata including pricing, context windows, and capabilities.

## Base URLs

- **Config Route**: `/api/config/llm-providers/:type/models`
- **Admin Route**: `/api/admin/llm-providers/:type/models`

## Supported Providers

- `openai` - OpenAI GPT models
- `anthropic` - Anthropic Claude models
- `google` - Google Gemini models
- `perplexity` - Perplexity Sonar models

## Endpoints

### List Models for Provider

**GET** `/api/config/llm-providers/:type/models`

Returns a list of available models for the specified provider with comprehensive metadata.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Provider type (openai, anthropic, google, perplexity) |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `modelType` | string | No | Filter by model type: `chat`, `embedding` |

#### Response Format

```json
{
  "success": true,
  "provider": "openai",
  "modelType": "all",
  "count": 15,
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "description": "Most advanced multimodal model, optimized for speed and intelligence",
      "type": "chat",
      "contextWindow": 128000,
      "maxOutputTokens": 16384,
      "pricing": {
        "input": 2.5,
        "output": 10.0
      },
      "supportsVision": true,
      "supportsFunctionCalling": true,
      "supportsStreaming": true
    }
  ]
}
```

#### Model Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Model identifier used in API calls |
| `name` | string | Human-readable model name |
| `description` | string | Brief description of model capabilities |
| `type` | string | Model type: `chat`, `embedding`, or `both` |
| `contextWindow` | number | Maximum input context length in tokens |
| `maxOutputTokens` | number | Maximum output length in tokens |
| `pricing` | object | Pricing per 1M tokens (input/output) |
| `supportsVision` | boolean | Whether model supports image inputs |
| `supportsFunctionCalling` | boolean | Whether model supports function/tool calling |
| `supportsStreaming` | boolean | Whether model supports streaming responses |
| `deprecated` | boolean | Whether model is deprecated |
| `releaseDate` | string | Model release date |

## Examples

### Get All OpenAI Models

```bash
curl http://localhost:3000/api/config/llm-providers/openai/models
```

**Response:**
```json
{
  "success": true,
  "provider": "openai",
  "modelType": "all",
  "count": 15,
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "description": "Most advanced multimodal model, optimized for speed and intelligence",
      "type": "chat",
      "contextWindow": 128000,
      "maxOutputTokens": 16384,
      "pricing": { "input": 2.5, "output": 10.0 },
      "supportsVision": true,
      "supportsFunctionCalling": true,
      "supportsStreaming": true
    },
    {
      "id": "text-embedding-3-large",
      "name": "Text Embedding 3 Large",
      "description": "Most powerful embedding model with 3072 dimensions",
      "type": "embedding",
      "contextWindow": 8191,
      "pricing": { "input": 0.13, "output": 0 }
    }
  ]
}
```

### Get Only Chat Models

```bash
curl http://localhost:3000/api/config/llm-providers/openai/models?modelType=chat
```

**Response:**
```json
{
  "success": true,
  "provider": "openai",
  "modelType": "chat",
  "count": 12,
  "models": [
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "type": "chat",
      ...
    }
  ]
}
```

### Get Only Embedding Models

```bash
curl http://localhost:3000/api/config/llm-providers/openai/models?modelType=embedding
```

**Response:**
```json
{
  "success": true,
  "provider": "openai",
  "modelType": "embedding",
  "count": 3,
  "models": [
    {
      "id": "text-embedding-3-large",
      "name": "Text Embedding 3 Large",
      "type": "embedding",
      ...
    }
  ]
}
```

### Get Anthropic Models

```bash
curl http://localhost:3000/api/config/llm-providers/anthropic/models
```

**Response:**
```json
{
  "success": true,
  "provider": "anthropic",
  "modelType": "all",
  "count": 8,
  "models": [
    {
      "id": "claude-3-5-sonnet-20241022",
      "name": "Claude 3.5 Sonnet",
      "description": "Most intelligent model with improved coding and analysis",
      "type": "chat",
      "contextWindow": 200000,
      "maxOutputTokens": 8192,
      "pricing": { "input": 3.0, "output": 15.0 },
      "supportsVision": true,
      "supportsFunctionCalling": true,
      "supportsStreaming": true
    }
  ]
}
```

### List Supported Providers

```bash
curl http://localhost:3000/api/config/llm-providers-supported
```

**Response:**
```json
{
  "success": true,
  "count": 4,
  "providers": [
    {
      "id": "openai",
      "name": "Openai",
      "modelsEndpoint": "/api/config/llm-providers/openai/models"
    },
    {
      "id": "anthropic",
      "name": "Anthropic",
      "modelsEndpoint": "/api/config/llm-providers/anthropic/models"
    },
    {
      "id": "google",
      "name": "Google",
      "modelsEndpoint": "/api/config/llm-providers/google/models"
    },
    {
      "id": "perplexity",
      "name": "Perplexity",
      "modelsEndpoint": "/api/config/llm-providers/perplexity/models"
    }
  ]
}
```

## Error Responses

### Invalid Provider Type

```json
{
  "error": "Unsupported provider type 'invalid'. Supported providers: openai, anthropic, google, perplexity",
  "code": "INVALID_PROVIDER_TYPE"
}
```

### Server Error

```json
{
  "error": "Failed to fetch LLM models",
  "message": "Internal server error"
}
```

## Integration with Frontend

### Using with Model Autocomplete Component

The frontend `ModelAutocomplete` component can fetch models from these endpoints:

```typescript
// In LLMProvidersPage.tsx
const fetchModels = async (providerType: string) => {
  const response = await fetch(`/api/config/llm-providers/${providerType}/models`);
  const data = await response.json();
  return data.models;
};
```

### Example: Populating Model Dropdown

```typescript
import { useState, useEffect } from 'react';

function ModelSelector({ providerType }: { providerType: string }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/config/llm-providers/${providerType}/models?modelType=chat`);
        const data = await response.json();
        setModels(data.models);
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, [providerType]);

  return (
    <select disabled={loading}>
      {models.map(model => (
        <option key={model.id} value={model.id}>
          {model.name} - {model.contextWindow.toLocaleString()} tokens
        </option>
      ))}
    </select>
  );
}
```

## Provider-Specific Notes

### OpenAI
- All models support streaming
- Vision support available in GPT-4o and GPT-4 Turbo
- Embedding models return 0 for output pricing
- Context windows range from 8K to 128K tokens

### Anthropic
- Claude 3.5 Sonnet is the most capable model
- All Claude 3+ models support vision
- Context windows up to 200K tokens
- Legacy Claude 2 models marked as deprecated

### Google (Gemini)
- Gemini 1.5 Pro has largest context (2M tokens)
- Experimental models available with `*-exp` suffix
- All models support multimodal inputs

### Perplexity
- Specialized for search-augmented responses
- Real-time web search capabilities
- Sonar Pro for most accurate results

## Data Source

Model data is maintained in `/src/server/data/llmModels.ts` and includes:
- Current pricing (as of implementation date)
- Context window limits
- Capability flags (vision, function calling, streaming)
- Deprecation status

**Note:** Pricing and availability may change. Verify with provider documentation for latest information.

## See Also

- [LLM Providers Configuration](./llm-providers.md)
- [Model Autocomplete Component](../components/ModelAutocomplete.md)
- [Bot Configuration API](./bot-config.md)
