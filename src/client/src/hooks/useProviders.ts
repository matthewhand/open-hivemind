import { useQueries } from '@tanstack/react-query';
import { getLlmProviders, getMessengerProviders, type ProviderInfo } from '../services/providerService';

export const useProviders = () => {
  const results = useQueries({
    queries: [
      {
        queryKey: ['providers', 'llm'],
        queryFn: getLlmProviders,
        retry: 1,
      },
      {
        queryKey: ['providers', 'messenger'],
        queryFn: getMessengerProviders,
        retry: 1,
      },
    ],
  });

  const [llmQuery, messengerQuery] = results;

  const llmProviders: ProviderInfo[] = llmQuery.data ?? [];
  const messageProviders: ProviderInfo[] = messengerQuery.data ?? [];
  const loading = llmQuery.isLoading || messengerQuery.isLoading;
  const error =
    llmQuery.error && messengerQuery.error ? 'Failed to fetch providers' : null;

  return { llmProviders, messageProviders, loading, error };
};

export type { ProviderInfo };
