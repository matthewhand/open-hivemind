import flowiseProvider from '@integrations/flowise/flowiseProvider';
import axios from 'axios';
import flowiseConfig from '@config/flowiseConfig';
import { getLlmProvider } from '@llm/getLlmProvider';


jest.mock('axios');
jest.mock('@config/flowiseConfig');
jest.mock('@llm/getLlmProvider');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFlowiseConfig = flowiseConfig as jest.Mocked<typeof flowiseConfig>;
const mockedGetLlmProvider = getLlmProvider as jest.Mock;


describe('FlowiseProvider Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the config for all tests in this suite
    (mockedFlowiseConfig.get as jest.Mock).mockReturnValue('http://fake-flowise-endpoint');
  });

  it('should return FlowiseProvider when LLM_PROVIDER is flowise', () => {
    mockedGetLlmProvider.mockReturnValue([flowiseProvider]);
    const providers = getLlmProvider();
    expect(providers[0]).toBe(flowiseProvider);
  });

  it('should return empty string for chat completion', async () => {
    const result = await flowiseProvider.generateChatCompletion([]);
    expect(result).toBe('');
  });

  it('should support completion', () => {
    expect(flowiseProvider.supportsCompletion()).toBe(true);
  });

  it('should not support chat completion', () => {
    expect(flowiseProvider.supportsChatCompletion()).toBe(false);
  });

  it('should generate completion successfully', async () => {
    mockedAxios.post.mockResolvedValue({ data: { completion: 'test completion' } });
    const completion = await flowiseProvider.generateCompletion('test prompt');
    expect(completion).toBe('test completion');
    expect(mockedAxios.post).toHaveBeenCalledWith('http://fake-flowise-endpoint', { prompt: 'test prompt' });
  });
});
