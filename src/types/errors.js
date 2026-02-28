"use strict";
/**
 * Comprehensive error type system for Open Hivemind
 *
 * This file provides strongly-typed error handling to replace 'any' usage
 * in catch blocks and error handling throughout the application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorUtils = void 0;
exports.isHivemindError = isHivemindError;
exports.isAppError = isAppError;
/**
 * Error handling utilities
 */
var ErrorUtils = /** @class */ (function () {
    function ErrorUtils() {
    }
    /**
     * Safely extract error message from any error type
     */
    ErrorUtils.getMessage = function (error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error && typeof error === 'object' && 'message' in error) {
            return String(error.message);
        }
        return 'Unknown error occurred';
    };
    /**
     * Safely extract error code from any error type
     */
    ErrorUtils.getCode = function (error) {
        if (error && typeof error === 'object' && 'code' in error) {
            return String(error.code);
        }
        return undefined;
    };
    /**
     * Safely extract status code from any error type
     */
    ErrorUtils.getStatusCode = function (error) {
        var _a;
        if (error && typeof error === 'object' && 'statusCode' in error) {
            return Number(error.statusCode);
        }
        if (this.isAxiosError(error) && ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status)) {
            return error.response.status;
        }
        return undefined;
    };
    /**
     * Check if error is an Axios error
     */
    ErrorUtils.isAxiosError = function (error) {
        return Boolean(error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError);
    };
    /**
     * Check if error is a network error
     */
    ErrorUtils.isNetworkError = function (error) {
        return (this.isAxiosError(error) ||
            Boolean(error && typeof error === 'object' && 'type' in error && error.type === 'network'));
    };
    /**
     * Check if error is retryable
     */
    ErrorUtils.isRetryable = function (error) {
        if (error && typeof error === 'object' && 'retryable' in error) {
            return Boolean(error.retryable);
        }
        var statusCode = this.getStatusCode(error);
        if (statusCode) {
            // Retry on server errors (5xx) and rate limits (429)
            return statusCode >= 500 || statusCode === 429;
        }
        return false;
    };
    /**
     * Classify error type and provide handling recommendations
     */
    ErrorUtils.classifyError = function (error) {
        var statusCode = this.getStatusCode(error);
        var message = this.getMessage(error).toLowerCase();
        // Rate limit errors
        if (statusCode === 429 || message.includes('rate limit')) {
            return {
                type: 'rate-limit',
                retryable: true,
                severity: 'medium',
                userMessage: 'Rate limit exceeded. Please try again later.',
                logLevel: 'warn',
            };
        }
        // Authentication errors
        if (statusCode === 401 ||
            message.includes('unauthorized') ||
            message.includes('invalid token')) {
            return {
                type: 'authentication',
                retryable: false,
                severity: 'high',
                userMessage: 'Authentication failed. Please check your credentials.',
                logLevel: 'warn',
            };
        }
        // Authorization errors
        if (statusCode === 403 ||
            message.includes('forbidden') ||
            message.includes('permission denied')) {
            return {
                type: 'authorization',
                retryable: false,
                severity: 'high',
                userMessage: 'Access denied. You do not have permission to perform this action.',
                logLevel: 'warn',
            };
        }
        // Network/timeout errors
        if (statusCode === 408 ||
            statusCode === 504 ||
            message.includes('timeout') ||
            message.includes('network')) {
            return {
                type: 'timeout',
                retryable: true,
                severity: 'medium',
                userMessage: 'Request timed out. Please try again.',
                logLevel: 'warn',
            };
        }
        // Server errors
        if (statusCode && statusCode >= 500) {
            return {
                type: 'api',
                retryable: true,
                severity: 'high',
                userMessage: 'Service temporarily unavailable. Please try again later.',
                logLevel: 'error',
            };
        }
        // Client errors (4xx)
        if (statusCode && statusCode >= 400 && statusCode < 500) {
            return {
                type: 'api',
                retryable: false,
                severity: 'medium',
                userMessage: 'Request failed. Please check your input and try again.',
                logLevel: 'warn',
            };
        }
        // Validation errors
        if (message.includes('validation') ||
            message.includes('invalid') ||
            message.includes('required')) {
            return {
                type: 'validation',
                retryable: false,
                severity: 'low',
                userMessage: 'Invalid input. Please check your data and try again.',
                logLevel: 'info',
            };
        }
        // Configuration errors
        if (message.includes('config') || message.includes('configuration')) {
            return {
                type: 'configuration',
                retryable: false,
                severity: 'high',
                userMessage: 'Configuration error. Please contact support.',
                logLevel: 'error',
            };
        }
        // Database errors
        if (message.includes('database') || message.includes('sql') || message.includes('connection')) {
            return {
                type: 'database',
                retryable: true,
                severity: 'high',
                userMessage: 'Database error. Please try again later.',
                logLevel: 'error',
            };
        }
        // Default unknown error
        return {
            type: 'unknown',
            retryable: false,
            severity: 'medium',
            userMessage: 'An unexpected error occurred. Please try again.',
            logLevel: 'error',
        };
    };
    /**
     * Convert any error to a HivemindError
     */
    ErrorUtils.toHivemindError = function (error, message, type) {
        if (isHivemindError(error)) {
            return error;
        }
        if (error &&
            typeof error === 'object' &&
            'message' in error &&
            'name' in error &&
            Object.prototype.toString.call(error) === '[object Error]') {
            return error;
        }
        if (typeof error === 'string') {
            return this.createError(message || error);
        }
        return this.createError(message || 'Unknown error occurred', type || 'unknown', undefined, undefined, { originalError: error });
    };
    /**
     * Create a standardized error object
     */
    ErrorUtils.createError = function (message, type, code, statusCode, details) {
        if (type === void 0) { type = 'unknown'; }
        var error = new Error(message);
        error.code = code || type.toUpperCase();
        error.type = type;
        error.statusCode = statusCode;
        error.details = details;
        error.timestamp = new Date();
        error.retryable = this.classifyError(error).retryable;
        return error;
    };
    return ErrorUtils;
}());
exports.ErrorUtils = ErrorUtils;
/**
 * Type guard to check if error is a HivemindError
 */
function isHivemindError(error) {
    return Boolean(error instanceof Error ||
        (error && typeof error === 'object' && ('type' in error || 'code' in error)));
}
/**
 * Type guard to check if error is an AppError
 */
function isAppError(error) {
    return Boolean(error instanceof Error &&
        error &&
        typeof error === 'object' &&
        'type' in error &&
        'code' in error);
}
