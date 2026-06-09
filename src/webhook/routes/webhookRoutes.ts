import Debug from 'debug';
import type { Request, Response } from 'express';
import type express from 'express';
import type { IMessengerService } from '@hivemind/shared-types';
import { predictionImageMap } from '@src/message/helpers/processing/handleImageMessage';
import { recordWebhookEvent } from '@src/server/routes/webhookEvents';
// Import after jest.doMock of config to allow per-test overrides
import {
  verifyIpWhitelist,
  verifySlackSignature,
  verifyWebhookToken,
} from '@webhook/security/webhookSecurity';

const debug = Debug('app:webhookRoutes');

// Webhook request body schema validation
interface WebhookBody {
  id?: string;
  status?: string;
  output?: unknown[];
  urls?: unknown[];
  [key: string]: unknown;
}

/**
 * Messenger services that accept inbound webhook payloads (e.g. the
 * `@hivemind/message-webhook` adapter) expose `handleIncomingWebhook`. The base
 * IMessengerService interface does not declare it, so we narrow structurally.
 */
interface IInboundWebhookReceiver {
  handleIncomingWebhook(payload: unknown, channelId?: string): Promise<string>;
}

function supportsIncomingWebhook(
  service: IMessengerService | null | undefined
): service is IMessengerService & IInboundWebhookReceiver {
  return (
    !!service &&
    typeof (service as Partial<IInboundWebhookReceiver>).handleIncomingWebhook === 'function'
  );
}

function validateWebhookBody(body: WebhookBody): { valid: boolean; errors: string[] } {
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

/**
 * Outcome of processing a webhook payload, independent of the express
 * request/response objects so the same logic can be replayed on retry.
 */
interface WebhookOutcome {
  statusCode: number;
  body: Record<string, unknown>;
  error?: string;
}

/** Record only non-sensitive request headers (no tokens/signatures). */
function pickSafeHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of ['content-type', 'user-agent']) {
    const value = req.headers[name];
    if (typeof value === 'string') {
      headers[name] = value;
    }
  }
  return headers;
}

export function configureWebhookRoutes(
  app: express.Application,
  messageService: IMessengerService,
  targetChannel?: string
): void {
  // Processing logic is factored out of the express handlers so the WebUI
  // retry endpoint (POST /api/webhooks/events/:id/retry) can re-dispatch a
  // recorded payload through the exact same path.
  const processPredictionWebhook = async (body: WebhookBody): Promise<WebhookOutcome> => {
    // Validate request body
    const validation = validateWebhookBody(body);
    if (!validation.valid) {
      debug('Webhook validation failed:', validation.errors);
      return {
        statusCode: 400,
        body: { error: 'Invalid request body', details: validation.errors },
        error: `Invalid request body: ${validation.errors.join('; ')}`,
      };
    }

    const predictionId = String(body.id);
    const predictionStatus = body.status;
    const resultArray = body.output;
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
      return { statusCode: 200, body: { success: true } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      debug('Failed to send webhook message:', message);
      return { statusCode: 500, body: { error: 'Failed to process webhook' }, error: message };
    }
  };

  const processInboundWebhook = async (payload: unknown): Promise<WebhookOutcome> => {
    if (!supportsIncomingWebhook(messageService)) {
      debug('Messenger service does not support inbound webhooks');
      return {
        statusCode: 501,
        body: { error: 'Inbound webhooks are not supported by the configured messenger service' },
        error: 'Inbound webhooks are not supported by the configured messenger service',
      };
    }

    try {
      const reply = await messageService.handleIncomingWebhook(payload, targetChannel);
      return { statusCode: 200, body: { success: true, reply } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      debug('Failed to process inbound webhook:', message);
      return {
        statusCode: 500,
        body: { error: 'Failed to process inbound webhook' },
        error: message,
      };
    }
  };

  const processSlackWebhook = async (payload: unknown): Promise<WebhookOutcome> => {
    // Slack-formatted payloads are also handled by handleIncomingWebhook
    // (it understands attachments/username). Forward when supported.
    if (supportsIncomingWebhook(messageService)) {
      try {
        const reply = await messageService.handleIncomingWebhook(payload, targetChannel);
        return { statusCode: 200, body: { success: true, reply } };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        debug('Failed to process Slack webhook:', message);
        return {
          statusCode: 500,
          body: { error: 'Failed to process Slack webhook' },
          error: message,
        };
      }
    }

    return { statusCode: 200, body: { success: true } };
  };

  // Runs the processor, records the event in the in-memory webhook event log
  // (with a redeliver closure so it can be genuinely retried), and sends the
  // HTTP response.
  const dispatch = async (
    req: Request,
    res: Response,
    source: string,
    process: (payload: unknown) => Promise<WebhookOutcome>
  ): Promise<Response> => {
    const start = Date.now();
    const outcome = await process(req.body);

    recordWebhookEvent({
      source,
      endpoint: req.path,
      method: req.method,
      statusCode: outcome.statusCode,
      duration: Date.now() - start,
      payload: req.body,
      headers: pickSafeHeaders(req),
      error: outcome.error,
      redeliver: async (payload) => {
        const result = await process(payload);
        return { statusCode: result.statusCode, error: result.error };
      },
    });

    return res.status(outcome.statusCode).json(outcome.body);
  };

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

      return dispatch(req, res, 'generic', (payload) =>
        processPredictionWebhook(payload as WebhookBody)
      );
    }
  );

  // Inbound webhook ingress: deliver the payload to the messenger service's
  // registered message handler (via handleIncomingWebhook) when the service
  // supports it. This is what makes externally-pushed messages reach the
  // pipeline rather than being silently dropped.
  app.post(
    '/webhook/receive',
    verifyWebhookToken,
    verifyIpWhitelist,
    async (req: Request, res: Response) => {
      debug('Received inbound webhook payload:', { bodyKeys: Object.keys(req.body || {}) });

      return dispatch(req, res, 'generic', processInboundWebhook);
    }
  );

  app.post('/webhook/slack', verifySlackSignature, async (req: Request, res: Response) => {
    debug('Received Slack webhook:', req.body);

    return dispatch(req, res, 'slack', processSlackWebhook);
  });
}
