/**
 * Comprehensive error type system for Open Hivemind
 *
 * This file provides strongly-typed error handling to replace 'any' usage
 * in catch blocks and error handling throughout the application.
 */
export type ErrorType = 'unknown' | 'network' | 'validation' | 'authentication' | 'authorization' | 'configuration' | 'api' | 'database' | 'rate-limit' | 'timeout';
/**
 * Generic error type that can be used in catch blocks to replace 'any'
 * Provides type safety while maintaining backward compatibility
 */
export type GenericError = Error | AxiosError | ApiError | ValidationError | ConfigurationError | DatabaseError | unknown;
/**
 * Enhanced error interface that extends the standard Error
 */
export interface AppError extends Error {
    code: string;
    statusCode?: number;
    type: ErrorType;
    details?: Record<string, unknown>;
    retryable?: boolean;
    timestamp?: Date;
}
/**
 * Network/HTTP error type (commonly thrown by axios and fetch)
 */
export interface NetworkError extends AppError {
    type: 'network';
    statusCode: number;
    response?: {
        data?: unknown;
        headers?: Record<string, string>;
    };
    request?: {
        url?: string;
        method?: string;
    };
}
/**
 * Axios-specific error type (common in API integrations)
 */
export interface AxiosError extends Error {
    isAxiosError: boolean;
    response?: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        data: unknown;
    };
    request?: unknown;
    config?: {
        url?: string;
        method?: string;
        headers?: Record<string, string>;
    };
}
/**
 * API error type for external service integrations
 */
export interface ApiError extends AppError {
    type: 'api';
    service: string;
    endpoint?: string;
    statusCode?: number;
    retryAfter?: number;
}
/**
 * Validation error type
 */
export interface ValidationError extends AppError {
    type: 'validation';
    field?: string;
    value?: unknown;
    expected?: unknown;
    suggestions?: string[];
}
/**
 * Configuration error type
 */
export interface ConfigurationError extends AppError {
    type: 'configuration';
    configKey?: string;
    expectedType?: string;
    providedType?: string;
}
/**
 * Database error type
 */
export interface DatabaseError extends AppError {
    type: 'database';
    operation?: string;
    table?: string;
    query?: string;
}
/**
 * Authentication error type
 */
export interface AuthenticationError extends AppError {
    type: 'authentication';
    provider?: string;
    reason?: 'invalid_credentials' | 'expired_token' | 'missing_token' | 'invalid_format';
}
/**
 * Authorization error type
 */
export interface AuthorizationError extends AppError {
    type: 'authorization';
    resource?: string;
    action?: string;
    requiredPermission?: string;
}
/**
 * Rate limit error type
 */
export interface RateLimitError extends AppError {
    type: 'rate-limit';
    retryAfter: number;
    limit?: number;
    remaining?: number;
    resetTime?: Date;
}
/**
 * Timeout error type
 */
export interface TimeoutError extends AppError {
    type: 'timeout';
    timeoutMs: number;
    operation?: string;
}
/**
 * Union type for all possible error types
 */
export type HivemindError = AppError | NetworkError | AxiosError | ApiError | ValidationError | ConfigurationError | DatabaseError | AuthenticationError | AuthorizationError | RateLimitError | TimeoutError | Error | unknown;
/**
 * Error classification result
 */
export interface ErrorClassification {
    type: ErrorType;
    retryable: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userMessage?: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
/**
 * Error handling utilities
 */
export declare class ErrorUtils {
    /**
     * Safely extract error message from any error type
     */
    static getMessage(error: HivemindError): string;
    /**
     * Safely extract error code from any error type
     */
    static getCode(error: HivemindError): string | undefined;
    /**
     * Safely extract status code from any error type
     */
    static getStatusCode(error: HivemindError): number | undefined;
    /**
     * Check if error is an Axios error
     */
    static isAxiosError(error: HivemindError): error is AxiosError;
    /**
     * Check if error is a network error
     */
    static isNetworkError(error: HivemindError): error is NetworkError;
    /**
     * Check if error is retryable
     */
    static isRetryable(error: HivemindError): boolean;
    /**
     * Classify error type and provide handling recommendations
     */
    static classifyError(error: HivemindError): ErrorClassification;
    /**
     * Convert any error to a HivemindError
     */
    static toHivemindError(error: unknown, message?: string, type?: string): HivemindError;
    /**
     * Create a standardized error object
     */
    static createError(message: string, type?: ErrorType, code?: string, statusCode?: number, details?: Record<string, unknown>): AppError;
}
/**
 * Type guard to check if error is a HivemindError
 */
export declare function isHivemindError(error: unknown): error is HivemindError;
/**
 * Type guard to check if error is an AppError
 */
export declare function isAppError(error: unknown): error is AppError;
//# sourceMappingURL=errors.d.ts.map