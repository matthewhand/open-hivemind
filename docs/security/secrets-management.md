# Secrets Management

This document describes how Open Hivemind handles API keys, tokens, passwords, and other sensitive credentials.

## Overview

Open Hivemind manages secrets through:

1. **Environment variables** for configuration
2. **Encrypted storage** in SQLite database (optional)
3. **Secure transmission** via HTTPS (in production)
4. **Logging redaction** to prevent credential leakage

## Environment Variables

### Required Environment Variables

The following environment variables contain sensitive data:

**LLM Provider API Keys:**
```bash
OPENAI_API_KEY=sk-...          # OpenAI API key
ANTHROPIC_API_KEY=sk-ant-...   # Anthropic API key
PERPLEXITY_API_KEY=...         # Perplexity API key
REPLICATE_API_TOKEN=...        # Replicate API token
```

**Message Provider Credentials:**
```bash
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...

# Discord
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...

# Telegram
TELEGRAM_BOT_TOKEN=...

# Mattermost
MATTERMOST_URL=...
MATTERMOST_TOKEN=...
```

**Integration Credentials:**
```bash
# Flowise
FLOWISE_API_KEY=...
FLOWISE_API_URL=...

# N8N
N8N_API_KEY=...
N8N_WEBHOOK_URL=...
```

**Application Secrets:**
```bash
SESSION_SECRET=...             # Express session encryption key
ADMIN_PASSWORD=...             # Admin user password
JWT_SECRET=...                 # JWT token signing key (if using JWT auth)
DATABASE_ENCRYPTION_KEY=...    # For encrypting sensitive DB fields
```

### Environment Variable Storage

**Development:**
- Store in `.env` file in project root
- `.env` is gitignored and never committed
- Use `.env.example` as a template

**Production:**
- Set environment variables via hosting platform
- Use secrets management service (AWS Secrets Manager, HashiCorp Vault, etc.)
- Never hardcode secrets in configuration files

### Validation

Environment variables are validated at startup:

```typescript
// From src/utils/envValidation.ts
export function validateRequiredEnvVars() {
  const required = ['OPENAI_API_KEY', 'SLACK_BOT_TOKEN', ...];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

## Database Storage

### Encrypted Fields

Sensitive data stored in the database is encrypted:

**Bot Configuration:**
```typescript
// From src/database/types.ts
interface BotConfiguration {
  id: number;
  name: string;
  apiKey: string;        // ENCRYPTED
  webhookSecret: string; // ENCRYPTED
  // ... other fields
}
```

**Encryption Method:**

Open Hivemind uses AES-256-GCM encryption for sensitive fields:

```typescript
// Pseudo-code - actual implementation in SecureConfigManager
import crypto from 'crypto';

function encrypt(plaintext: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    authTag: authTag.toString('hex'),
  });
}

