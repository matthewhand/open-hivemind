import flowiseProvider from '@integrations/flowise/flowiseProvider';
import { getFlowiseResponse } from '@integrations/flowise/flowiseRestClient';
import { getFlowiseSdkResponse } from '@integrations/flowise/flowiseSdkClient';
import flowiseConfig from '@config/flowiseConfig';
import { getLlmProvider } from '@llm/getLlmProvider';
import { IMessage } from '@message/interfaces/IMessage';

jest.mock('@integrations/flowise/flowiseRestClient');
jest.mock('@integrations/flowise/flowiseSdkClient');
jest.mock('@llm/getLlmProvider');
jest.mock('@config/flowiseConfig');

const mockedGetFlowiseResponse = getFlowiseResponse as jest.Mock;
const mockedGetFlowiseSdkResponse = getFlowiseSdkResponse as jest.Mock;
const mockedGetLlmProvider = getLlmProvider as jest.Mock;
const mockedFlowiseConfig = flowiseConfig as jest.Mocked<typeof flowiseConfig>;

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

  describe.each([true, false])('chat completion with FLOWISE_USE_REST=%s', (useRest) => {
    beforeEach(() => {
      mockedFlowiseConfig.get.mockImplementation((key: string | null | undefined) => {
        if (key === 'FLOWISE_USE_REST') return useRest;
        if (key === 'FLOWISE_CONVERSATION_CHATFLOW_ID') return 'test-chatflow-id';
        return ''; // Default return for other keys
      });
    });

    it(`should call ${useRest ? 'getFlowiseResponse' : 'getFlowiseSdkResponse'} for chat completion`, async () => {
      if (useRest) {
        mockedGetFlowiseResponse.mockResolvedValue('flowise rest response');
        const result = await flowiseProvider.generateChatCompletion('test message', [], { channelId: 'test-channel' });
        expect(mockedGetFlowiseResponse).toHaveBeenCalledWith('test-channel', 'test message');
        expect(mockedGetFlowiseSdkResponse).not.toHaveBeenCalled();
        expect(result).toBe('flowise rest response');
      } else {
        mockedGetFlowiseSdkResponse.mockResolvedValue('flowise sdk response');
        const result = await flowiseProvider.generateChatCompletion('test message', [], { channelId: 'test-channel' });
        expect(mockedGetFlowiseSdkResponse).toHaveBeenCalledWith('test message', 'test-chatflow-id');
        expect(mockedGetFlowiseResponse).not.toHaveBeenCalled();
        expect(result).toBe('flowise sdk response');
      }
    });
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
