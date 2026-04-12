import { z } from 'zod';

/**
 * Mattermost configuration schema
 */
export const MattermostSchema = z.object({
  MATTERMOST_SERVER_URL: z.string().default(''),
  MATTERMOST_TOKEN: z.string().default(''),
  MATTERMOST_CHANNEL: z.string().default(''),
});

export type MattermostConfig = z.infer<typeof MattermostSchema>;
