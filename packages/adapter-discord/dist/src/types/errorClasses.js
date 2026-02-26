"use strict";
/**
 * Enhanced error classes for Open Hivemind with recovery strategies
 *
 * This file extends the base error types with concrete error classes
 * that include recovery mechanisms and correlation IDs for tracking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorFactory = exports.ApiError = exports.TimeoutError = exports.RateLimitError = exports.AuthorizationError = exports.AuthenticationError = exports.DatabaseError = exports.ConfigurationError = exports.ValidationError = exports.NetworkError = exports.BaseHivemindError = void 0;
const uuid_1 = require("uuid");
const errors_1 = require("./errors");
/**
 * Base error class with correlation ID and recovery capabilities
 */
class BaseHivemindError extends Error {
    constructor(message, type, code, statusCode, details, context) {
        super(message);
        this.name = this.constructor.name;
        this.type = type;
        this.code = code || type.toUpperCase();
        this.statusCode = statusCode;
        this.details = details;
        this.context = context;
        this.timestamp = new Date();
        this.correlationId = (0, uuid_1.v4)();
        const classification = errors_1.ErrorUtils.classifyError(this);
        this.retryable = classification.retryable;
        this.severity = classification.severity;
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    /**
     * Get the HTTP status code (alias for statusCode)
     */
    get status() {
        return this.statusCode;
    }
    /**
     * Convert to JSON for logging/serialization
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            type: this.type,
            statusCode: this.statusCode,
            details: this.details,
            context: this.context,
            retryable: this.retryable,
            timestamp: this.timestamp.toISOString(),
            correlationId: this.correlationId,
            stack: this.stack,
        };
    }
}
exports.BaseHivemindError = BaseHivemindError;
/**
 * Network error with retry capabilities
 */
class NetworkError extends BaseHivemindError {
    constructor(message, response, request, context) {
        super(message, 'network', 'NETWORK_ERROR', (response === null || response === void 0 ? void 0 : response.status) || 503, { response, request }, context);
        this.severity = 'medium';
        this.response = response;
        this.request = request;
    }
    getRecoveryStrategy() {
        var _a;
        const statusCode = (_a = this.response) === null || _a === void 0 ? void 0 : _a.status;
        // Retry on server errors and rate limits
        if (!statusCode || statusCode >= 500 || statusCode === 429) {
            return {
                canRecover: true,
                maxRetries: 3,
                retryDelay: this.calculateRetryDelay(),
                recoverySteps: [
                    'Check network connectivity',
                    'Verify endpoint availability',
                    'Retry with exponential backoff',
                ],
            };
        }
        // Don't retry client errors (4xx except 429)
        return {
            canRecover: false,
            recoverySteps: [
                'Check request parameters',
                'Verify authentication credentials',
                'Contact support if issue persists',
            ],
        };
    }
    calculateRetryDelay() {
        // Exponential backoff with jitter
        const baseDelay = 1000; // 1 second
        const jitter = Math.random() * 1000; // Random jitter up to 1 second
        return baseDelay + jitter;
    }
}
exports.NetworkError = NetworkError;
/**
 * Validation error with field-specific information
 */
class ValidationError extends BaseHivemindError {
    constructor(message, details, value, expected, suggestions, context) {
        // Handle both old signature (message, details object) and new signature
        let field;
        let actualDetails;
        if (typeof details === 'object' && details !== null) {
            field = details.field;
            actualDetails = details;
        }
        else if (typeof details === 'string') {
            field = details;
        }
        super(message, 'validation', 'VALIDATION_ERROR', 400, { field, value, expected, suggestions, ...actualDetails }, context);
        this.field = field;
        this.value = value;
        this.expected = expected;
        this.suggestions = suggestions;
    }
    getRecoveryStrategy() {
        return {
            canRecover: false,
            recoverySteps: [
                'Check input data format',
                'Validate required fields',
                ...this.suggestions || [],
            ],
        };
    }
}
exports.ValidationError = ValidationError;
/**
 * Configuration error with environment-specific recovery
 */
class ConfigurationError extends BaseHivemindError {
    constructor(message, configKey, expectedType, providedType, context) {
        super(message, 'configuration', 'CONFIG_ERROR', 500, { configKey, expectedType, providedType }, context);
        this.severity = 'critical';
        this.configKey = configKey;
        this.expectedType = expectedType;
        this.providedType = providedType;
    }
    getRecoveryStrategy() {
        return {
            canRecover: false,
            recoverySteps: [
                'Check environment variables',
                'Verify configuration file format',
                'Review documentation for required settings',
            ],
        };
    }
}
exports.ConfigurationError = ConfigurationError;
/**
 * Database error with connection retry capabilities
 */
class DatabaseError extends BaseHivemindError {
    constructor(message, operation, table, query, context) {
        super(message, 'database', 'DATABASE_ERROR', 500, { operation, table, query }, context);
        this.operation = operation;
        this.table = table;
        this.query = query;
    }
    getRecoveryStrategy() {
        // Retry on connection errors
        if (this.message.toLowerCase().includes('connection') ||
            this.message.toLowerCase().includes('timeout')) {
            return {
                canRecover: true,
                maxRetries: 3,
                retryDelay: 2000,
                recoverySteps: [
                    'Check database server status',
                    'Verify connection string',
                    'Retry connection with backoff',
                ],
            };
        }
        return {
            canRecover: false,
            recoverySteps: [
                'Check database permissions',
                'Verify query syntax',
                'Contact database administrator',
            ],
        };
    }
}
exports.DatabaseError = DatabaseError;
/**
 * Authentication error with token refresh capabilities
 */
class AuthenticationError extends BaseHivemindError {
    constructor(message, provider, reason, context) {
        super(message, 'authentication', 'AUTH_ERROR', 401, { provider, reason }, context);
        this.provider = provider;
        this.reason = reason;
    }
    getRecoveryStrategy() {
        // Allow token refresh for expired tokens
        if (this.reason === 'expired_token') {
            return {
                canRecover: true,
                maxRetries: 1,
                retryDelay: 0,
                fallbackAction: async () => {
                    // This would be implemented by the calling code
                    throw new Error('Token refresh not implemented');
                },
                recoverySteps: [
                    'Attempt to refresh authentication token',
                    'Re-authenticate with provider',
                ],
            };
        }
        return {
            canRecover: false,
            recoverySteps: [
                'Check authentication credentials',
                'Verify token format',
                'Re-authenticate with provider',
            ],
        };
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Authorization error with permission request
 */
class AuthorizationError extends BaseHivemindError {
    constructor(message, resource, action, requiredPermission, context) {
        super(message, 'authorization', 'AUTHZ_ERROR', 403, { resource, action, requiredPermission }, context);
        this.resource = resource;
        this.action = action;
        this.requiredPermission = requiredPermission;
    }
    getRecoveryStrategy() {
        return {
            canRecover: false,
            recoverySteps: [
                'Request required permissions',
                'Contact administrator for access',
                'Check user role and permissions',
            ],
        };
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Rate limit error with automatic retry
 */
class RateLimitError extends BaseHivemindError {
    constructor(message, retryAfter, limit, remaining, resetTime, context) {
        super(message, 'rate-limit', 'RATE_LIMIT_ERROR', 429, { retryAfter, limit, remaining, resetTime }, context);
        this.retryAfter = retryAfter;
        this.limit = limit;
        this.remaining = remaining;
        this.resetTime = resetTime;
    }
    getRecoveryStrategy() {
        return {
            canRecover: true,
            maxRetries: 1,
            retryDelay: this.retryAfter * 1000, // Convert to milliseconds
            recoverySteps: [
                `Wait ${this.retryAfter} seconds before retrying`,
                'Reduce request frequency',
                'Consider implementing request queuing',
            ],
        };
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Timeout error with retry capabilities
 */
class TimeoutError extends BaseHivemindError {
    constructor(message, timeoutMs, operation, context) {
        super(message, 'timeout', 'TIMEOUT_ERROR', 408, { timeoutMs, operation }, context);
        this.timeoutMs = timeoutMs;
        this.operation = operation;
    }
    getRecoveryStrategy() {
        return {
            canRecover: true,
            maxRetries: 2,
            retryDelay: this.timeoutMs,
            recoverySteps: [
                'Increase timeout duration',
                'Check network connectivity',
                'Verify service availability',
            ],
        };
    }
}
exports.TimeoutError = TimeoutError;
/**
 * API error for external service integrations
 */
class ApiError extends BaseHivemindError {
    constructor(message, service, endpoint, statusCode, retryAfter, context) {
        super(message, 'api', 'API_ERROR', statusCode, { service, endpoint, retryAfter }, context);
        this.service = service;
        this.endpoint = endpoint;
        this.retryAfter = retryAfter;
    }
    getRecoveryStrategy() {
        // Retry on server errors and if retry-after is provided
        if (!this.statusCode || this.statusCode >= 500 || this.retryAfter) {
            return {
                canRecover: true,
                maxRetries: 3,
                retryDelay: this.retryAfter ? this.retryAfter * 1000 : 2000,
                recoverySteps: [
                    `Check ${this.service} service status`,
                    'Verify API endpoint availability',
                    'Retry with exponential backoff',
                ],
            };
        }
        return {
            canRecover: false,
            recoverySteps: [
                `Check ${this.service} API documentation`,
                'Verify request format',
                'Contact service provider',
            ],
        };
    }
}
exports.ApiError = ApiError;
/**
 * Error factory for creating appropriate error instances
 */
class ErrorFactory {
    /**
     * Create an appropriate error instance from a generic error
     */
    static createError(error, context) {
        if (error instanceof BaseHivemindError) {
            return error;
        }
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        switch (classification.type) {
            case 'network':
                return new NetworkError(errors_1.ErrorUtils.getMessage(hivemindError), hivemindError.response, hivemindError.request, context);
            case 'validation':
                return new ValidationError(errors_1.ErrorUtils.getMessage(hivemindError), hivemindError.field, hivemindError.value, hivemindError.expected, hivemindError.suggestions, context);
            case 'configuration':
                return new ConfigurationError(errors_1.ErrorUtils.getMessage(hivemindError), hivemindError.configKey, hivemindError.expectedType, hivemindError.providedType, context);
            case 'database':
                return new DatabaseError(errors_1.ErrorUtils.getMessage(hivemindError), hivemindError.operation, hivemindError.table, hivemindError.query, context);
            case 'authentication':
                return new AuthenticationError(errors_1.ErrorUtils.getMessage(hivemindError), hivemindError.provider, hivemindError.reason, context);
            case 'authorization':
                return new AuthorizationError(errors_1.ErrorUtils.getMessage(hivemindError), hivemindError.resource, hivemindError.action, hivemindError.requiredPermission, context);
            case 'rate-limit':
                return new RateLimitError(errors_1.ErrorUtils.getMessage(hivemindError), hivemindError.retryAfter || 60, hivemindError.limit, hivemindError.remaining, hivemindError.resetTime, context);
            case 'timeout':
                return new TimeoutError(errors_1.ErrorUtils.getMessage(hivemindError), hivemindError.timeoutMs || 30000, hivemindError.operation, context);
            case 'api':
                return new ApiError(errors_1.ErrorUtils.getMessage(hivemindError), hivemindError.service || 'unknown', hivemindError.endpoint, errors_1.ErrorUtils.getStatusCode(hivemindError), hivemindError.retryAfter, context);
            default:
                // Create a generic error for unknown types
                return new ApiError(errors_1.ErrorUtils.getMessage(hivemindError), 'unknown', undefined, errors_1.ErrorUtils.getStatusCode(hivemindError), undefined, context);
        }
    }
}
exports.ErrorFactory = ErrorFactory;
