import { z } from 'zod';

/** POST /api/demo/chat */
export const DemoChatSchema = z.object({
  body: z.object({
    message: z.string().min(1, { message: 'message is required' }),
    botName: z.string().min(1, { message: 'botName is required' }),
    channelId: z.string().optional(),
    userId: z.string().optional(),
    userName: z.string().optional(),
  }),
});
