# Open WebUI Configuration

The Open WebUI configuration module manages settings for the Open WebUI API integration.

## Configuration Options

### OPEN_WEBUI_API_URL
- **Description**: Open WebUI API URL
- **Type**: String
- **Default**: `'http://host.docker.internal:3000/api/'`
- **Environment Variable**: `OPEN_WEBUI_API_URL`

### OPEN_WEBUI_USERNAME
- **Description**: Open WebUI username
- **Type**: String
- **Default**: `'admin'`
- **Environment Variable**: `OPEN_WEBUI_USERNAME`

### OPEN_WEBUI_PASSWORD
- **Description**: Open WebUI password
- **Type**: String
- **Default**: `'password123'`
- **Environment Variable**: `OPEN_WEBUI_PASSWORD`

### OPEN_WEBUI_KNOWLEDGE_FILE
- **Description**: Path to Open WebUI knowledge file
- **Type**: String
- **Default**: `''`
- **Environment Variable**: `OPEN_WEBUI_KNOWLEDGE_FILE`

### OPEN_WEBUI_MODEL
- **Description**: Default model for Open WebUI completions
- **Type**: String
- **Default**: `'llama3.2'`
- **Environment Variable**: `OPEN_WEBUI_MODEL`

## Usage

```typescript
import openWebUIConfig from './openWebUIConfig';

const apiUrl = openWebUIConfig.get('OPEN_WEBUI_API_URL');
const username = openWebUIConfig.get('OPEN_WEBUI_USERNAME');
const model = openWebUIConfig.get('OPEN_WEBUI_MODEL');
```

## Configuration Sources

The configuration values can be set in the following order of precedence:
1. Environment variables
2. JSON config file (`config/providers/openwebui.json`)
3. Default values

## Example Configuration File

```json
{
  "OPEN_WEBUI_API_URL": "http://host.docker.internal:3000/api/",
  "OPEN_WEBUI_USERNAME": "admin",
  "OPEN_WEBUI_PASSWORD": "password123",
  "OPEN_WEBUI_KNOWLEDGE_FILE": "",
  "OPEN_WEBUI_MODEL": "llama3.2"
}