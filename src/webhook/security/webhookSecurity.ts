import { Request, Response, NextFunction } from 'express';
import webhookConfig from '@src/webhook/interfaces/webhookConfig';

export const verifyWebhookToken = (req: Request, res: Response, next: NextFunction): void => {
    const providedToken: string = req.headers['x-webhook-token'] ? String(req.headers['x-webhook-token']) : '';
    const expectedToken: string = String(webhookConfig.get('WEBHOOK_TOKEN'));

    if (!expectedToken) {
        throw new Error('WEBHOOK_TOKEN is not defined in config');
    }

    if (!providedToken || providedToken !== expectedToken) {
        res.status(403).send('Forbidden: Invalid token');
        return;
    }

    next();
};

export const verifyIpWhitelist = (req: Request, res: Response, next: NextFunction): void => {
    const whitelistedIps: string[] = webhookConfig.get('WEBHOOK_IP_WHITELIST') ? webhookConfig.get('WEBHOOK_IP_WHITELIST').split(',') : [];
    const requestIp: string = req.ip ?? '';

    if (whitelistedIps.length === 0) {
        console.log("No WEBHOOK_IP_WHITELIST set, allowing all IPs");
        next();
        return;
    }

    if (!whitelistedIps.includes(requestIp)) {
        res.status(403).send('Forbidden: Unauthorized IP address');
        return;
    }

    next();
};
