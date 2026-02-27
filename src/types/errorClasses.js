"use strict";
/**
 * Enhanced error classes for Open Hivemind with recovery strategies
 *
 * This file extends the base error types with concrete error classes
 * that include recovery mechanisms and correlation IDs for tracking.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorFactory = exports.ApiError = exports.TimeoutError = exports.RateLimitError = exports.AuthorizationError = exports.AuthenticationError = exports.DatabaseError = exports.ConfigurationError = exports.ValidationError = exports.NetworkError = exports.BaseHivemindError = void 0;
var uuid_1 = require("uuid");
var errors_1 = require("./errors");
/**
 * Base error class with correlation ID and recovery capabilities
 */
var BaseHivemindError = /** @class */ (function (_super) {
    __extends(BaseHivemindError, _super);
    function BaseHivemindError(message, type, code, statusCode, details, context) {
        var _this = _super.call(this, message) || this;
        _this.name = _this.constructor.name;
        _this.type = type;
        _this.code = code || type.toUpperCase();
        _this.statusCode = statusCode;
        _this.details = details;
        _this.context = context;
        _this.timestamp = new Date();
        _this.correlationId = (0, uuid_1.v4)();
        var classification = errors_1.ErrorUtils.classifyError(_this);
        _this.retryable = classification.retryable;
        _this.severity = classification.severity;
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, _this.constructor);
        }
        return _this;
    }
    Object.defineProperty(BaseHivemindError.prototype, "status", {
        /**
         * Get the HTTP status code (alias for statusCode)
         */
        get: function () {
            return this.statusCode;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Convert to JSON for logging/serialization
     */
    BaseHivemindError.prototype.toJSON = function () {
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
    };
    return BaseHivemindError;
}(Error));
exports.BaseHivemindError = BaseHivemindError;
/**
 * Network error with retry capabilities
 */
var NetworkError = /** @class */ (function (_super) {
    __extends(NetworkError, _super);
    function NetworkError(message, response, request, context) {
        var _this = _super.call(this, message, 'network', 'NETWORK_ERROR', (response === null || response === void 0 ? void 0 : response.status) || 503, { response: response, request: request }, context) || this;
        _this.severity = 'medium';
        _this.response = response;
        _this.request = request;
        return _this;
    }
    NetworkError.prototype.getRecoveryStrategy = function () {
        var _a;
        var statusCode = (_a = this.response) === null || _a === void 0 ? void 0 : _a.status;
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
    };
    NetworkError.prototype.calculateRetryDelay = function () {
        // Exponential backoff with jitter
        var baseDelay = 1000; // 1 second
        var jitter = Math.random() * 1000; // Random jitter up to 1 second
        return baseDelay + jitter;
    };
    return NetworkError;
}(BaseHivemindError));
exports.NetworkError = NetworkError;
/**
 * Validation error with field-specific information
 */
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(message, details, value, expected, suggestions, context) {
        var _this = this;
        // Handle both old signature (message, details object) and new signature
        var field;
        var actualDetails;
        if (typeof details === 'object' && details !== null) {
            field = details.field;
            actualDetails = details;
        }
        else if (typeof details === 'string') {
            field = details;
        }
        _this = _super.call(this, message, 'validation', 'VALIDATION_ERROR', 400, __assign({ field: field, value: value, expected: expected, suggestions: suggestions }, actualDetails), context) || this;
        _this.field = field;
        _this.value = value;
        _this.expected = expected;
        _this.suggestions = suggestions;
        return _this;
    }
    ValidationError.prototype.getRecoveryStrategy = function () {
        return {
            canRecover: false,
            recoverySteps: __spreadArray([
                'Check input data format',
                'Validate required fields'
            ], (this.suggestions || []), true),
        };
    };
    return ValidationError;
}(BaseHivemindError));
exports.ValidationError = ValidationError;
/**
 * Configuration error with environment-specific recovery
 */
var ConfigurationError = /** @class */ (function (_super) {
    __extends(ConfigurationError, _super);
    function ConfigurationError(message, configKey, expectedType, providedType, context) {
        var _this = _super.call(this, message, 'configuration', 'CONFIG_ERROR', 500, { configKey: configKey, expectedType: expectedType, providedType: providedType }, context) || this;
        _this.severity = 'critical';
        _this.configKey = configKey;
        _this.expectedType = expectedType;
        _this.providedType = providedType;
        return _this;
    }
    ConfigurationError.prototype.getRecoveryStrategy = function () {
        return {
            canRecover: false,
            recoverySteps: [
                'Check environment variables',
                'Verify configuration file format',
                'Review documentation for required settings',
            ],
        };
    };
    return ConfigurationError;
}(BaseHivemindError));
exports.ConfigurationError = ConfigurationError;
/**
 * Database error with connection retry capabilities
 */
var DatabaseError = /** @class */ (function (_super) {
    __extends(DatabaseError, _super);
    function DatabaseError(message, operation, table, query, context) {
        var _this = _super.call(this, message, 'database', 'DATABASE_ERROR', 500, { operation: operation, table: table, query: query }, context) || this;
        _this.operation = operation;
        _this.table = table;
        _this.query = query;
        return _this;
    }
    DatabaseError.prototype.getRecoveryStrategy = function () {
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
    };
    return DatabaseError;
}(BaseHivemindError));
exports.DatabaseError = DatabaseError;
/**
 * Authentication error with token refresh capabilities
 */
