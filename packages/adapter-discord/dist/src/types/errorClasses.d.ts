/**
 * Enhanced error classes for Open Hivemind with recovery strategies
 *
 * This file extends the base error types with concrete error classes
 * that include recovery mechanisms and correlation IDs for tracking.
 */
import type { AppError, ErrorType } from './errors';
/**
 * Base error class with correlation ID and recovery capabilities
 */
export declare abstract class BaseHivemindError extends Error implements AppError {
    readonly code: string;
    readonly type: ErrorType;
    readonly statusCode?: number;
    readonly details?: Record<string, unknown>;
    readonly retryable: boolean;
    readonly severity: string;
    readonly timestamp: Date;
    readonly correlationId: string;
    readonly context?: Record<string, unknown>;
    constructor(message: string, type: ErrorType, code?: string, statusCode?: number, details?: Record<string, unknown>, context?: Record<string, unknown>);
    /**
     * Get the HTTP status code (alias for statusCode)
     */
    get status(): number | undefined;
    /**
     * Get a recovery strategy for this error
     */
    abstract getRecoveryStrategy(): ErrorRecoveryStrategy;
    /**
     * Convert to JSON for logging/serialization
     */
    toJSON(): Record<string, unknown>;
}
/**
 * Recovery strategy interface
 */
export interface ErrorRecoveryStrategy {
    canRecover: boolean;
    retryDelay?: number;
    maxRetries?: number;
    fallbackAction?: () => Promise<unknown>;
    recoverySteps?: string[];
}
/**
 * Network error with retry capabilities
 */
export declare class NetworkError extends BaseHivemindError {
    readonly severity: string;
    readonly response?: {
        data?: unknown;
        headers?: Record<string, string>;
        status?: number;
    };
    readonly request?: {
        url?: string;
        method?: string;
        headers?: Record<string, string>;
    };
    constructor(message: string, response?: {
        data?: unknown;
        headers?: Record<string, string>;
        status?: number;
    }, request?: {
        url?: string;
        method?: string;
        headers?: Record<string, string>;
    }, context?: Record<string, unknown>);
    getRecoveryStrategy(): ErrorRecoveryStrategy;
    private calculateRetryDelay;
}
/**
 * Validation error with field-specific information
 */
export declare class ValidationError extends BaseHivemindError {
    readonly field?: string;
    readonly value?: unknown;
    readonly expected?: unknown;
    readonly suggestions?: string[];
    constructor(message: string, details?: Record<string, unknown> | string, value?: unknown, expected?: unknown, suggestions?: string[], context?: Record<string, unknown>);
    getRecoveryStrategy(): ErrorRecoveryStrategy;
}
/**
 * Configuration error with environment-specific recovery
 */
export declare class ConfigurationError extends BaseHivemindError {
    readonly configKey?: string;
    readonly expectedType?: string;
    readonly providedType?: string;
    readonly severity: string;
    constructor(message: string, configKey?: string, expectedType?: string, providedType?: string, context?: Record<string, unknown>);
    getRecoveryStrategy(): ErrorRecoveryStrategy;
}
/**
 * Database error with connection retry capabilities
 */
export declare class DatabaseError extends BaseHivemindError {
    readonly operation?: string;
    readonly table?: string;
    readonly query?: string;
    constructor(message: string, operation?: string, table?: string, query?: string, context?: Record<string, unknown>);
    getRecoveryStrategy(): ErrorRecoveryStrategy;
}
/**
 * Authentication error with token refresh capabilities
 */
export declare class AuthenticationError extends BaseHivemindError {
    readonly provider?: string;
    readonly reason?: 'invalid_credentials' | 'expired_token' | 'missing_token' | 'invalid_format';
    constructor(message: string, provider?: string, reason?: 'invalid_credentials' | 'expired_token' | 'missing_token' | 'invalid_format', context?: Record<string, unknown>);
    getRecoveryStrategy(): ErrorRecoveryStrategy;
}
/**
 * Authorization error with permission request
 */
export declare class AuthorizationError extends BaseHivemindError {
    readonly resource?: string;
    readonly action?: string;
    readonly requiredPermission?: string;
    constructor(message: string, resource?: string, action?: string, requiredPermission?: string, context?: Record<string, unknown>);
    getRecoveryStrategy(): ErrorRecoveryStrategy;
}
/**
 * Rate limit error with automatic retry
 */
export declare class RateLimitError extends BaseHivemindError {
    readonly retryAfter: number;
    readonly limit?: number;
    readonly remaining?: number;
    readonly resetTime?: Date;
    constructor(message: string, retryAfter: number, limit?: number, remaining?: number, resetTime?: Date, context?: Record<string, unknown>);
    getRecoveryStrategy(): ErrorRecoveryStrategy;
}
/**
 * Timeout error with retry capabilities
 */
export declare class TimeoutError extends BaseHivemindError {
    readonly timeoutMs: number;
    readonly operation?: string;
    constructor(message: string, timeoutMs: number, operation?: string, context?: Record<string, unknown>);
    getRecoveryStrategy(): ErrorRecoveryStrategy;
}
/**
 * API error for external service integrations
 */
export declare class ApiError extends BaseHivemindError {
    readonly service: string;
    readonly endpoint?: string;
    readonly retryAfter?: number;
    constructor(message: string, service: string, endpoint?: string, statusCode?: number, retryAfter?: number, context?: Record<string, unknown>);
    getRecoveryStrategy(): ErrorRecoveryStrategy;
}
/**
 * Error factory for creating appropriate error instances
 */
export declare class ErrorFactory {
    /**
     * Create an appropriate error instance from a generic error
     */
    static createError(error: unknown, context?: Record<string, unknown>): BaseHivemindError;
}
//# sourceMappingURL=errorClasses.d.ts.map