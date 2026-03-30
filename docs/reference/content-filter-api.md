# Content Filter API Reference

## ContentFilterService

The `ContentFilterService` is a singleton service that provides content filtering capabilities for Open Hivemind.

### Import

```typescript
import { ContentFilterService, ContentFilterResult } from '@src/services/ContentFilterService';
```

### Getting the Instance

```typescript
const contentFilter = ContentFilterService.getInstance();
```

## Methods

### `checkContent()`

Check if content passes the content filter.

**Signature:**
```typescript
checkContent(
  content: string,
  config: ContentFilterConfig,
  role?: string
): ContentFilterResult
```

**Parameters:**
- `content` (string) - The message content to check
- `config` (ContentFilterConfig) - The content filter configuration
- `role` (string, optional) - The message role ('user' | 'assistant' | 'system')

**Returns:** `ContentFilterResult`
```typescript
interface ContentFilterResult {
  allowed: boolean;       // Whether the content passed the filter
  reason?: string;        // Reason for blocking, if blocked
  matchedTerms?: string[]; // Matched blocked terms, if any
}
```

**Example:**
```typescript
const result = contentFilter.checkContent(
  'This is spam content',
  {
    enabled: true,
    strictness: 'medium',
    blockedTerms: ['spam', 'scam']
  },
  'user'
);

if (!result.allowed) {
  console.log('Content blocked:', result.reason);
  console.log('Matched terms:', result.matchedTerms);
}
```

**Behavior:**
- System messages (role: 'system') always bypass filtering
- Returns `{ allowed: true }` if filter is disabled
- Returns `{ allowed: true }` if no blocked terms are defined
- Returns `{ allowed: false }` with details if content is blocked

### `filterContentForDisplay()`

Filter content for display by redacting blocked terms.

**Signature:**
```typescript
filterContentForDisplay(
  content: string,
  config: ContentFilterConfig
): string
```

**Parameters:**
- `content` (string) - The content to filter
- `config` (ContentFilterConfig) - The content filter configuration

**Returns:** `string` - Content with blocked terms replaced by `[FILTERED]`

**Example:**
```typescript
const filtered = contentFilter.filterContentForDisplay(
  'This is spam content',
  {
    enabled: true,
    strictness: 'low',
    blockedTerms: ['spam']
  }
);
// Result: "This is [FILTERED] content"
```

**Behavior:**
- Returns original content if filter is disabled
- Replaces matched terms with `[FILTERED]`
- Respects strictness level for matching
- Case-insensitive matching

## Types

### ContentFilterConfig

Configuration interface for content filtering.

```typescript
interface ContentFilterConfig {
  /** Whether content filter is enabled */
  enabled: boolean;

  /** Strictness level */
  strictness?: 'low' | 'medium' | 'high';

  /** List of specific blocked terms/phrases */
  blockedTerms?: string[];
}
```

**Fields:**
- `enabled` (boolean, required) - Whether the filter is active
- `strictness` (string, optional) - Matching strategy (default: 'low')
  - `'low'` - Whole word matching only
  - `'medium'` - Substring matching
  - `'high'` - Pattern matching with obfuscation detection
- `blockedTerms` (string[], optional) - Array of terms to block

### ContentFilterResult

Result of a content filtering check.

```typescript
interface ContentFilterResult {
  /** Whether the content passed the filter */
  allowed: boolean;

  /** Reason for blocking, if blocked */
  reason?: string;

  /** Matched blocked terms, if any */
  matchedTerms?: string[];
}
```

**Fields:**
- `allowed` (boolean) - True if content is allowed, false if blocked
- `reason` (string, optional) - Human-readable reason for blocking
- `matchedTerms` (string[], optional) - List of matched blocked terms

## Strictness Levels

### Low Strictness (default)

Whole word matching with word boundaries.

**Matching behavior:**
- Exact word matches only
- Case-insensitive
- Respects punctuation boundaries

**Example:**
```typescript
// Blocked term: "spam"
"This is spam"      // ✅ BLOCKED
"This is spammy"    // ❌ ALLOWED (substring)
"This is SPAM"      // ✅ BLOCKED (case-insensitive)
"No spam!"          // ✅ BLOCKED (punctuation boundary)
```

### Medium Strictness

Substring matching without word boundaries.

**Matching behavior:**
- Matches any occurrence
- Case-insensitive
- No word boundary requirements

**Example:**
```typescript
// Blocked term: "spam"
"This is spam"      // ✅ BLOCKED
"This is spammy"    // ✅ BLOCKED (substring)
"This is SPAM"      // ✅ BLOCKED (case-insensitive)
"suspicious"        // ✅ BLOCKED (contains "spam")
```

### High Strictness

Pattern matching with obfuscation detection.

**Matching behavior:**
- Substring matching
- Leetspeak detection (4→a, 3→e, 0→o, 1→i, 5→s, 7→t, 8→b)
- Symbol substitution ($→s, @→a, !→i)
- Spacing removal
- Case-insensitive

