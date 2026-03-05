import { useState, useEffect, useCallback, useRef } from 'react';

export interface UsePageLifecycleOptions<T> {
  /** The page title to set in the document head */
  title?: string;
  /** Async function to fetch data. Receives an AbortSignal. Must be stable (memoized) or defined outside component. */
  fetchData?: (signal: AbortSignal) => Promise<T>;
  /** Initial data state */
  initialData?: T;
  /** Dependencies array to trigger re-fetch */
  dependencies?: any[];
}

export interface UsePageLifecycleResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  /** Manually trigger a re-fetch */
  refetch: () => Promise<void>;
}

/**
 * Hook to manage common page lifecycle tasks:
 * - Setting document title
 * - Fetching data with loading/error states
 * - Handling AbortController for cancellation
 * - preventing state updates on unmounted component
 */
export function usePageLifecycle<T = any>({
  title,
  fetchData,
  initialData,
  dependencies = [],
}: UsePageLifecycleOptions<T>): UsePageLifecycleResult<T> {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState<boolean>(!!fetchData);
  const [error, setError] = useState<Error | null>(null);

  // Store the active controller to abort previous requests on new fetch or unmount
  const abortControllerRef = useRef<AbortController | null>(null);

  // Set document title
  useEffect(() => {
    if (title) {
      document.title = `${title} | Open-Hivemind`;
    }
  }, [title]);

  const executeFetch = useCallback(async () => {
    if (!fetchData) return;

    // Abort previous request if any (e.g. rapid dependency changes or manual refetch)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchData(signal);

      // Only update state if not aborted
      if (!signal.aborted) {
        setData(result);
        setLoading(false);
      }
    } catch (err: unknown) {
      // Check for abort errors (standard DOMException or custom)
      const isAbortError =
        (err instanceof Error && err.name === 'AbortError') ||
        (err instanceof DOMException && err.name === 'AbortError');

      const isSignalAborted = signal.aborted;

      if (!isAbortError && !isSignalAborted) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    } finally {
        // Cleanup ref if this was the active request
        if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
        }
    }
  }, [fetchData]);

  // Initial fetch and dependency change
  useEffect(() => {
    executeFetch();

    return () => {
      // Cleanup on unmount or dependency change
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executeFetch, ...dependencies]);

  return { data, loading, error, refetch: executeFetch };
}
