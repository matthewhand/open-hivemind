import Debug from 'debug';
import express, { Request, Response } from 'express';
import { verifyWebhookToken, verifyIpWhitelist } from '@webhook/security/webhookSecurity';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';

const debug = Debug('app:webhookEvents');

type EventEnvelope = {
  version?: number;
  id?: string;
  type?: string;
  source?: string;
  timestamp?: string;
  data?: any;
};

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

function validateEnvelope(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push('Body must be a JSON object');
    return { valid: false, errors };
  }
  const env = body as EventEnvelope;
  if (!env.type || typeof env.type !== 'string') errors.push('Field "type" is required and must be a string');
  if (!env.id || typeof env.id !== 'string' || env.id.trim() === '') errors.push('Field "id" is required and must be a non-empty string');
  if (typeof env.version !== 'undefined' && typeof env.version !== 'number') errors.push('Field "version" must be a number if provided');
  if (typeof env.source !== 'undefined' && typeof env.source !== 'string') errors.push('Field "source" must be a string if provided');
  if (typeof env.timestamp !== 'undefined' && typeof env.timestamp !== 'string') errors.push('Field "timestamp" must be an ISO string if provided');
  if (typeof env.data === 'undefined' || typeof env.data !== 'object' || Array.isArray(env.data)) errors.push('Field "data" is required and must be an object');
  return { valid: errors.length === 0, errors };
}

export function configureEventWebhookRoutes(app: express.Application, messageService: IMessengerService): void {
  app.post('/webhooks/events', verifyWebhookToken, verifyIpWhitelist, async (req: Request, res: Response) => {
    debug('Received event:', JSON.stringify(redactBodyForLog(req.body)));

    const { valid, errors } = validateEnvelope(req.body);
    if (!valid) {
      debug('Envelope validation failed:', JSON.stringify(errors));
      return res.status(400).json({ error: 'Invalid event envelope', details: errors });
    }

    const { type, data } = req.body as EventEnvelope;
    try {
      switch (type) {
        case 'message.post': {
          const text = data?.text;
          const channelId = (req.query.channelId as string) || data?.channelId || '';
          if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Invalid event payload', details: ['data.text is required and must be a string'] });
          }
          await messageService.sendPublicAnnouncement(channelId, text);
          return res.status(200).json({ ok: true });
        }
        case 'health.ping': {
          const challenge = typeof data?.challenge === 'string' ? data.challenge : undefined;
          return res.status(200).json(challenge ? { ok: true, challenge } : { ok: true });
        }
        case 'job.status': {
          // Generic async job update (queued/processing/succeeded/failed)
          // For now, just acknowledge. Can be wired to your job tracking later.
          return res.status(200).json({ ok: true });
        }
        default:
          return res.status(400).json({ error: 'Unsupported event type', details: [String(type)] });
      }
    } catch (error: any) {
      debug('Error handling event', { type, error: error?.message });
      // Keep 200-style behavior for idempotent receivers, but include ok=false for observability
      return res.status(200).json({ ok: false, error: 'handler_error' });
    }
  });
}

