import type { NextFunction, Request, Response } from 'express';
import webhookConfig from '@config/webhookConfig';
import Logger from '@common/logger';

export const verifyWebhookToken = (req: Request, res: Response, next: NextFunction): void => {
  // Handle case-insensitive header names; Express normally lowercases, but unit tests pass raw objects
  const headerKey = Object.keys(req.headers || {}).find(
    (k) => k.toLowerCase() === 'x-webhook-token'
  );
  const providedToken: string = headerKey ? String((req.headers as any)[headerKey]) : '';
  const expectedToken = String(webhookConfig.get('WEBHOOK_TOKEN'));

  if (!expectedToken) {
    throw new Error('WEBHOOK_TOKEN is not configured');
  }

  if (!providedToken || providedToken !== expectedToken) {
    res.status(403).send('Forbidden: Invalid token');
    return;
  }

  next();
};

export const verifyIpWhitelist = (req: Request, res: Response, next: NextFunction): void => {
  const whitelistedIps: string[] = webhookConfig.get('WEBHOOK_IP_WHITELIST')
    ? String(webhookConfig.get('WEBHOOK_IP_WHITELIST'))
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const requestIp: string = req.ip ?? '';

  if (whitelistedIps.length === 0) {
    Logger.warn('No WEBHOOK_IP_WHITELIST set, allowing all IPs');
    next();
    return;
  }

  if (!whitelistedIps.includes(requestIp)) {
    res.status(403).send('Forbidden: Unauthorized IP address');
    return;
  }

  next();
};
