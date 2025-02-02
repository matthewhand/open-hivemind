import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { openAiProvider } from '@src/llm/openAiProvider';
import FlowiseProvider from '@integrations/flowise/flowiseProvider';
// If you also support OpenWebUI, import it similarly
// import OpenWebUIProvider from '@integrations/openwebui/runInference';

export function getLlmProvider(): ILlmProvider {
  const providerEnv = process.env.LLM_PROVIDER || 'openai';
  switch (providerEnv.toLowerCase()) {
    case 'flowise':
      // FlowiseProvider is exported as an instance
      return FlowiseProvider;
    // case 'openwebui':
    //   return OpenWebUIProvider;
    case 'openai':
    default:
      return openAiProvider;
  }
}
