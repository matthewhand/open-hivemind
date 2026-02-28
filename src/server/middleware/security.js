"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHeaders = securityHeaders;
exports.securityLogging = securityLogging;
exports.apiRateLimit = apiRateLimit;
exports.sanitizeInput = sanitizeInput;
exports.ipWhitelist = ipWhitelist;
exports.secureCORS = secureCORS;
var debug_1 = require("debug");
var errorClasses_1 = require("../../types/errorClasses");
var debug = (0, debug_1.default)('app:securityMiddleware');
// Module-scoped rate-limit store (replaces global.rateLimitStore).
// Scoped to the module lifecycle so it is garbage-collected when the module is
// unloaded and never bleeds between jest test runs after jest.resetModules().
var rateLimitStore = new Map();
// Cache trusted proxies at module load time for performance
var cachedTrustedProxies = null;
/**
 * Security middleware that adds comprehensive security headers
 * to protect against common web vulnerabilities
 */
function securityHeaders(req, res, next) {
    // Prevent clickjacking attacks
    res.setHeader('X-Frame-Options', 'DENY');
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Content Security Policy (CSP)
    var cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:", // Allow inline scripts for WebSocket connections
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' ws: wss: https:", // Allow WebSocket connections
        "media-src 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-src 'none'", // Prevent iframes
        "worker-src 'none'", // Prevent web workers
        "manifest-src 'self'",
        "prefetch-src 'self'",
    ];
    if (process.env.NODE_ENV === 'development') {
        // Relax CSP for development
        cspDirectives.push("script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https://localhost:*");
        cspDirectives.push("connect-src 'self' ws: wss: http://localhost:* https://localhost:*");
        cspDirectives.push("style-src 'self' 'unsafe-inline' http://localhost:* https://fonts.googleapis.com");
    }
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    // HSTS (HTTP Strict Transport Security) - only in production
    if (process.env.NODE_ENV === 'production' && req.secure) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    // Remove server information
    res.removeHeader('X-Powered-By');
    // Add custom security headers
    res.setHeader('X-Application-Name', 'Open-Hivemind');
    res.setHeader('X-Application-Version', process.env.npm_package_version || '1.0.0');
    debug('Security headers applied to response');
    next();
}
/**
 * Request logging middleware for security monitoring
 */
function securityLogging(req, res, next) {
    var startTime = Date.now();
    var clientIP = getClientIP(req);
    var userAgent = req.get('User-Agent') || 'Unknown';
    // Log security-relevant information
    debug('Security Log - Request:', {
        method: req.method,
        url: req.url,
        ip: clientIP,
        userAgent: userAgent.substring(0, 100), // Truncate long user agents
        timestamp: new Date().toISOString(),
        headers: {
            'content-type': req.get('content-type'),
            accept: req.get('accept'),
            referer: req.get('referer'),
            origin: req.get('origin'),
        },
    });
    // Log response
    res.on('finish', function () {
        var duration = Date.now() - startTime;
        debug('Security Log - Response:', {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: "".concat(duration, "ms"),
            ip: clientIP,
        });
        // Alert on suspicious activity
        if (res.statusCode >= 400) {
            debug('Security Alert - Error response:', {
                method: req.method,
                url: req.url,
                status: res.statusCode,
                ip: clientIP,
                userAgent: userAgent.substring(0, 50),
            });
        }
        // Alert on slow responses (potential DoS)
        if (duration > 10000) {
            // 10 seconds
            debug('Security Alert - Slow response:', {
                method: req.method,
                url: req.url,
                duration: "".concat(duration, "ms"),
                ip: clientIP,
            });
        }
    });
    next();
}
/**
 * Rate limiting middleware for API endpoints
 */
function apiRateLimit(req, res, next) {
    var clientIP = getClientIP(req);
    var now = Date.now();
    var windowMs = 15 * 60 * 1000; // 15 minutes
    var maxRequests = 100; // requests per window
    // This is a simple in-memory rate limiter
    // In production, you'd want to use Redis or another persistent store
    var key = "ratelimit:".concat(clientIP);
    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { requests: [], resetTime: now + windowMs });
    }
    var clientData = rateLimitStore.get(key);
    // Clean up old requests
    clientData.requests = clientData.requests.filter(function (timestamp) { return timestamp > now - windowMs; });
    // Check if limit exceeded
    if (clientData.requests.length >= maxRequests) {
        debug('Rate limit exceeded for IP:', clientIP);
        var retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
        return next(new errorClasses_1.RateLimitError('Rate limit exceeded. Please try again later.', retryAfter, maxRequests, 0, new Date(clientData.resetTime)));
    }
    // Add current request
    clientData.requests.push(now);
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - clientData.requests.length).toString());
    res.setHeader('X-RateLimit-Reset', clientData.resetTime.toString());
    next();
}
/**
 * Input sanitization middleware
 */
