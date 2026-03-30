import { z } from 'zod';

/** POST /api/errors/frontend */
export const FrontendErrorSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    message: z.string().min(1, { message: 'Error message is required' }),
    stack: z.string().optional(),
    status: z.number().optional(),
    code: z.string().optional(),
    details: z.record(z.unknown()).optional(),
    correlationId: z.string().min(1, { message: 'Correlation ID is required' }),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    timestamp: z.string().optional(),
    componentStack: z.string().optional(),
    userAgent: z.string().optional(),
    url: z.string().optional(),
    localStorage: z.record(z.string()).optional(),
    sessionStorage: z.record(z.string()).optional(),
    performance: z.unknown().optional(),
  }),
});
