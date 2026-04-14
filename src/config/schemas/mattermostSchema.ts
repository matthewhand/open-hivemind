import { z } from 'zod';

/**
 * Mattermost configuration schema
 */
export const MattermostSchema = z.object({
  MATTERMOST_SERVER_URL: z.string().default(''),
  MATTERMOST_TOKEN: z.string().default(''),
  MATTERMOST_CHANNEL: z.string().default(''),
  MATTERMOST_TEAM: z.string().default(''),
  MATTERMOST_WS_RECONNECT_INTERVAL: z.number().int().default(5000),
  MATTERMOST_MAX_MESSAGE_LENGTH: z.number().int().default(4000),
});

export type MattermostConfig = z.infer<typeof MattermostSchema>;
