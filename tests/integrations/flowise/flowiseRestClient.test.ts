import { ConfigurationManager } from '@config/ConfigurationManager';
import { resetAllCircuitBreakers } from '@common/CircuitBreaker';
import flowiseConfig from '../../../packages/llm-flowise/src/flowiseConfig';
import {
  getFlowiseResponse,
  getFlowiseResponseFallback,
} from '../../../packages/llm-flowise/src/flowiseRestClient';

jest.mock('@hivemind/shared-types', () => ({
  ...jest.requireActual('@hivemind/shared-types'),
  http: {
    post: jest.fn(),
  },
  isSafeUrl: jest.fn().mockResolvedValue({ safe: true }),
}));

import { http } from '@hivemind/shared-types';
const mockedHttp = http as jest.Mocked<typeof http>;

jest.mock('../../../packages/llm-flowise/src/flowiseConfig', () => {
  const actual = jest.requireActual('../../../packages/llm-flowise/src/flowiseConfig');
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
    resetAllCircuitBreakers();
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

    mockedHttp.post.mockResolvedValueOnce({
      text: 'answer', chatId: 'new-chat'
    } as any);

    const text = await getFlowiseResponse(channelId, 'hello');
    expect(text).toBe('answer');

    // verify http called with endpoint and headers
    expect(mockedHttp.post).toHaveBeenCalledWith(
      'http://flowise.local/prediction/chatflow-123',
      { question: 'hello', chatId: 'old-chat' },
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
      })
    );

    // chatId updated in session
    expect(mgr.getSession('flowise', channelId)).toEqual({ chatId: 'new-chat' });
  });

  it('does not update chatId if API returns none; still returns text', async () => {
    // manager may already have prior chat from previous test; ensure no change
    const mgr = ConfigurationManager.getInstance() as any;
    const before = mgr.getSession('flowise', channelId);

    mockedHttp.post.mockResolvedValueOnce({ text: 'ok' } as any);

    const text = await getFlowiseResponse(channelId, 'q');
    expect(text).toBe('ok');

    // if no prior session, remain undefined; if existed, remain unchanged
    const after = mgr.getSession('flowise', channelId);
    expect(after).toEqual(before);
  });

  it('throws when API returns empty/invalid text', async () => {
    mockedHttp.post.mockResolvedValueOnce({ text: '   ' } as any);
    await expect(getFlowiseResponse(channelId, 'q')).rejects.toThrow(
      'Failed to fetch response from Flowise.'
    );
  });

  it('wraps http errors into a generic error', async () => {
    mockedHttp.post.mockRejectedValueOnce(
      Object.assign(new Error('boom'), {
        status: 500,
        data: { err: 'x' },
      })
    );
    await expect(getFlowiseResponse(channelId, 'q')).rejects.toThrow(
      'Failed to fetch response from Flowise.'
    );
  });

  it('wraps non-http errors into a generic error', async () => {
    mockedHttp.post.mockRejectedValueOnce(new Error('other'));
    await expect(getFlowiseResponse(channelId, 'q')).rejects.toThrow(
      'Failed to fetch response from Flowise.'
    );
  });

  it('fallback delegates to getFlowiseResponse', async () => {
    mockedHttp.post.mockResolvedValueOnce({ text: 'via-fallback' } as any);
    await expect(getFlowiseResponseFallback(channelId, 'hey')).resolves.toBe('via-fallback');
  });
});
