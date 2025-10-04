# Dynamic Model Fetching & Enhanced Provider Configuration

Navigation: [Docs Index](../README.md) | [Configuration Overview](overview.md) | [Provider Cheatsheet](provider-cheatsheet.md)


This document describes the enhanced LLM provider configuration system with dynamic model fetching, autocomplete functionality, and relaxed API key validation for third-party provider support.

## Overview

The enhanced system provides:
- **Dynamic Model Loading**: Automatically fetch available models from provider APIs
- **Autocomplete Interface**: Smart suggestions with keyboard navigation and validation
- **Third-Party Provider Support**: Relaxed validation for custom API keys and endpoints
- **Real-time Validation**: Warnings instead of errors for non-standard configurations
- **Provider-Specific Endpoints**: Support for custom base URLs and model endpoints

## Features

### 1. ModelAutocomplete Component

A sophisticated autocomplete component that provides dynamic model selection with validation.

#### Key Features:
- **Dynamic API Integration**: Fetches models directly from provider APIs
- **Keyboard Navigation**: Arrow keys, Enter, Escape support
- **Real-time Filtering**: As-you-type search through available models
- **Validation Warnings**: Non-blocking alerts for unusual configurations
- **Custom Model Support**: Manual entry for custom/third-party models
- **Provider Detection**: Automatic endpoint configuration based on provider type

#### DaisyUI Components Used:
- `input` with `input-bordered` styling
- `dropdown` with `dropdown-content` menu
- `loading` spinner indicators
- `alert` for error/warning messages
- `badge` for provider tags
- `progress` for validation states

### 2. Enhanced Provider Schemas

All LLM provider schemas now include:
- **Base URL Overrides**: Support for third-party endpoints
- **Dynamic Model Selection**: Replaces static dropdowns with autocomplete
- **Relaxed Validation**: Warnings instead of errors for API keys

#### Provider Support:

##### OpenAI (`openai.ts`)
```typescript
{
  name: 'baseUrl',
  label: 'Base URL (Optional)',
  type: 'url',
  description: 'Custom API base URL for third-party OpenAI-compatible providers (OPENAI_BASE_URL)',
  placeholder: 'https://api.openai.com/v1 or https://your-proxy.com/v1'
}
```

##### Anthropic (`anthropic.ts`)
```typescript
{
  name: 'baseUrl',
  label: 'Base URL (Optional)',
  type: 'url',
  description: 'Custom API base URL for third-party Anthropic-compatible providers (ANTHROPIC_BASE_URL)',
  placeholder: 'https://api.anthropic.com or https://your-proxy.com'
}
```

##### Ollama (`ollama.ts`)
```typescript
{
  name: 'endpoint',
  label: 'API Endpoint',
  type: 'url',
  description: 'URL of your Ollama server or Ollama-compatible API',
  placeholder: 'http://localhost:11434 or https://your-ollama-compatible-api.com'
}
```

### 3. Model Fetching Endpoints

The system automatically fetches models from:

- **OpenAI**: `/v1/models` - Returns all available GPT models
- **Ollama**: `/api/tags` - Returns locally installed models
- **Anthropic**: Static list of Claude models (no public endpoint)

### 4. Validation System

#### Relaxed API Key Validation
- **Warnings Only**: Non-standard API key formats show warnings, not errors
- **Third-Party Support**: Custom keys for proxy services and third-party providers
- **Format Suggestions**: Helpful hints about expected formats without blocking

#### Model Validation
- **Available Model Check**: Warns if entered model isn't in fetched list
- **Custom Model Support**: Allows manual entry for custom models
- **Provider-Specific Validation**: Different validation rules per provider

## Usage Examples

### Basic Model Autocomplete

```typescript
import { ModelAutocomplete } from '../components/DaisyUI';

<ModelAutocomplete
  value={selectedModel}
  onChange={setSelectedModel}
  providerType="openai"
  apiKey="sk-your-api-key"
  placeholder="Enter model name..."
  onValidationError={(error) => console.warn(error)}
/>
```

### Third-Party Provider Configuration

```typescript
// Custom OpenAI-compatible provider
<ModelAutocomplete
  value={model}
  onChange={setModel}
  providerType="openai"
  apiKey="custom-key-from-third-party"
  baseUrl="https://your-proxy.com/v1"
  onValidationError={(error) => {
    // Show warning but don't block user
    console.warn('Third-party provider warning:', error);
  }}
/>
```

### Ollama Local Instance

```typescript
<ModelAutocomplete
  value={model}
  onChange={setModel}
  providerType="ollama"
  baseUrl="http://localhost:11434"
  placeholder="Models will load from local Ollama instance..."
/>
```

