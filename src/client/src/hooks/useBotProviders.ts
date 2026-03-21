import { v4 as uuidv4 } from "uuid";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useCallback } from 'react';
import type {
  MessageProvider,
  LLMProvider,
} from '../types/bot';
import { useBots } from './useBots';
import { getProviderSchemasByType, getProviderSchema } from '../provider-configs';

const useBotProviders = () => {
  const { updateBot } = useBots();

  // Generate unique ID
  const generateId = () => uuidv4();

  // Create message provider
  const createMessageProvider = useCallback((
    _botId: string,
    type: string,
    name: string,
    config: Record<string, any>,
  ): MessageProvider => {
    const schema = getProviderSchema(type);

    const provider: MessageProvider = {
      id: generateId(),
      type,
      name: name || schema?.displayName || 'New Provider',
      config,
      enabled: true,
    };

    return provider;
  }, []);

  // Create LLM provider
  const createLLMProvider = useCallback((
    _botId: string,
    type: string,
    name: string,
    config: Record<string, any>,
  ): LLMProvider => {
    const schema = getProviderSchema(type);

    const provider: LLMProvider = {
      id: generateId(),
      type,
      name: name || schema?.displayName || 'New Provider',
      config,
      enabled: true,
    };

    return provider;
  }, []);

  // Add message provider to bot
  const addMessageProvider = useCallback((
    botId: string,
    type: string,
    name: string,
    config: Record<string, any>,
  ) => {
    const provider = createMessageProvider(botId, type, name, config);

    updateBot(botId, (prevBot) => ({
      ...prevBot,
      messageProviders: [...prevBot.messageProviders, provider],
    }));

    return provider;
  }, [createMessageProvider, updateBot]);

  // Add LLM provider to bot
  const addLLMProvider = useCallback((
    botId: string,
    type: string,
    name: string,
    config: Record<string, any>,
  ) => {
    const provider = createLLMProvider(botId, type, name, config);

    updateBot(botId, (prevBot) => ({
      ...prevBot,
      llmProviders: [...prevBot.llmProviders, provider],
    }));

    return provider;
  }, [createLLMProvider, updateBot]);

  // Update provider
  const updateProvider = useCallback((
    botId: string,
    providerId: string,
    updates: Partial<MessageProvider | LLMProvider>,
  ) => {
    updateBot(botId, (prevBot) => {
      const updatedMessageProviders = prevBot.messageProviders.map(p =>
        p.id === providerId ? { ...p, ...updates } : p,
      );

      const updatedLLMProviders = prevBot.llmProviders.map(p =>
        p.id === providerId ? { ...p, ...updates } : p,
      );

      return {
        ...prevBot,
        messageProviders: updatedMessageProviders,
        llmProviders: updatedLLMProviders,
      };
    });
  }, [updateBot]);

  // Remove provider from bot
  const removeProvider = useCallback((botId: string, providerId: string) => {
    updateBot(botId, (prevBot) => ({
      ...prevBot,
      messageProviders: prevBot.messageProviders.filter(p => p.id !== providerId),
      llmProviders: prevBot.llmProviders.filter(p => p.id !== providerId),
    }));
  }, [updateBot]);

  // Test provider connection
  const testProvider = useCallback(async (
    botId: string,
    providerId: string,
  ): Promise<boolean> => {
    try {
      // Update provider status to testing
      updateProvider(botId, providerId, { enabled: false });

      // Simulate API call to test provider
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update provider status based on type
      updateBot(botId, (prevBot) => {
        const messageProvider = prevBot.messageProviders.find(p => p.id === providerId);
        const llmProvider = prevBot.llmProviders.find(p => p.id === providerId);

        if (messageProvider) {
          const updatedProviders = prevBot.messageProviders.map(p =>
            p.id === providerId
              ? { ...p, enabled: true }
              : p,
          );
          return { ...prevBot, messageProviders: updatedProviders };
        }

        if (llmProvider) {
          const updatedProviders = prevBot.llmProviders.map(p =>
            p.id === providerId
              ? { ...p, enabled: true }
              : p,
          );
          return { ...prevBot, llmProviders: updatedProviders };
        }

        return prevBot;
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';

      updateBot(botId, (prevBot) => {
        const messageProvider = prevBot.messageProviders.find(p => p.id === providerId);
        const llmProvider = prevBot.llmProviders.find(p => p.id === providerId);

        if (messageProvider) {
          const updatedProviders = prevBot.messageProviders.map(p =>
            p.id === providerId
              ? { ...p, enabled: false }
              : p,
          );
          return { ...prevBot, messageProviders: updatedProviders };
        }

        if (llmProvider) {
          const updatedProviders = prevBot.llmProviders.map(p =>
            p.id === providerId
              ? { ...p, enabled: false }
              : p,
          );
          return { ...prevBot, llmProviders: updatedProviders };
        }

        return prevBot;
      });

      return false;
    }
  }, [updateBot, updateProvider]);

  // Get available provider types
  const getAvailableMessageProviders = useCallback(() => {
    return getProviderSchemasByType('message').map(s => s.providerType);
  }, []);

  const getAvailableLLMProviders = useCallback(() => {
    return getProviderSchemasByType('llm').map(s => s.providerType);
  }, []);

  // Get provider schema by type
  const getMessageProviderSchema = useCallback((type: string) => {
    return getProviderSchema(type);
  }, []);

  const getLLMProviderSchema = useCallback((type: string) => {
    return getProviderSchema(type);
  }, []);

  return {
    addMessageProvider,
    addLLMProvider,
    updateProvider,
    removeProvider,
    testProvider,
    getAvailableMessageProviders,
    getAvailableLLMProviders,
    getMessageProviderSchema,
    getLLMProviderSchema,
  };
};

export { useBotProviders };
export default useBotProviders;
