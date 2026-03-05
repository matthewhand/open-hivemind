import { WebClient } from '@slack/web-api';

export interface SlackConnectionTestResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export const testSlackConnection = async (botToken: string): Promise<SlackConnectionTestResult> => {
  const trimmed = botToken.trim();
  if (!trimmed) {
    return { ok: false, message: 'Slack bot token is required' };
  }

  const client = new WebClient(trimmed);
  try {
    const response = await client.auth.test();
    if (!response.ok) {
      return {
        ok: false,
        message: response.error || 'Slack auth.test failed',
        details: response as any,
      };
    }

    return {
      ok: true,
      message: `Connected as ${response.user} in ${response.team}`,
      details: response as any,
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || 'Slack connection failed',
    };
  }
};
