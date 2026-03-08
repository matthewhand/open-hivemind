import axios from 'axios';

jest.mock('axios');
jest.mock('./lettaConfig', () => ({
  __esModule: true,
  default: { get: jest.fn().mockReturnValue(undefined) },
}));
jest.mock('debug', () => () => jest.fn());

// Import after mocks are registered
import { LettaProvider } from './lettaProvider';

const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeClient(overrides: { get?: jest.Mock; post?: jest.Mock } = {}) {
  return {
    get: overrides.get ?? jest.fn(),
    post: overrides.post ?? jest.fn(),
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  (LettaProvider as any).instance = undefined;
  mockedAxios.isAxiosError.mockReturnValue(false);
  // Default: empty client; individual tests override as needed
  mockedAxios.create.mockReturnValue(makeClient() as any);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('singleton', () => {
  it('returns the same instance on repeated calls', () => {
    const a = LettaProvider.getInstance({ apiKey: 'k' });
    const b = LettaProvider.getInstance({ apiKey: 'other' });
    expect(a).toBe(b);
  });
});

describe('listAgents', () => {
  it('returns data from GET /agents', async () => {
    const agents = [{ id: '1', name: 'agent-one' }];
    const client = makeClient({ get: jest.fn().mockResolvedValue({ data: agents }) });
    mockedAxios.create.mockReturnValue(client as any);

    const result = await LettaProvider.getInstance().listAgents();
    expect(result).toEqual(agents);
    expect(client.get).toHaveBeenCalledWith('/agents');
  });

  it('throws wrapped error on failure', async () => {
    const client = makeClient({ get: jest.fn().mockRejectedValue(new Error('network down')) });
    mockedAxios.create.mockReturnValue(client as any);

    await expect(LettaProvider.getInstance().listAgents()).rejects.toThrow(
      'Failed to list agents: network down'
    );
  });
});

describe('sendMessage', () => {
  it('returns last assistant message content', async () => {
    const data = [
      { id: '1', role: 'user', content: 'hi' },
      { id: '2', role: 'assistant', content: 'hello' },
    ];
    const client = makeClient({ post: jest.fn().mockResolvedValue({ data }) });
    mockedAxios.create.mockReturnValue(client as any);

    const result = await LettaProvider.getInstance().sendMessage('agent-1', 'hi');
    expect(result).toBe('hello');
  });

  it('returns empty string when no assistant message', async () => {
    const client = makeClient({ post: jest.fn().mockResolvedValue({ data: [] }) });
    mockedAxios.create.mockReturnValue(client as any);

    expect(await LettaProvider.getInstance().sendMessage('agent-1', 'hi')).toBe('');
  });
});

describe('generateChatCompletion', () => {
  it('throws when no agentId configured', async () => {
    await expect(LettaProvider.getInstance().generateChatCompletion('hello')).rejects.toThrow(
      'No agent ID provided'
    );
  });

  it('delegates to sendMessage with agentId from metadata', async () => {
    const client = makeClient({
      post: jest.fn().mockResolvedValue({
        data: [{ id: '1', role: 'assistant', content: 'reply' }],
      }),
    });
    mockedAxios.create.mockReturnValue(client as any);

    const result = await LettaProvider.getInstance().generateChatCompletion('hello', [], {
      agentId: 'agent-42',
    });
    expect(result).toBe('reply');
    expect(client.post).toHaveBeenCalledWith('/agents/agent-42/messages', {
      messages: [{ role: 'user', content: 'hello' }],
    });
  });
});

describe('generateCompletion', () => {
  it('always throws', async () => {
    await expect(LettaProvider.getInstance().generateCompletion('x')).rejects.toThrow(
      'does not support non-chat completion'
    );
  });
});

describe('retryWithBackoff', () => {
  it('retries on 429 and succeeds on second attempt', async () => {
    const axiosErr = Object.assign(new Error('rate limited'), {
      response: { status: 429 },
    });
    const get = jest
      .fn()
      .mockRejectedValueOnce(axiosErr)
      .mockResolvedValueOnce({ data: [] });

    mockedAxios.create.mockReturnValue(makeClient({ get }) as any);
    mockedAxios.isAxiosError.mockReturnValue(true);

    const promise = LettaProvider.getInstance().listAgents();
    await jest.runAllTimersAsync();
    expect(await promise).toEqual([]);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 400', async () => {
    const axiosErr = Object.assign(new Error('bad request'), {
      response: { status: 400 },
    });
    const get = jest.fn().mockRejectedValue(axiosErr);
    mockedAxios.create.mockReturnValue(makeClient({ get }) as any);
    mockedAxios.isAxiosError.mockReturnValue(true);

    await expect(LettaProvider.getInstance().listAgents()).rejects.toThrow('bad request');
    expect(get).toHaveBeenCalledTimes(1);
  });
});
