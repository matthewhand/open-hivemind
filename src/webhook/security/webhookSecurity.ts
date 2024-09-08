import { Request, Response, NextFunction } from 'express';
import webhookConfig from '@src/webhook/interfaces/webhookConfig';

export const verifyWebhookToken = (req: Request, res: Response, next: NextFunction): void => {
    const providedToken = String(req.headers['x-webhook-token'] || '');
    const expectedToken: string = webhookConfig.get('WEBHOOK_SECRET_TOKEN') as string;

    if (!expectedToken) {
        throw new Error('WEBHOOK_SECRET_TOKEN is not defined in config');
    }

    if (!providedToken || providedToken !== expectedToken) {
        res.status(403).send('Forbidden: Invalid token');
        return;
    }

    next();
};

export const verifyIpWhitelist = (req: Request, res: Response, next: NextFunction): void => {
    const whitelistedIps: string[] = webhookConfig.get('WEBHOOK_WHITELISTED_IPS') as string[];
    const requestIp = req.ip;

    if (whitelistedIps.length === 0) {
        throw new Error('WEBHOOK_WHITELISTED_IPS is not defined or empty in config');
    }

    if (!whitelistedIps.includes(requestIp)) {
        res.status(403).send('Forbidden: Unauthorized IP address');
        return;
    }

    next();
};