function sanitizeInput(req, res, next) {
    // Sanitize query parameters
    if (req.query) {
        for (var _i = 0, _a = Object.entries(req.query); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (typeof value === 'string') {
                // Remove potentially dangerous characters
                var sanitized = value.replace(/[<>'"&]/g, '');
                req.query[key] = sanitized;
            }
        }
    }
    // Sanitize body parameters (for POST/PUT requests)
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    // Sanitize headers and cookies
    sanitizeHeaders(req);
    sanitizeCookies(req);
    next();
}
/**
 * Recursively sanitize object properties
 * Strips script injection patterns without HTML-encoding data values,
 * which would corrupt legitimate API payloads (URLs with &, JSON strings, etc.).
 */
function sanitizeObject(obj) {
    for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (typeof value === 'string') {
            // Strip dangerous script/iframe tags and event handler attributes.
            // Do NOT HTML-encode characters like <, >, &, ', " — these are valid
            // in API request values and encoding them corrupts the data.
            obj[key] = value
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
        }
        else if (typeof value === 'object' && value !== null) {
            sanitizeObject(value);
        }
    }
}
/**
 * Sanitize request headers
 * Only strips script-injection patterns from non-security-sensitive headers.
 * Headers such as Authorization and Cookie carry opaque token values and must
 * not be modified — stripping characters from them breaks authentication.
 */
var SKIP_HEADER_SANITIZATION = new Set([
    'authorization',
    'cookie',
    'set-cookie',
    'proxy-authorization',
]);
function sanitizeHeaders(req) {
    if (req.headers) {
        for (var _i = 0, _a = Object.entries(req.headers); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (SKIP_HEADER_SANITIZATION.has(key.toLowerCase())) {
                continue;
            }
            if (typeof value === 'string') {
                // Strip script tags and javascript: URIs from header values.
                req.headers[key] = value
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '');
            }
        }
    }
}
/**
 * Sanitize request cookies
 */
