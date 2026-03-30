import { z } from 'zod';
import { idParam } from './commonSchema';

/** POST /api/dashboard/ai/config */
export const UpdateDashboardConfigSchema = z.object({
  body: z.record(z.unknown()).refine((val) => Object.keys(val).length > 0, {
    message: 'Configuration body must not be empty',
  }),
});

/** POST /api/dashboard/ai/feedback */
export const SubmitAIFeedbackSchema = z.object({
  body: z.object({
    recommendationId: z.string().min(1, { message: 'Recommendation ID is required' }),
    feedback: z.string().min(1, { message: 'Feedback is required' }),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/** POST /api/dashboard/alerts/:id/acknowledge or /resolve */
export const AlertIdParamSchema = z.object({
  params: z.object({
    id: idParam('Alert ID'),
  }),
});

/** GET /api/dashboard/activity/export */
export const ExportActivitySchema = z.object({
  query: z.object({
    format: z.enum(['csv', 'json']).default('csv'),
    bot: z.string().optional(),
    messageProvider: z.string().optional(),
    llmProvider: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

/** GET /api/dashboard/analytics/export */
export const ExportAnalyticsSchema = z.object({
  query: z.object({
    format: z.enum(['csv', 'json']).default('csv'),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});
