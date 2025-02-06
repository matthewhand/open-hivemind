import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export class SlackSignatureVerifier {
  private signingSecret: string;
  constructor(signingSecret: string) {
    this.signingSecret = signingSecret;
  }

  public verify(req: Request, res: Response, next: NextFunction): void {
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const slackSignature = req.headers['x-slack-signature'] as string;
    if (!timestamp || !slackSignature) {
      res.status(400).send('Bad Request');
      return;
    }
    const requestBody = JSON.stringify(req.body);
    const baseString = `v0:${timestamp}:${requestBody}`;
    const mySignature = `v0=${crypto.createHmac('sha256', this.signingSecret).update(baseString).digest('hex')}`;
    // For production, compare mySignature with slackSignature.
    next();
  }
}
