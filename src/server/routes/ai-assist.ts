import Debug from 'debug';
import { Router } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { getLlmProfileByKey } from '../../config/llmProfiles';
import { UserConfigStore } from '../../config/UserConfigStore';
import type { ILlmProvider } from '../../llm/interfaces/ILlmProvider';
import { IMessage } from '../../message/interfaces/IMessage';
import { instantiateLlmProvider, loadPlugin } from '../../plugins/PluginLoader';
import { HTTP_STATUS } from '../../types/constants';
import { ErrorUtils } from '../../types/errors';
import { ChatGenerateSchema } from '../../validation/schemas/miscSchema';
import { validateRequest } from '../../validation/validateRequest';
import { asyncErrorHandler } from '../middleware/errorHandler';

const debug = Debug('app:ai-assist');
const router = Router();

// Simple concrete implementation of IMessage for internal use
class SimpleMessage extends IMessage {
  constructor(role: string, content: string) {
    super({}, role);
    this.content = content;
  }

  getMessageId(): string {
    return 'generated-' + Date.now();
  }
  getTimestamp(): Date {
    return new Date();
  }
  setText(text: string): void {
    this.content = text;
  }
  getChannelId(): string {
    return 'internal-ai-assist';
  }
  getAuthorId(): string {
    return 'system';
  }
  getChannelTopic(): string | null {
    return null;
  }
  getUserMentions(): string[] {
    return [];
  }
  getChannelUsers(): string[] {
    return [];
  }
  mentionsUsers(userId: string): boolean {
    return false;
  }
  isFromBot(): boolean {
    return this.role === 'assistant';
  }
  getAuthorName(): string {
    return this.role;
  }
}

// Maximum prompt length to prevent memory exhaustion and expensive API calls
const MAX_PROMPT_LENGTH = 32000; // ~8k tokens approximate limit
const MAX_SYSTEM_PROMPT_LENGTH = 16000;

router.post('/generate', validateRequest(ChatGenerateSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    if (!prompt) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Prompt is required'));
    }

    // Input validation for prompt sizes
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.error(`Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`)
        );
    }
    if (systemPrompt && systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.error(
            `System prompt exceeds maximum length of ${MAX_SYSTEM_PROMPT_LENGTH} characters`
          )
        );
    }

    const userConfig = UserConfigStore.getInstance();
    const settings = userConfig.getGeneralSettings();
    const providerKey = settings.webuiIntelligenceProvider;

    if (!providerKey || providerKey === 'none') {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('AI Assistance is not configured.'));
    }

    const profile = getLlmProfileByKey(providerKey);
    if (!profile) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Configured AI Assistance provider profile not found.'));
    }

    let instance: ILlmProvider | undefined;
    try {
      const pluginName = `llm-${profile.provider.toLowerCase()}`;
      const mod = await loadPlugin(pluginName);
      instance = instantiateLlmProvider(mod, profile.config);
      debug(
        `Initialized LLM provider via plugin for AI Assist: ${profile.provider} (${profile.name})`
      );
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug(`Failed to initialize provider ${profile.name}:`, hivemindError);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(
            `Failed to initialize provider: ${hivemindError instanceof Error ? hivemindError.message : String(hivemindError)}`
          )
        );
    }

    if (!instance) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to instantiate provider instance.'));
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
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('Provider does not support generation.'));
    }

    return res.json(ApiResponse.success({ result }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error in AI Assist generation:', hivemindError);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to generate response'));
  }
});

export default router;
