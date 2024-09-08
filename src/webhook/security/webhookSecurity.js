"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyIpWhitelist = exports.verifyWebhookToken = void 0;
const _config_1 = __importDefault(require("@config"));
// Middleware for token-based authentication
const verifyWebhookToken = (req, res, next) => {
    const providedToken = req.headers['x-webhook-token'];
    const expectedToken = _config_1.default.get('WEBHOOK_SECRET_TOKEN');
    if (!providedToken || providedToken !== expectedToken) {
        res.status(403).send('Forbidden: Invalid token');
        return;
    }
    next();
};
exports.verifyWebhookToken = verifyWebhookToken;
// Middleware for IP whitelisting (default to localhost)
const verifyIpWhitelist = (req, res, next) => {
    const whitelistedIps = _config_1.default.get('WEBHOOK_WHITELISTED_IPS') || ['127.0.0.1'];
    const requestIp = req.ip;
    if (!whitelistedIps.includes(requestIp)) {
        res.status(403).send('Forbidden: Unauthorized IP address');
        return;
    }
    next();
};
exports.verifyIpWhitelist = verifyIpWhitelist;