## Configuration Schema Extensions

### New Field Type: `model-autocomplete`

```typescript
{
  name: 'model',
  label: 'Model',
  type: 'model-autocomplete',
  required: true,
  component: ModelAutocomplete,
  componentProps: {
    providerType: 'openai',
    placeholder: 'Enter model name...',
    label: 'Model Selection'
  }
}
```

### Enhanced Validation

```typescript
// API key validation now shows warnings instead of errors
if (field.name === 'apiKey' || field.type === 'password') {
  console.warn(`${field.label} format warning: Non-standard format`);
  // Don't block user - just warn
} else {
  return `${field.label} format is invalid`;
}
```

## Environment Variable Support

The system respects standard environment variable naming:

- `OPENAI_BASE_URL` - OpenAI API endpoint override
- `ANTHROPIC_BASE_URL` - Anthropic API endpoint override
- `OLLAMA_ENDPOINT` - Ollama server endpoint

## DaisyUI Integration

### Components Used
- **Input**: Base input styling with validation states
- **Dropdown**: Menu for model suggestions
- **Loading**: Spinner during API calls
- **Alert**: Error and warning messages
- **Badge**: Provider and status indicators
- **Progress**: Validation and loading states
- **Button**: Refresh and action buttons

### Styling Classes
- `input-bordered` - Styled input fields
- `dropdown-content` - Dropdown menu container
- `alert-warning` - Warning message styling
- `badge-ghost` - Subtle status indicators
- `loading` - Spinner animation

## Error Handling

### Network Errors
- Graceful degradation when API endpoints are unreachable
- Clear error messages with troubleshooting suggestions
- Retry functionality with refresh buttons

### Validation Errors
- Non-blocking warnings for API key format issues
- Helpful suggestions for common configuration problems
- Support for third-party provider quirks

### Model Loading Errors
- Fallback to manual entry when API calls fail
- Clear indication of custom vs. fetched models
- Retry mechanisms for temporary failures

## Security Considerations

### API Key Handling
- Keys are used only for model fetching, not stored permanently
- No logging of complete API keys (only first 8 characters for debugging)
- Support for both official and third-party provider keys

### CORS and Network Security
- All API calls made from client-side for transparency
- Proper error handling for cross-origin requests
- Support for proxy configurations

## Troubleshooting

### Common Issues

**Models not loading:**
1. Check API key validity and permissions
2. Verify base URL is accessible
3. Check CORS settings for third-party providers
4. Use refresh button to retry loading

**Validation warnings:**
1. Warnings are informational and don't block functionality
2. Third-party providers often use non-standard key formats
3. Custom endpoints may require different authentication

**Third-party provider setup:**
1. Enter custom base URL in the "Third-Party Compatibility" section
2. Use provider-specific API key format
3. Test with manual model entry if autocomplete doesn't work

### Debug Information

Enable console logging to see:
- API request details
- Model fetching progress
- Validation warnings
- Network error details

## Future Enhancements

### Planned Features
- **Model Caching**: Local storage of fetched models
- **Model Metadata**: Pricing, context length, capability information
- **Provider Health Checks**: Automatic endpoint validation
- **Batch Configuration**: Setup multiple providers simultaneously
- **Import/Export**: Configuration sharing between environments

### Provider Extensions
- **Google AI Platform**: Gemini model support
- **Cohere**: Command and Embed models
- **Mistral AI**: Mistral and Mixtral models
- **Local Providers**: LM Studio, LocalAI, etc.

## API Reference

### ModelAutocomplete Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `string` | ✓ | Current model value |
| `onChange` | `(value: string) => void` | ✓ | Change handler |
| `providerType` | `'openai' | 'anthropic' | 'ollama' | 'custom'` | ✓ | Provider type |
| `apiKey` | `string` | - | API key for model fetching |
| `baseUrl` | `string` | - | Custom endpoint URL |
| `placeholder` | `string` | - | Input placeholder text |
| `label` | `string` | - | Field label |
| `onValidationError` | `(error: string) => void` | - | Validation error handler |
| `onValidationSuccess` | `() => void` | - | Validation success handler |

### Provider Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | `password` | Provider API key (relaxed validation) |
| `baseUrl` | `url` | Custom API endpoint for third-party providers |
| `model` | `model-autocomplete` | Dynamic model selection with autocomplete |
| `temperature` | `number` | Response randomness (0-2) |
| `maxTokens` | `number` | Maximum response length |

## Conclusion

The enhanced dynamic model fetching system provides a user-friendly interface for LLM provider configuration while maintaining flexibility for third-party providers and custom setups. The use of DaisyUI components ensures a consistent, accessible interface that integrates seamlessly with the existing design system.