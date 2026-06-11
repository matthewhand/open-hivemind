/**
 * Derive a connection-status badge for a message-provider profile.
 *
 * There is no live per-profile health endpoint yet, so status is derived from
 * what the backend already exposes:
 *  - `/api/dashboard/status` reports per-bot `connected` flags including the
 *    bot's message provider — if any bot on this profile's platform is
 *    connected, the platform connection is demonstrably working.
 *  - Otherwise we fall back to the stored profile's validation state: a
 *    credential is present (Configured) or missing (Error).
 */

export type ProviderStatusLevel = 'connected' | 'configured' | 'error';

export interface ProviderStatus {
  level: ProviderStatusLevel;
  label: string;
  description: string;
}

export interface StatusBotLike {
  provider?: string;
  messageProvider?: string;
  connected?: boolean;
  status?: string;
}

/** Config keys that count as "a credential is present". */
const CREDENTIAL_KEYS = [
  'token',
  'botToken',
  'appToken',
  'apiKey',
  'accessToken',
  'signingSecret',
  'webhookUrl',
  'serverUrl',
];

export function hasCredential(config: Record<string, unknown> | undefined | null): boolean {
  if (!config) return false;
  return CREDENTIAL_KEYS.some((key) => {
    const value = config[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function deriveProviderStatus(
  profile: { provider?: string; config?: Record<string, unknown> },
  statusBots: StatusBotLike[] | undefined | null
): ProviderStatus {
  const platform = (profile.provider || '').toLowerCase();

  const platformBots = (statusBots || []).filter((bot) => {
    const botProvider = (bot.messageProvider || bot.provider || '').toLowerCase();
    return platform !== '' && botProvider === platform;
  });

  if (platformBots.some((bot) => bot.connected === true)) {
    return {
      level: 'connected',
      label: 'Connected',
      description: 'A bot on this platform is connected',
    };
  }

  if (platformBots.some((bot) => (bot.status || '').toLowerCase() === 'error')) {
    return {
      level: 'error',
      label: 'Error',
      description: 'A bot on this platform reports an error',
    };
  }

  if (hasCredential(profile.config)) {
    return {
      level: 'configured',
      label: 'Configured',
      description: 'Credentials present — connection not yet verified',
    };
  }

  return {
    level: 'error',
    label: 'Error',
    description: 'Missing credentials — edit the profile to add a token',
  };
}
