/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';

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
 * React hook that fetches data from a GET endpoint via TanStack Query.
 *
 * This is a thin compatibility wrapper — new code should prefer `useQuery` directly.
 *
 * @example
 *   const { data: bots, loading, error, refetch } = useApiQuery<Bot[]>('/api/bots');
 */
export function useApiQuery<T = any>(
  url: string | null,
  options: UseApiQueryOptions = {},
): UseApiQueryResult<T> {
  const { ttl = 30_000, enabled = true, pollInterval, bust = false } = options;
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    error,
    refetch: tqRefetch,
  } = useQuery<T>({
    queryKey: ['apiQuery', url],
    queryFn: async () => {
      const result = await apiService.get<T>(url!);
      return result;
    },
    enabled: enabled && !!url,
    staleTime: bust ? 0 : ttl,
    gcTime: ttl * 2,
    refetchInterval: pollInterval,
  });

  const refetch = async () => {
    // Invalidate first so staleTime is ignored
    await queryClient.invalidateQueries({ queryKey: ['apiQuery', url] });
    await tqRefetch();
  };

  return {
    data: data ?? null,
    loading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}

export default useApiQuery;