**Example:**
```typescript
// Blocked term: "spam"
"This is spam"      // ✅ BLOCKED
"This is sp4m"      // ✅ BLOCKED (leetspeak)
"This is $pam"      // ✅ BLOCKED (symbol substitution)
"This is s p a m"   // ✅ BLOCKED (spacing)
"This is SP@M"      // ✅ BLOCKED (multiple)
```

## Integration Examples

### Message Processing

```typescript
import { ContentFilterService } from '@src/services/ContentFilterService';
import type { IMessage } from '@src/message/interfaces/IMessage';

async function processMessage(message: IMessage, botConfig: any) {
  const contentFilter = ContentFilterService.getInstance();

  // Check incoming message
  if (botConfig.contentFilter) {
    const result = contentFilter.checkContent(
      message.getText(),
      botConfig.contentFilter,
      message.role
    );

    if (!result.allowed) {
      console.log('Message blocked:', result.reason);
      return null;
    }
  }

  // Process message...
}
```

### Custom Middleware

```typescript
import { ContentFilterService } from '@src/services/ContentFilterService';

function contentFilterMiddleware(config: ContentFilterConfig) {
  const service = ContentFilterService.getInstance();

  return async (req: any, res: any, next: any) => {
    const content = req.body.message;
    const result = service.checkContent(content, config);

    if (!result.allowed) {
      return res.status(403).json({
        error: 'Content not allowed',
        reason: result.reason,
        matchedTerms: result.matchedTerms
      });
    }

    next();
  };
}
```

### Admin Dashboard

```typescript
import { ContentFilterService } from '@src/services/ContentFilterService';

// Preview what would be blocked
function previewFilter(sampleText: string, config: ContentFilterConfig) {
  const service = ContentFilterService.getInstance();

  const result = service.checkContent(sampleText, config);
  const filtered = service.filterContentForDisplay(sampleText, config);

  return {
    original: sampleText,
    blocked: !result.allowed,
    reason: result.reason,
    matchedTerms: result.matchedTerms,
    filtered: filtered
  };
}
```

### Batch Processing

```typescript
import { ContentFilterService } from '@src/services/ContentFilterService';

// Check multiple messages
function batchCheck(messages: string[], config: ContentFilterConfig) {
  const service = ContentFilterService.getInstance();

  return messages.map(msg => ({
    message: msg,
    result: service.checkContent(msg, config, 'user')
  }));
}
```

## Error Handling

The ContentFilterService methods do not throw errors. Instead:

- Invalid or empty terms in `blockedTerms` are silently skipped
- Empty content is allowed (returns `{ allowed: true }`)
- Missing or invalid config fields use safe defaults
- Service always returns a valid result object

**Example:**
```typescript
// Safe to call with any input
const result = contentFilter.checkContent(
  '',  // Empty content - allowed
  {
    enabled: true,
    blockedTerms: ['spam', null, undefined, '']  // Invalid terms skipped
  }
);
// Result: { allowed: true }
```

## Performance Considerations

### Time Complexity
- O(n) where n = number of blocked terms
- Each term requires one string operation per strictness level
- High strictness adds deobfuscation pass (O(m) where m = content length)

### Memory Usage
- Minimal memory overhead
- No caching or persistent state
- Terms are processed on-demand

### Optimization Tips
1. Use lower strictness when possible
2. Keep blocked terms list concise
3. Use specific phrases over single characters
4. Avoid extremely long blocked terms
5. Consider caching config objects

### Benchmarks

Approximate processing times (1000 chars, 100 terms):
- Low strictness: ~0.5ms
- Medium strictness: ~0.8ms
- High strictness: ~1.5ms

## Testing

### Unit Tests

```typescript
import { ContentFilterService } from '@src/services/ContentFilterService';
import { describe, it, expect } from 'vitest';

describe('ContentFilterService', () => {
  it('should block prohibited content', () => {
    const service = ContentFilterService.getInstance();

    const result = service.checkContent(
      'This is spam',
      {
        enabled: true,
        strictness: 'low',
        blockedTerms: ['spam']
      }
    );

    expect(result.allowed).toBe(false);
    expect(result.matchedTerms).toContain('spam');
  });
});
```

### Integration Tests

See `tests/message/handlers/contentFilter.integration.test.ts` for comprehensive integration tests.

## Related Documentation

- [Content Filtering Guide](../features/content-filtering.md)
- [Setup Examples](../../examples/content-filter-setup.md)
- [Guardrail Profiles](../features/guardrail-profiles.md)

## Migration Notes

No migration needed. The service:
- Uses existing `ContentFilterConfig` type
- Integrates with existing guardrail profiles
- No breaking changes to existing APIs
- Backward compatible with all versions

## Support

For issues or questions:
1. Review unit tests: `tests/services/ContentFilterService.test.ts`
2. Review integration tests: `tests/message/handlers/contentFilter.integration.test.ts`
3. Check implementation: `src/services/ContentFilterService.ts`
4. Consult feature docs: `docs/features/content-filtering.md`
