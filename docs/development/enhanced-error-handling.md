# Enhanced Error Handling Guide

This guide covers the enhanced error handling system in Open Hivemind, which provides actionable, user-friendly error messages with recovery suggestions.

## Overview

The enhanced error handling system includes:

1. **Specific Error Types** - Categorized errors for different failure scenarios
2. **Actionable Messages** - Clear explanations of what went wrong
3. **Recovery Suggestions** - Step-by-step guidance to resolve issues
4. **Retry Capabilities** - Automatic retry with proper backoff for transient failures
5. **Documentation Links** - Direct links to relevant troubleshooting guides
6. **Support Integration** - Easy way to contact support with error details

## Architecture

### Backend Components

#### EnhancedErrorHandler (`src/common/errors/EnhancedErrorHandler.ts`)

The core error handler that converts any error into an actionable error with:
- User-friendly messages
- Specific error type classification
- Actionable suggestions
- Retry information
- Documentation links

```typescript
import { EnhancedErrorHandler } from '@/common/errors/EnhancedErrorHandler';

// Convert any error to actionable error
const actionableError = EnhancedErrorHandler.toActionableError(error, {
  operation: 'marketplace_install',
  component: 'plugin-manager',
  resourceType: 'package',
});
```

#### Error Types (`src/types/errorClasses.ts`)

Base error classes with built-in recovery strategies:
- `NetworkError` - Network connectivity issues
- `AuthenticationError` - Invalid credentials or expired tokens
- `ValidationError` - Input validation failures
- `RateLimitError` - API rate limiting
- `TimeoutError` - Operation timeouts
- `ApiError` - External service errors
- `ConfigurationError` - Configuration issues

### Frontend Components

#### EnhancedErrorAlert (`src/client/src/components/DaisyUI/EnhancedErrorAlert.tsx`)

React component for displaying actionable errors:

```tsx
import EnhancedErrorAlert from '@/components/DaisyUI/EnhancedErrorAlert';

<EnhancedErrorAlert
  title="Installation Failed"
  message="Failed to clone repository from GitHub"
  errorType="error"
  suggestions={[
    'Verify the GitHub repository URL is correct',
    'Check if you have internet connectivity',
    'Ensure the repository is public or you have access',
  ]}
  canRetry={true}
  retryAfter={5}
  docsUrl="https://docs.open-hivemind.ai/marketplace/troubleshooting"
  onRetry={() => retryInstallation()}
  onDismiss={() => setError(null)}
/>
```

#### Enhanced Error Utilities (`src/client/src/utils/enhancedErrorHandling.ts`)

Utilities for converting API errors to actionable displays:

```typescript
import { useEnhancedErrorHandling } from '@/utils/enhancedErrorHandling';

const { handleError } = useEnhancedErrorHandling();

try {
  await installPackage(repoUrl);
} catch (err) {
  const actionableError = handleError(err, 'Installation Failed');
  setError(actionableError);
}
```

## Error Types and Responses

### Marketplace Errors

#### Installation Failed
**Error Type:** `marketplace_install_failed`

**Common Causes:**
- Invalid repository URL
- Network connectivity issues
- Build failures

**Suggestions:**
- Check the repository URL is correct
- Verify internet connectivity
- Ensure package structure is valid

**Can Retry:** Yes (for network issues)

**Example Response:**
```json
{
  "error": "Installation failed",
  "message": "Failed to clone repository",
  "errorType": "marketplace_git_error",
  "suggestions": [
    "Verify the GitHub repository URL is correct and accessible",
    "Check if the repository is public or you have access",
    "Ensure your server has internet connectivity"
  ],
  "canRetry": true,
  "docsUrl": "https://docs.open-hivemind.ai/marketplace/troubleshooting"
}
```

### Tool Execution Errors

#### Tool Execution Failed
**Error Type:** `tool_execution_failed`

**Common Causes:**
- Server not connected
- Invalid parameters
- Permission denied by guard
- Timeout

**Suggestions:**
- Reconnect to the MCP server
- Verify tool parameters are correct
- Check user permissions
- Ensure server is responsive

**Can Retry:** Yes (for connection/timeout issues)

