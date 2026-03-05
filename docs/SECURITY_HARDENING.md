# Security Hardening Implementation Guide

This document provides a comprehensive overview of the security measures implemented in Open-Hivemind, along with implementation details, configuration options, and best practices.

## Table of Contents

1. [Credential Management](#1-credential-management)
2. [Secret Vault Integration](#2-secret-vault-integration)
3. [WebUI Sanitization](#3-webui-sanitization)
4. [CORS Configuration](#4-cors-configuration)
5. [Session Management](#5-session-management)
6. [Input Validation](#6-input-validation)
7. [Rate Limiting](#7-rate-limiting)
8. [Testing Security Measures](#8-testing-security-measures)

---

## 1. Credential Management

### Overview
Hardcoded credentials have been removed from the codebase. The [`debugEnvVars.ts`](src/config/debugEnvVars.ts) file has been sanitized to prevent accidental exposure of sensitive information.

### Implementation Details

#### Removed Hardcoded Credentials
- All API keys, passwords, and tokens have been removed from source code
- Environment variables are now the only source for sensitive configuration
- Debug utilities use placeholder values that are clearly marked

#### Secure Configuration Manager
Location: [`src/config/SecureConfigManager.ts`](src/config/SecureConfigManager.ts)

Features:
- AES-256-GCM encryption for stored configurations
- Integrity verification with HMAC-SHA256
- Secure key derivation using PBKDF2
- Configuration isolation by type (bot, user, system)

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

```bash
# Required environment variables
ENCRYPTION_KEY=<32-byte hex string>  # For SecureConfigManager
MASTER_KEY=<derived-key-password>     # For key derivation
```

### Best Practices
1. Never commit `.env` files to version control
2. Rotate encryption keys periodically
3. Use different keys for development and production
4. Monitor access to secure configurations

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

### Overview
Secure session management with proper storage, cookie configuration, and rotation mechanisms.

### Implementation Details

Location: [`src/middleware/sessionMiddleware.ts`](src/middleware/sessionMiddleware.ts)

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

### Overview
Redis-backed rate limiting with configurable profiles for different endpoint types.

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

## 8. Testing Security Measures

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
- [ ] Security headers (Helmet) enabled
- [ ] All security tests passing
- [ ] Penetration testing completed

### Ongoing Monitoring

- [ ] Monitor rate limit violations
- [ ] Audit log review for unauthorized access
- [ ] Secret rotation schedule
- [ ] Security dependency updates
- [ ] CORS policy review on domain changes

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
