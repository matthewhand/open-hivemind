/**
 * API Key Validation Utilities (server-side)
 *
 * Re-exports the client-side validation utilities for use by server-side
 * provider-config schemas that import from '../../utils/apiKeyValidation'.
 */

export interface ApiKeyValidationResult {
  isValid: boolean;
  message?: string;
  hint?: string;
}

/**
 * Provider-specific API key patterns and validation rules
 */
const API_KEY_PATTERNS: Record<
  string,
  {
    pattern: RegExp;
    hint: string;
    description: string;
  }
> = {
  openai: {
    pattern: /^sk-[A-Za-z0-9]{48}$/,
    hint: 'OpenAI API keys start with "sk-" followed by 48 alphanumeric characters',
    description: 'Example: sk-abc123...(48 characters total)',
  },
  anthropic: {
    pattern: /^sk-ant-[A-Za-z0-9\-_]{40,}$/,
    hint: 'Anthropic API keys start with "sk-ant-" followed by 40+ alphanumeric characters, hyphens, or underscores',
    description: 'Example: sk-ant-api03-abc123...',
  },
  discord: {
    pattern: /^[A-Za-z0-9_\-]{59,}$/,
    hint: 'Discord bot tokens are typically 59+ characters containing letters, numbers, underscores, and hyphens',
    description: 'Example: MTk4NzA1MDMyMzU5...(long token)',
  },
  telegram: {
    pattern: /^\d{8,10}:[A-Za-z0-9_\-]{35}$/,
    hint: 'Telegram bot tokens follow the format: bot_id:auth_token (e.g., 1234567890:ABC...)',
    description: 'Example: 1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789',
  },
  slack: {
    pattern: /^xoxb-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24}$/,
    hint: 'Slack bot tokens start with "xoxb-" followed by numbers and a 24-character hash',
    description: 'Example: xoxb-1234567890-1234567890-abc123...',
  },
  openwebui: {
    pattern: /^sk-[A-Za-z0-9]{32,}$/,
    hint: 'OpenWebUI API keys typically start with "sk-" followed by 32+ alphanumeric characters',
    description: 'Example: sk-abc123...(32+ characters)',
  },
};

export function validateApiKey(
  provider: string,
  key: string,
  strict: boolean = false
): ApiKeyValidationResult {
  if (!key || typeof key !== 'string') {
    return { isValid: false, message: 'API key is required' };
  }

  const trimmedKey = key.trim();

  if (trimmedKey.length === 0) {
    return { isValid: false, message: 'API key cannot be empty' };
  }

  if (trimmedKey.length < 10) {
    return { isValid: false, message: 'API key is too short to be valid' };
  }

  const providerPattern = API_KEY_PATTERNS[provider.toLowerCase()];

  if (!providerPattern) {
    if (trimmedKey.length >= 20) {
      return { isValid: true, hint: 'No specific format validation available for this provider' };
    }
    return {
      isValid: !strict,
      message: strict ? 'API key format could not be verified for this provider' : undefined,
      hint: 'No specific format validation available for this provider',
    };
  }

  const patternMatch = providerPattern.pattern.test(trimmedKey);

  if (patternMatch) {
    return { isValid: true };
  }

  if (strict) {
    return {
      isValid: false,
      message: `API key format is invalid for ${provider}`,
      hint: providerPattern.hint,
    };
  }

  return {
    isValid: true,
    message: `Warning: API key format does not match expected ${provider} format`,
    hint: providerPattern.hint,
  };
}

export function getApiKeyFormatHint(provider: string): string | undefined {
  const providerPattern = API_KEY_PATTERNS[provider.toLowerCase()];
  return providerPattern?.hint;
}
