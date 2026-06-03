# Security Hardening Implementation Guide

This document provides a comprehensive overview of the security measures implemented in Open-Hivemind, along with implementation details, configuration options, and best practices.

> **Note on scope.** Several subsections below (Secret Vault Integration, the Redis-backed Session Management and Rate Limiting examples) describe *target architectures / reference patterns* for enterprise deployments. They do not all correspond 1:1 to the current code. The **Implementation Status** table immediately below is the authoritative record of what ships today versus what is still pending or in review — treat it as the source of truth when the prose and the code disagree.

## Implementation Status

| Area | Status | Where |
|------|--------|-------|
| CSRF protection (synchronizer token) | **Implemented** | `src/server/middleware/csrf.ts`, mounted in `src/server/registerRoutes.ts` and `src/server/server.ts` |
| Durable audit log (SQLite/Postgres-backed) | **Implemented** | `src/server/middleware/auditLogger.ts`, `src/database/repositories/AuditEventRepository.ts` |
| Durable user persistence (registrations, password changes, lastLogin survive restart) | **Implemented** | `src/auth/UserRepository.ts`, wired in `src/auth/AuthManager.ts` |
| Webhook IP allow-list (exact-match IPv4/IPv6) | **Implemented** | `src/webhook/security/webhookSecurity.ts` (`verifyIpWhitelist`) |
| Admin trusted-IP guard (exact IP **and** CIDR ranges) | **Implemented** | `src/server/middleware/security.ts` (`isTrustedAdminIP` / `adminIPGuard`) |
| Encryption-at-rest for stored secrets (AES-256-GCM) | **Implemented** | `src/config/SecureConfigManager.ts` |
| Security response headers (CSP, HSTS, X-Frame-Options, etc.) | **Implemented** | `src/server/middleware/security.ts` (`securityHeaders`) |
| Webhook token + Slack signature verification (timing-safe) | **Implemented** | `src/webhook/security/webhookSecurity.ts` |
| Two-factor authentication (2FA) | **In review** | Settings UI fields exist (`SettingsSecurity.tsx`); enforcement lives in a held `[SECURITY-REVIEW]` PR |
| Account lockout after failed logins | **In review** | Settings UI fields exist; enforcement lives in a held `[SECURITY-REVIEW]` PR |
| Durable / Redis-backed session manager | **In review** | `src/auth/SessionManager.ts` exists but is not yet wired into the request path; held in a `[SECURITY-REVIEW]` PR |

Legend: **Implemented** = present and active on `main`. **In review** = code or UI scaffolding exists but the enforcing path is intentionally not wired in yet (held in a security-review PR).

## Table of Contents

