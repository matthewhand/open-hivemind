import { useCallback } from 'react';
import {
  MessageProvider,
  LLMProvider,
  MessageProviderType,
  LLMProviderType,
  MESSAGE_PROVIDER_CONFIGS,
  LLM_PROVIDER_CONFIGS
} from '../types/bot';
import { useBots } from './useBots';

const useBotProviders = () => {
  const { updateBot } = useBots();

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Create message provider
  const createMessageProvider = useCallback((
    botId: string,
    type: MessageProviderType,
    name: string,
    config: Record<string, any>
  ): MessageProvider => {
    const providerConfig = MESSAGE_PROVIDER_CONFIGS[type];
    if (!providerConfig) {
      throw new Error(`Unknown message provider type: ${type}`);
    }

    const provider: MessageProvider = {
      id: generateId(),
      type,
      name: name || providerConfig.name,
      config,
      status: 'disconnected',
      lastConnected: null,
      error: null
    };

    return provider;
  }, []);

  // Create LLM provider
  const createLLMProvider = useCallback((
    botId: string,
    type: LLMProviderType,
    name: string,
    config: Record<string, any>
  ): LLMProvider => {
    const providerConfig = LLM_PROVIDER_CONFIGS[type];
    if (!providerConfig) {
      throw new Error(`Unknown LLM provider type: ${type}`);
    }

    const provider: LLMProvider = {
      id: generateId(),
      type,
      name: name || providerConfig.name,
      config,
      status: 'unavailable',
      lastConnected: null,
      error: null
    };

    return provider;
  }, []);

  // Add message provider to bot
  const addMessageProvider = useCallback((
    botId: string,
    type: MessageProviderType,
    name: string,
    config: Record<string, any>
  ) => {
    const provider = createMessageProvider(botId, type, name, config);

    updateBot(botId, (prevBot) => ({
      ...prevBot,
      messageProviders: [...prevBot.messageProviders, provider]
    }));

    return provider;
  }, [createMessageProvider, updateBot]);

  // Add LLM provider to bot
  const addLLMProvider = useCallback((
    botId: string,
    type: LLMProviderType,
    name: string,
    config: Record<string, any>
  ) => {
    const provider = createLLMProvider(botId, type, name, config);

    updateBot(botId, (prevBot) => ({
      ...prevBot,
      llmProviders: [...prevBot.llmProviders, provider]
    }));

    return provider;
  }, [createLLMProvider, updateBot]);

  // Update provider
  const updateProvider = useCallback((
    botId: string,
    providerId: string,
    updates: Partial<MessageProvider | LLMProvider>
  ) => {
    updateBot(botId, (prevBot) => {
      const updatedMessageProviders = prevBot.messageProviders.map(p =>
        p.id === providerId ? { ...p, ...updates } : p
      );

      const updatedLLMProviders = prevBot.llmProviders.map(p =>
        p.id === providerId ? { ...p, ...updates } : p
      );

      return {
        ...prevBot,
        messageProviders: updatedMessageProviders,
        llmProviders: updatedLLMProviders
      };
    });
  }, [updateBot]);

  // Remove provider from bot
  const removeProvider = useCallback((botId: string, providerId: string) => {
    updateBot(botId, (prevBot) => ({
      ...prevBot,
      messageProviders: prevBot.messageProviders.filter(p => p.id !== providerId),
      llmProviders: prevBot.llmProviders.filter(p => p.id !== providerId)
    }));
  }, [updateBot]);

  // Test provider connection
  const testProvider = useCallback(async (
    botId: string,
    providerId: string
  ): Promise<boolean> => {
    try {
      // Update provider status to testing
      updateProvider(botId, providerId, { status: 'testing', error: null });

      // Simulate API call to test provider
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update provider status based on type
      updateBot(botId, (prevBot) => {
        const messageProvider = prevBot.messageProviders.find(p => p.id === providerId);
        const llmProvider = prevBot.llmProviders.find(p => p.id === providerId);

        if (messageProvider) {
          const updatedProviders = prevBot.messageProviders.map(p =>
            p.id === providerId
              ? { ...p, status: 'connected' as const, lastConnected: new Date().toISOString(), error: null }
              : p
          );
          return { ...prevBot, messageProviders: updatedProviders };
        }

        if (llmProvider) {
          const updatedProviders = prevBot.llmProviders.map(p =>
            p.id === providerId
              ? { ...p, status: 'available' as const, lastConnected: new Date().toISOString(), error: null }
              : p
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
              ? { ...p, status: 'error' as const, error: errorMessage }
              : p
          );
          return { ...prevBot, messageProviders: updatedProviders };
        }

        if (llmProvider) {
          const updatedProviders = prevBot.llmProviders.map(p =>
            p.id === providerId
              ? { ...p, status: 'error' as const, error: errorMessage }
              : p
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
    return Object.keys(MESSAGE_PROVIDER_CONFIGS) as MessageProviderType[];
  }, []);

  const getAvailableLLMProviders = useCallback(() => {
    return Object.keys(LLM_PROVIDER_CONFIGS) as LLMProviderType[];
  }, []);

  // Get provider config by type
  const getMessageProviderConfig = useCallback((type: MessageProviderType) => {
    return MESSAGE_PROVIDER_CONFIGS[type];
  }, []);

  const getLLMProviderConfig = useCallback((type: LLMProviderType) => {
    return LLM_PROVIDER_CONFIGS[type];
  }, []);

  return {
    addMessageProvider,
    addLLMProvider,
    updateProvider,
    removeProvider,
    testProvider,
    getAvailableMessageProviders,
    getAvailableLLMProviders,
    getMessageProviderConfig,
    getLLMProviderConfig
  };
};

export default useBotProviders;