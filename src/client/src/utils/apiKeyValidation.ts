/**
 * API Key Validation Utilities
 *
 * Provides provider-specific validation for API keys and tokens.
 * Each provider has different key/token formats that can be validated.
 */

export interface ApiKeyValidationResult {
  isValid: boolean;
  message?: string;
  hint?: string;
}

/**
 * Provider-specific API key patterns and validation rules
 */
const API_KEY_PATTERNS: Record<string, {
  pattern: RegExp;
  hint: string;
  description: string;
}> = {
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

/**
 * Validates an API key for a specific provider type
 *
 * @param provider - The provider type (e.g., 'openai', 'anthropic', 'discord')
 * @param key - The API key or token to validate
 * @param strict - If true, enforces strict validation. If false, provides warnings only
 * @returns Validation result with status and optional messages
 */
export function validateApiKey(
  provider: string,
  key: string,
  strict: boolean = false
): ApiKeyValidationResult {
  // Basic validation - check if key exists
  if (!key || typeof key !== 'string') {
    return {
      isValid: false,
      message: 'API key is required',
    };
  }

  // Trim whitespace
  const trimmedKey = key.trim();

  // Check for empty or whitespace-only keys
  if (trimmedKey.length === 0) {
    return {
      isValid: false,
      message: 'API key cannot be empty',
    };
  }

  // Check for obviously invalid keys
  if (trimmedKey.length < 10) {
    return {
      isValid: false,
      message: 'API key is too short to be valid',
    };
  }

  // Get provider-specific pattern
  const providerPattern = API_KEY_PATTERNS[provider.toLowerCase()];

  // If no specific pattern is defined, do basic validation only
  if (!providerPattern) {
    // For unknown providers, just check basic properties
    if (trimmedKey.length >= 20) {
      return {
        isValid: true,
        hint: 'No specific format validation available for this provider',
      };
    }
    return {
      isValid: !strict,
      message: strict ? 'API key format could not be verified for this provider' : undefined,
      hint: 'No specific format validation available for this provider',
    };
  }

  // Test against provider-specific pattern
  const patternMatch = providerPattern.pattern.test(trimmedKey);

  if (patternMatch) {
    return {
      isValid: true,
    };
  }

  // Pattern didn't match
  if (strict) {
    return {
      isValid: false,
      message: `API key format is invalid for ${provider}`,
      hint: providerPattern.hint,
    };
  }

  // In non-strict mode, allow the key but provide a warning
  return {
    isValid: true,
    message: `Warning: API key format does not match expected ${provider} format`,
    hint: providerPattern.hint,
  };
}

/**
 * Gets the format hint for a specific provider
 *
 * @param provider - The provider type
 * @returns Format hint string or undefined if no pattern exists
 */
export function getApiKeyFormatHint(provider: string): string | undefined {
  const providerPattern = API_KEY_PATTERNS[provider.toLowerCase()];
  return providerPattern?.hint;
}

/**
 * Gets the format description for a specific provider
 *
 * @param provider - The provider type
 * @returns Format description string or undefined if no pattern exists
 */
export function getApiKeyFormatDescription(provider: string): string | undefined {
  const providerPattern = API_KEY_PATTERNS[provider.toLowerCase()];
  return providerPattern?.description;
}

/**
 * Checks if a provider has specific validation rules
 *
 * @param provider - The provider type
 * @returns True if the provider has specific validation rules
 */
export function hasApiKeyValidation(provider: string): boolean {
  return provider.toLowerCase() in API_KEY_PATTERNS;
}

/**
 * Validates multiple API keys for different providers
 *
 * @param keys - Object mapping provider names to API keys
 * @param strict - If true, enforces strict validation
 * @returns Object mapping provider names to validation results
 */
export function validateMultipleApiKeys(
  keys: Record<string, string>,
  strict: boolean = false
): Record<string, ApiKeyValidationResult> {
  const results: Record<string, ApiKeyValidationResult> = {};

  for (const [provider, key] of Object.entries(keys)) {
    results[provider] = validateApiKey(provider, key, strict);
  }

  return results;
}
