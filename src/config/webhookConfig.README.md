# Webhook Configuration

The Webhook configuration module manages settings for the webhook service.

## Configuration Options

### WEBHOOK_ENABLED
- **Description**: Whether to enable the webhook service
- **Type**: Boolean
- **Default**: `false`
- **Environment Variable**: `WEBHOOK_ENABLED`

### WEBHOOK_URL
- **Description**: Webhook URL for sending messages
- **Type**: String
- **Default**: `''`
- **Environment Variable**: `WEBHOOK_URL`

### WEBHOOK_TOKEN
- **Description**: Token used to verify incoming webhook requests
- **Type**: String
- **Default**: `''`
- **Environment Variable**: `WEBHOOK_TOKEN`

### WEBHOOK_IP_WHITELIST
- **Description**: Comma-separated list of IPs allowed to send webhook requests
- **Type**: String
- **Default**: `''`
- **Environment Variable**: `WEBHOOK_IP_WHITELIST`

### WEBHOOK_PORT
- **Description**: The port to run the webhook on
- **Type**: Port (Integer 0-65535)
- **Default**: `80`
- **Environment Variable**: `WEBHOOK_PORT`

## Usage

```typescript
import webhookConfig from './webhookConfig';

const enabled = webhookConfig.get('WEBHOOK_ENABLED');
const url = webhookConfig.get('WEBHOOK_URL');
const port = webhookConfig.get('WEBHOOK_PORT');
```

## Configuration Sources

The configuration values can be set in the following order of precedence:
1. Environment variables
2. JSON config file (`config/providers/webhook.json`)
3. Default values

## Example Configuration File

```json
{
  "WEBHOOK_ENABLED": false,
  "WEBHOOK_URL": "",
  "WEBHOOK_TOKEN": "",
  "WEBHOOK_IP_WHITELIST": "",
  "WEBHOOK_PORT": 80
}