"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAdminAction = exports.logBotAction = exports.logConfigChange = exports.auditMiddleware = void 0;
var debug_1 = require("debug");
var auditLogger_1 = require("../../common/auditLogger");
var debug = (0, debug_1.default)('app:auditMiddleware');
/**
 * Middleware to extract user information for audit logging
 */
var auditMiddleware = function (req, res, next) {
    var _a, _b, _c, _d, _e;
    try {
        // Extract user information from various sources
        var user = 'anonymous';
        // Check for authenticated user from RBAC system
        if (req.user) {
            var userObj = req.user;
            user = userObj.username || userObj.email || userObj.id || 'authenticated-user';
        }
        // Extract IP address
        var ipAddress = req.ip ||
            ((_a = req.connection) === null || _a === void 0 ? void 0 : _a.remoteAddress) ||
            ((_b = req.socket) === null || _b === void 0 ? void 0 : _b.remoteAddress) ||
            ((_c = req.headers) === null || _c === void 0 ? void 0 : _c['x-forwarded-for']) ||
            ((_d = req.headers) === null || _d === void 0 ? void 0 : _d['x-real-ip']) ||
            'unknown';
        // Extract user agent
        var userAgent = ((_e = req.headers) === null || _e === void 0 ? void 0 : _e['user-agent']) || 'unknown';
        // Attach to request for use in route handlers
        req.auditUser = user;
        req.auditIp = ipAddress;
        req.auditUserAgent = userAgent;
        next();
    }
    catch (error) {
        debug('Audit middleware error:', error);
        next();
    }
};
exports.auditMiddleware = auditMiddleware;
/**
 * Helper function to log configuration changes
 */
var logConfigChange = function (req, action, resource, result, details, options) {
    if (options === void 0) { options = {}; }
    var auditLogger = auditLogger_1.AuditLogger.getInstance();
    auditLogger.logConfigChange(req.auditUser || 'unknown', action, resource, result, details, __assign({ ipAddress: req.auditIp, userAgent: req.auditUserAgent }, options));
};
exports.logConfigChange = logConfigChange;
/**
 * Helper function to log bot actions
 */
var logBotAction = function (req, action, botName, result, details, options) {
    if (options === void 0) { options = {}; }
    var auditLogger = auditLogger_1.AuditLogger.getInstance();
    auditLogger.logBotAction(req.auditUser || 'unknown', action, botName, result, details, __assign({ ipAddress: req.auditIp, userAgent: req.auditUserAgent }, options));
};
exports.logBotAction = logBotAction;
/**
 * Helper function to log admin actions
 */
var logAdminAction = function (req, action, resource, result, details, options) {
    if (options === void 0) { options = {}; }
    var auditLogger = auditLogger_1.AuditLogger.getInstance();
    auditLogger.logAdminAction(req.auditUser || 'unknown', action, resource, result, details, __assign({ ipAddress: req.auditIp, userAgent: req.auditUserAgent }, options));
};
exports.logAdminAction = logAdminAction;
exports.default = exports.auditMiddleware;
