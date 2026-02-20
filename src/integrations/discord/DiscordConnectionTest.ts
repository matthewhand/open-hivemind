export interface DiscordConnectionTestResult {
  success: boolean;
  message: string;
  latency?: number;
}

export const testDiscordConnection = async (
  token: string
): Promise<DiscordConnectionTestResult> => {
  if (!token) {
    return {
      success: false,
      message: 'No Discord bot token provided',
    };
  }

  const start = Date.now();
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });

    const latency = Date.now() - start;

    if (response.ok) {
      const data = (await response.json()) as { username?: string; id?: string };
      return {
        success: true,
        message: `Connected as ${data.username || data.id || 'unknown'}`,
        latency,
      };
    } else {
      const error = (await response.json()) as { message?: string };
      return {
        success: false,
        message: error.message || `HTTP ${response.status}`,
        latency,
      };
    }
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      latency: Date.now() - start,
    };
  }
};
