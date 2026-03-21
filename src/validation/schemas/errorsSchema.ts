import { z } from 'zod';

export const FrontendErrorReportSchema = z.object({
  body: z
    .object({
      name: z.string().optional(),
      message: z.string({ required_error: 'message is required' }),
      stack: z.string().optional(),
      status: z.number().optional(),
      code: z.string().optional(),
      details: z.record(z.any()).optional(),
      correlationId: z.string({ required_error: 'correlationId is required' }),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      timestamp: z.string().optional(),
      componentStack: z.string().optional(),
      userAgent: z.string().optional(),
      url: z.string().optional(),
      localStorage: z.record(z.string()).optional(),
      sessionStorage: z.record(z.string()).optional(),
      performance: z.any().optional(),
    })
    .passthrough(),
});
