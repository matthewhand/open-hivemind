# Guard Profiles Configuration UI Enhancement

## Overview

The Guard Profiles configuration UI has been significantly enhanced with better validation, help text, testing features, and configuration templates to improve usability and security.

## New Features

### 1. Configuration Templates

Three pre-configured templates are available to quickly set up guard profiles:

- **Strict Production**: High security profile with owner-only access, rate limiting (50 req/min), and high-strictness content filtering
- **Moderate Security**: Balanced profile with rate limiting (100 req/min) and medium-strictness content filtering
- **Permissive Development**: Relaxed profile suitable for development and testing environments

Access templates via the "Templates" button on the Guard Profiles page.

### 2. Guard Testing

Test your guard configurations before saving them:

1. Click "Test Guards" in the guard configuration modal
2. Enter sample input:
   - User ID for access control testing
   - Tool Name for tool-specific access testing
   - Request Count for rate limit testing
   - Content for content filter testing
3. Click "Run Test" to see how guards would respond
4. View detailed results showing:
   - Overall result (ALLOWED/BLOCKED)
   - Individual guard results with reasons

### 3. Inline Help Text

Each guard type now includes helpful descriptions:

- **Access Control**: Explains owner-only vs custom user/tool restrictions
- **Rate Limiter**: Describes request limiting and time windows
- **Content Filter**: Explains term blocking and strictness levels

### 4. Enhanced Validation

Real-time validation with helpful error messages:

- Profile name required (max 100 characters)
- Max requests: 1-10,000
- Time window: 1 second - 1 hour (max 3600 seconds)
- Blocked terms: max 100 terms
- User IDs and tool names: alphanumeric, dashes, underscores only

Validation errors are displayed inline next to the relevant fields.

### 5. Visual Indicators

- Enabled/disabled guards shown with toggle switches and badges
- Disabled form fields have reduced opacity
- Guard cards show active guards with colored badges
- Test results use success/error styling for clarity

## API Changes

### New Endpoint: POST /api/admin/guard-profiles/test

Tests guard rules against sample input without saving.

**Request Body:**
```json
{
  "guards": {
    "mcpGuard": {
      "enabled": true,
      "type": "custom",
      "allowedUsers": ["user1"],
      "allowedTools": ["tool1"]
    },
    "rateLimit": {
      "enabled": true,
      "maxRequests": 100,
      "windowMs": 60000
    },
    "contentFilter": {
      "enabled": true,
      "strictness": "high",
      "blockedTerms": ["password", "secret"]
    }
  },
  "testInput": {
    "userId": "user1",
    "toolName": "tool1",
    "content": "Safe content",
    "requestCount": 50
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overallResult": "allowed",
    "results": [
      {
        "guard": "Access Control",
        "enabled": true,
        "result": "allowed",
        "reason": "Access granted: User and tool are allowed"
      },
      {
        "guard": "Rate Limiter",
        "enabled": true,
        "result": "allowed",
        "reason": "Within rate limit: 50/100 requests in 60s window"
      },
      {
        "guard": "Content Filter",
        "enabled": true,
        "result": "allowed",
        "reason": "Content allowed: No blocked terms found (high strictness)"
      }
    ]
  },
  "message": "Guard test completed"
}
```

## Validation Schema Updates

Enhanced validation schemas with stricter rules:

- User IDs must match: `/^[a-zA-Z0-9-_]+$/`
- Tool names must match: `/^[a-zA-Z0-9-_]+$/`
- Max requests: 1-10,000
- Window time: 1-3,600,000ms (1 second to 1 hour)
- Blocked terms: max 100 items

## Testing

### Unit Tests

- `tests/unit/validation/guardProfilesSchema.test.ts` - Validation schema tests
  - Tests for valid and invalid inputs
  - Boundary condition testing
  - Error message verification

### Integration Tests

- `tests/api/guard-profiles-test.test.ts` - API endpoint tests
  - Test endpoint functionality
  - Access control testing
  - Rate limit testing
  - Content filter testing
  - Multi-guard scenarios

### E2E Tests

- `tests/e2e/screenshot-guards-enhanced.spec.ts` - UI tests with screenshot
  - Template application
  - Form validation
  - Guard testing functionality
  - Help text display
  - Visual state verification

## Usage

### Creating a Guard Profile from Template

1. Navigate to Guard Profiles page
2. Click "Templates" button
3. Select a template (Strict, Moderate, or Permissive)
4. Adjust settings as needed
5. Click "Create Profile"

### Testing Guard Configuration

1. Create or edit a guard profile
2. Configure guards (access control, rate limit, content filter)
3. Click "Test Guards" button
4. Fill in test input fields
5. Click "Run Test"
6. Review results to verify guard behavior

### Validation Workflow

1. Form fields validate in real-time
2. Inline error messages appear for invalid input
3. Save button is disabled when required fields are empty
4. Backend validation provides additional safety

## Files Modified

- `src/validation/schemas/guardProfilesSchema.ts` - Enhanced validation
- `src/server/routes/guardProfiles.ts` - Added test endpoint
- `src/client/src/pages/GuardsPage.tsx` - UI enhancements
- `tests/unit/validation/guardProfilesSchema.test.ts` - Validation tests
- `tests/api/guard-profiles-test.test.ts` - API tests
- `tests/e2e/screenshot-guards-enhanced.spec.ts` - E2E tests

## Screenshot

See `docs/screenshots/guards-configuration.png` for a visual reference of the enhanced UI showing:
- Configuration modal with all sections expanded
- Help text for each guard type
- Form validation
- Template selection
- Test functionality
