import type { NextFunction, Request, Response } from 'express';
import webhookConfig from '@config/webhookConfig';
import Logger from '@common/logger';
import crypto from 'crypto';

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

  if (!providedToken) {
    res.status(403).send('Forbidden: Invalid token');
    return;
  }

  // Prevent timing attacks using crypto.timingSafeEqual
  const providedBuffer = Buffer.from(providedToken, 'utf8');
  const expectedBuffer = Buffer.from(expectedToken, 'utf8');

  let isEqual = false;

  if (providedBuffer.length !== expectedBuffer.length) {
    // If lengths are different, do a constant-time compare of expectedBuffer with itself
    // to prevent leaking the length of the expected token.
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
  } else {
    isEqual = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  }

  if (!isEqual) {
    res.status(403).send('Forbidden: Invalid token');
    return;
  }

  next();
};

// Validate IPv4 format
const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export const verifyIpWhitelist = (req: Request, res: Response, next: NextFunction): void => {
  const whitelistedIps: string[] = webhookConfig.get('WEBHOOK_IP_WHITELIST')
    ? String(webhookConfig.get('WEBHOOK_IP_WHITELIST'))
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  let requestIp: string = req.ip ?? '';

  // Handle IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
  const ipv4Match = requestIp.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4Match) {
    requestIp = ipv4Match[1];
  }

  // Basic IP Validation to prevent spoofed/malformed IPs
  const isIpv4 = ipv4Regex.test(requestIp);
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$|^::1$/;
  const isIpv6 = ipv6Regex.test(requestIp);

  if (!isIpv4 && !isIpv6) {
    res.status(403).send('Forbidden: Malformed IP address');
    return;
  }

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
