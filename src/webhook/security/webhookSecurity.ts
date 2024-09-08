import { Request, Response, NextFunction } from 'express';
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';

// Middleware for token-based authentication
export const verifyWebhookToken = (req: Request, res: Response, next: NextFunction): void => {
    const providedToken = req.headers['x-webhook-token'] as string | undefined;
    const expectedToken = discordConfig.get('WEBHOOK_SECRET_TOKEN');

    console.debug('Provided Token:', redactSensitiveInfo('x-webhook-token', providedToken));
    console.debug('Expected Token:', redactSensitiveInfo('WEBHOOK_SECRET_TOKEN', expectedToken));

    if (!expectedToken) {
        throw new Error('WEBHOOK_SECRET_TOKEN is not defined in config');
    }

    if (!providedToken || providedToken !== expectedToken) {
        res.status(403).send('Forbidden: Invalid token');
        return;
    }

    next();
};

// Middleware for IP whitelisting
export const verifyIpWhitelist = (req: Request, res: Response, next: NextFunction): void => {
    const whitelistedIps = discordConfig.get<string[]>('WEBHOOK_WHITELISTED_IPS');
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
