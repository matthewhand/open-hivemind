import crypto from 'crypto';
import net from 'net';
import type { NextFunction, Request, Response } from 'express';
import webhookConfig from '@config/webhookConfig';
import Logger from '@common/logger';

export const verifyWebhookToken = (req: Request, res: Response, next: NextFunction): void => {
  // Handle case-insensitive header names; Express normally lowercases, but unit tests pass raw objects
  const headerKey = Object.keys(req.headers || {}).find(
    (k) => k.toLowerCase() === 'x-webhook-token'
  );

  let providedToken: string = headerKey ? String(req.headers[headerKey.toLowerCase()]) : '';

  // Fallback to Authorization Bearer token if x-webhook-token is not provided
  // RFC 6750 specifies Bearer token format: Bearer <token>
  const BEARER_PREFIX = 'bearer ';
  if (!providedToken) {
    const authHeaderKey = Object.keys(req.headers || {}).find(
      (k) => k.toLowerCase() === 'authorization'
    );
    if (authHeaderKey) {
      const authHeaderValue = String(req.headers[authHeaderKey.toLowerCase()]);
      if (authHeaderValue.toLowerCase().startsWith(BEARER_PREFIX)) {
        providedToken = authHeaderValue.substring(BEARER_PREFIX.length).trim();
      }
    }
  }

  let expectedToken: string;
  try {
    expectedToken = String(webhookConfig.get('WEBHOOK_TOKEN'));
  } catch (error: unknown) {
    Logger.error('Webhook configuration error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).send('Internal Server Error: Webhook configuration error');
    return;
  }

  if (!expectedToken) {
    Logger.error('WEBHOOK_TOKEN is not configured', { method: req.method, path: req.path });
    res.status(500).send('Internal Server Error: Webhook is misconfigured');
    return;
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
    return net.isIPv6(ip);
  } catch {
    return false;
  }
};

export const verifyIpWhitelist = (req: Request, res: Response, next: NextFunction): void => {
  let whitelistedIps: string[] = [];
  try {
    whitelistedIps = webhookConfig.get('WEBHOOK_IP_WHITELIST')
      ? String(webhookConfig.get('WEBHOOK_IP_WHITELIST'))
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  } catch (error: unknown) {
    Logger.error('Webhook configuration error', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).send('Internal Server Error: Webhook configuration error');
    return;
  }

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
    Logger.warn('No WEBHOOK_IP_WHITELIST set, blocking request');
    res.status(403).send('Forbidden: IP whitelist is empty');
    return;
  }

  if (!whitelistedIps.includes(requestIp)) {
    res.status(403).send('Forbidden: Unauthorized IP address');
    return;
  }

  next();
};

/**
 * Verify Slack signature for incoming webhooks.
 *
 * Uses crypto.createHmac('sha256', SLACK_SIGNING_SECRET) to verify the X-Slack-Signature
 * and X-Slack-Request-Timestamp headers.
 *
 * Note: Requires the raw request body (added by setupMiddleware via verify function).
 */
export const verifySlackSignature = (req: Request, res: Response, next: NextFunction): void => {
  const signature = req.headers['x-slack-signature'] as string;
  const timestamp = req.headers['x-slack-request-timestamp'] as string;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    Logger.warn('SLACK_SIGNING_SECRET is not configured, skipping signature verification');
    return next();
  }

  if (!signature || !timestamp) {
    Logger.warn('Missing Slack signature headers', { path: req.path });
    res.status(401).send('Unauthorized: Missing Slack headers');
    return;
  }

  // Prevent replay attacks (5 minute window)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp, 10) < fiveMinutesAgo) {
    Logger.warn('Slack request timestamp is too old', { timestamp, path: req.path });
    res.status(401).send('Unauthorized: Request too old');
    return;
  }

  const rawBody = (req as any).rawBody;
  if (rawBody === undefined) {
    Logger.error(
      'Raw body not found for Slack signature verification. Ensure setupMiddleware is configured.'
    );
    res.status(500).send('Internal Server Error: Missing raw body');
    return;
  }

  const sigBaseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  const mySignature = 'v0=' + hmac.update(sigBaseString).digest('hex');

  try {
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const mySignatureBuffer = Buffer.from(mySignature, 'utf8');

    if (
      signatureBuffer.length === mySignatureBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, mySignatureBuffer)
    ) {
      next();
    } else {
      Logger.warn('Invalid Slack signature', { path: req.path });
      res.status(401).send('Unauthorized: Invalid Slack signature');
    }
  } catch (error) {
    Logger.error('Error during Slack signature verification', { error });
    res.status(401).send('Unauthorized: Signature verification error');
  }
};