**Example Response:**
```json
{
  "error": "Tool execution failed",
  "message": "Not connected to MCP server example-server",
  "errorType": "tool_execution_failed",
  "suggestions": [
    "Reconnect to the MCP server",
    "Check if the server is still running",
    "Restart the bot or application"
  ],
  "canRetry": true,
  "toolName": "search",
  "serverName": "example-server",
  "docsUrl": "https://docs.open-hivemind.ai/tools/troubleshooting"
}
```

### Provider Connection Errors

#### Connection Failed
**Error Type:** `provider_connection_failed`

**Common Causes:**
- Invalid credentials
- Service unavailable
- Network issues
- Provider not configured

**Suggestions:**
- Verify provider credentials
- Check provider service status
- Ensure network connectivity
- Review configuration requirements

**Can Retry:** Yes (for transient failures)

**Example Response:**
```json
{
  "error": "Connection failed",
  "message": "Cannot reach provider at api.example.com",
  "errorType": "provider_connection_failed",
  "suggestions": [
    "Verify the provider credentials are correct",
    "Check the provider service status",
    "Ensure network connectivity to the provider",
    "Review provider-specific configuration requirements"
  ],
  "canRetry": true,
  "docsUrl": "https://docs.open-hivemind.ai/providers/slack"
}
```

### Authentication Errors

#### Invalid API Key
**Error Type:** `auth_invalid_key`

**Common Causes:**
- Incorrect API key
- Revoked credentials
- Wrong environment

**Suggestions:**
- Verify your API key is correct
- Check that the API key hasn't been revoked
- Ensure you're using the right key for this environment
- Generate a new API key if needed

**Can Retry:** No

**Example Response:**
```json
{
  "error": "Authentication failed",
  "message": "Invalid API key for OpenAI provider",
  "errorType": "auth_invalid_key",
  "suggestions": [
    "Verify your API key is correct",
    "Check that the API key hasn't been revoked",
    "Generate a new API key if needed"
  ],
  "canRetry": false,
  "docsUrl": "https://docs.open-hivemind.ai/authentication"
}
```

### Rate Limiting

#### Rate Limit Exceeded
**Error Type:** `rate_limit_exceeded`

**Common Causes:**
- Too many requests in short time
- Exceeded plan limits

**Suggestions:**
- Wait before retrying
- Reduce request frequency
- Consider upgrading plan
- Implement request queuing

**Can Retry:** Yes (after delay)

**Example Response:**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Retry after 60 seconds.",
  "errorType": "rate_limit_exceeded",
  "suggestions": [
    "Wait 60 seconds before trying again",
    "Reduce the frequency of requests",
    "Consider upgrading your plan for higher rate limits"
  ],
  "canRetry": true,
  "retryAfter": 60,
  "docsUrl": "https://docs.open-hivemind.ai/rate-limits"
}
```

## Implementation Examples

### Backend: API Route with Enhanced Errors

```typescript
import { EnhancedErrorHandler } from '@/common/errors/EnhancedErrorHandler';

router.post('/api/tools/execute', async (req, res) => {
  try {
    const result = await executeTool(req.body);
    res.json({ success: true, result });
  } catch (err: any) {
    const actionableError = EnhancedErrorHandler.toActionableError(err, {
      operation: 'tool_execution',
      component: req.body.toolName,
      resourceType: 'tool',
    });

    const display = EnhancedErrorHandler.formatForDisplay(actionableError);

    res.status(actionableError.statusCode || 500).json({
      error: display.title,
      message: display.message,
      errorType: actionableError.errorType,
      suggestions: actionableError.suggestions,
      canRetry: actionableError.canRetry,
      retryAfter: actionableError.retryAfter,
      docsUrl: actionableError.docsUrl,
      correlationId: actionableError.correlationId,
    });
  }
});
```

### Frontend: Using Enhanced Error Alert

```tsx
import React, { useState } from 'react';
import EnhancedErrorAlert from '@/components/DaisyUI/EnhancedErrorAlert';
import { useEnhancedErrorHandling } from '@/utils/enhancedErrorHandling';

