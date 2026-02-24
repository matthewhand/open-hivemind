/**
 * Lightweight error classes for shared-types package.
 *
 * @module @hivemind/shared-types/errors
 *
 * ## Purpose
 * These error classes are designed for use by adapter packages (@hivemind/adapter-*)
 * to avoid circular dependencies with the main codebase. They provide a common error
 * handling interface that can be extended or adapted by the main codebase.
 *
 * ## Relationship to Main Codebase Errors
 * The main codebase (`src/types/errorClasses.ts`) contains more comprehensive error
 * classes with additional features:
 * - Recovery strategies (`getRecoveryStrategy()`)
 * - Correlation IDs for request tracking
 * - Automatic error classification
 * - Retry configuration
 *
 * These lightweight errors are suitable for adapter packages that need basic error
 * types without the overhead of the full error infrastructure.
 *
 * ## When to Use
 * - Use these errors **within adapter packages** (`@hivemind/adapter-*`)
 * - Use `src/types/errorClasses.ts` for **main codebase** error handling
 * - The `IErrorFactory` interface allows adapters to use either implementation
 *
 * ## Migration
 * In a future version, these error classes may be consolidated with the main
 * codebase errors once the package structure is finalized.
 */

/**
 * Base error class for shared-types package.
 *
 * This provides a lightweight foundation for all error types in the shared-types
 * package. Unlike the main codebase's `BaseHivemindError`, this class does not
 * include recovery strategies or correlation IDs to keep it minimal.
 *
 * @example
 * ```typescript
 * class MyCustomError extends BaseError {
 *   constructor(message: string) {
 *     super(message, 'MY_CUSTOM_ERROR');
 *   }
 * }
 * ```
 */
export abstract class BaseError extends Error {
  /**
   * Error code for programmatic error handling.
   * This is a short, uppercase identifier for the error type.
   */
  public readonly code: string;

  /**
   * Timestamp when the error was created.
   * Useful for logging and debugging.
   */
  public readonly timestamp: Date;

  /**
   * Creates a new BaseError instance.
   *
   * @param message - Human-readable error message
   * @param code - Error code for programmatic handling (defaults to 'UNKNOWN_ERROR')
   */
  constructor(message: string, code: string = 'UNKNOWN_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts the error to a JSON-serializable object.
   * Useful for logging and API responses.
   *
   * @returns A plain object representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Validation error for input validation failures.
 *
 * Use this error when user input or configuration values fail validation checks.
 * This is a lightweight alternative to the main codebase's `ValidationError` that
 * does not include recovery strategies or correlation IDs.
 *
 * ## Comparison with Main Codebase ValidationError
 * The main codebase `ValidationError` (`src/types/errorClasses.ts`) includes:
 * - `getRecoveryStrategy()` method with actionable steps
 * - Correlation ID for request tracking
 * - Suggestions array for fixing the validation issue
 * - Field, value, and expected type metadata
 *
 * This lightweight version provides basic validation error functionality suitable
 * for adapter packages that need to signal validation failures without the full
 * error infrastructure.
 *
 * @example
 * ```typescript
 * if (!config.apiKey) {
 *   throw new ValidationError('API key is required', 'API_KEY_REQUIRED');
 * }
 * ```
 *
 * @example
 * ```typescript
 * if (typeof port !== 'number') {
 *   throw new ValidationError(
 *     `Invalid port type: expected number, got ${typeof port}`,
 *     'INVALID_PORT_TYPE'
 *   );
 * }
 * ```
 */
export class ValidationError extends BaseError {
  /**
   * Creates a new ValidationError instance.
   *
   * @param message - Human-readable description of the validation failure
   * @param code - Error code for programmatic handling (defaults to 'VALIDATION_ERROR')
   */
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, code);
  }
}

/**
 * Network error for connection and communication failures.
 *
 * Use this error when network operations fail, such as HTTP requests, WebSocket
 * connections, or other network-related operations. This is a lightweight alternative
 * to the main codebase's `NetworkError` that does not include recovery strategies
 * or correlation IDs.
 *
 * ## Comparison with Main Codebase NetworkError
 * The main codebase `NetworkError` (`src/types/errorClasses.ts`) includes:
 * - `getRecoveryStrategy()` method with retry configuration
 * - Correlation ID for request tracking
 * - Response and request metadata for debugging
 * - Automatic retry delay calculation with jitter
 *
 * This lightweight version provides basic network error functionality suitable
 * for adapter packages that need to signal network failures without the full
 * error infrastructure.
 *
 * @example
 * ```typescript
 * try {
 *   const response = await fetch(url);
 *   if (!response.ok) {
 *     throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
 *   }
 * } catch (error) {
 *   throw new NetworkError(`Failed to connect to ${url}: ${error.message}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * if (!socket.connected) {
 *   throw new NetworkError('WebSocket connection not established', 'WS_NOT_CONNECTED');
 * }
 * ```
 */
export class NetworkError extends BaseError {
  /**
   * Creates a new NetworkError instance.
   *
   * @param message - Human-readable description of the network failure
   * @param code - Error code for programmatic handling (defaults to 'NETWORK_ERROR')
   */
  constructor(message: string, code: string = 'NETWORK_ERROR') {
    super(message, code);
  }
}

