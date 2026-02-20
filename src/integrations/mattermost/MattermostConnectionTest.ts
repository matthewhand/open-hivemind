import MattermostClient from './mattermostClient';

export interface MattermostConnectionTestResult {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export const testMattermostConnection = async (
  serverUrl: string,
  token: string
): Promise<MattermostConnectionTestResult> => {
  const trimmedUrl = serverUrl.trim();
  const trimmedToken = token.trim();
  if (!trimmedUrl || !trimmedToken) {
    return { ok: false, message: 'Mattermost server URL and token are required' };
  }

  const client = new MattermostClient({ serverUrl: trimmedUrl, token: trimmedToken });
  try {
    await client.connect();
    return { ok: true, message: `Connected to Mattermost at ${trimmedUrl}` };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || 'Mattermost connection failed',
    };
  }
};
