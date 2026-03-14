/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { getLlmProviders, getMessengerProviders, type ProviderInfo } from '../services/providerService';

export const useProviders = () => {
  const [llmProviders, setLlmProviders] = useState<ProviderInfo[]>([]);
  const [messageProviders, setMessageProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const [llmResult, messengerResult] = await Promise.allSettled([
          getLlmProviders(),
          getMessengerProviders(),
        ]);

        const llm = llmResult.status === 'fulfilled' ? llmResult.value : [];
        const messenger = messengerResult.status === 'fulfilled' ? messengerResult.value : [];
        if (llmResult.status === 'rejected' && messengerResult.status === 'rejected') {
          throw new Error('Failed to fetch providers');
        }
        setLlmProviders(llm);
        setMessageProviders(messenger);
      } catch (err) {
        setError('Failed to fetch providers');
      }
      setLoading(false);
    };

    fetchProviders();
  }, []);

  return { llmProviders, messageProviders, loading, error };
};

export type { ProviderInfo };
