import { shouldReplyToUnsolicitedMessage } from '../../../src/message/helpers/unsolicitedMessageHandler';
import messageConfig from '../../../src/config/messageConfig';
import { clearBotActivity } from '../../../src/message/helpers/processing/ChannelActivity';

jest.mock('../../../src/config/messageConfig', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

describe('shouldReplyToUnsolicitedMessage', () => {
  const botId = 'bot123';
  const integration = 'discord';

  beforeEach(() => {
    jest.clearAllMocks();
    clearBotActivity();
    (messageConfig.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return true;
      if (key === 'MESSAGE_UNSOLICITED_ADDRESSED') return false;
      if (key === 'MESSAGE_UNSOLICITED_UNADDRESSED') return false;
      if (key === 'MESSAGE_ACTIVITY_TIME_WINDOW') return 300000;
      if (key === 'MESSAGE_WAKEWORDS') return ['bot'];
      return null;
    });
  });

  it('returns true only for direct mention when MESSAGE_ONLY_WHEN_SPOKEN_TO=true', () => {
    const msg: any = {
      getChannelId: () => 'c1',
      getText: () => 'hello',
      mentionsUsers: () => false,
      isReplyToBot: () => false,
    };

    expect(shouldReplyToUnsolicitedMessage(msg, botId, integration)).toBe(false);

    const mentioned: any = { ...msg, mentionsUsers: () => true };
    expect(shouldReplyToUnsolicitedMessage(mentioned, botId, integration)).toBe(true);
  });

  it('returns true for wakeword when MESSAGE_ONLY_WHEN_SPOKEN_TO=true', () => {
    const msg: any = {
      getChannelId: () => 'c1',
      getText: () => 'bot help me',
      mentionsUsers: () => false,
      isReplyToBot: () => false,
    };

    expect(shouldReplyToUnsolicitedMessage(msg, botId, integration)).toBe(true);
  });

  it('when MESSAGE_ONLY_WHEN_SPOKEN_TO=false, requires recent activity and opportunity', () => {
    (messageConfig.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return false;
      if (key === 'MESSAGE_UNSOLICITED_ADDRESSED') return true;
      if (key === 'MESSAGE_UNSOLICITED_UNADDRESSED') return true;
      if (key === 'MESSAGE_WAKEWORDS') return ['bot'];
      return null;
    });

    const msg: any = {
      getChannelId: () => 'c1',
      getText: () => 'this is chatter',
      mentionsUsers: () => false,
      isReplyToBot: () => false,
      getUserMentions: () => [],
    };

    // No opportunity -> no reply (eligibility)
    expect(shouldReplyToUnsolicitedMessage(msg, botId, integration)).toBe(false);

    // Opportunity -> yes
    const q: any = { ...msg, getText: () => 'anyone know how do i fix this?' };
    expect(shouldReplyToUnsolicitedMessage(q, botId, integration)).toBe(true);
  });

  it('respects addressed/unaddressed config when MESSAGE_ONLY_WHEN_SPOKEN_TO=false', () => {
    (messageConfig.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'MESSAGE_ONLY_WHEN_SPOKEN_TO') return false;
      if (key === 'MESSAGE_UNSOLICITED_ADDRESSED') return false;
      if (key === 'MESSAGE_UNSOLICITED_UNADDRESSED') return true;
      if (key === 'MESSAGE_WAKEWORDS') return ['bot'];
      return null;
    });

    const addressed: any = {
      getChannelId: () => 'c1',
      getText: () => 'hey @someone, can someone help?',
      mentionsUsers: () => false,
      isReplyToBot: () => false,
      getUserMentions: () => ['someone'],
    };
    expect(shouldReplyToUnsolicitedMessage(addressed, botId, integration)).toBe(false);
  });
});
