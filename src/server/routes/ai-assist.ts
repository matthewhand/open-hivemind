import Debug from 'debug';
import { Router } from 'express';
import { FlowiseProvider } from '../../integrations/flowise/flowiseProvider';
import * as openWebUIImport from '../../integrations/openwebui/runInference';
import { getLlmProfileByKey } from '../../config/llmProfiles';
import { UserConfigStore } from '../../config/UserConfigStore';
import { authenticate } from '../middleware/auth';
import type { ILlmProvider } from '../../llm/interfaces/ILlmProvider';
import { IMessage } from '../../message/interfaces/IMessage';

const debug = Debug('app:ai-assist');
const router = Router();

// Simple concrete implementation of IMessage for internal use
class SimpleMessage extends IMessage {
  constructor(role: string, content: string) {
    super({}, role);
    this.content = content;
  }

  getMessageId(): string { return 'generated-' + Date.now(); }
  getTimestamp(): Date { return new Date(); }
  setText(text: string): void { this.content = text; }
  getChannelId(): string { return 'internal-ai-assist'; }
  getAuthorId(): string { return 'system'; }
  getChannelTopic(): string | null { return null; }
  getUserMentions(): string[] { return []; }
  getChannelUsers(): string[] { return []; }
  mentionsUsers(userId: string): boolean { return false; }
  isFromBot(): boolean { return this.role === 'assistant'; }
  getAuthorName(): string { return this.role; }
}

// Define OpenWebUI provider locally as in getLlmProvider.ts
const openWebUI: ILlmProvider = {
  name: 'openwebui',
  supportsChatCompletion: () => true,
  supportsCompletion: () => false,
  generateChatCompletion: async (
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ) => {
    if (openWebUIImport.generateChatCompletion.length === 3) {
      const result = await openWebUIImport.generateChatCompletion(
        userMessage,
        historyMessages,
        metadata
      );
      return result.text || '';
    } else {
      const result = await openWebUIImport.generateChatCompletion(userMessage, historyMessages);
      return result.text || '';
    }
  },
  generateCompletion: async () => {
    throw new Error('Non-chat completion not supported by OpenWebUI');
  },
};

router.use(authenticate);

router.post('/generate', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const userConfig = UserConfigStore.getInstance();
    const settings = userConfig.getGeneralSettings();
    const providerKey = settings.webuiIntelligenceProvider;

    if (!providerKey || providerKey === 'none') {
      return res.status(400).json({ error: 'AI Assistance is not configured.' });
    }

    const profile = getLlmProfileByKey(providerKey);
    if (!profile) {
      return res.status(404).json({ error: 'Configured AI Assistance provider profile not found.' });
    }

    let instance: ILlmProvider | undefined;
    try {
      switch (profile.provider.toLowerCase()) {
        case 'openai':
          // Dynamic require for OpenAI provider
          const { OpenAiProvider } = require('@hivemind/provider-openai');
          instance = new OpenAiProvider(profile.config);
          debug(`Initialized OpenAI provider instance for AI Assist: ${profile.name}`);
          break;
        case 'flowise':
          instance = new FlowiseProvider(profile.config);
          debug(`Initialized Flowise provider instance for AI Assist: ${profile.name}`);
          break;
        case 'openwebui':
          instance = openWebUI;
          debug(`Initialized OpenWebUI provider instance for AI Assist: ${profile.name}`);
          break;
        default:
          debug(`Unknown LLM provider type for AI Assist: ${profile.provider}`);
          return res.status(400).json({ error: `Unsupported provider type: ${profile.provider}` });
      }
    } catch (error: any) {
      debug(`Failed to initialize provider ${profile.name}:`, error);
      return res.status(500).json({ error: `Failed to initialize provider: ${error.message}` });
    }

    if (!instance) {
      return res.status(500).json({ error: 'Failed to instantiate provider instance.' });
    }

    // Construct messages
    const messages: IMessage[] = [];
    if (systemPrompt) {
        messages.push(new SimpleMessage('system', systemPrompt));
    }

    let result = '';
    if (instance.supportsChatCompletion()) {
        result = await instance.generateChatCompletion(prompt, messages);
    } else if (instance.supportsCompletion()) {
        // Fallback for completion-only providers
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
        result = await instance.generateCompletion(fullPrompt);
    } else {
        return res.status(400).json({ error: 'Provider does not support generation.' });
    }

    return res.json({ result });

  } catch (error: any) {
    debug('Error in AI Assist generation:', error);
    return res.status(500).json({
      error: 'Failed to generate response',
      message: error.message
    });
  }
});

export default router;
