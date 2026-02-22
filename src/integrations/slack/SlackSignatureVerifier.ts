import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Verifies Slack request signatures to ensure authentic requests
 *
 * @class
 * @param {string} signingSecret - The Slack app's signing secret from credentials
 * @example
 * const verifier = new SlackSignatureVerifier(process.env.SLACK_SIGNING_SECRET);
 * app.use('/slack/events', verifier.verify.bind(verifier));
 */
export class SlackSignatureVerifier {
  private signingSecret: string;

  constructor(signingSecret: string) {
    this.signingSecret = signingSecret;
  }

  /**
   * Middleware that verifies Slack request signature
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @param {NextFunction} next - Express next function
   * @returns {void}
   * @throws {Error} If signature verification fails
   * @description
   * - Validates X-Slack headers presence
   * - Generates signature from request body
   * - Compares with provided signature using timing-safe comparison
   */
  public verify(req: Request, res: Response, next: NextFunction): void {
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const slackSignature = req.headers['x-slack-signature'] as string;
    if (!timestamp || !slackSignature) {
      res.status(400).send('Bad Request');
      return;
    }

    // Enforce timestamp skew (5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const tsNum = Number(timestamp);
    if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > 60 * 5) {
      res.status(400).send('Bad Request: stale timestamp');
      return;
    }

    // Prefer a preserved raw body string if provided by upstream middleware
    const reqWithRawBody = req as Request & { rawBody?: unknown };
    const bodyStr =
      reqWithRawBody.rawBody && typeof reqWithRawBody.rawBody === 'string'
        ? reqWithRawBody.rawBody
        : typeof req.body === 'string'
          ? (req.body as string)
          : JSON.stringify(req.body);

    const baseString = `v0:${timestamp}:${bodyStr}`;
    const mySigHex = crypto
      .createHmac('sha256', this.signingSecret)
      .update(baseString)
      .digest('hex');
    const expected = Buffer.from(`v0=${mySigHex}`, 'utf8');
    const provided = Buffer.from(String(slackSignature), 'utf8');

    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      res.status(403).send('Forbidden: Invalid signature');
      return;
    }

    next();
  }
}
