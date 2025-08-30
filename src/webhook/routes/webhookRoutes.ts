import Debug from 'debug';
import express, { Request, Response } from 'express';
import { predictionImageMap } from '@src/message/helpers/processing/handleImageMessage';
import { getLlm } from '@src/llm/getLlm';
import { getBotManager } from '@src/integrations/getBotManager';

// Import after jest.doMock of config to allow per-test overrides
import { verifyWebhookToken, verifyIpWhitelist } from '@webhook/security/webhookSecurity';

const debug = Debug('app:webhookRoutes');

// Webhook request body schema validation
function validateWebhookBody(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    errors.push('Request body must be a valid JSON object');
    return { valid: false, errors };
  }
  
  if (!body.id || typeof body.id !== 'string') {
    errors.push('Missing or invalid "id" field (must be string)');
  }
  
  if (!body.status || typeof body.status !== 'string') {
    errors.push('Missing or invalid "status" field (must be string)');
  }
  
  if (body.output && !Array.isArray(body.output)) {
    errors.push('Invalid "output" field (must be array if present)');
  }
  
  return { valid: errors.length === 0, errors };
}

export function configureWebhookRoutes(app: express.Application, messageService: IMessengerService, targetChannel?: string): void {
  app.post('/webhook', verifyWebhookToken, verifyIpWhitelist, async (req: Request, res: Response) => {
    debug('Received webhook request:', {
      headers: { 'content-type': req.headers['content-type'], 'user-agent': req.headers['user-agent'] },
      bodyKeys: Object.keys(req.body || {}),
      predictionId: req.body?.id,
      status: req.body?.status
    });

    // Validate request body
    const validation = validateWebhookBody(req.body);
    if (!validation.valid) {
      debug('Webhook validation failed:', validation.errors);
      return res.status(400).json({ 
        error: 'Invalid request body', 
        details: validation.errors 
      });
    }

    const { id: predictionId, status: predictionStatus, output: resultArray } = req.body;
    const imageUrl = predictionImageMap.get(predictionId);

    debug('Processing webhook:', { predictionId, predictionStatus, hasImageUrl: !!imageUrl });

    // Use the message service to send platform-agnostic messages
    const resultMessage = predictionStatus === 'succeeded'
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
    res.status(200).json({ success: true, processed: predictionId });
  });
}
