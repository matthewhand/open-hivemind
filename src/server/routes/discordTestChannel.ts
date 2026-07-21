/**
 * Resolve which Discord channel an authenticated connectivity test should target.
 *
 * Preference order (first non-empty wins):
 * 1. Explicit request override (body/query)
 * 2. Live messenger getDefaultChannel() when available (runtime truth)
 * 3. DISCORD_DEFAULT_CHANNEL_ID — canonical runtime default used by DiscordService
 * 4. DISCORD_CHANNEL_ID — legacy / deploy-env alias
 *
 * Does not hardcode a production channel; callers must surface a 400 when this returns null.
 */
export function resolveDiscordTestChannelId(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  overrideChannelId?: string | null,
  liveDefaultChannelId?: string | null
): string | null {
  const candidates = [
    overrideChannelId,
    liveDefaultChannelId,
    env.DISCORD_DEFAULT_CHANNEL_ID,
    env.DISCORD_CHANNEL_ID,
  ];
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

/** Minimal messenger surface used by the Discord connectivity test. */
export interface DiscordSendMessenger {
  provider?: string;
  providerName?: string;
  getDefaultChannel?(): string;
  sendMessage?(channelId: string, text: string, senderName?: string): Promise<string>;
  sendMessageToChannel?(
    channelId: string,
    text: string,
    senderName?: string
  ): Promise<string | void>;
}

/**
 * Pick a live Discord messenger from the boot-registered services list.
 */
export function pickDiscordMessenger(
  services: readonly DiscordSendMessenger[]
): DiscordSendMessenger | null {
  for (const service of services) {
    const name = String(service.providerName || service.provider || '').toLowerCase();
    const ctor = (service as { constructor?: { name?: string } }).constructor?.name || '';
    if (name.includes('discord') || ctor.toLowerCase().includes('discord')) {
      return service;
    }
  }
  return null;
}

/**
 * Send via the live messenger (prefer sendMessageToChannel, then sendMessage).
 */
export async function sendDiscordTestMessage(
  messenger: DiscordSendMessenger,
  channelId: string,
  text: string
): Promise<string> {
  if (typeof messenger.sendMessageToChannel === 'function') {
    const id = await messenger.sendMessageToChannel(channelId, text);
    return id != null && String(id).length > 0 ? String(id) : `sent:${channelId}`;
  }
  if (typeof messenger.sendMessage === 'function') {
    return await messenger.sendMessage(channelId, text);
  }
  throw new Error(
    'Discord messenger is not ready: no sendMessageToChannel/sendMessage on the live service'
  );
}
