import { z } from 'zod';
import { idParam } from './commonSchema';

/** POST /api/webhooks/events/:id/retry */
export const RetryWebhookEventSchema = z.object({
  params: z.object({
    id: idParam('Event ID'),
  }),
});
