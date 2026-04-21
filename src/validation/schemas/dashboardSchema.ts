import { z } from 'zod';

export const DashboardQuerySchema = z.object({
  query: z.object({
    from: z.any().optional(),
    to: z.any().optional(),
  }),
});

export const DashboardAnnouncementQuerySchema = z.object({
  query: z.object({
    providers: z.any().optional(),
    ratings: z.any().optional(),
  }),
});

export const DashboardActivityQuerySchema = z.object({
  query: z.object({
    bot: z.any().optional(),
    messageProvider: z.any().optional(),
    llmProvider: z.any().optional(),
    from: z.any().optional(),
    to: z.any().optional(),
    limit: z.any().optional(),
    offset: z.any().optional(),
  }),
}).passthrough();
