/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiCache } from '../services/apiCache';

export interface UseApiQueryOptions {
  /** Time-to-live for the cached response in milliseconds (default: 30 000). */
  ttl?: number;
  /** If true, skip the initial fetch (useful for conditional fetching). */
  enabled?: boolean;
  /** Polling interval in milliseconds. When set, the query re-fetches automatically. */
  pollInterval?: number;
  /** When true, bypass the cache and fetch fresh data. */
  bust?: boolean;
}

export interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Manually re-fetch (bypasses cache). */
  refetch: () => Promise<void>;
}

/**
 * React hook that fetches data from a GET endpoint through the ApiCache layer.
 *
 * Features:
 *  - Automatic caching & deduplication via `apiCache`.
 *  - Configurable TTL per query.
 *  - Optional polling interval.
 *  - Returns `{ data, loading, error, refetch }`.
 *
 * @example
 *   const { data: bots, loading, error, refetch } = useApiQuery<Bot[]>('/api/bots');
 */
export function useApiQuery<T = any>(
  url: string | null,
  options: UseApiQueryOptions = {},
): UseApiQueryResult<T> {
  const { ttl, enabled = true, pollInterval, bust = false } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled && !!url);
  const [error, setError] = useState<Error | null>(null);

  // Keep latest url in a ref so the polling interval always uses the current value
  const urlRef = useRef(url);
  urlRef.current = url;

  const fetchData = useCallback(
    async (forceBust = false) => {
      const currentUrl = urlRef.current;
      if (!currentUrl) return;

      setLoading(true);
      setError(null);

      try {
        const result = await apiCache.get<T>(currentUrl, {
          ttl,
          bust: forceBust || bust,
        });
        setData(result);
      } catch (err: any) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    },
    // ttl and bust are primitives, safe to list here
    [ttl, bust],
  );

  // Refetch always busts the cache
  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (enabled && url) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled]);

  // Polling
  useEffect(() => {
    if (!pollInterval || !enabled || !url) return;

    const id = setInterval(() => {
      fetchData(true);
    }, pollInterval);

    return () => clearInterval(id);
  }, [pollInterval, enabled, url, fetchData]);

  return { data, loading, error, refetch };
}

export default useApiQuery;
