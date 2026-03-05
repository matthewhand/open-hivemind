import Debug from 'debug';
import type { Request, Response } from 'express';
import type express from 'express';
import { predictionImageMap } from '@src/message/helpers/processing/handleImageMessage';
import type { IMessengerService } from '@message/interfaces/IMessengerService';
// Import after jest.doMock of config to allow per-test overrides
import { verifyIpWhitelist, verifyWebhookToken } from '@webhook/security/webhookSecurity';

const debug = Debug('app:webhookRoutes');

// Webhook request body schema validation
function validateWebhookBody(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    errors.push('Request body must be a valid JSON object');
    return { valid: false, errors };
  }

  // Validate prediction ID
  if (!body.id || typeof body.id !== 'string') {
    errors.push('Missing or invalid "id" field (must be non-empty string)');
  } else if (body.id.length === 0 || body.id.length > 100) {
    errors.push('"id" field must be between 1 and 100 characters');
  }

  // Validate status
  if (!body.status || typeof body.status !== 'string') {
    errors.push('Missing or invalid "status" field (must be string)');
  } else {
    const validStatuses = ['starting', 'processing', 'succeeded', 'failed', 'canceled'];
    if (!validStatuses.includes(body.status.toLowerCase())) {
      errors.push(`Invalid status "${body.status}". Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  // Validate output array if present
  if (body.output !== undefined) {
    if (!Array.isArray(body.output)) {
      errors.push('Invalid "output" field (must be array if present)');
    } else if (body.output.length > 10) {
      errors.push('"output" array cannot contain more than 10 items');
    }
  }

  // Validate URLs if present
  if (body.urls && !Array.isArray(body.urls)) {
    errors.push('Invalid "urls" field (must be array if present)');
  }

  // Security: Check for potentially malicious content
  const maliciousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i, /<object/i];

  const checkString = JSON.stringify(body);
  for (const pattern of maliciousPatterns) {
    if (pattern.test(checkString)) {
      errors.push('Request contains potentially malicious content');
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

export function configureWebhookRoutes(
  app: express.Application,
  messageService: IMessengerService,
  targetChannel?: string
): void {
  app.post(
    '/webhook',
    verifyWebhookToken,
    verifyIpWhitelist,
    async (req: Request, res: Response) => {
      debug('Received webhook request:', {
        headers: {
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent'],
        },
        bodyKeys: Object.keys(req.body || {}),
        predictionId: req.body?.id,
        status: req.body?.status,
      });

      // Validate request body
      const validation = validateWebhookBody(req.body);
      if (!validation.valid) {
        debug('Webhook validation failed:', validation.errors);
        return res.status(400).json({
          error: 'Invalid request body',
          details: validation.errors,
        });
      }

      const { id: predictionId, status: predictionStatus, output: resultArray } = req.body;
      const imageUrl = predictionImageMap.get(predictionId);

      debug('Processing webhook:', { predictionId, predictionStatus, hasImageUrl: !!imageUrl });

      // Use the message service to send platform-agnostic messages
      const resultMessage =
        predictionStatus === 'succeeded'
          ? `${(resultArray || []).join(' ')}\nImage URL: ${imageUrl || 'N/A'}`
          : `Prediction ID: ${predictionId}\nStatus: ${predictionStatus}`;

      try {
        const channelId = targetChannel || messageService.getDefaultChannel?.() || '';
        await messageService.sendPublicAnnouncement(channelId, resultMessage);
        debug('Successfully sent webhook message to channel:', channelId);
      } catch (error: any) {
        debug('Failed to send webhook message:', error.message);
        return res.status(500).json({ error: 'Failed to process webhook' });
      }

      predictionImageMap.delete(predictionId);
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ success: true, processed: predictionId });
    }
  );
}
