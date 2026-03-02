import crypto from 'crypto';
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

  if (!providedToken) {
    res.status(403).send('Forbidden: Invalid token');
    return;
  }

  // Prevent timing attacks using crypto.timingSafeEqual.
  // Pad both buffers to the same length so that length differences do not
  // leak information about the expected token via timing side-channels.
  const providedBuffer = Buffer.from(providedToken, 'utf8');
  const expectedBuffer = Buffer.from(expectedToken, 'utf8');

  const maxLen = Math.max(providedBuffer.length, expectedBuffer.length);
  const paddedProvided = Buffer.alloc(maxLen);
  const paddedExpected = Buffer.alloc(maxLen);
  providedBuffer.copy(paddedProvided);
  expectedBuffer.copy(paddedExpected);

  const isEqual =
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(paddedProvided, paddedExpected);

  if (!isEqual) {
    res.status(403).send('Forbidden: Invalid token');
    return;
  }

  next();
};

/**
 * Validate that all octets of an IPv4 address are in the range 0-255.
 */
const isValidIpv4 = (ip: string): boolean => {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ipv4Regex.exec(ip);
  if (!match) return false;
  return [match[1], match[2], match[3], match[4]].every((octet) => {
    const n = parseInt(octet, 10);
    return n >= 0 && n <= 255;
  });
};

/**
 * Validate an IPv6 address using Node's built-in net module for full RFC 4291
 * compliance (handles compressed notation, embedded IPv4, loopback, etc.).
 */
const isValidIpv6 = (ip: string): boolean => {
  // Use the net module for authoritative IPv6 validation
  try {
    const net = require('net') as typeof import('net');
    return net.isIPv6(ip);
  } catch {
    return false;
  }
};

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

  // Validate IP format before whitelist evaluation
  const validIp = isValidIpv4(requestIp) || isValidIpv6(requestIp);

  if (!validIp) {
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
