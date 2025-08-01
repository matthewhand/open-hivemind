# OpenAI Configuration

The OpenAI configuration module manages settings for the OpenAI API integration.

## Configuration Options

### OPENAI_API_KEY
- **Description**: OpenAI API key for authentication
- **Type**: String
- **Default**: `''`
- **Environment Variable**: `OPENAI_API_KEY`

### OPENAI_TEMPERATURE
- **Description**: Sampling temperature for OpenAI completions
- **Type**: Number
- **Default**: `0.7`
- **Environment Variable**: `OPENAI_TEMPERATURE`

### OPENAI_MAX_TOKENS
- **Description**: Maximum tokens for OpenAI completion
- **Type**: Integer
- **Default**: `150`
- **Environment Variable**: `OPENAI_MAX_TOKENS`

### OPENAI_FREQUENCY_PENALTY
- **Description**: Frequency penalty for OpenAI completions
- **Type**: Number
- **Default**: `0.1`
- **Environment Variable**: `OPENAI_FREQUENCY_PENALTY`

### OPENAI_PRESENCE_PENALTY
- **Description**: Presence penalty for OpenAI completions
- **Type**: Number
- **Default**: `0.05`
- **Environment Variable**: `OPENAI_PRESENCE_PENALTY`

### OPENAI_BASE_URL
- **Description**: Base URL for OpenAI API
- **Type**: String
- **Default**: `'https://api.openai.com/v1'`
- **Environment Variable**: `OPENAI_BASE_URL`

### OPENAI_TIMEOUT
- **Description**: API request timeout for OpenAI (in milliseconds)
- **Type**: Integer
- **Default**: `10000`
- **Environment Variable**: `OPENAI_TIMEOUT`

### OPENAI_ORGANIZATION
- **Description**: OpenAI organization ID
- **Type**: String
- **Default**: `''`
- **Environment Variable**: `OPENAI_ORGANIZATION`

### OPENAI_MODEL
- **Description**: OpenAI model to use
- **Type**: String
- **Default**: `'gpt-3.5-turbo'`
- **Environment Variable**: `OPENAI_MODEL`

### OPENAI_STOP
- **Description**: Stop sequences for OpenAI completions
- **Type**: Array
- **Default**: `[]`
- **Environment Variable**: `OPENAI_STOP`

### OPENAI_TOP_P
- **Description**: Top-p sampling for OpenAI
- **Type**: Number
- **Default**: `1.0`
- **Environment Variable**: `OPENAI_TOP_P`

### OPENAI_SYSTEM_PROMPT
- **Description**: System prompt for OpenAI
- **Type**: String
- **Default**: `'Greetings, human...'`
- **Environment Variable**: `OPENAI_SYSTEM_PROMPT`

### OPENAI_RESPONSE_MAX_TOKENS
- **Description**: Maximum tokens for OpenAI response
- **Type**: Integer
- **Default**: `100`
- **Environment Variable**: `OPENAI_RESPONSE_MAX_TOKENS`

### OPENAI_MAX_RETRIES
- **Description**: Maximum number of retries for OpenAI requests
- **Type**: Integer
- **Default**: `3`
- **Environment Variable**: `OPENAI_MAX_RETRIES`

### OPENAI_FINISH_REASON_RETRY
- **Description**: Retry strategy based on finish reason
- **Type**: String
- **Default**: `'stop'`
- **Environment Variable**: `OPENAI_FINISH_REASON_RETRY`

### OPENAI_VOICE
- **Description**: OpenAI Voice for TTS
- **Type**: String
- **Default**: `'nova'`
- **Environment Variable**: `OPENAI_VOICE`

## Usage

```typescript
import openaiConfig from './openaiConfig';

const apiKey = openaiConfig.get('OPENAI_API_KEY');
const model = openaiConfig.get('OPENAI_MODEL');
const temperature = openaiConfig.get('OPENAI_TEMPERATURE');
```

## Configuration Sources

The configuration values can be set in the following order of precedence:
1. Environment variables
2. JSON config file (`config/providers/openai.json`)
3. Default values

## Example Configuration File

```json
{
  "OPENAI_API_KEY": "",
  "OPENAI_MODEL": "gpt-4",
  "OPENAI_VOICE": "nova",
  "OPENAI_BASE_URL": "https://api.openai.com",
  "OPENAI_TIMEOUT": 10000,
  "OPENAI_TEMPERATURE": 0.7,
  "OPENAI_MAX_TOKENS": 150,
  "OPENAI_FREQUENCY_PENALTY": 0.1,
  "OPENAI_PRESENCE_PENALTY": 0.05,
  "OPENAI_ORGANIZATION": "",
  "OPENAI_STOP": "",
  "OPENAI_TOP_P": 0.9,
  "OPENAI_SYSTEM_PROMPT": "Greetings, human...",
  "OPENAI_RESPONSE_MAX_TOKENS": 100,
  "OPENAI_MAX_RETRIES": 3,
  "OPENAI_FINISH_REASON_RETRY": "stop"
}