/**
 * API error for external service integration failures.
 *
 * Use this error when interactions with external APIs fail, such as Discord API,
 * Slack API, or LLM provider APIs. This is a lightweight alternative to the main
 * codebase's `ApiError` that does not include recovery strategies or correlation IDs.
 *
 * ## Comparison with Main Codebase ApiError
 * The main codebase `ApiError` (`src/types/errorClasses.ts`) includes:
 * - `getRecoveryStrategy()` method with service-specific recovery steps
 * - Correlation ID for request tracking
 * - Service name and endpoint metadata
 * - Retry-after support for rate-limited requests
 *
 * This lightweight version provides basic API error functionality suitable for
 * adapter packages that need to signal API failures without the full error
 * infrastructure.
 *
 * @example
 * ```typescript
 * try {
 *   const data = await discordClient.channels.fetch(channelId);
 *   return data;
 * } catch (error) {
 *   throw new ApiError(
 *     `Discord API error: ${error.message}`,
 *     'DISCORD_API_ERROR'
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * if (response.status === 429) {
 *   throw new ApiError('Rate limited by external API', 'RATE_LIMITED');
 * }
 * ```
 */
export class ApiError extends BaseError {
  /**
   * Creates a new ApiError instance.
   *
   * @param message - Human-readable description of the API failure
   * @param code - Error code for programmatic handling (defaults to 'API_ERROR')
   */
  constructor(message: string, code: string = 'API_ERROR') {
    super(message, code);
  }
}

/**
 * Configuration error for missing or invalid configuration.
 *
 * Use this error when required configuration is missing, invalid, or cannot be
 * loaded. This is a lightweight alternative to the main codebase's
 * `ConfigurationError` that does not include recovery strategies or correlation IDs.
 *
 * ## Comparison with Main Codebase ConfigurationError
 * The main codebase `ConfigurationError` (`src/types/errorClasses.ts`) includes:
 * - `getRecoveryStrategy()` method with environment-specific steps
 * - Correlation ID for request tracking
 * - Config key, expected type, and provided type metadata
 * - Critical severity classification
 *
 * This lightweight version provides basic configuration error functionality suitable
 * for adapter packages that need to signal configuration issues without the full
 * error infrastructure.
 *
 * @example
 * ```typescript
 * if (!process.env.DISCORD_BOT_TOKEN) {
 *   throw new ConfigurationError(
 *     'DISCORD_BOT_TOKEN environment variable is not set',
 *     'MISSING_DISCORD_TOKEN'
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * const config = loadConfig(configPath);
 * if (!config) {
 *   throw new ConfigurationError(
 *     `Failed to load configuration from ${configPath}`,
 *     'CONFIG_LOAD_FAILED'
 *   );
 * }
 * ```
 */
export class ConfigurationError extends BaseError {
  /**
   * Creates a new ConfigurationError instance.
   *
   * @param message - Human-readable description of the configuration issue
   * @param code - Error code for programmatic handling (defaults to 'CONFIG_ERROR')
   */
  constructor(message: string, code: string = 'CONFIG_ERROR') {
    super(message, code);
  }
}

/**
 * Factory interface for creating error instances.
 *
 * This interface allows adapter packages to use either the lightweight error
 * classes from this module or the full-featured error classes from the main
 * codebase. Adapters can accept an error factory in their constructor to
 * allow for flexible error handling strategies.
 *
 * @example
 * ```typescript
 * class MyAdapter {
 *   private errorFactory: IErrorFactory;
 *
 *   constructor(errorFactory: IErrorFactory = {
 *     createValidationError: (msg, code) => new ValidationError(msg, code),
 *     createNetworkError: (msg, code) => new NetworkError(msg, code),
 *     createApiError: (msg, code) => new ApiError(msg, code),
 *     createConfigurationError: (msg, code) => new ConfigurationError(msg, code),
 *   }) {
 *     this.errorFactory = errorFactory;
 *   }
 *
 *   validateInput(input: unknown): void {
 *     if (!input) {
 *       throw this.errorFactory.createValidationError('Input is required');
 *     }
 *   }
 * }
 * ```
 */
export interface IErrorFactory {
  /**
   * Creates a validation error instance.
   *
   * @param message - Error message
   * @param code - Optional error code
   * @returns A validation error instance
   */
  createValidationError(message: string, code?: string): ValidationError;

  /**
   * Creates a network error instance.
   *
   * @param message - Error message
   * @param code - Optional error code
   * @returns A network error instance
   */
  createNetworkError(message: string, code?: string): NetworkError;

  /**
   * Creates an API error instance.
   *
   * @param message - Error message
   * @param code - Optional error code
   * @returns An API error instance
   */
  createApiError(message: string, code?: string): ApiError;

  /**
   * Creates a configuration error instance.
   *
   * @param message - Error message
   * @param code - Optional error code
   * @returns A configuration error instance
   */
  createConfigurationError(message: string, code?: string): ConfigurationError;
}

/**
 * Default error factory implementation using lightweight error classes.
 *
 * This factory creates instances of the lightweight error classes from this module.
 * Use this when you don't need the full error infrastructure from the main codebase.
 *
 * @example
 * ```typescript
 * import { defaultErrorFactory } from '@hivemind/shared-types/errors';
 *
 * // Create errors using the factory
 * throw defaultErrorFactory.createValidationError('Invalid input');
 * throw defaultErrorFactory.createNetworkError('Connection failed');
 * ```
 */
export const defaultErrorFactory: IErrorFactory = {
  createValidationError(message: string, code?: string): ValidationError {
    return new ValidationError(message, code);
  },

  createNetworkError(message: string, code?: string): NetworkError {
    return new NetworkError(message, code);
  },

  createApiError(message: string, code?: string): ApiError {
    return new ApiError(message, code);
  },

  createConfigurationError(message: string, code?: string): ConfigurationError {
    return new ConfigurationError(message, code);
  },
};
