/**
 * Production messengers stamp `.provider` (getMessengerProvider), not
 * always `.providerName`. These tests pin that the send map builds from
 * the production shape.
 */
import type { IMessengerService } from '@hivemind/shared-types';
import { buildMessengersByProvider, resolveProviderKey } from '@src/pipeline/createPipeline';
import { resolveOutboundPlatform } from '@src/pipeline/SendStage';

function svc(stamp: { provider?: string; providerName?: string; name?: string }) {
  return {
    ...stamp,
    sendMessageToChannel: jest.fn(),
  } as unknown as IMessengerService;
}

describe('buildMessengersByProvider / resolveProviderKey', () => {
  it('resolveProviderKey prefers .provider (production stamp)', () => {
    expect(resolveProviderKey(svc({ provider: 'discord', providerName: 'other' }))).toBe('discord');
    expect(resolveProviderKey(svc({ providerName: 'slack' }))).toBe('slack');
    expect(resolveProviderKey(svc({ name: 'mattermost' }))).toBe('mattermost');
  });

  it('builds a map keyed by production .provider values', () => {
    const discord = svc({ provider: 'discord' });
    const slack = svc({ provider: 'slack' });
    const map = buildMessengersByProvider(slack, [discord, slack]);

    expect(map.get('discord')).toBe(discord);
    expect(map.get('slack')).toBe(slack);
    expect(map.size).toBe(2);
  });
});

describe('resolveOutboundPlatform', () => {
  it('prefers MESSAGE_PROVIDER over platform=generic', () => {
    expect(
      resolveOutboundPlatform({
        platform: 'generic',
        botConfig: { MESSAGE_PROVIDER: 'Slack' },
      })
    ).toBe('slack');
  });

  it('falls back to platform when MESSAGE_PROVIDER missing', () => {
    expect(
      resolveOutboundPlatform({
        platform: 'discord',
        botConfig: {},
      })
    ).toBe('discord');
  });

  it('returns undefined when only generic/empty', () => {
    expect(resolveOutboundPlatform({ platform: 'generic', botConfig: {} })).toBeUndefined();
    expect(resolveOutboundPlatform({ platform: '', botConfig: {} })).toBeUndefined();
  });
});
