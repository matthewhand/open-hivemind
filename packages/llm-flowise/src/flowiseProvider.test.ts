import { getFlowiseResponse } from '@integrations/flowise/flowiseRestClient';
import { getFlowiseSdkResponse } from '@integrations/flowise/flowiseSdkClient';
import { FlowiseProvider } from './flowiseProvider';

jest.mock('@config/flowiseConfig', () => ({
  get: jest.fn((key: string) => {
    if (key === 'FLOWISE_USE_REST') return false;
    if (key === 'FLOWISE_CONVERSATION_CHATFLOW_ID') return 'flow-123';
    return null;
  }),
}));

jest.mock('@integrations/flowise/flowiseRestClient', () => ({
  getFlowiseResponse: jest.fn().mockResolvedValue('rest response'),
}));

jest.mock('@integrations/flowise/flowiseSdkClient', () => ({
  getFlowiseSdkResponse: jest.fn().mockResolvedValue('sdk response'),
}));

describe('FlowiseProvider', () => {
  let provider: FlowiseProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new FlowiseProvider();
  });

  it('returns error message when channelId is missing', async () => {
    const result = await provider.generateChatCompletion('hello', [], {});
    expect(result).toMatch(/missing some context/);
  });

  it('uses SDK client when useRest is false', async () => {
    const result = await provider.generateChatCompletion('hello', [], { channelId: 'ch1' });
    expect(getFlowiseSdkResponse).toHaveBeenCalledWith('hello', 'flow-123');
    expect(result).toBe('sdk response');
  });

  it('uses REST client when useRest is true', async () => {
    provider = new FlowiseProvider({ useRest: true });
    const result = await provider.generateChatCompletion('hello', [], { channelId: 'ch1' });
    expect(getFlowiseResponse).toHaveBeenCalledWith('ch1', 'hello');
    expect(result).toBe('rest response');
  });

  it('returns error string when SDK throws', async () => {
    (getFlowiseSdkResponse as jest.Mock).mockRejectedValueOnce(new Error('timeout'));
    const result = await provider.generateChatCompletion('hello', [], { channelId: 'ch1' });
    expect(result).toMatch(/error communicating/);
  });

  it('validateCredentials returns true for REST mode', async () => {
    provider = new FlowiseProvider({ useRest: true });
    expect(await provider.validateCredentials()).toBe(true);
  });

  it('validateCredentials returns true when chatflowId is set', async () => {
    provider = new FlowiseProvider({ chatflowId: 'abc' });
    expect(await provider.validateCredentials()).toBe(true);
  });
});
