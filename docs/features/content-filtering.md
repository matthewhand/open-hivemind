# Content Filtering

Content filtering provides automated protection against unwanted or prohibited content in bot conversations. The filter can be configured per bot through guardrail profiles.

## Overview

The content filter checks both incoming user messages and outgoing bot responses against a list of blocked terms. It supports three strictness levels and can be enabled or disabled per bot.

## Configuration

Content filtering is configured through guardrail profiles. Each profile can specify:

- **enabled**: Whether content filtering is active
- **strictness**: The matching strategy (low, medium, or high)
- **blockedTerms**: Array of terms/phrases to block

### Example Guardrail Profile

```json
{
  "id": "strict",
  "name": "Strict Protection",
  "description": "Strict rate limiting and content filtering",
  "guards": {
    "mcpGuard": {
      "enabled": true,
      "type": "owner"
    },
    "rateLimit": {
      "enabled": true,
      "maxRequests": 10,
      "windowMs": 60000
    },
    "contentFilter": {
      "enabled": true,
      "strictness": "high",
      "blockedTerms": ["spam", "scam", "phishing", "offensive-term"]
    }
  }
}
```

## Strictness Levels

### Low (Default)

**Whole word matching** - Most permissive, blocks only exact word matches.

- Matches complete words only
- Case-insensitive
- Respects word boundaries (punctuation, spaces)

**Example:**
- Blocked term: "spam"
- Blocked: "This is spam" ✓
- Allowed: "This is spammy" ✓

### Medium

**Substring matching** - Moderate protection, blocks partial matches.

- Matches any occurrence of the term
- Case-insensitive
- No word boundary requirements

**Example:**
- Blocked term: "spam"
- Blocked: "This is spam" ✓
- Blocked: "This is spammy" ✓

### High

**Pattern matching with obfuscation detection** - Most aggressive, attempts to detect common evasion tactics.

- Matches substrings
- Detects leetspeak (sp4m → spam)
- Detects symbol substitutions ($pam → spam)
- Detects spacing obfuscation (s p a m → spam)
- Case-insensitive

**Example:**
- Blocked term: "spam"
- Blocked: "This is spam" ✓
- Blocked: "This is sp4m" ✓
- Blocked: "This is $pam" ✓
- Blocked: "This is s p a m" ✓

## Behavior

### Incoming Messages

When a user message contains blocked content:

1. The message is rejected before LLM processing
2. An audit log entry is created
3. Optionally, a notification is sent to the user
4. The bot does not respond to the message

### Outgoing Responses

When a bot response contains blocked content:

1. The response is blocked before sending
2. An audit log entry is created
3. No message is sent to the channel
4. The conversation state is preserved

### System Messages

System messages (role: "system") always bypass content filtering. This ensures that administrative and automated messages are not blocked.

## User Notifications

By default, users are notified when their message is blocked. This behavior can be controlled with the `MESSAGE_CONTENT_FILTER_NOTIFY` configuration option:

```javascript
// Enable notifications (default)
MESSAGE_CONTENT_FILTER_NOTIFY: true

// Disable notifications (silent blocking)
MESSAGE_CONTENT_FILTER_NOTIFY: false
```

When enabled, users receive the message:
```
Your message contains content that is not allowed.
```

## Audit Logging

All content filter blocks are logged for audit purposes with the following information:

- User ID
- Channel ID
- Bot ID
- Matched terms
- Strictness level
- Block type (incoming message or bot response)

## API Integration

The content filter is automatically applied when a bot has a guardrail profile with content filtering enabled. No additional code is required.

### Programmatic Usage

For custom implementations, the ContentFilterService can be used directly:

```typescript
import { ContentFilterService } from '@src/services/ContentFilterService';

const contentFilter = ContentFilterService.getInstance();

// Check content
const result = contentFilter.checkContent(
  'This is spam content',
  {
    enabled: true,
    strictness: 'medium',
    blockedTerms: ['spam', 'scam']
  },
  'user' // role: 'user' | 'assistant' | 'system'
);

if (!result.allowed) {
  console.log('Blocked:', result.reason);
  console.log('Matched terms:', result.matchedTerms);
}

// Filter content for display (redact blocked terms)
const filtered = contentFilter.filterContentForDisplay(
  'This is spam content',
  {
    enabled: true,
    strictness: 'low',
    blockedTerms: ['spam']
  }
);
// Output: "This is [FILTERED] content"
```

## Best Practices

1. **Start with low strictness** and adjust based on your needs
2. **Use specific terms** rather than generic words to avoid false positives
3. **Test your blocked terms** before deploying to production
4. **Monitor audit logs** to understand what content is being blocked
5. **Consider user experience** when deciding on notification settings
6. **Combine with rate limiting** for comprehensive protection

## Common Use Cases

### Safe-for-Work Environment
```json
{
  "enabled": true,
  "strictness": "high",
  "blockedTerms": ["nsfw-term-1", "nsfw-term-2", ...]
}
```

### Anti-Spam Protection
```json
{
  "enabled": true,
  "strictness": "medium",
  "blockedTerms": ["spam", "buy now", "click here", "limited time"]
}
```

### Brand Protection
```json
{
  "enabled": true,
  "strictness": "low",
  "blockedTerms": ["competitor-brand-1", "competitor-brand-2"]
}
```

### Compliance Requirements
```json
{
  "enabled": true,
  "strictness": "high",
  "blockedTerms": ["confidential-term-1", "restricted-term-2"]
}
```

## Limitations

- The filter operates on text content only (does not analyze images or attachments)
- High strictness may produce false positives due to aggressive deobfuscation
- Determined users may find ways to circumvent the filter
- Performance impact is minimal but increases with more blocked terms

## Performance

The content filter is highly optimized:

- O(n) complexity where n is the number of blocked terms
- Case-insensitive matching uses efficient string operations
- Minimal memory overhead
- No external dependencies

## Related Features

- **Rate Limiting**: Control message frequency (see [Rate Limiting](./rate-limiting.md))
- **MCP Guard**: Control tool access (see [MCP Guard](./mcp-guard.md))
- **Guardrail Profiles**: Bundle multiple guards together (see [Guardrail Profiles](./guardrail-profiles.md))
