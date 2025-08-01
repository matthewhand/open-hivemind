# Mattermost Configuration

The Mattermost configuration module manages settings for the Mattermost integration.

## Configuration Options

### MATTERMOST_SERVER_URL
- **Description**: Mattermost server endpoint
- **Type**: String
- **Default**: `''`
- **Environment Variable**: `MATTERMOST_SERVER_URL`

### MATTERMOST_TOKEN
- **Description**: Mattermost authentication token
- **Type**: String
- **Default**: `''`
- **Environment Variable**: `MATTERMOST_TOKEN`

### MATTERMOST_CHANNEL
- **Description**: Default Mattermost channel for messages
- **Type**: String
- **Default**: `''`
- **Environment Variable**: `MATTERMOST_CHANNEL`

## Usage

```typescript
import mattermostConfig from './mattermostConfig';

const serverUrl = mattermostConfig.get('MATTERMOST_SERVER_URL');
const token = mattermostConfig.get('MATTERMOST_TOKEN');
const channel = mattermostConfig.get('MATTERMOST_CHANNEL');
```

## Configuration Sources

The configuration values can be set in the following order of precedence:
1. Environment variables
2. JSON config file (`config/providers/mattermost.json`)
3. Default values

## Example Configuration File

```json
{
  "MATTERMOST_SERVER_URL": "",
  "MATTERMOST_TOKEN": "",
  "MATTERMOST_CHANNEL": ""
}