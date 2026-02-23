import { useState, useEffect, useCallback } from 'react';
import { PageLifecycleOptions, PageLifecycleResult } from '../types/page';

export function usePageLifecycle<T>({
  fetchData,
  title,
}: PageLifecycleOptions<T>): PageLifecycleResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Update document title
  useEffect(() => {
    if (title) {
      document.title = `${title} | Open Hivemind`;
    }
  }, [title]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchData();
      setData(result);
    } catch (err) {
      console.error('Page data fetch error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh, setData };
}
