import { useCallback, useEffect, useState } from 'react';

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
      const stored = localStorage.getItem('auth_tokens');
      const accessToken = stored ? (JSON.parse(stored) as { accessToken?: string })?.accessToken : undefined;
      const response = await fetch('/api/config/llm-status', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!response.ok) {
        throw new Error('Failed to load LLM status');
      }
      const data = await response.json();
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
