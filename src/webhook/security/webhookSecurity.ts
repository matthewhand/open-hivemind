import { Request, Response, NextFunction } from 'express';
import config from '@config';

// Middleware for token-based authentication
export const verifyWebhookToken = (req: Request, res: Response, next: NextFunction): void => {
    const providedToken = req.headers['x-webhook-token'];
    const expectedToken = config.get<string>('WEBHOOK_SECRET_TOKEN');

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

    if (!whitelistedIps.includes(requestIp)) {
        res.status(403).send('Forbidden: Unauthorized IP address');
        return;
    }

    next();
};
