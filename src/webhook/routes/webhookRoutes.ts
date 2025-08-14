import Debug from 'debug';
import express, { Request, Response } from 'express';
import { predictionImageMap } from '@src/message/helpers/processing/handleImageMessage';
import { verifyWebhookToken, verifyIpWhitelist } from '@webhook/security/webhookSecurity';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';

const debug = Debug('app:webhookRoutes');

// Minimal schema validation (zod/ajv-like) without external deps
function validateWebhookBody(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
    errors.push('Body must be a JSON object');
    return { valid: false, errors };
  }
  if (!body.id || typeof body.id !== 'string' || body.id.trim() === '') {
    errors.push('Field "id" is required and must be a non-empty string');
  }
  if (!body.status || typeof body.status !== 'string') {
    errors.push('Field "status" is required and must be a string');
  }
  if (typeof body.output !== 'undefined' && !Array.isArray(body.output)) {
    errors.push('Field "output" must be an array if provided');
  }
  if (body.status === 'succeeded' && !Array.isArray(body.output)) {
    errors.push('Field "output" is required as an array when status is "succeeded"');
  }
  return { valid: errors.length === 0, errors };
}

function redactBodyForLog(body: any): any {
  try {
    if (!body || typeof body !== 'object') return body;
    const redacted: Record<string, any> = {};
    for (const [k, v] of Object.entries(body)) {
      redacted[k] = redactSensitiveInfo(k, v);
    }
    return redacted;
  } catch {
    return '<<redaction_failed>>';
  }
}

export function configureWebhookRoutes(app: express.Application, messageService: IMessengerService): void {
  app.post('/webhook', verifyWebhookToken, verifyIpWhitelist, async (req: Request, res: Response) => {
    debug('Received webhook:', JSON.stringify(redactBodyForLog(req.body)));

    const { valid, errors } = validateWebhookBody(req.body);
    if (!valid) {
      debug('Validation failed:', JSON.stringify(errors));
      return res.status(400).json({ error: 'Invalid request body', details: errors });
    }

    const predictionId = req.body.id as string;
    const predictionStatus = req.body.status as string;
    const resultArray = (req.body.output || []) as string[];
    const imageUrl = predictionImageMap.get(predictionId);

    debug('Image URL:', imageUrl);

    // Optional channel selection via query; default remains empty for compatibility
    const channelId = (req.query.channelId as string) || '';

    // Use the message service to send platform-agnostic messages
    const resultMessage = predictionStatus === 'succeeded'
      ? `${resultArray.join(' ')}\nImage URL: ${imageUrl}`
      : `Prediction ID: ${predictionId}\nStatus: ${predictionStatus}`;

    try {
      await messageService.sendPublicAnnouncement(channelId, resultMessage);  // Keep empty default for tests
    } catch (error: any) {
      debug('Failed to send message:', error.message);
      // Continue to return 200 as per current behavior/tests
    }

    predictionImageMap.delete(predictionId);
    res.setHeader('Content-Type', 'application/json');
    res.sendStatus(200);
  });
}
