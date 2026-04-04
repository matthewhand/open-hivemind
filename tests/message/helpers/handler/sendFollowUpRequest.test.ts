import { sendFollowUpRequest } from '../../../../src/message/helpers/handler/sendFollowUpRequest';

jest.mock('@src/llm/taskLlmRouter', () => ({
  getTaskLlm: jest.fn(),
}));

jest.mock('@config/discordConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

import { getTaskLlm } from '@src/llm/taskLlmRouter';
import discordConfig from '@config/discordConfig';

describe('sendFollowUpRequest', () => {
  const mockSendMessageToChannel = jest.fn();
  const mockMessageProvider: any = {
    sendMessageToChannel: mockSendMessageToChannel,
  };

  const mockMessage: any = {
    metadata: { correlationId: 'abc-123' },
    getText: () => 'hello',
  };

  const originalMathRandom = Math.random;

  beforeEach(() => {
    jest.clearAllMocks();
    (discordConfig.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'DISCORD_CHANNEL_BONUSES') {return {};}
      if (key === 'DISCORD_UNSOLICITED_CHANCE_MODIFIER') {return 1.0;}
      return undefined;
    });
  });

  afterEach(() => {
    Math.random = originalMathRandom;
  });

  it('returns early when provider does not support chat completion', async () => {
    (getTaskLlm as jest.Mock).mockResolvedValue({
      provider: {
        supportsChatCompletion: () => false,
      },
      metadata: {},
    });

    await sendFollowUpRequest(mockMessage, 'channel-1', 'follow up', mockMessageProvider);

    expect(mockSendMessageToChannel).not.toHaveBeenCalled();
  });

  it('skips follow-up when random gate fails', async () => {
    Math.random = jest.fn(() => 0.95);
    (getTaskLlm as jest.Mock).mockResolvedValue({
      provider: {
        supportsChatCompletion: () => true,
        generateChatCompletion: jest.fn(),
      },
      metadata: {},
    });

    await sendFollowUpRequest(mockMessage, 'channel-1', 'follow up', mockMessageProvider);

    expect(mockSendMessageToChannel).not.toHaveBeenCalled();
  });

  it('sends follow-up when random gate passes using channel bonus', async () => {
    Math.random = jest.fn(() => 0.01);
    (discordConfig.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'DISCORD_CHANNEL_BONUSES') {return { 'channel-1': 5 };}
      if (key === 'DISCORD_UNSOLICITED_CHANCE_MODIFIER') {return 1.0;}
      return undefined;
    });

    const generateChatCompletion = jest.fn().mockResolvedValue('AI reply');
    (getTaskLlm as jest.Mock).mockResolvedValue({
      provider: {
        supportsChatCompletion: () => true,
        generateChatCompletion,
      },
      metadata: { route: 'followup' },
    });

    await sendFollowUpRequest(
      mockMessage,
      'channel-1',
      'follow up',
      mockMessageProvider,
      'sender-key-1'
    );

    expect(generateChatCompletion).toHaveBeenCalledWith(
      'follow up',
      [mockMessage],
      { route: 'followup' }
    );
    expect(mockSendMessageToChannel).toHaveBeenCalledWith(
      'channel-1',
      'follow up AI reply',
      'sender-key-1'
    );
  });

  it('swallows provider errors and does not throw', async () => {
    Math.random = jest.fn(() => 0.0);
    (getTaskLlm as jest.Mock).mockResolvedValue({
      provider: {
        supportsChatCompletion: () => true,
        generateChatCompletion: jest.fn().mockRejectedValue(new Error('provider down')),
      },
      metadata: {},
    });

    await expect(
      sendFollowUpRequest(mockMessage, 'channel-1', 'follow up', mockMessageProvider)
    ).resolves.toBeUndefined();

    expect(mockSendMessageToChannel).not.toHaveBeenCalled();
  });
});