function sanitizeCookies(req) {
    if (req.cookies) {
        for (var _i = 0, _a = Object.entries(req.cookies); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (typeof value === 'string') {
                // Remove potentially dangerous characters from cookies
                req.cookies[key] = value.replace(/[<>'"&]/g, '');
            }
        }
    }
}
/**
 * Configuration for trusted proxies
 * Can be set via TRUSTED_PROXIES env variable (comma-separated)
 * Defaults to common local/internal network addresses
 */
function getTrustedProxies() {
    // Return cached value if available
    if (cachedTrustedProxies !== null) {
        return cachedTrustedProxies;
    }
    var envProxies = process.env.TRUSTED_PROXIES;
    if (envProxies) {
        var proxies = [];
        var entries = envProxies
            .split(',')
            .map(function (ip) { return ip.trim(); })
            .filter(Boolean);
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var entry = entries_1[_i];
            // Allow wildcard
            if (entry === '*') {
                proxies.push(entry);
                continue;
            }
            // Validate CIDR notation
            if (entry.includes('/')) {
                var _a = entry.split('/'), network = _a[0], prefix = _a[1];
                var prefixNum = parseInt(prefix, 10);
                if (!isNaN(prefixNum) &&
                    prefixNum >= 0 &&
                    prefixNum <= 32 &&
                    network.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
                    proxies.push(entry);
                }
                else {
                    debug('Warning: Invalid CIDR in TRUSTED_PROXIES:', entry);
                }
                continue;
            }
            // Validate IP address (basic check)
            if (entry.match(/^(\d{1,3}\.){3}\d{1,3}$/) ||
                entry.match(/^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/) ||
                entry === '::1') {
                proxies.push(entry);
            }
            else {
                debug('Warning: Invalid IP in TRUSTED_PROXIES:', entry);
            }
        }
        cachedTrustedProxies = proxies;
        return proxies;
    }
    // Default trusted proxies - localhost and private network ranges
    cachedTrustedProxies = [
        '127.0.0.1',
        '::1',
        '::ffff:127.0.0.1',
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
    ];
    return cachedTrustedProxies;
}
/**
 * Check if an IP address matches a trusted proxy
 * Supports CIDR notation for ranges
 */
function isTrustedProxy(ip) {
    var trustedProxies = getTrustedProxies();
    for (var _i = 0, trustedProxies_1 = trustedProxies; _i < trustedProxies_1.length; _i++) {
        var trusted = trustedProxies_1[_i];
        // Check for exact match
        if (!trusted.includes('/')) {
            if (ip === trusted || ip === "::ffff:".concat(trusted)) {
                return true;
            }
        }
        else if (ip === trusted) {
            return true;
        }
        // Check for wildcard (allow all) - only '*' is supported, not '0.0.0.0'
        if (trusted === '*') {
            return true;
        }
        // Check CIDR notation
        if (trusted.includes('/')) {
            if (isIPInCIDR(ip, trusted)) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Validate and sanitize an IP address
 * Returns null if the IP is invalid or potentially malicious
 */
function validateIP(ip) {
    if (!ip || typeof ip !== 'string') {
        return null;
    }
    // Trim whitespace
    ip = ip.trim();
    // Reject IPs with suspicious characters (prevent header injection)
    if (/[\r\n\0]/.test(ip)) {
        return null;
    }
    // Handle IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
    var ipv4Match = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (ipv4Match) {
        ip = ipv4Match[1];
    }
    // Validate IPv4 format
    var ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    var ipv4Result = ip.match(ipv4Regex);
    if (ipv4Result) {
        var a = ipv4Result[1], b = ipv4Result[2], c = ipv4Result[3], d = ipv4Result[4];
        var octets = [a, b, c, d];
        for (var _i = 0, octets_1 = octets; _i < octets_1.length; _i++) {
            var octet = octets_1[_i];
            // Reject leading zeros (octal confusion attack) - only "0" is allowed
            if (octet.length > 1 && octet.startsWith('0')) {
                return null;
            }
            var num = parseInt(octet, 10);
            if (isNaN(num) || num < 0 || num > 255) {
                return null;
            }
        }
        return ip;
    }
    // Validate IPv6 format (basic check)
    // IPv6 can be compressed, so we just check for valid hex characters and colons
    var ipv6Regex = /^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$|^::1$/;
    if (ipv6Regex.test(ip)) {
        return ip;
    }
    return null;
}
/**
 * Get the immediate connection IP (not from headers)
 * This is the IP that actually connected to the server
 */
function getConnectionIP(req) {
    var _a;
    var remoteAddress = ((_a = req.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress) || 'unknown';
    var validated = validateIP(remoteAddress);
    return validated || 'unknown';
}
/**
 * Get client IP address from request
 *
 * SECURITY: This function now validates that proxy headers are only trusted
 * when the request comes from a trusted proxy. This prevents IP spoofing attacks
 * where an attacker could set X-Forwarded-For to 127.0.0.1 to bypass access controls.
 */
function getClientIP(req) {
    // Get the actual connection IP
    var connectionIP = getConnectionIP(req);
    // Only trust proxy headers if the connection comes from a trusted proxy
    if (!isTrustedProxy(connectionIP)) {
        debug('Untrusted proxy - using connection IP:', connectionIP);
        return connectionIP;
    }
    // Trust proxy headers - check in order of preference
    // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
    // The first IP is the original client
    var forwardedFor = req.get('x-forwarded-for');
    if (forwardedFor) {
        // X-Forwarded-For can contain multiple IPs separated by commas
        // We take the first one as the client IP, but validate it
        var ips = forwardedFor.split(',').map(function (ip) { return ip.trim(); });
        for (var _i = 0, ips_1 = ips; _i < ips_1.length; _i++) {
            var ip = ips_1[_i];
            var validated = validateIP(ip);
            if (validated) {
                debug('Using X-Forwarded-For IP:', validated, 'via trusted proxy:', connectionIP);
                return validated;
            }
        }
    }
    var realIP = req.get('x-real-ip');
    if (realIP) {
        var validated = validateIP(realIP);
        if (validated) {
            debug('Using X-Real-IP:', validated, 'via trusted proxy:', connectionIP);
            return validated;
        }
    }
    var clientIP = req.get('x-client-ip');
    if (clientIP) {
        var validated = validateIP(clientIP);
        if (validated) {
            debug('Using X-Client-IP:', validated, 'via trusted proxy:', connectionIP);
            return validated;
        }
    }
    // Fall back to connection remote address
    debug('No proxy headers found, using connection IP:', connectionIP);
    return connectionIP;
}
/**
 * IP whitelist middleware for admin endpoints
 */
function ipWhitelist(req, res, next) {
    var _a;
    var clientIP = getClientIP(req);
    // Get whitelist from environment or config
    var whitelistEnv = process.env.ADMIN_IP_WHITELIST;
    var whitelist = [];
    if (whitelistEnv) {
        whitelist = whitelistEnv.split(',').map(function (ip) { return ip.trim(); });
    }
    else {
        // Try to load from config files
        try {
            var config = require('config');
            var adminConfig = config.get('admin');
            if (adminConfig && adminConfig.ipWhitelist && Array.isArray(adminConfig.ipWhitelist)) {
                whitelist = adminConfig.ipWhitelist;
            }
        }
        catch (configError) {
            debug('Could not load config for IP whitelist:', configError);
        }
        // Default to localhost for development if no config found
        if (whitelist.length === 0) {
            whitelist = ['127.0.0.1', '::1', 'localhost'];
        }
    }
    // Check if IP is in whitelist
    var isAllowed = whitelist.some(function (allowedIP) {
        if (allowedIP === '*') {
            return true; // Allow all
        }
        if (allowedIP.includes('/')) {
            // CIDR notation support (basic)
            return isIPInCIDR(clientIP, allowedIP);
        }
        return clientIP === allowedIP || clientIP === "::ffff:".concat(allowedIP);
    });
    if (!isAllowed) {
        debug('IP access denied:', {
            ip: clientIP,
            method: req.method,
            url: req.url,
            userAgent: (_a = req.get('User-Agent')) === null || _a === void 0 ? void 0 : _a.substring(0, 100),
        });
        res.status(403).json({
            error: 'Access Denied',
            message: 'Your IP address is not authorized to access this resource.',
        });
        return;
    }
    debug('IP access granted:', { ip: clientIP, method: req.method, url: req.url });
    next();
}
/**
 * Convert IPv4 address to numeric representation for comparison
 * Returns NaN for invalid IP addresses
 */
function ipToLong(ip) {
    // Validate IP format first
    if (!ip || typeof ip !== 'string') {
        return NaN;
    }
    var parts = ip.split('.');
    if (parts.length !== 4) {
        return NaN;
    }
    var nums = parts.map(function (p) { return parseInt(p, 10); });
    // Validate each octet is a number between 0-255
    for (var _i = 0, nums_1 = nums; _i < nums_1.length; _i++) {
        var num = nums_1[_i];
        if (isNaN(num) || num < 0 || num > 255) {
            return NaN;
        }
    }
    return (nums[0] << 24) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
}
/**
 * Check if an IP address is in a CIDR range
 * Supports both IPv4 and IPv4-mapped IPv6 addresses
 * Note: IPv6 CIDR ranges are not currently supported
 */
function isIPInCIDR(ip, cidr) {
    try {
        // Handle IPv4-mapped IPv6 addresses
        var cleanIP = ip;
        var ipv4Match = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
        if (ipv4Match) {
            cleanIP = ipv4Match[1];
        }
        // Only support IPv4 CIDR for now - warn if IPv6 CIDR is provided
        if (!cleanIP.includes('.') || cleanIP.includes(':')) {
            return false;
        }
        // Validate CIDR network part is IPv4
        var _a = cidr.split('/'), network = _a[0], prefixStr = _a[1];
        if (!network.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
            debug('Warning: IPv6 CIDR not supported:', cidr);
            return false;
        }
        var prefix = parseInt(prefixStr, 10);
        if (isNaN(prefix) || prefix < 0 || prefix > 32) {
            return false;
        }
        var ipLong = ipToLong(cleanIP);
        var networkLong = ipToLong(network);
        // Validate IP conversions succeeded
        if (isNaN(ipLong) || isNaN(networkLong)) {
            return false;
        }
        // Handle /0 prefix specially - it should match all IPs
        // Note: JavaScript shift is modulo 32, so -1 << 32 === -1, not 0
        if (prefix === 0) {
            return true;
        }
        var mask = -1 << (32 - prefix);
        return (ipLong & mask) === (networkLong & mask);
    }
    catch (e) {
        debug('CIDR parsing error:', e);
        return false;
    }
}
/**
 * CORS middleware with security considerations
 */
function secureCORS(req, res, next) {
    var origin = req.get('origin');
    // Allow specific origins or localhost in development
    var allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
    ];
    // In production, you might want to restrict this further
    if (process.env.NODE_ENV === 'development' || !origin || allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
}