var AuthenticationError = /** @class */ (function (_super) {
    __extends(AuthenticationError, _super);
    function AuthenticationError(message, provider, reason, context) {
        var _this = _super.call(this, message, 'authentication', 'AUTH_ERROR', 401, { provider: provider, reason: reason }, context) || this;
        _this.provider = provider;
        _this.reason = reason;
        return _this;
    }
    AuthenticationError.prototype.getRecoveryStrategy = function () {
        var _this = this;
        // Allow token refresh for expired tokens
        if (this.reason === 'expired_token') {
            return {
                canRecover: true,
                maxRetries: 1,
                retryDelay: 0,
                fallbackAction: function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        // This would be implemented by the calling code
                        throw new Error('Token refresh not implemented');
                    });
                }); },
                recoverySteps: ['Attempt to refresh authentication token', 'Re-authenticate with provider'],
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
    };
    return AuthenticationError;
}(BaseHivemindError));
exports.AuthenticationError = AuthenticationError;
/**
 * Authorization error with permission request
 */
var AuthorizationError = /** @class */ (function (_super) {
    __extends(AuthorizationError, _super);
    function AuthorizationError(message, resource, action, requiredPermission, context) {
        var _this = _super.call(this, message, 'authorization', 'AUTHZ_ERROR', 403, { resource: resource, action: action, requiredPermission: requiredPermission }, context) || this;
        _this.resource = resource;
        _this.action = action;
        _this.requiredPermission = requiredPermission;
        return _this;
    }
    AuthorizationError.prototype.getRecoveryStrategy = function () {
        return {
            canRecover: false,
            recoverySteps: [
                'Request required permissions',
                'Contact administrator for access',
                'Check user role and permissions',
            ],
        };
    };
    return AuthorizationError;
}(BaseHivemindError));
exports.AuthorizationError = AuthorizationError;
/**
 * Rate limit error with automatic retry
 */
var RateLimitError = /** @class */ (function (_super) {
    __extends(RateLimitError, _super);
    function RateLimitError(message, retryAfter, limit, remaining, resetTime, context) {
        var _this = _super.call(this, message, 'rate-limit', 'RATE_LIMIT_ERROR', 429, { retryAfter: retryAfter, limit: limit, remaining: remaining, resetTime: resetTime }, context) || this;
        _this.retryAfter = retryAfter;
        _this.limit = limit;
        _this.remaining = remaining;
        _this.resetTime = resetTime;
        return _this;
    }
    RateLimitError.prototype.getRecoveryStrategy = function () {
        return {
            canRecover: true,
            maxRetries: 1,
            retryDelay: this.retryAfter * 1000, // Convert to milliseconds
            recoverySteps: [
                "Wait ".concat(this.retryAfter, " seconds before retrying"),
                'Reduce request frequency',
                'Consider implementing request queuing',
            ],
        };
    };
    return RateLimitError;
}(BaseHivemindError));
exports.RateLimitError = RateLimitError;
/**
 * Timeout error with retry capabilities
 */
var TimeoutError = /** @class */ (function (_super) {
    __extends(TimeoutError, _super);
    function TimeoutError(message, timeoutMs, operation, context) {
        var _this = _super.call(this, message, 'timeout', 'TIMEOUT_ERROR', 408, { timeoutMs: timeoutMs, operation: operation }, context) || this;
        _this.timeoutMs = timeoutMs;
        _this.operation = operation;
        return _this;
    }
    TimeoutError.prototype.getRecoveryStrategy = function () {
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
    };
    return TimeoutError;
}(BaseHivemindError));
exports.TimeoutError = TimeoutError;
/**
 * API error for external service integrations
 */
var ApiError = /** @class */ (function (_super) {
    __extends(ApiError, _super);
    function ApiError(message, service, endpoint, statusCode, retryAfter, context) {
        var _this = _super.call(this, message, 'api', 'API_ERROR', statusCode, { service: service, endpoint: endpoint, retryAfter: retryAfter }, context) || this;
        _this.service = service;
        _this.endpoint = endpoint;
        _this.retryAfter = retryAfter;
        return _this;
    }
    ApiError.prototype.getRecoveryStrategy = function () {
        // Retry on server errors and if retry-after is provided
        if (!this.statusCode || this.statusCode >= 500 || this.retryAfter) {
            return {
                canRecover: true,
                maxRetries: 3,
                retryDelay: this.retryAfter ? this.retryAfter * 1000 : 2000,
                recoverySteps: [
                    "Check ".concat(this.service, " service status"),
                    'Verify API endpoint availability',
                    'Retry with exponential backoff',
                ],
            };
        }
        return {
            canRecover: false,
            recoverySteps: [
                "Check ".concat(this.service, " API documentation"),
                'Verify request format',
                'Contact service provider',
            ],
        };
    };
    return ApiError;
}(BaseHivemindError));
exports.ApiError = ApiError;
/**
 * Error factory for creating appropriate error instances
 */
var ErrorFactory = /** @class */ (function () {
    function ErrorFactory() {
    }
    /**
     * Create an appropriate error instance from a generic error
     */
    ErrorFactory.createError = function (error, context) {
        if (error instanceof BaseHivemindError) {
            return error;
        }
        var hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        var classification = errors_1.ErrorUtils.classifyError(hivemindError);
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
    };
    return ErrorFactory;
}());
exports.ErrorFactory = ErrorFactory;