1. [Credential Management & Encryption at Rest](#1-credential-management--encryption-at-rest)
2. [Secret Vault Integration](#2-secret-vault-integration)
3. [WebUI Sanitization](#3-webui-sanitization)
4. [CORS Configuration](#4-cors-configuration)
5. [Session Management](#5-session-management)
6. [Input Validation](#6-input-validation)
7. [Rate Limiting](#7-rate-limiting)
8. [CSRF Protection](#8-csrf-protection)
9. [Durable Audit Log](#9-durable-audit-log)
10. [Durable User Persistence](#10-durable-user-persistence)
11. [Webhook & Admin IP Allow-Lists](#11-webhook--admin-ip-allow-lists)
12. [Testing Security Measures](#12-testing-security-measures)

---

## 1. Credential Management & Encryption at Rest

### Overview
Hardcoded credentials have been removed from the codebase. The [`debugEnvVars.ts`](src/config/debugEnvVars.ts) file has been sanitized to prevent accidental exposure of sensitive information.

### Implementation Details

#### Removed Hardcoded Credentials
- All API keys, passwords, and tokens have been removed from source code
- Environment variables are now the only source for sensitive configuration
- Debug utilities use placeholder values that are clearly marked

#### Secure Configuration Manager (Encryption at Rest)
Location: [`src/config/SecureConfigManager.ts`](src/config/SecureConfigManager.ts)

Stored secrets (bot tokens, provider API keys, etc.) are encrypted at rest. As implemented today:

- **AES-256-GCM authenticated encryption** for stored configurations. Each record is serialized as `iv:authTag:ciphertext`, where `iv` is a fresh random 16-byte initialization vector and `authTag` is the GCM authentication tag (tamper detection is provided by GCM itself).
- **Auto-managed encryption key.** On first use the manager generates a random 32-byte key with `crypto.randomBytes(32)` and persists it to `config/.key` (created if absent, reused thereafter). The key is **not** read from an environment variable in the current implementation.
- **On-disk layout.** Encrypted configs live under `config/secure/`, backups under `config/backups/`.
- Configuration records carry a `checksum` and `updatedAt`/`createdAt` metadata and can be grouped by `type` (e.g. `bot`).

> **Operational note.** Because the encryption key lives in `config/.key`, that file must be protected with filesystem permissions and included in your backup/secret-rotation strategy. Losing `config/.key` makes existing encrypted configs unrecoverable; leaking it defeats encryption at rest.

```typescript
// Example usage
import { SecureConfigManager } from '@src/config/SecureConfigManager';

const configManager = new SecureConfigManager();

// Store configuration securely
await configManager.storeConfig({
  id: 'bot-api-keys',
  name: 'Bot API Keys',
  type: 'bot',
  data: {
    discordToken: process.env.DISCORD_BOT_TOKEN,
    openaiKey: process.env.OPENAI_API_KEY
  }
});

// Retrieve configuration
const config = await configManager.getConfig('bot-api-keys');
```

#### Sensitive Information Redaction
Location: [`src/common/redactSensitiveInfo.ts`](src/common/redactSensitiveInfo.ts)

Automatically redacts sensitive values in logs and error messages:
- API keys: `sk-1234567890` → `sk-1******7890`
- Passwords: `mySecretPassword` → `mySe****word`
- Tokens: `abc123xyz789` → `abc1****x789`

### Configuration

The `SecureConfigManager` does **not** currently require an `ENCRYPTION_KEY`/`MASTER_KEY` environment variable — it self-manages its key in `config/.key` (see above). The security-relevant environment variables that *are* honored today are documented in `.env.sample`; the most relevant ones for this guide:

```bash
# Session signing secret (used by the session middleware)
SESSION_SECRET=your-secure-session-secret

# Trusted admin login network controls (supports exact IPs and CIDR ranges)
ALLOW_LOCALHOST_ADMIN=true
ADMIN_IP_WHITELIST=127.0.0.1,::1,::ffff:127.0.0.1

# Webhook inbound IP allow-list (exact IPs only — see §11)
WEBHOOK_IP_WHITELIST=203.0.113.10,203.0.113.11
```

### Best Practices
1. Never commit `.env` files or `config/.key` to version control.
2. Back up `config/.key` securely; rotation requires re-encrypting existing configs.
3. Use different keys/secrets for development and production.
4. Restrict filesystem permissions on `config/.key`, `config/secure/`, and the SQLite database file.
5. Monitor access to secure configurations via the durable audit log (§9).

---

## 2. Secret Vault Integration

### Overview
Open-Hivemind supports integration with external secret management systems for enterprise deployments.

### Supported Secret Backends

#### HashiCorp Vault
```typescript
// Configuration in environment
VAULT_ADDR=https://vault.example.com:8200
VAULT_TOKEN=s.xxxxxxxx
VAULT_NAMESPACE=production

// Secret path structure
secret/data/open-hivemind/discord
secret/data/open-hivemind/openai
secret/data/open-hivemind/database
```

#### AWS Secrets Manager
```typescript
// Configuration
AWS_REGION=us-east-1
AWS_SECRETS_PREFIX=open-hivemind/

// Secret names
open-hivemind/discord-credentials
open-hivemind/llm-providers
```

#### Azure Key Vault
```typescript
// Configuration
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxx
```

### Implementation Pattern

```typescript
// src/config/SecretProvider.ts
interface ISecretProvider {
  getSecret(path: string): Promise<string>;
  getSecretObject<T>(path: string): Promise<T>;
  rotateSecret(path: string): Promise<void>;
}

// Factory pattern for provider selection
function getSecretProvider(): ISecretProvider {
  const backend = process.env.SECRET_BACKEND || 'env';
  
  switch (backend) {
    case 'vault':
      return new VaultSecretProvider();
    case 'aws':
      return new AWSSecretProvider();
    case 'azure':
      return new AzureSecretProvider();
    default:
      return new EnvSecretProvider();
  }
}
```

### Environment Variable Loading Order

1. **System environment** (highest priority)
2. **Secret vault** (if configured)
3. **`.env` file** (development only)
4. **Default values** (lowest priority)

### Security Considerations
- Secret caching is disabled by default
- Secrets are never logged or exposed in error messages
- Automatic secret rotation is supported for vault backends
- Audit logging for secret access (enterprise feature)

---

## 3. WebUI Sanitization

### Overview
All user-generated content is sanitized to prevent XSS attacks and injection vulnerabilities.

### Entry Points Identified

| Entry Point | Input Type | Sanitization Method |
|-------------|------------|---------------------|
| Chat messages | Text/HTML | DOMPurify + escape |
| Configuration forms | JSON/Text | Schema validation + escape |
| File uploads | Binary | Type validation + scanning |
| API responses | JSON | Output encoding |
| WebSocket messages | JSON | Schema validation + sanitization |

### Implementation Details

#### Input Sanitization Middleware
Location: [`src/middleware/sanitizationMiddleware.ts`](src/middleware/sanitizationMiddleware.ts)

```typescript
import sanitizeHtml from 'sanitize-html';
import { escape } from 'html-entities';

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Recursively sanitize all string values in request body
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove HTML tags and escape entities
      return escape(sanitizeHtml(obj, {
        allowedTags: [],
        allowedAttributes: {}
      }));
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, sanitize(v)])
      );
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  next();
};
```

#### React Precautions

1. **Never use `dangerouslySetInnerHTML`**
   ```jsx
   // ❌ Dangerous
   <div dangerouslySetInnerHTML={{ __html: userInput }} />
   
   // ✅ Safe
   <div>{userInput}</div>
   ```

2. **Use DOMPurify for rich text**
   ```jsx
   import DOMPurify from 'dompurify';
   
   const SafeHtml = ({ content }) => (
     <div dangerouslySetInnerHTML={{
       __html: DOMPurify.sanitize(content, {
         ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
         ALLOWED_ATTR: ['href']
       })
     }} />
   );
   ```

3. **URL validation for links**
   ```typescript
   const isValidUrl = (url: string): boolean => {
     try {
       const parsed = new URL(url);
       return ['http:', 'https:'].includes(parsed.protocol);
     } catch {
       return false;
     }
   };
   ```

### Libraries Used

| Library | Purpose | Version |
|---------|---------|---------|
| `sanitize-html` | HTML sanitization | ^2.11.0 |
| `html-entities` | Entity encoding | ^2.4.0 |
| `dompurify` | DOM sanitization (frontend) | ^3.0.0 |
| `validator` | General validation | ^13.9.0 |

### Testing Sanitization

```typescript
// tests/integration/comprehensive-security.test.ts
test('should sanitize malicious input', async () => {
  const response = await request(app)
    .post('/secure-endpoint')
    .send({ comment: '<script>alert("xss")</script>' })
    .expect(200);
    
  expect(response.body.data.comment).toBe(
    '<script>alert("xss")</script>'
  );
});
```

---

## 4. CORS Configuration

### Overview
Production-grade CORS configuration with environment-based policies and default restrictions.

### Implementation Details

Location: [`src/middleware/corsMiddleware.ts`](src/middleware/corsMiddleware.ts)

```typescript
import cors from 'cors';

const getAllowedOrigins = (): string[] => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      // Production: Only explicitly allowed origins
      return process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [];
      
    case 'staging':
      // Staging: Allow staging domain + production origins
      return [
        ...getAllowedOrigins(),
        'https://staging.open-hivemind.com'
      ];
      
    default:
      // Development: Allow localhost variants
      return [
        'http://localhost:3000',
        'http://localhost:3028',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3028'
      ];
  }
};

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID'
  ],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};
```

### Environment Configuration

```bash
# Production CORS settings
CORS_ORIGINS=https://app.example.com,https://admin.example.com
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400

# Development (relaxed)
NODE_ENV=development  # Allows localhost
```

### Security Headers

Additional security headers applied via Helmet:

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 5. Session Management

> **Status: partially implemented / hardening in review.** A session signing secret (`SESSION_SECRET`) and a session middleware (`src/middleware/sessionMiddleware.ts`) exist today. The richer **durable session manager** described below — `src/auth/SessionManager.ts`, idle/absolute timeouts, store-backed invalidation and rotation — is **in review**: the class exists in the tree but is **not yet wired into the request path**, and ships in a held `[SECURITY-REVIEW]` PR. The Redis/`connect-redis` example below is a **reference target architecture**, not the current runtime (the project does not require Redis to run). Treat this section as design guidance until the held PR lands.

### Overview
Secure session management with proper storage, cookie configuration, and rotation mechanisms.

### Implementation Details

Location: [`src/middleware/sessionMiddleware.ts`](src/middleware/sessionMiddleware.ts) (active), `src/auth/SessionManager.ts` (in review — see status note above)

```typescript
import session from 'express-session';
import connectRedis from 'connect-redis';
import { createClient } from 'redis';

const RedisStore = connectRedis(session);

// Redis client for session storage
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    tls: process.env.NODE_ENV === 'production',
    rejectUnauthorized: true
  }
});

export const sessionConfig = {
  store: new RedisStore({
    client: redisClient,
    prefix: 'oh-sess:',
    ttl: 86400, // 24 hours
    disableTouch: false
  }),
  name: 'oh-session', // Don't use default 'connect.sid'
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
    maxAge: 86400000, // 24 hours
    domain: process.env.COOKIE_DOMAIN,
    path: '/'
  }
};
```

### Cookie Security

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `secure` | `true` (production) | HTTPS only |
| `httpOnly` | `true` | Prevent JavaScript access |
| `sameSite` | `'strict'` | CSRF protection |
| `maxAge` | `86400000` | 24-hour expiration |
| `domain` | Configured | Scope limitation |

### Session Rotation

```typescript
// Rotate session on privilege escalation
export const rotateSession = async (req: Request, res: Response, next: NextFunction) => {
  const oldSession = { ...req.session };
  
  // Regenerate session ID
  req.session.regenerate((err) => {
    if (err) return next(err);
    
    // Restore session data
    Object.assign(req.session, oldSession, {
      rotatedAt: Date.now()
    });
    
    next();
  });
};

// Apply on login
app.post('/login', authenticate, rotateSession, (req, res) => {
  res.json({ success: true });
});
```

### Session Invalidation

```typescript
// Invalidate all sessions for a user
export const invalidateUserSessions = async (userId: string) => {
  const pattern = `oh-sess:*:${userId}`;
  const keys = await redisClient.keys(pattern);
  
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

// Invalidate on password change
app.post('/change-password', async (req, res) => {
  await updateUserPassword(req.body.newPassword);
  await invalidateUserSessions(req.user.id);
  res.json({ message: 'Password changed. Please log in again.' });
});
```

### Redis Configuration

```bash
# Redis connection
REDIS_URL=redis://:password@redis.example.com:6379/0
REDIS_TLS=true

# Session configuration
SESSION_SECRET=<64-character-random-string>
COOKIE_DOMAIN=.example.com
```

---

## 6. Input Validation

### Overview
Comprehensive input validation for all API endpoints using express-validator with schema-based validation.

### Implementation Details

Location: [`src/middleware/validationMiddleware.ts`](src/middleware/validationMiddleware.ts)

```typescript
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation middleware
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({
        field: e.path,
        message: e.msg,
        value: e.value
      }))
    });
  }
  next();
};

// Common validation schemas
export const schemas = {
  // Bot configuration
  botConfig: [
    body('name').trim().isLength({ min: 1, max: 100 }).escape(),
    body('provider').isIn(['discord', 'slack', 'mattermost']),
    body('token').isString().notEmpty(),
    validate
  ],
  
  // API key validation
  apiKey: [
    body('key').isString().trim().isLength({ min: 10, max: 200 }),
    body('provider').isIn(['openai', 'anthropic', 'cohere']),
    validate
  ],
  
  // User input
  message: [
    body('content').trim().isLength({ min: 1, max: 4000 }),
    body('channelId').isAlphanumeric(),
    validate
  ],
  
  // ID parameters
  idParam: [
    param('id').isAlphanumeric().isLength({ min: 1, max: 50 }),
    validate
  ],
  
  // Pagination
  pagination: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validate
  ]
};
```

### Endpoint Validation Coverage

| Endpoint | Method | Validation Schema |
|----------|--------|-------------------|
| `/api/bots` | POST | `schemas.botConfig` |
| `/api/bots/:id` | PUT | `schemas.botConfig` + `schemas.idParam` |
| `/api/bots/:id` | DELETE | `schemas.idParam` |
| `/api/keys` | POST | `schemas.apiKey` |
| `/api/message` | POST | `schemas.message` |
| `/api/config` | GET | `schemas.pagination` |

### Custom Validators

```typescript
// Custom validation for complex rules
export const customValidators = {
  isValidJson: (value: string) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      throw new Error('Invalid JSON format');
    }
  },
  
  isAllowedDomain: (email: string) => {
    const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || [];
    const domain = email.split('@')[1];
    if (!allowedDomains.includes(domain)) {
      throw new Error('Email domain not allowed');
    }
    return true;
  },
  
  isValidWebhookUrl: (url: string) => {
    const parsed = new URL(url);
    if (!['https:'].includes(parsed.protocol)) {
      throw new Error('Webhook must use HTTPS');
    }
    return true;
  }
};
```

### Error Response Format

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name must be between 1 and 100 characters",
      "value": ""
    },
    {
      "field": "provider",
      "message": "Invalid value",
      "value": "invalid-provider"
    }
  ]
}
```

---

## 7. Rate Limiting

> **Status note.** Rate limiting is active on sensitive endpoints (e.g. the auth and admin/config routers use `express-rate-limit`; see `src/server/routes/admin/audit.ts` and the auth routers). The **Redis-backed** profiles shown below are a **reference/target architecture** — the current default runtime uses in-process `express-rate-limit` and does not require Redis.

### Overview
Redis-backed rate limiting with configurable profiles for different endpoint types (target architecture).

### Implementation Details

Location: [`src/middleware/rateLimitMiddleware.ts`](src/middleware/rateLimitMiddleware.ts)

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

// Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL
});

// Rate limit profiles
export const rateLimitProfiles = {
  // Default: 100 requests per 15 minutes
  default: rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: 'rl:default:'
    }),
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] as string
  }),
  
  // Authentication: 5 attempts per 15 minutes
  auth: rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: 'rl:auth:'
    }),
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: { error: 'Too many login attempts' }
  }),
  
  // Configuration changes: 10 per hour
  config: rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: 'rl:config:'
    }),
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'Too many configuration changes' }
  }),
  
  // Admin operations: 20 per minute
  admin: rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: 'rl:admin:'
    }),
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'Too many admin requests' }
  }),
  
  // API: 1000 per minute
  api: rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: 'rl:api:'
    }),
    windowMs: 60 * 1000,
    max: 1000,
    message: { error: 'API rate limit exceeded' }
  })
};
```

### Integration Points

```typescript
// Apply rate limiting to routes
import { rateLimitProfiles } from '@src/middleware/rateLimitMiddleware';

// Authentication routes
app.post('/login', rateLimitProfiles.auth, loginHandler);
app.post('/register', rateLimitProfiles.auth, registerHandler);

// Configuration routes
app.put('/api/config', rateLimitProfiles.config, configUpdateHandler);

// Admin routes
app.use('/admin', rateLimitProfiles.admin);

// API routes
app.use('/api', rateLimitProfiles.api);

// Default for all other routes
app.use(rateLimitProfiles.default);
```

### Configuration

```bash
# Redis connection for rate limiting
REDIS_URL=redis://localhost:6379

# Rate limit overrides (optional)
RATE_LIMIT_DEFAULT_MAX=100
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_CONFIG_MAX=10
RATE_LIMIT_ADMIN_MAX=20
RATE_LIMIT_API_MAX=1000
```

### Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703145600
```

### Handling Rate Limit Exceeded

```typescript
// Custom handler for rate limit exceeded
const customHandler = (req: Request, res: Response) => {
  res.status(429).json({
    error: 'Too many requests',
    retryAfter: res.getHeader('Retry-After'),
    limit: res.getHeader('X-RateLimit-Limit')
  });
};
```

---

## 8. CSRF Protection

**Status: Implemented and active.**

A synchronizer-token CSRF defense protects state-changing requests under `/api`.

Location: [`src/server/middleware/csrf.ts`](src/server/middleware/csrf.ts). Mounted on the active server entrypoint in [`src/server/registerRoutes.ts`](src/server/registerRoutes.ts) (and also referenced in `src/server/server.ts`).

### How it works

1. The client fetches a token from `GET /api/csrf-token`. This endpoint is registered **before** the protection middleware so it is always reachable, and it sets a per-session id cookie (`_csrf_sid`, `httpOnly`, `sameSite=strict`, `secure` in production).
2. Tokens are cryptographically random (`crypto.randomBytes(32)`, base64url-encoded) and bound to the session id, with a 24-hour expiry. Expired tokens are pruned by an hourly cleanup interval.
3. For unsafe methods (`POST`/`PUT`/`DELETE`/`PATCH`), the client must send the token in the `X-CSRF-Token` header (or `_csrf` in the body). Validation uses a constant-time comparison (`crypto.timingSafeEqual`).
4. Safe methods (`GET`/`HEAD`/`OPTIONS`) pass through untouched, so read APIs are unaffected.

The WebUI client (`src/client/src/services/api/core.ts`) already fetches the token and attaches the `X-CSRF-Token` header on mutations.

### Scope and exemptions

- Applied as `app.use('/api', …)` to all `/api` routes **except**:
  - `/api/auth/*` — login/refresh must work before a token/session exists; these are protected by dedicated auth rate limiters instead.
  - `GET /api/csrf-token` — the token-issuing endpoint (a safe method, already exempt).
- External inbound webhooks are mounted at `/webhook/*` (not under `/api`) and are therefore not affected by CSRF middleware; they are protected by the webhook token and IP allow-list (§11) instead.
- In tests, CSRF can be skipped by setting `NODE_ENV=test` **and** `CSRF_SKIP_IN_TEST=true`.

> **Token store note.** The token store is an in-process `Map`. In a multi-instance deployment this should be backed by a shared store (e.g. Redis) so tokens issued by one instance validate on another. A `csrfDoubleSubmit` (stateless double-submit cookie) variant is also exported for stateless deployments.

---

## 9. Durable Audit Log

**Status: Implemented.** Audit events are persisted to the database and survive process restarts.

### Architecture

There are two audit subsystems in the codebase:

| Logger | Location | Backing store | Use |
|--------|----------|---------------|-----|
| `auditLogger` (service) | `src/server/middleware/auditLogger.ts` | **Durable** — SQLite/Postgres via `DatabaseManager` → `AuditEventRepository` | Request/security audit trail used by admin audit routes |
| `AuditLogger` (singleton) | `src/common/auditLogger.ts` | Append-only **rotating file** (`config/audit.log`, 10 MB × 5 rotations) | Config/bot/admin action logging with CSV export |

The durable service path (`src/server/middleware/auditLogger.ts`):

- Keeps a bounded in-memory cache (last 1000 entries) **and** writes each entry through to a durable store (fire-and-forget, so it never blocks the request path).
- The default store lazily resolves `DatabaseManager` and calls `insertAuditEvent` / `queryAuditEvents` / `getAuditEventStats` / `getRecentAuditEvents`. When no database is configured the calls degrade gracefully (no throw) and the in-memory cache remains the source of truth.
- On first read it can `hydrate()` the in-memory cache from persisted history so events logged before a restart remain visible.
- `queryPersisted()` and `getStatsPersisted()` read from the durable store first, falling back to the in-memory cache.

### Persistence layer

[`src/database/repositories/AuditEventRepository.ts`](src/database/repositories/AuditEventRepository.ts) provides best-effort durable storage against the `audit_events` table (schema in `src/database/schemas/LoggingSchemas.ts`, with indexes on `timestamp`, `action`, `resource`, `user_id`, and `status`). It supports filtered queries (time range, action/resource lists, status, free-text search), pagination, recent-N retrieval, and aggregate stats. All methods degrade gracefully when the database is unavailable.

### Middleware helpers

`auditMiddleware(action, resource)` wraps the response to capture status and log automatically; `auditMiddlewareWithChanges(...)` additionally records before/after values; `logAuditEvent(...)` allows manual logging from within handlers. Each entry records action, resource, resourceId, userId, IP, user-agent, status, and optional error message.

---

## 10. Durable User Persistence

**Status: Implemented.** Registered users, password changes, and `lastLogin` timestamps survive restarts (previously they lived only in in-memory maps).

Location: [`src/auth/UserRepository.ts`](src/auth/UserRepository.ts), wired into [`src/auth/AuthManager.ts`](src/auth/AuthManager.ts).

- `AuthManager` constructs a `UserRepository` and, on startup, **loads** all persisted users into its in-memory maps. On register/update/delete/change-password it **persists** the change back via `upsert()` / `delete()`.
- Storage is a synchronous `better-sqlite3` table, `auth_users`, with columns: `id`, `username` (unique), `email` (unique), `role`, `is_active`, `created_at`, `last_login`, `password_hash`, `tenant_id`. The synchronous API is used deliberately so the existing synchronous auth code paths are unchanged.
- WAL journaling and foreign-key enforcement are enabled. The database path defaults to the configured `DATABASE_PATH`; tests can inject an in-memory database.
- Only password **hashes** are stored — never plaintext passwords.

> A separate `users` table (auto-increment id, `passwordHash`, `roleId`, `tenantId`) also exists in the main migration (`src/database/migrations/000_initial_schema.ts`) for the multi-tenant/RBAC data model. The active `AuthManager` persistence path uses the `auth_users` table described above.

---

## 11. Webhook & Admin IP Allow-Lists

**Status: Implemented.** Two independent IP-restriction mechanisms exist; note the difference in matching semantics.

### Webhook inbound allow-list (exact match)

Location: [`src/webhook/security/webhookSecurity.ts`](src/webhook/security/webhookSecurity.ts) (`verifyIpWhitelist`), applied to `POST /webhook` and `POST /webhook/receive` (after `verifyWebhookToken`).

- Driven by `WEBHOOK_IP_WHITELIST` — a comma-separated list of **literal IPv4/IPv6 addresses**.
- **Exact-match only.** The request IP must appear verbatim in the list; **CIDR ranges are not supported on this path.** IPv4-mapped IPv6 addresses (`::ffff:1.2.3.4`) are normalized to their IPv4 form before comparison.
- **Fail-closed.** If `WEBHOOK_IP_WHITELIST` is empty/unset, all webhook requests are rejected with `403`. Malformed request IPs are also rejected.
- Webhook requests must additionally pass `verifyWebhookToken` (timing-safe comparison of `X-Webhook-Token` or `Authorization: Bearer`), and the `/webhook/slack` route verifies the Slack signature (`X-Slack-Signature`) with a 5-minute replay window.

### Admin trusted-IP guard (exact match **and** CIDR)

Location: [`src/server/middleware/security.ts`](src/server/middleware/security.ts) (`isTrustedAdminIP` / `adminIPGuard`).

- Driven by `ADMIN_IP_WHITELIST` (defaults to loopback: `127.0.0.1`, `::1`, `::ffff:127.0.0.1`), and gated by `ALLOW_LOCALHOST_ADMIN=true`.
- Supports **both** exact IPs and **CIDR ranges** (entries containing `/` are matched via `isIPInCIDR`).
- `FORCE_TRUSTED_LOGIN=true` bypasses the check (intended for controlled environments only).

> The distinct matching semantics are intentional: the admin guard accepts CIDR ranges, the webhook allow-list requires exact addresses. Configure `WEBHOOK_IP_WHITELIST` with explicit IPs accordingly.

---

## 12. Testing Security Measures

### Test Structure

```
tests/
├── unit/
│   └── security/
│       ├── credentialManagement.test.ts
│       ├── rateLimiting.test.ts
│       └── inputValidation.test.ts
└── integration/
    └── comprehensive-security.test.ts
```

### Running Security Tests

```bash
# Run all security tests
npm test -- tests/unit/security/ tests/integration/comprehensive-security.test.ts

# Run with coverage
npm test -- --coverage --testPathPattern="security"

# Run specific test file
npm test -- tests/unit/security/credentialManagement.test.ts
```

### Test Coverage Requirements

| Area | Minimum Coverage |
|------|------------------|
| Credential Management | 80% |
| Input Validation | 90% |
| Rate Limiting | 85% |
| CORS | 80% |
| Session Management | 85% |
| Sanitization | 90% |

### Security Test Examples

#### Credential Management Test
```typescript
describe('Credential Management', () => {
  test('should store and retrieve configurations securely', async () => {
    const configManager = new SecureConfigManager();
    
    await configManager.storeConfig({
      id: 'test-config',
      name: 'Test Configuration',
      type: 'bot',
      data: { apiKey: 'secret_api_key_123' }
    });
    
    const config = await configManager.getConfig('test-config');
    expect(config?.data.apiKey).toBe('secret_api_key_123');
  });
  
  test('should redact sensitive information', () => {
    const redacted = redactSensitiveInfo('apiKey', 'sk-1234567890');
    expect(redacted).toBe('sk-1******7890');
  });
});
```

#### Rate Limiting Test
```typescript
describe('Rate Limiting', () => {
  test('should reject requests exceeding limit', async () => {
    const app = express();
    app.use(rateLimitProfiles.auth);
    app.get('/test', (req, res) => res.json({ ok: true }));
    
    // Make 6 requests (limit is 5)
    for (let i = 0; i < 5; i++) {
      await request(app).get('/test').expect(200);
    }
    
    // 6th should fail
    await request(app).get('/test').expect(429);
  });
});
```

#### Input Validation Test
```typescript
describe('Input Validation', () => {
  test('should reject invalid input', async () => {
    const response = await request(app)
      .post('/api/bots')
      .send({ name: '', provider: 'invalid' })
      .expect(400);
    
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'name' })
    );
  });
});
```

---

## Security Checklist

### Pre-Deployment

- [ ] All hardcoded credentials removed
- [ ] Environment variables properly configured
- [ ] Secret vault integration tested
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting enabled on all endpoints
- [ ] Input validation on all API endpoints
- [ ] Session cookies configured with secure flags
- [ ] Security response headers enabled (`securityHeaders` middleware)
- [ ] CSRF protection active on `/api` (verify client sends `X-CSRF-Token`)
- [ ] `WEBHOOK_IP_WHITELIST` set (fail-closed; webhooks rejected if empty)
- [ ] `config/.key`, `config/secure/`, and the SQLite DB file have restricted filesystem permissions and are backed up
- [ ] All security tests passing
- [ ] Penetration testing completed

### Ongoing Monitoring

- [ ] Monitor rate limit violations
- [ ] Review the durable audit log (§9) for unauthorized access
- [ ] Secret rotation schedule (including `config/.key`)
- [ ] Security dependency updates
- [ ] CORS policy review on domain changes
- [ ] Track the held `[SECURITY-REVIEW]` PRs (2FA, account lockout, durable session manager) for landing

---

## Incident Response

### Credential Exposure

1. Immediately rotate exposed credentials
2. Invalidate all active sessions
3. Audit access logs for unauthorized usage
4. Update affected configurations
5. Document incident and remediation steps

### Rate Limit Breach

1. Identify source IP/user
2. Check for legitimate traffic spike
3. Temporarily increase limits if valid
4. Block IP if malicious
5. Review and adjust rate limit profiles

### Input Validation Bypass

1. Identify bypass method
2. Patch validation logic
3. Scan for similar vulnerabilities
4. Add regression test
5. Review all input endpoints

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Redis Security](https://redis.io/topics/security)
- [Helmet.js Documentation](https://helmetjs.github.io/)
