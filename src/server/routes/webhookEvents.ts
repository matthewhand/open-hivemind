import Debug from 'debug';
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../types/constants';
import { WebhookRetrySchema } from '../../validation/schemas/miscSchema';
import { validateRequest } from '../../validation/validateRequest';

const debug = Debug('app:webui:webhook-events');
const router = Router();

// ── Types ───────────────────────────────────────────────────────────────────

export interface WebhookRedeliverResult {
  statusCode: number;
  error?: string;
}

/**
 * Re-dispatches the original payload through the same processing path the
 * ingress handler used. Captured as a closure at recording time so retry can
 * genuinely replay the event rather than fabricating a success.
 */
export type WebhookRedeliverFn = (payload: unknown) => Promise<WebhookRedeliverResult>;

export interface WebhookEvent {
  id: string;
  timestamp: string;
  source: string; // discord, slack, mattermost, telegram, generic
  endpoint: string; // the path that was hit
  method: string;
  statusCode: number;
  duration: number; // ms
  payloadPreview: string; // first N chars of the JSON body
  payload: unknown; // full payload (stored in memory)
  headers: Record<string, string>;
  error?: string;
  redeliver?: WebhookRedeliverFn; // not serialized (functions are dropped by JSON)
}

// ── In-memory event store ───────────────────────────────────────────────────

const MAX_EVENTS = parseInt(process.env.WEBHOOK_EVENT_LOG_MAX || '1000', 10);
const PAYLOAD_PREVIEW_LENGTH = 200;

const events: WebhookEvent[] = [];

function addEvent(event: WebhookEvent): void {
  events.unshift(event); // newest first
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }
}

/**
 * Call this from webhook ingress points to record an event.
 */
export function recordWebhookEvent(opts: {
  source: string;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  payload?: unknown;
  headers?: Record<string, string>;
  error?: string;
  redeliver?: WebhookRedeliverFn;
}): WebhookEvent {
  const payloadStr = opts.payload ? JSON.stringify(opts.payload) : '';
  const event: WebhookEvent = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    source: opts.source,
    endpoint: opts.endpoint,
    method: opts.method,
    statusCode: opts.statusCode,
    duration: opts.duration,
    payloadPreview:
      payloadStr.slice(0, PAYLOAD_PREVIEW_LENGTH) +
      (payloadStr.length > PAYLOAD_PREVIEW_LENGTH ? '...' : ''),
    payload: opts.payload ?? null,
    headers: opts.headers ?? {},
    error: opts.error,
    redeliver: opts.redeliver,
  };
  addEvent(event);
  debug('Recorded webhook event %s from %s (%d)', event.id, event.source, event.statusCode);
  return event;
}

// ── GET /api/webhooks/events — list with pagination + filters ───────────────

router.get('/events', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const source = (req.query.source as string) || '';
    const status = (req.query.status as string) || ''; // 'success' | 'failed'
    const startDate = (req.query.startDate as string) || '';
    const endDate = (req.query.endDate as string) || '';

    let filtered = events;

    if (source) {
      filtered = filtered.filter((e) => e.source.toLowerCase() === source.toLowerCase());
    }
    if (status === 'success') {
      filtered = filtered.filter((e) => e.statusCode >= 200 && e.statusCode < 400);
    } else if (status === 'failed') {
      filtered = filtered.filter((e) => e.statusCode >= 400);
    }
    if (startDate) {
      const start = new Date(startDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= end);
    }

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const paged = filtered.slice(offset, offset + limit);

    // Strip full payload from list view — clients fetch detail by id
    const items = paged.map(({ payload: _payload, redeliver: _redeliver, ...rest }) => rest);

    return res.json(
      ApiResponse.success({
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    );
  } catch (error) {
    debug('Error listing webhook events:', error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to list webhook events'));
  }
});

// ── GET /api/webhooks/events/:id — single event with full payload ───────────

router.get('/events/:id', (req, res) => {
  try {
    const event = events.find((e) => e.id === req.params.id);
    if (!event) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Event not found'));
    }
    return res.json(ApiResponse.success(event));
  } catch (error) {
    debug('Error fetching webhook event:', error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to fetch webhook event'));
  }
});

// ── POST /api/webhooks/events/:id/retry — replay a failed event ─────────────

router.post(
  '/events/:id/retry',
  validateRequest(WebhookRetrySchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const original = events.find((e) => e.id === req.params.id);
      if (!original) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Event not found'));
      }

      // Only allow retrying failed events
      if (original.statusCode < 400) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(ApiResponse.error('Only failed events can be retried'));
      }

      // Without a redelivery handler captured at ingress there is nothing to
      // genuinely replay — refuse rather than fabricate a queued/success event.
      if (!original.redeliver) {
        return res
          .status(HTTP_STATUS.NOT_IMPLEMENTED)
          .json(
            ApiResponse.error(
              'This event cannot be retried: no redelivery handler was captured when it was recorded'
            )
          );
      }

      // Re-dispatch the original payload through the same handler path and
      // record the real outcome as a new event.
      const start = Date.now();
      let result: WebhookRedeliverResult;
      try {
        result = await original.redeliver(original.payload);
      } catch (error) {
        result = {
          statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      const retryEvent = recordWebhookEvent({
        source: original.source,
        endpoint: original.endpoint,
        method: original.method,
        statusCode: result.statusCode,
        duration: Date.now() - start,
        payload: original.payload,
        headers: { ...original.headers, 'x-retry-of': original.id },
        error: result.error,
        redeliver: original.redeliver,
      });

      debug('Retried webhook event %s → %s (%d)', original.id, retryEvent.id, result.statusCode);

      return res.json(
        ApiResponse.success({
          originalId: original.id,
          retryId: retryEvent.id,
          statusCode: result.statusCode,
          message:
            result.statusCode < 400
              ? 'Event redelivered successfully'
              : `Retry failed with status ${result.statusCode}`,
        })
      );
    } catch (error) {
      debug('Error retrying webhook event:', error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to retry webhook event'));
    }
  })
);

export default router;
