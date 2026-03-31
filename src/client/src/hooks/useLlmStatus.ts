import { useCallback, useEffect, useState } from 'react';
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
  const [status, setStatus] = useState<LlmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.get<LlmStatus>('/api/config/llm-status');
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load LLM status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    loading,
    error,
    refresh: fetchStatus,
  };
};
