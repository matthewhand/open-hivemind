import { FlowiseClient } from 'flowise-sdk';
import flowiseConfig from '@hivemind/provider-flowise/flowiseConfig';
import { getFlowiseSdkResponse } from '@hivemind/provider-flowise/flowiseSdkClient';

jest.mock('flowise-sdk', () => {
  const createPrediction = jest.fn();
  const ctor = jest.fn().mockImplementation(() => ({
    createPrediction,
  }));
  // expose the mock so tests can access the same function reference
  (ctor as any).__mock = { createPrediction };
  return { FlowiseClient: ctor };
});

jest.mock('@hivemind/provider-flowise/flowiseConfig', () => {
  const actual = jest.requireActual('@hivemind/provider-flowise/flowiseConfig');
  return {
    __esModule: true,
    default: {
      get: jest.fn((key: string) => {
        const map: Record<string, any> = {
          FLOWISE_API_ENDPOINT: 'http://flowise.local',
          FLOWISE_API_KEY: 'sdk-api-key',
        };
        return map[key] ?? actual.default.get(key);
      }),
    },
  };
});

describe('flowiseSdkClient.getFlowiseSdkResponse', () => {
  const chatflowId = 'chatflow-abc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns completion text on success and passes expected params', async () => {
    const ctor = FlowiseClient as unknown as jest.Mock & {
      __mock: { createPrediction: jest.Mock };
    };
    ctor.__mock.createPrediction.mockResolvedValueOnce({ text: 'hello from sdk' });

    const text = await getFlowiseSdkResponse('hi there', chatflowId);
    expect(text).toBe('hello from sdk');

    expect(FlowiseClient).toHaveBeenCalledWith({ baseUrl: 'http://flowise.local' });
    expect(ctor.__mock.createPrediction).toHaveBeenCalledWith({
      chatflowId,
      question: 'hi there',
      overrideConfig: {
        credentials: {
          DefaultKey: 'sdk-api-key',
        },
      },
      streaming: false,
    });
  });

  it('returns empty string when SDK returns no text', async () => {
    const ctor = FlowiseClient as unknown as jest.Mock & {
      __mock: { createPrediction: jest.Mock };
    };
    ctor.__mock.createPrediction.mockResolvedValueOnce({});

    const text = await getFlowiseSdkResponse('no text', chatflowId);
    expect(text).toBe('');
  });

  it('returns empty string when SDK throws', async () => {
    const ctor = FlowiseClient as unknown as jest.Mock & {
      __mock: { createPrediction: jest.Mock };
    };
    ctor.__mock.createPrediction.mockRejectedValueOnce(new Error('network'));

    const text = await getFlowiseSdkResponse('boom', chatflowId);
    expect(text).toBe('');
  });
});