function MarketplacePage() {
  const [error, setError] = useState<ActionableErrorDisplay | null>(null);
  const { handleError } = useEnhancedErrorHandling();

  const handleInstall = async (repoUrl: string) => {
    try {
      setError(null);
      const response = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }

      // Success handling
    } catch (err) {
      const actionableError = handleError(err, 'Installation Failed');
      setError(actionableError);
    }
  };

  return (
    <div>
      {error && (
        <EnhancedErrorAlert
          title={error.title}
          message={error.message}
          errorType={error.errorType}
          suggestions={error.suggestions}
          canRetry={error.canRetry}
          retryAfter={error.retryAfter}
          docsUrl={error.docsUrl}
          contactSupport={error.contactSupport}
          correlationId={error.correlationId}
          details={error.details}
          onRetry={() => handleInstall(repoUrl)}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Rest of component */}
    </div>
  );
}
```

## Best Practices

### 1. Always Provide Context

When converting errors, provide context about what operation failed:

```typescript
const actionableError = EnhancedErrorHandler.toActionableError(error, {
  operation: 'marketplace_install',
  component: 'plugin-manager',
  resourceType: 'package',
  resourceId: packageName,
});
```

### 2. Include Specific Suggestions

Tailor suggestions to the specific error and context:

```typescript
const suggestions = [];
if (errorMessage.includes('git')) {
  suggestions.push('Verify the GitHub repository URL');
  suggestions.push('Check repository access permissions');
}
```

### 3. Use Appropriate Retry Strategies

Only mark errors as retryable when it makes sense:

```typescript
return {
  canRetry: statusCode === 503 ||
            errorType === 'network_error' ||
            errorType === 'timeout',
  retryAfter: calculateBackoff(attempt),
};
```

### 4. Link to Documentation

Always provide documentation links for complex errors:

```typescript
return {
  docsUrl: `https://docs.open-hivemind.ai/${category}/troubleshooting`,
};
```

### 5. Log for Support

Include correlation IDs for tracking:

```typescript
const correlationId = uuidv4();
logger.error('Operation failed', { correlationId, error, context });

return {
  correlationId,
  contactSupport: true,
};
```

## Testing

### Unit Tests

```typescript
describe('EnhancedErrorHandler', () => {
  it('should convert network error to actionable error', () => {
    const error = new Error('ECONNREFUSED');
    error.code = 'ECONNREFUSED';

    const result = EnhancedErrorHandler.toActionableError(error, {
      operation: 'marketplace_install',
    });

    expect(result.errorType).toBe('network_error');
    expect(result.canRetry).toBe(true);
    expect(result.suggestions).toContain('Check your internet connection');
  });
});
```

### Integration Tests

Test the full error flow from API to UI:

```typescript
it('should display enhanced error alert for failed installation', async () => {
  const { getByText, getByRole } = render(<MarketplacePage />);

  // Trigger error
  const installButton = getByText('Install');
  fireEvent.click(installButton);

  // Wait for error alert
  await waitFor(() => {
    expect(getByText('Installation Failed')).toBeInTheDocument();
    expect(getByText('Verify the GitHub repository URL')).toBeInTheDocument();
  });

  // Test retry button
  const retryButton = getByRole('button', { name: /try again/i });
  expect(retryButton).toBeEnabled();
});
```

## Migration Guide

### Updating Existing Error Handling

**Before:**
```typescript
} catch (err) {
  return res.status(400).json({ error: err.message });
}
```

**After:**
```typescript
} catch (err) {
  const errorMessage = err.message || 'Operation failed';
  const suggestions = [/* contextual suggestions */];

  return res.status(400).json({
    error: 'Operation failed',
    message: errorMessage,
    errorType: 'marketplace_install_failed',
    suggestions,
    canRetry: true,
    docsUrl: 'https://docs.open-hivemind.ai/troubleshooting',
  });
}
```

## Future Enhancements

- [ ] Add i18n support for multi-language error messages
- [ ] Implement error analytics and tracking
- [ ] Add automatic error reporting to monitoring services
- [ ] Create error recovery workflows
- [ ] Build error pattern detection and prevention
