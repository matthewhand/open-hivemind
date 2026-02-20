import axios from 'axios';
import { ConfigurationManager } from '@config/ConfigurationManager';
import flowiseConfig from '@integrations/flowise/flowiseConfig';
import {
  getFlowiseResponse,
  getFlowiseResponseFallback,
} from '@integrations/flowise/flowiseRestClient';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('@integrations/flowise/flowiseConfig', () => {
  const actual = jest.requireActual('@integrations/flowise/flowiseConfig');
  return {
    __esModule: true,
    default: {
      get: jest.fn((key: string) => {
        const map: Record<string, any> = {
          FLOWISE_API_ENDPOINT: 'http://flowise.local',
          FLOWISE_API_KEY: 'test-api-key',
          FLOWISE_CONVERSATION_CHATFLOW_ID: 'chatflow-123',
        };
        return map[key] ?? actual.default.get(key);
      }),
    },
  };
});

jest.mock('@config/ConfigurationManager', () => {
  class FakeManager {
    private sessions: Record<string, Record<string, any>> = {};
    static instance: FakeManager | null = null;
    static getInstance() {
      if (!FakeManager.instance) FakeManager.instance = new FakeManager();
      return FakeManager.instance;
    }
    getSession(namespace: string, channelId: string) {
      return this.sessions[`${namespace}:${channelId}`];
    }
    setSession(namespace: string, channelId: string, chatId: string) {
      this.sessions[`${namespace}:${channelId}`] = { chatId };
    }
  }
  return { ConfigurationManager: FakeManager };
});

describe('flowiseRestClient.getFlowiseResponse', () => {
  const channelId = 'channel-xyz';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws if question is empty/whitespace', async () => {
    await expect(getFlowiseResponse(channelId, '   ')).rejects.toThrow(
      'Cannot send an empty question to Flowise.'
    );
  });

  it('throws if config is incomplete (missing pieces)', async () => {
    (flowiseConfig.get as jest.Mock).mockImplementation((key: string) => {
      const map: Record<string, any> = {
        FLOWISE_API_ENDPOINT: '',
        FLOWISE_API_KEY: 'k',
        FLOWISE_CONVERSATION_CHATFLOW_ID: 'id',
      };
      return map[key];
    });
    await expect(getFlowiseResponse(channelId, 'hello')).rejects.toThrow(
      'Flowise configuration incomplete.'
    );
  });

  it('sends POST with headers and returns text; updates chatId when returned', async () => {
    // restore valid config
    (flowiseConfig.get as jest.Mock).mockImplementation((key: string) => {
      const map: Record<string, any> = {
        FLOWISE_API_ENDPOINT: 'http://flowise.local',
        FLOWISE_API_KEY: 'test-api-key',
        FLOWISE_CONVERSATION_CHATFLOW_ID: 'chatflow-123',
      };
      return map[key];
    });

    // prime session with old chatId
    const mgr = ConfigurationManager.getInstance() as any;
    mgr.setSession('flowise', channelId, 'old-chat');

    mockedAxios.post.mockResolvedValueOnce({
      data: { text: 'answer', chatId: 'new-chat' },
    } as any);

    const text = await getFlowiseResponse(channelId, 'hello');
    expect(text).toBe('answer');

    // verify axios called with endpoint and headers
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://flowise.local/prediction/chatflow-123',
      { question: 'hello', chatId: 'old-chat' },
      {
        headers: {
          Authorization: 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
      }
    );

    // chatId updated in session
    expect(mgr.getSession('flowise', channelId)).toEqual({ chatId: 'new-chat' });
  });

  it('does not update chatId if API returns none; still returns text', async () => {
    // manager may already have prior chat from previous test; ensure no change
    const mgr = ConfigurationManager.getInstance() as any;
    const before = mgr.getSession('flowise', channelId);

    mockedAxios.post.mockResolvedValueOnce({
      data: { text: 'ok' },
    } as any);

    const text = await getFlowiseResponse(channelId, 'q');
    expect(text).toBe('ok');

    // if no prior session, remain undefined; if existed, remain unchanged
    const after = mgr.getSession('flowise', channelId);
    expect(after).toEqual(before);
  });

  it('throws when API returns empty/invalid text', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { text: '   ' } } as any);
    await expect(getFlowiseResponse(channelId, 'q')).rejects.toThrow(
      'Failed to fetch response from Flowise.'
    );
  });

  it('wraps axios errors into a generic error', async () => {
    mockedAxios.post.mockRejectedValueOnce(
      Object.assign(new Error('boom'), {
        isAxiosError: true,
        response: { status: 500, data: { err: 'x' } },
      })
    );
    await expect(getFlowiseResponse(channelId, 'q')).rejects.toThrow(
      'Failed to fetch response from Flowise.'
    );
  });

  it('wraps non-axios errors into a generic error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('other'));
    await expect(getFlowiseResponse(channelId, 'q')).rejects.toThrow(
      'Failed to fetch response from Flowise.'
    );
  });

  it('fallback delegates to getFlowiseResponse', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { text: 'via-fallback' } } as any);
    await expect(getFlowiseResponseFallback(channelId, 'hey')).resolves.toBe('via-fallback');
  });
});
