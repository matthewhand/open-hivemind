import Debug from 'debug';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import { predictionImageMap } from '@src/message/helpers/processing/handleImageMessage';
import { verifyWebhookToken, verifyIpWhitelist } from '@webhook/security/webhookSecurity';
import { IMessengerService } from '@message/interfaces/IMessengerService';

const debug = Debug('app:webhookRoutes');

// Webhook request body schema
const webhookRequestSchema = z.object({
  id: z.string().min(1, 'Prediction ID is required'),
  status: z.enum(['starting', 'processing', 'succeeded', 'failed', 'canceled'], {
    errorMap: () => ({ message: 'Status must be one of: starting, processing, succeeded, failed, canceled' })
  }),
  output: z.array(z.string()).optional(),
  error: z.string().optional(),
  logs: z.string().optional(),
  created_at: z.string().optional(),
  completed_at: z.string().optional()
});

type WebhookRequest = z.infer<typeof webhookRequestSchema>;

export function configureWebhookRoutes(app: express.Application, messageService: IMessengerService): void {
  app.post('/webhook', verifyWebhookToken, verifyIpWhitelist, async (req: Request, res: Response) => {
    debug('Received webhook request', {
      predictionId: req.body?.id,
      status: req.body?.status,
      hasOutput: !!req.body?.output,
      timestamp: new Date().toISOString()
    });

    // Validate request body schema
    const validationResult = webhookRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorDetails = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received: err.code === 'invalid_type' ? typeof req.body?.[err.path[0]] : req.body?.[err.path[0]]
      }));
      
      debug('Webhook validation failed:', { errors: errorDetails, body: req.body });
      return res.status(400).json({
        error: 'Invalid request body',
        details: errorDetails,
        timestamp: new Date().toISOString()
      });
    }

    const { id: predictionId, status: predictionStatus, output: resultArray } = validationResult.data;
    const imageUrl = predictionImageMap.get(predictionId);

    debug('Processing webhook', {
      predictionId,
      status: predictionStatus,
      hasImageUrl: !!imageUrl,
      outputLength: resultArray?.length || 0
    });

    // Use the message service to send platform-agnostic messages
    const resultMessage = predictionStatus === 'succeeded'
      ? `${resultArray?.join(' ') || 'No output provided'}\nImage URL: ${imageUrl || 'No image URL'}`
      : `Prediction ID: ${predictionId}\nStatus: ${predictionStatus}`;

    try {
      // TODO: Parameterize target announcement channel instead of empty default
      await messageService.sendPublicAnnouncement('', resultMessage);
      debug('Message sent successfully', { predictionId, messageLength: resultMessage.length });
    } catch (error: any) {
      debug('Failed to send message', {
        predictionId,
        error: error.message,
        errorType: error.constructor.name
      });
      // Don't return error to webhook caller - this is an internal issue
    }

    // Clean up prediction mapping
    const wasDeleted = predictionImageMap.delete(predictionId);
    debug('Cleanup completed', { predictionId, mappingDeleted: wasDeleted });
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      success: true,
      predictionId,
      processed: true,
      timestamp: new Date().toISOString()
    });
  });
}
