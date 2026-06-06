import { EventEmitter } from 'events';
import { SlackBotManager } from './SlackBotManager';

// --- Mock the Slack SDK clients so no network calls happen ---

// RTM client: records the 'message' handler and lets the test emit events.
const rtmInstances: MockRTMClient[] = [];
class MockRTMClient extends EventEmitter {
  public started = false;
  constructor(public token: string) {
    super();
    rtmInstances.push(this);
  }
  async start() {
    this.started = true;
    return {};
  }
  async disconnect() {
    this.started = false;
  }
}

class MockSocketModeClient extends EventEmitter {
  async start() {
    return {};
  }
  async disconnect() {
    return undefined;
  }
}

const authTestMock = jest.fn().mockResolvedValue({ user_id: 'UPRIMARY', user: 'primarybot' });
class MockWebClient {
  public auth = { test: authTestMock };
  public conversations = { history: jest.fn().mockResolvedValue({ messages: [] }) };
  constructor(public token: string) {}
}

jest.mock('@slack/rtm-api', () => ({
  RTMClient: jest.fn().mockImplementation((token: string) => new MockRTMClient(token)),
}));
jest.mock('@slack/socket-mode', () => ({
  SocketModeClient: jest.fn().mockImplementation(() => new MockSocketModeClient()),
}));
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation((token: string) => new MockWebClient(token)),
}));

describe('SlackBotManager RTM receive (primary bot)', () => {
  beforeEach(() => {
    rtmInstances.length = 0;
    authTestMock.mockClear();
  });

  it('registers an RTM message handler for the primary bot and forwards incoming messages', async () => {
    const manager = new SlackBotManager([{ token: 'xoxb-primary' }], 'rtm');

    const handler = jest.fn().mockResolvedValue('ok');
    manager.setMessageHandler(handler);

    await manager.initialize();

    // The RTM client for the primary bot must have been constructed and started.
    expect(rtmInstances.length).toBe(1);
    const rtm = rtmInstances[0];
    expect(rtm.started).toBe(true);

    // Simulate an inbound channel message from another user.
    rtm.emit('message', {
      type: 'message',
      text: 'hello from rtm',
      user: 'USOMEONE',
      channel: 'C123',
      ts: '1700000000.000100',
    });

    // Allow the async handler in the listener to run.
    await new Promise((r) => setImmediate(r));

    expect(handler).toHaveBeenCalledTimes(1);
    const [msgArg, , botConfig] = handler.mock.calls[0];
    expect(msgArg.getText()).toBe('hello from rtm');
    expect(botConfig.token).toBe('xoxb-primary');
  });

  it('ignores self-authored and empty RTM messages', async () => {
    const manager = new SlackBotManager([{ token: 'xoxb-primary' }], 'rtm');
    const handler = jest.fn().mockResolvedValue('ok');
    manager.setMessageHandler(handler);
    await manager.initialize();

    const rtm = rtmInstances[0];

    // Self message (user === bot user id resolved from auth.test => UPRIMARY)
    rtm.emit('message', {
      type: 'message',
      text: 'echo',
      user: 'UPRIMARY',
      channel: 'C123',
      ts: '1700000000.000200',
    });
    // Empty text
    rtm.emit('message', {
      type: 'message',
      text: '',
      user: 'USOMEONE',
      channel: 'C123',
      ts: '1700000000.000300',
    });

    await new Promise((r) => setImmediate(r));

    expect(handler).not.toHaveBeenCalled();
  });
});
