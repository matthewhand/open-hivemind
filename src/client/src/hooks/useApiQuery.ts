import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../services/api';

interface UseApiQueryOptions {
  /** Time-to-live for cached data in ms (default: 30000) */
  ttl?: number;
  /** Skip the initial fetch */
  enabled?: boolean;
}

interface UseApiQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const cache = new Map<string, { data: unknown; timestamp: number }>();

export function useApiQuery<T = unknown>(
  url: string,
  options: UseApiQueryOptions = {},
): UseApiQueryResult<T> {
  const { ttl = 30_000, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < ttl) {
      setData(cached.data as T);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await apiService.get(url);
      if (mountedRef.current) {
        cache.set(url, { data: result, timestamp: Date.now() });
        setData(result as T);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [url, ttl]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, enabled]);

  return { data, isLoading, error, refetch: fetchData };
}
