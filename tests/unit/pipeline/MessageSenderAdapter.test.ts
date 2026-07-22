import type { IMessengerService } from '@hivemind/shared-types';
import { MessageSenderAdapter } from '@src/pipeline/adapters/MessageSenderAdapter';

function stub(name: string) {
  return {
    providerName: name,
    sendMessageToChannel: jest.fn().mockResolvedValue('id'),
  } as unknown as IMessengerService & { sendMessageToChannel: jest.Mock };
}

describe('MessageSenderAdapter', () => {
  it('routes by platform and forwards thread args', async () => {
    const slack = stub('slack');
    const discord = stub('discord');
    const adapter = new MessageSenderAdapter({
      messengerService: slack,
      messengersByProvider: { slack, discord },
    });
    await adapter.sendToChannel('c', 't', 'b', {
      platform: 'discord',
      threadId: 'th',
      replyToMessageId: 'm1',
    });
    expect(discord.sendMessageToChannel).toHaveBeenCalledWith('c', 't', 'b', 'th', 'm1');
    expect(slack.sendMessageToChannel).not.toHaveBeenCalled();
  });

  it('falls back to primary when platform missing', async () => {
    const primary = stub('slack');
    const adapter = new MessageSenderAdapter({ messengerService: primary });
    await adapter.sendToChannel('c', 't', 'b', { platform: 'telegram' });
    expect(primary.sendMessageToChannel).toHaveBeenCalled();
  });
});
