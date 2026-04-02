# Real-Time Validation

## Overview

Real-time validation provides instant feedback as users configure bots and other system components. This feature helps catch configuration errors early, reducing frustration and support requests.

## Features

- **Debounced Validation**: Waits 500ms after user stops typing to avoid excessive API calls
- **Visual Feedback**: Color-coded inputs (red for errors, yellow for warnings, green for valid)
- **Helpful Messages**: Clear error messages with actionable suggestions
- **Loading States**: Shows spinner while validation is in progress
- **Field-Level Validation**: Validates individual fields as they change
- **DaisyUI Integration**: Uses DaisyUI components for consistent styling

## Architecture

### Frontend Components

#### `useRealTimeValidation` Hook

Location: `src/client/src/hooks/useRealTimeValidation.ts`

React hook that manages validation state and API calls:

```typescript
const validation = useRealTimeValidation(formData, {
  debounceMs: 500,        // Debounce delay
  profileId: 'standard',  // Validation profile
  enabled: true,          // Enable/disable validation
});

// Returns:
// {
//   isValid: boolean,
//   errors: ValidationError[],
//   warnings: ValidationWarning[],
//   isValidating: boolean
// }
```

**Key Features:**
- Automatic debouncing to prevent API spam
- Cancels stale requests when data changes
- Handles errors gracefully (doesn't flash error states on network issues)
- Uses AbortController for proper cleanup

#### `ValidationFeedback` Component

Location: `src/client/src/components/ValidationFeedback.tsx`

Displays validation feedback with icons and suggestions:

```tsx
<ValidationFeedback
  errors={validation.errors}
  warnings={validation.warnings}
  isValidating={validation.isValidating}
  isValid={validation.isValid}
  fieldName="name"        // Optional: filter to specific field
  variant="inline"        // 'inline' or 'block'
  compact={true}          // Smaller text for compact layouts
/>
```

**Helper Function:**
```typescript
getValidationInputClass(isValidating, isValid, hasErrors, hasWarnings)
// Returns DaisyUI classes: 'input-error', 'input-warning', 'input-success', etc.
```

### Backend Services

#### Real-Time Validation Service

Location: `src/server/services/RealTimeValidationService.ts`

Provides configurable validation rules and profiles.

**Default Validation Rules:**
- `required-name`: Bot name is required
- `required-message-provider`: Message provider is required
- `required-llm-provider`: LLM provider is required
- `format-bot-name`: Name must match `^[a-zA-Z0-9_-]{1,100}$`
- `discord-token`: Discord token format validation
- `openai-api-key`: OpenAI API key format validation
- `business-unique-name`: Bot name must be unique
- `security-no-hardcoded-secrets`: Warns about hardcoded secrets
- `performance-model-selection`: Info about model performance implications

**Validation Profiles:**
- `standard`: Most rules enabled (default)
- `strict`: All rules enabled, maximum security
- `quick`: Only required fields

#### API Endpoints

Location: `src/admin/adminRoutes.ts`

**POST /api/admin/validate/bot-config**
```json
{
  "configData": { "name": "my-bot", "messageProvider": "discord" },
  "profileId": "standard"
}
```

Response:
```json
{
  "success": true,
  "result": {
    "isValid": false,
    "errors": [
      {
        "id": "req-llm-1",
        "ruleId": "required-llm-provider",
        "message": "LLM provider is required",
        "field": "llmProvider",
        "value": "",
        "suggestions": ["Select an LLM provider: openai, flowise, or openwebui"],
        "category": "required"
      }
    ],
    "warnings": [],
    "score": 50
  }
}
```

**POST /api/admin/validate/persona**
```json
{
  "personaData": { "name": "", "systemPrompt": "" },
  "profileId": "standard"
}
```

## Usage Examples

### Basic Form Validation

```tsx
import { useRealTimeValidation } from '../hooks/useRealTimeValidation';
import ValidationFeedback, { getValidationInputClass } from '../components/ValidationFeedback';

function BotForm() {
  const [formData, setFormData] = useState({ name: '', messageProvider: '' });

  // Enable validation
  const validation = useRealTimeValidation(formData);

  return (
    <div className="form-control">
      <label className="label">Bot Name</label>
      <input
        type="text"
        className={`input ${getValidationInputClass(
          validation.isValidating,
          validation.isValid,
          validation.errors.filter(e => e.field === 'name').length > 0,
          validation.warnings.filter(w => w.field === 'name').length > 0
        )}`}
        value={formData.name}
        onChange={e => setFormData({ ...formData, name: e.target.value })}
      />
      <ValidationFeedback
        {...validation}
        fieldName="name"
        variant="inline"
        compact
      />
    </div>
  );
}
```

### Conditional Validation

```tsx
// Only validate on specific step
const validation = useRealTimeValidation(formData, {
  enabled: currentStep === 1,
  profileId: 'strict',
  debounceMs: 300, // Faster feedback
});
```

### Custom Validation

You can add custom validation rules to the RealTimeValidationService:

```typescript
const validationService = RealTimeValidationService.getInstance();

validationService.addRule({
  id: 'custom-rule',
  name: 'Custom Validation',
  description: 'My custom validation logic',
  category: 'business',
  severity: 'error',
  validator: (config) => {
    const errors = [];

    if (config.customField === 'invalid') {
      errors.push({
        id: 'custom-1',
        ruleId: 'custom-rule',
        message: 'Custom field is invalid',
        field: 'customField',
        value: config.customField,
        suggestions: ['Try a different value'],
        category: 'business',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      info: [],
      score: errors.length === 0 ? 100 : 0,
    };
  },
});
```

## Testing

### Unit Tests

Location: `tests/unit/hooks/useRealTimeValidation.test.ts`

Tests cover:
- Initial state
- Debouncing behavior
- Validation state transitions
- Error and warning handling
- Request cancellation
- Network error handling
- Enabled/disabled state
- Custom profile IDs

Run tests:
```bash
npm test -- tests/unit/hooks/useRealTimeValidation.test.ts
```

### E2E Tests

Location: `tests/e2e/screenshot-realtime-validation.spec.ts`

Tests capture screenshots showing:
- Validation error states (red borders, error messages)
- Validation warning states (yellow borders, warning messages)
- Valid states (green borders, checkmarks)
- Loading states (spinner)

Run tests:
```bash
npm run test:e2e -- tests/e2e/screenshot-realtime-validation.spec.ts
```

## Screenshots

Screenshots are saved to:
- `docs/screenshots/realtime-validation.png` - Comprehensive view
- `docs/screenshots/realtime-validation-error.png` - Error state
- `docs/screenshots/realtime-validation-warning.png` - Warning state
- `docs/screenshots/realtime-validation-valid.png` - Valid state

## Performance Considerations

### Debouncing

The default 500ms debounce ensures that validation doesn't fire on every keystroke:
- User types "my-bot" → only 1 API call after 500ms
- Without debouncing → 6 API calls (one per character)

### Request Cancellation

When data changes before validation completes, the previous request is cancelled using AbortController:
- Prevents stale responses from updating the UI
- Reduces server load
- Improves perceived performance

### Caching

The validation service could be enhanced with caching:
```typescript
// Future enhancement
const cachedResult = validationCache.get(hash(configData));
if (cachedResult && !isStale(cachedResult)) {
  return cachedResult;
}
```

## Best Practices

1. **Use Field-Level Validation**: Filter errors/warnings by field name for cleaner UI
   ```tsx
   fieldName="name"
   ```

2. **Enable Conditionally**: Only validate when needed to reduce API calls
   ```tsx
   enabled={isFormDirty && step === 1}
   ```

3. **Show Helpful Suggestions**: Include actionable suggestions in validation rules
   ```typescript
   suggestions: ['Use only alphanumeric characters', 'Must be 1-100 characters']
   ```

4. **Handle Loading States**: Show spinner during validation
   ```tsx
   {validation.isValidating && <Loader className="animate-spin" />}
   ```

5. **Color-Code Inputs**: Use DaisyUI classes for visual feedback
   ```tsx
   className={getValidationInputClass(...)}
   ```

6. **Don't Block on Warnings**: Allow submission with warnings, block on errors
   ```tsx
   disabled={validation.errors.length > 0}
   ```

## Troubleshooting

### Validation Not Triggering

- Check `enabled` prop is `true`
- Verify data is not `null` or `undefined`
- Check console for network errors

### Too Many API Calls

- Increase `debounceMs` (default is 500ms)
- Check for unnecessary re-renders causing data changes

### Stale Validation Results

- Hook automatically cancels old requests
- If seeing stale data, check for data serialization issues

### Validation Errors Not Displaying

- Verify `ValidationFeedback` component is rendered
- Check `fieldName` prop matches error field
- Inspect `validation.errors` in React DevTools

## Future Enhancements

1. **Client-Side Validation**: Add basic regex checks before API call
2. **Validation Caching**: Cache results for identical config data
3. **Async Rule Support**: Support async validators (e.g., check database)
4. **Rule Presets**: Quick templates for common validation scenarios
5. **Validation History**: Track validation changes over time
6. **Custom Rule UI**: Admin UI to add/edit validation rules
7. **Internationalization**: Translate error messages

## Related Files

- `src/client/src/hooks/useRealTimeValidation.ts` - Main hook
- `src/client/src/components/ValidationFeedback.tsx` - Feedback component
- `src/server/services/RealTimeValidationService.ts` - Backend service
- `src/admin/adminRoutes.ts` - API endpoints
- `tests/unit/hooks/useRealTimeValidation.test.ts` - Unit tests
- `tests/e2e/screenshot-realtime-validation.spec.ts` - E2E tests