function decrypt(ciphertext: string, key: string): string {
  const { iv, data, authTag } = JSON.parse(ciphertext);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(data, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}
```

**Encryption Key:**

The encryption key is derived from `DATABASE_ENCRYPTION_KEY` environment variable:

```bash
# Generate a secure key
DATABASE_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

**Important:** If `DATABASE_ENCRYPTION_KEY` is lost, encrypted data cannot be recovered.

### Secure Config Manager

The `SecureConfigManager` class handles encryption/decryption:

```typescript
// From src/config/SecureConfigManager.ts
class SecureConfigManager {
  // Encrypts sensitive fields before storage
  encryptConfig(config: BotConfiguration): BotConfiguration {
    return {
      ...config,
      apiKey: this.encrypt(config.apiKey),
      webhookSecret: this.encrypt(config.webhookSecret),
    };
  }

  // Decrypts sensitive fields after retrieval
  decryptConfig(config: BotConfiguration): BotConfiguration {
    return {
      ...config,
      apiKey: this.decrypt(config.apiKey),
      webhookSecret: this.decrypt(config.webhookSecret),
    };
  }
}
```

## Logging and Redaction

### What is Logged

Open Hivemind logs:
- Request URLs and methods
- Response status codes
- Error messages and stack traces
- System events and metrics

### What is NOT Logged

The following are redacted or excluded from logs:

**API Keys and Tokens:**
```typescript
// API keys are redacted in logs
logger.info('OpenAI API call', {
  apiKey: redactSecret(apiKey)  // Shows: "sk-...****"
});
```

**Authorization Headers:**
```typescript
// Authorization headers are stripped from request logs
logger.debug('Request', {
  method: req.method,
  url: req.url,
  headers: {
    ...req.headers,
    authorization: '[REDACTED]',
    cookie: '[REDACTED]',
  },
});
```

**Password Fields:**
```typescript
// Password fields are excluded from error logs
logger.error('User creation failed', {
  username: user.username,
  email: user.email,
  // password: user.password,  // NEVER logged
});
```

### Redaction Utilities

The `redaction.ts` utility provides helper functions:

```typescript
// From src/client/src/utils/redaction.ts
export function redactApiKey(key: string): string {
  if (!key || key.length < 8) return '[REDACTED]';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function redactObject(obj: any, sensitiveKeys: string[]): any {
  const redacted = { ...obj };

  for (const key of sensitiveKeys) {
    if (key in redacted) {
      redacted[key] = '[REDACTED]';
    }
  }

  return redacted;
}

// Usage
const logData = redactObject(requestBody, [
  'apiKey', 'api_key', 'API_KEY',
  'password', 'token', 'secret',
]);
logger.info('Request received', logData);
```

### Audit Logging

Security-sensitive operations are logged to the audit trail:

```typescript
// From src/common/auditLogger.ts
auditLogger.logEvent({
  userId: user.id,
  action: 'API_KEY_UPDATED',
  resource: 'bot_configuration',
  resourceId: botId,
  timestamp: new Date(),
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  result: 'success',
  // No sensitive data included
});
```

**Audited Events:**
- User authentication (login, logout, failed attempts)
- API key creation, rotation, deletion
- Configuration changes
- Admin actions
- Permission changes

## Transmission Security

### HTTPS Requirements

**Production:**
- All traffic MUST use HTTPS
- HTTP requests are redirected to HTTPS
- HSTS header is set to enforce HTTPS:
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  ```

**Development:**
- HTTP is allowed for localhost testing
- Use `ngrok` or similar for testing webhooks

### WebSocket Security

WebSocket connections are secured:

```typescript
// From src/server/services/WebSocketService.ts
const wss = new WebSocketServer({
  server: httpsServer,  // Use HTTPS server
  verifyClient: (info) => {
    // Validate origin
    const origin = info.origin;
    if (!isAllowedOrigin(origin)) {
      return false;
    }

    // Validate session cookie
    const cookies = parseCookies(info.req.headers.cookie);
    return validateSession(cookies.sessionId);
  },
});
```

### API Key Transmission

API keys are transmitted in headers, not URL parameters:

```bash
# CORRECT: Key in Authorization header
curl -H "Authorization: Bearer $API_KEY" https://api.example.com/endpoint

# WRONG: Key in URL (logged, cached, visible)
curl https://api.example.com/endpoint?api_key=$API_KEY
```

## Secret Rotation

### API Key Rotation

To rotate an API key:

1. Generate new key from provider (OpenAI, Anthropic, etc.)
2. Update environment variable with new key
3. Restart Open Hivemind
4. Revoke old key from provider

**Zero-downtime rotation** (for larger deployments):

1. Configure both old and new keys (comma-separated)
2. Deploy updated configuration
3. Verify new key works
4. Remove old key from configuration
5. Revoke old key

### Session Secret Rotation

To rotate `SESSION_SECRET`:

1. Generate new secret:
   ```bash
   NEW_SECRET=$(openssl rand -hex 32)
   ```
2. Update `SESSION_SECRET` environment variable
3. Restart application
4. **Note:** All existing sessions will be invalidated

### Database Encryption Key Rotation

**Warning:** Rotating `DATABASE_ENCRYPTION_KEY` requires data migration:

1. Export all encrypted data with old key
2. Update `DATABASE_ENCRYPTION_KEY`
3. Re-import and re-encrypt data with new key

**Not recommended** unless old key is compromised.

## Access Control

### Environment Variable Access

**Principle:** Only the application process should access environment variables.

- Use `.env` file with restricted permissions: `chmod 600 .env`
- Do not expose env vars in web interfaces
- Do not log full environment (`process.env`)

### Database Access

**Principle:** Encrypted data should only be decrypted when needed.

```typescript
// GOOD: Decrypt only when needed
async function sendMessage(botId: number) {
  const config = await getBotConfig(botId);
  const decrypted = secureConfigManager.decrypt(config);
  await api.send(decrypted.apiKey, message);
  // apiKey not stored in memory longer than necessary
}

// BAD: Decrypting all configs upfront
const allConfigs = await getAllBotConfigs();
const decrypted = allConfigs.map(c => secureConfigManager.decrypt(c));
// All keys now in memory
```

### Admin Panel

The admin panel allows viewing/editing configuration, but:

- API keys are masked: `sk-...****`
- Full keys only shown on explicit "reveal" action
- Reveal action is logged to audit trail
- Session timeout enforces re-authentication

## Secrets in Configuration Files

### What NOT to Store in Config Files

Never store secrets in:
- `config/*.json` files
- `package.json`
- Docker Compose files (use `.env` or secrets)
- Kubernetes ConfigMaps (use Secrets)

### Config File Structure

```json
// config/default.json - NO SECRETS
{
  "llmProvider": "openai",
  "model": "gpt-4",
  "temperature": 0.7,
  "apiKeyEnvVar": "OPENAI_API_KEY"  // Reference to env var
}
```

## Secrets in Version Control

### .gitignore

Ensure these patterns are in `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Database files (may contain encrypted secrets)
data/
*.db
*.sqlite

# Config files that might contain secrets
config/local.json
config/production.json

# Logs (may contain redaction failures)
logs/
*.log

# IDE files (may store env vars)
.vscode/settings.json
.idea/
```

### Secrets Scanning

Enable pre-commit hooks to prevent secret commits:

```bash
# Install git-secrets
brew install git-secrets  # macOS
apt-get install git-secrets  # Linux

# Configure git-secrets
git secrets --install
git secrets --register-aws
git secrets --add 'sk-[a-zA-Z0-9]{32,}'  # OpenAI keys
git secrets --add 'xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}'  # Slack bot tokens
```

### Accidental Commit Response

If secrets are committed to version control:

1. **Immediately revoke** the exposed secret from the provider
2. **Generate new secret** and update configuration
3. **Remove from Git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
4. **Force push** (if remote)
5. **Notify team** about the incident

## Secrets in CI/CD

### GitHub Actions

Use encrypted secrets:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
        run: npm test
```

### Docker

Use Docker secrets (not ENV in Dockerfile):

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: open-hivemind
    secrets:
      - openai_api_key
      - slack_bot_token

secrets:
  openai_api_key:
    file: ./secrets/openai_api_key.txt
  slack_bot_token:
    file: ./secrets/slack_bot_token.txt
```

## Best Practices

### Do's

1. **Use environment variables** for secrets
2. **Encrypt sensitive database fields**
3. **Redact secrets in logs** using utility functions
4. **Use HTTPS in production** for all communications
5. **Rotate secrets regularly** (quarterly for high-risk keys)
6. **Audit secret access** via audit logging
7. **Use principle of least privilege** for secret access
8. **Scan for secrets in commits** using pre-commit hooks

### Don'ts

1. **Never commit secrets** to version control
2. **Never log full API keys** or passwords
3. **Never store secrets in config files** (use env vars)
4. **Never transmit secrets in URLs** (use headers)
5. **Never expose secrets in error messages**
6. **Never share secrets via chat/email** (use secure channels)
7. **Never use weak encryption** (AES-256-GCM minimum)
8. **Never store unencrypted secrets in database**

## Security Checklist

- [ ] All secrets are in environment variables, not config files
- [ ] `.env` file is gitignored and has restricted permissions (600)
- [ ] Database encryption key is set and stored securely
- [ ] All sensitive database fields are encrypted
- [ ] Logging utilities redact secrets before output
- [ ] HTTPS is enforced in production
- [ ] Session secrets are strong (32+ random bytes)
- [ ] Pre-commit hooks scan for secrets
- [ ] CI/CD secrets use encrypted secrets storage
- [ ] Secret rotation process is documented
- [ ] Audit logging tracks secret access
- [ ] Admin panel masks secrets by default

## References

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12 Factor App - Config](https://12factor.net/config)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [git-secrets](https://github.com/awslabs/git-secrets)
