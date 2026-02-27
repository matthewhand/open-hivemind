"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenant = exports.optionalAuth = exports.requireAdmin = exports.requirePermission = exports.requireRole = exports.authenticate = exports.AuthMiddleware = void 0;
var debug_1 = require("debug");
var errorClasses_1 = require("../types/errorClasses");
var AuthManager_1 = require("./AuthManager");
var debug = (0, debug_1.default)('app:AuthMiddleware');
var AuthMiddleware = /** @class */ (function () {
    function AuthMiddleware() {
        var _this = this;
        /**
         * JWT Authentication middleware
         * Verifies JWT token and attaches user to request
         * Bypasses authentication for localhost requests
         */
        this.authenticate = function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
            var isLocalhostRequest, allowLocalBypass, isLocalhost, bypassAuth, authHeader, token, payload, user, userWithTenant;
            var _this = this;
            return __generator(this, function (_a) {
                isLocalhostRequest = function () {
                    var _a, _b, _c, _d, _e;
                    var clientIP = (_e = (_c = (_a = req.ip) !== null && _a !== void 0 ? _a : (_b = req.connection) === null || _b === void 0 ? void 0 : _b.remoteAddress) !== null && _c !== void 0 ? _c : (_d = req.socket) === null || _d === void 0 ? void 0 : _d.remoteAddress) !== null && _e !== void 0 ? _e : '';
                    var host = req.get('host');
                    var origin = req.get('origin');
                    var isLocalhostIp = clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1';
                    // Strict check for host header to prevent host header injection
                    var isLocalhostHost = host &&
                        (host === 'localhost' ||
                            host.startsWith('localhost:') ||
                            host === '127.0.0.1' ||
                            host.startsWith('127.0.0.1:'));
                    // Strict check for origin header
                    var isLocalhostOrigin = origin &&
                        (origin === 'http://localhost' ||
                            origin.startsWith('http://localhost:') ||
                            origin === 'https://localhost' ||
                            origin.startsWith('https://localhost:') ||
                            origin === 'http://127.0.0.1' ||
                            origin.startsWith('http://127.0.0.1:') ||
                            origin === 'https://127.0.0.1' ||
                            origin.startsWith('https://127.0.0.1:'));
                    // console.log('Auth Check:', { clientIP, host, origin, isLocalhostIp, isLocalhostHost, isLocalhostOrigin });
                    return isLocalhostIp || isLocalhostHost || isLocalhostOrigin;
                };
                allowLocalBypass = process.env.ALLOW_LOCALHOST_ADMIN === 'true';
                isLocalhost = isLocalhostRequest();
                bypassAuth = function () {
                    debug("Bypassing authentication for localhost request: ".concat(req.method, " ").concat(req.path));
                    // Create a default admin user for localhost access
                    var defaultUser = {
                        id: 'localhost-admin',
                        username: 'localhost-admin',
                        email: 'admin@localhost',
                        role: 'admin',
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                    };
                    req.user = defaultUser;
                    req.permissions = _this.authManager.getUserPermissions(defaultUser.role);
                    next();
                };
                try {
                    authHeader = Array.isArray(req.headers.authorization)
                        ? req.headers.authorization[0]
                        : req.headers.authorization;
                    if ((!authHeader || !authHeader.startsWith('Bearer ')) && isLocalhost && allowLocalBypass) {
                        bypassAuth();
                        return [2 /*return*/];
                    }
                    if (!authHeader || !authHeader.startsWith('Bearer ')) {
                        throw new errorClasses_1.AuthenticationError('Bearer token required in Authorization header', undefined, 'missing_token');
                    }
                    token = authHeader.substring(7);
                    payload = this.authManager.verifyAccessToken(token);
                    user = this.authManager.getUser(payload.userId);
                    if (!user) {
                        throw new errorClasses_1.AuthenticationError('User not found', undefined, 'invalid_credentials');
                    }
                    userWithTenant = user;
                    // Attach user, permissions, and tenant to request
                    req.user = userWithTenant;
                    req.permissions = payload.permissions;
                    debug("Authenticated user: ".concat(user.username, " (role: ").concat(user.role, ")"));
                    next();
                }
                catch (error) {
                    // If validation fails BUT we are localhost and allow bypass, proceed as admin
                    if (isLocalhost && allowLocalBypass) {
                        debug('Authentication failed but localhost bypass is active. Proceeding as admin.');
                        bypassAuth();
                        return [2 /*return*/];
                    }
                    debug('Authentication error:', error);
                    // Pass error to Express error handler instead of throwing
                    if (error instanceof errorClasses_1.AuthenticationError) {
                        next(error);
                        return [2 /*return*/];
                    }
                    next(new errorClasses_1.AuthenticationError('Invalid or expired token', undefined, 'expired_token'));
                }
                return [2 /*return*/];
            });
        }); };
        /**
         * Role-based authorization middleware
         * Checks if user has required role
         */
        this.requireRole = function (requiredRole) {
            return function (req, res, next) {
                var authReq = req;
                if (!authReq.user) {
                    next(new errorClasses_1.AuthenticationError('User not authenticated', undefined, 'missing_token'));
                    return;
                }
                var roleHierarchy = {
                    viewer: 1,
                    user: 2,
                    admin: 3,
                };
                var userRoleLevel = roleHierarchy[authReq.user.role] || 0;
                var requiredRoleLevel = roleHierarchy[requiredRole] || 0;
                if (userRoleLevel < requiredRoleLevel) {
                    next(new errorClasses_1.AuthorizationError("Required role: ".concat(requiredRole, ", your role: ").concat(authReq.user.role), 'role_check', 'access', requiredRole));
                    return;
                }
                debug("Role check passed: ".concat(authReq.user.username, " has max level ").concat(userRoleLevel, " >= ").concat(requiredRoleLevel, " for ").concat(requiredRole));
                next();
            };
        };
        /**
         * Permission-based authorization middleware
         * Checks if user has specific permission
         */
        this.requirePermission = function (permission) {
            return function (req, res, next) {
                var _a;
                var authReq = req;
                if (!authReq.user) {
                    next(new errorClasses_1.AuthenticationError('User not authenticated', undefined, 'missing_token'));
                    return;
                }
                if (!((_a = authReq.permissions) === null || _a === void 0 ? void 0 : _a.includes(permission))) {
                    next(new errorClasses_1.AuthorizationError("Required permission: ".concat(permission), 'permission_check', 'access', permission));
                    return;
                }
                debug("Permission check passed: ".concat(authReq.user.username, " has ").concat(permission));
                next();
            };
        };
        /**
         * Admin-only middleware
         * Shortcut for requireRole('admin')
         */
        this.requireAdmin = this.requireRole('admin');
        /**
         * Optional authentication middleware
         * Attaches user to request if token is present, but doesn't fail if missing
         */
        this.optionalAuth = function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
            var authReq, authHeader, token, payload, user;
            return __generator(this, function (_a) {
                authReq = req;
                // Initialize user as undefined
                authReq.user = undefined;
                authReq.permissions = undefined;
                try {
                    authHeader = Array.isArray(req.headers.authorization)
                        ? req.headers.authorization[0]
                        : req.headers.authorization;
                    if (authHeader && authHeader.startsWith('Bearer ')) {
                        token = authHeader.substring(7);
                        payload = this.authManager.verifyAccessToken(token);
                        user = this.authManager.getUser(payload.userId);
                        if (user) {
                            authReq.user = user;
                            authReq.permissions = payload.permissions;
                            debug("Optional auth: authenticated user ".concat(user.username));
                        }
                    }
                }
                catch (error) {
                    // Silently ignore auth errors for optional auth
                    debug('Optional auth error:', error);
                }
                next();
                return [2 /*return*/];
            });
        }); };
        this.authManager = AuthManager_1.AuthManager.getInstance();
    }
    return AuthMiddleware;
}());
exports.AuthMiddleware = AuthMiddleware;
// Create middleware functions that get fresh AuthManager instance
var authenticate = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var middleware;
    return __generator(this, function (_a) {
        middleware = new AuthMiddleware();
        return [2 /*return*/, middleware.authenticate(req, res, next)];
    });
}); };
exports.authenticate = authenticate;
var requireRole = function (requiredRole) {
    var middleware = new AuthMiddleware();
    return middleware.requireRole(requiredRole);
};
exports.requireRole = requireRole;
var requirePermission = function (permission) {
    var middleware = new AuthMiddleware();
    return middleware.requirePermission(permission);
};
exports.requirePermission = requirePermission;
exports.requireAdmin = (function () {
    var middleware = new AuthMiddleware();
    return middleware.requireAdmin;
})();
var optionalAuth = function (req, res, next) { return __awaiter(void 0, void 0, void 0, function () {
    var middleware;
    return __generator(this, function (_a) {
        middleware = new AuthMiddleware();
        return [2 /*return*/, middleware.optionalAuth(req, res, next)];
    });
}); };
exports.optionalAuth = optionalAuth;
/**
 * Tenant middleware - ensures tenant context is set and valid
 */
var requireTenant = function (req, res, next) {
    // Skip tenant validation for now - just pass through
    next();
};
exports.requireTenant = requireTenant;
