import { Request, Response, NextFunction } from 'express';
import config from '../../config';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo'; // Importing redaction utility

// Middleware for token-based authentication
export const verifyWebhookToken = (req: Request, res: Response, next: NextFunction): void => {
    const providedToken = req.headers['x-webhook-token'];
    const expectedToken = config.get<string>('WEBHOOK_SECRET_TOKEN');

    // Redact sensitive token information in logs
    console.debug('Provided Token:', redactSensitiveInfo(providedToken));
    console.debug('Expected Token:', redactSensitiveInfo(expectedToken));

    if (!expectedToken) {
        throw new Error('WEBHOOK_SECRET_TOKEN is not defined in config');
    }

    if (!providedToken || providedToken !== expectedToken) {
        res.status(403).send('Forbidden: Invalid token');
        return;
    }

    next();
};

// Middleware for IP whitelisting (default to localhost)
export const verifyIpWhitelist = (req: Request, res: Response, next: NextFunction): void => {
    const whitelistedIps = config.get<string[]>('WEBHOOK_WHITELISTED_IPS') || ['127.0.0.1'];
    const requestIp = req.ip;

    console.debug('Request IP:', requestIp);
    console.debug('Whitelisted IPs:', whitelistedIps);

    if (!whitelistedIps || whitelistedIps.length === 0) {
        throw new Error('WEBHOOK_WHITELISTED_IPS is not defined or empty in config');
    }

    if (!whitelistedIps.includes(requestIp)) {
        res.status(403).send('Forbidden: Unauthorized IP address');
        return;
    }

    next();
};
