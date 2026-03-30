import { z } from 'zod';

/** POST /api/webui/validate-config */
export const ValidateConfigBodySchema = z.object({
  body: z.object({
    botConfig: z.object({
      name: z.string().optional(),
      messageProvider: z.string().optional(),
      llmProvider: z.string().optional(),
    }),
  }),
});
