import { useState, useCallback } from 'react';
import type { Metrics } from '../services/metricsService';
import { getMetrics } from '../services/metricsService';
import { useInterval } from './useInterval';

export const useMetrics = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const metricsData = await getMetrics();
      setMetrics(metricsData);
    } catch {
      setError('Failed to fetch metrics');
    }
    setLoading(false);
  }, []);

  useInterval(fetchMetrics, 5000);

  return { metrics, loading, error };
};
