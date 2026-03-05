/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { getLlmProviders, getMessengerProviders, type ProviderInfo } from '../services/providerService';

export const useProviders = () => {
  const [llmProviders, setLlmProviders] = useState<ProviderInfo[]>([]);
  const [messengerProviders, setMessengerProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const [llm, messenger] = await Promise.all([
          getLlmProviders(),
          getMessengerProviders(),
        ]);
        setLlmProviders(llm);
        setMessengerProviders(messenger);
      } catch (err) {
        setError('Failed to fetch providers');
      }
      setLoading(false);
    };

    fetchProviders();
  }, []);

  return { llmProviders, messengerProviders, loading, error };
};

export type { ProviderInfo };
