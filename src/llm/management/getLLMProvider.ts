import debugModule from 'debug';
import llmConfig from '@llm/interfaces/llmConfig';
import { OpenAI } from 'openai';

const debug = debugModule('app:getLLMProvider');

interface LLMService {
  name: string;
  generate: (prompt: string) => Promise<string>;
}

function getLLMProvider(): LLMService[] {
  const providers = llmConfig.get('LLM_PROVIDER') as string[];
  debug(`Configured LLM providers: ${providers.join(', ')}`);

  const llmServices: LLMService[] = [];

  providers.forEach((provider: string) => {
    try {
      switch (provider.toLowerCase()) {
        case 'openai':
          const openai = new OpenAI({
            apiKey: llmConfig.get('OPENAI_API_KEY') as string,
            baseURL: llmConfig.get('OPENAI_BASE_URL') as string,
            timeout: llmConfig.get('OPENAI_TIMEOUT') as number
          });
          llmServices.push({
            name: 'openai',
            generate: async (prompt: string) => {
              const response = await openai.chat.completions.create({
                model: llmConfig.get('OPENAI_MODEL') as string,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: llmConfig.get('OPENAI_MAX_TOKENS') as number,
                temperature: llmConfig.get('OPENAI_TEMPERATURE') as number
              });
              return response.choices[0].message.content || ''; // Fallback to empty string
            }
          });
          debug(`Initialized OpenAI provider`);
          break;
        default:
          debug(`Unsupported LLM provider: ${provider}, skipping`);
      }
    } catch (error) {
      debug(`Failed to initialize LLM provider ${provider}: ${error}`);
    }
  });

  if (llmServices.length === 0) {
    throw new Error('No valid LLM providers initialized');
  }

  return llmServices;
}

export { getLLMProvider };
