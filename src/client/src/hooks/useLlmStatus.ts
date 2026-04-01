import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export interface LlmStatus {
  defaultConfigured: boolean;
  defaultProviders: Array<{ id: string; name: string; type: string }>;
  botsMissingLlmProvider: string[];
  hasMissing: boolean;
}

interface LlmStatusState {
  status: LlmStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useLlmStatus = (): LlmStatusState => {
  const {
    data: status = null,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<LlmStatus>({
    queryKey: ['config', 'llm-status'],
    queryFn: () => apiService.get<LlmStatus>('/api/config/llm-status'),
  });

  const error = queryError instanceof Error ? queryError.message : null;

  const refresh = async () => {
    await refetch();
  };

  return {
    status,
    loading,
    error,
    refresh,
  };
};
