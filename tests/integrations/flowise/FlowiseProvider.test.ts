import flowiseProvider from '@integrations/flowise/flowiseProvider';
import { getFlowiseResponse } from '@integrations/flowise/flowiseRestClient';
import { getLlmProvider } from '@llm/getLlmProvider';
import { IMessage } from '@message/interfaces/IMessage';

jest.mock('@integrations/flowise/flowiseRestClient');
jest.mock('@llm/getLlmProvider');

const mockedGetFlowiseResponse = getFlowiseResponse as jest.Mock;
const mockedGetLlmProvider = getLlmProvider as jest.Mock;

const createMockMessage = (text: string): IMessage => ({
    getText: () => text,
} as any);

describe('FlowiseProvider Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return FlowiseProvider when LLM_PROVIDER is flowise', () => {
    mockedGetLlmProvider.mockReturnValue([flowiseProvider]);
    const providers = getLlmProvider();
    expect(providers[0]).toBe(flowiseProvider);
  });

  it('should call getFlowiseResponse for chat completion', async () => {
    mockedGetFlowiseResponse.mockResolvedValue('flowise response');
    const result = await flowiseProvider.generateChatCompletion('test message', [], { channelId: 'test-channel' });
    expect(mockedGetFlowiseResponse).toHaveBeenCalledWith('test-channel', 'test message');
    expect(result).toBe('flowise response');
  });

  it('should support chat completion', () => {
    expect(flowiseProvider.supportsChatCompletion()).toBe(true);
  });

  it('should not support legacy completion', () => {
    expect(flowiseProvider.supportsCompletion()).toBe(false);
  });
  
  it('should handle missing channelId in metadata gracefully', async () => {
      const response = await flowiseProvider.generateChatCompletion('test message', [], {}); // No channelId
      expect(response).toContain('missing some context');
      expect(mockedGetFlowiseResponse).not.toHaveBeenCalled();
  });
});
