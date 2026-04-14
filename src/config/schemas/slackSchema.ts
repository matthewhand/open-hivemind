import { z } from 'zod';

/**
 * Slack configuration schema
 */
export const SlackSchema = z.object({
  SLACK_BOT_TOKEN: z.string().default(''),
  SLACK_APP_TOKEN: z.string().default(''),
  SLACK_SIGNING_SECRET: z.string().default(''),
  SLACK_JOIN_CHANNELS: z.string().default(''),
  SLACK_DEFAULT_CHANNEL_ID: z.string().default(''),
  SLACK_MODE: z.enum(['socket', 'rtm']).default('socket'),
  SLACK_BOT_JOIN_CHANNEL_MESSAGE: z.string().default('# Bot joined the {channel} channel! :robot_face:\n\nWelcome! I\'m here to assist. [Get Started](action:start_{channel})'),
  SLACK_USER_JOIN_CHANNEL_MESSAGE: z.string().default('# Welcome, {user}, to the {channel} channel! :wave:\n\nHere’s some quick info:\n- *Purpose*: Support student inquiries related to learning objectives...\n- *Resources*: [Learn More](https://university.example.com/resources)\n\n## Actions\n- [Learning Objectives](action:learn_objectives_{channel})\n- [How-To](action:how_to_{channel})\n- [Contact Support](action:contact_support_{channel})\n- [Report Issue](action:report_issue_{channel})'),
  SLACK_BOT_LEARN_MORE_MESSAGE: z.string().default('Here’s more info about channel {channel}!'),
  SLACK_BUTTON_MAPPINGS: z.string().default('{"learn_objectives_C08BC0X4DFD": "Learning Objectives", "how_to_C08BC0X4DFD": "How-To", "contact_support_C08BC0X4DFD": "Contact Support", "report_issue_C08BC0X4DFD": "Report Issue", "start_C08BC0X4DFD": "Get Started"}'),
  WELCOME_RESOURCE_URL: z.string().default('https://university.example.com/resources'),
  REPORT_ISSUE_URL: z.string().default('https://university.example.com/report-issue'),
  SLACK_HELP_COMMAND_TOKEN: z.string().default(''),
  SLACK_MAX_MESSAGE_LENGTH: z.number().int().default(3000),
  SLACK_SOCKET_MODE: z.boolean().default(true),
});

export type SlackConfig = z.infer<typeof SlackSchema>;
