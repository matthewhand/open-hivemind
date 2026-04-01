import { useQuery } from '@tanstack/react-query';
import type { Metrics } from '../services/metricsService';
import { getMetrics } from '../services/metricsService';

export const useMetrics = () => {
  const {
    data: metrics = null,
    isLoading: loading,
    error: queryError,
  } = useQuery<Metrics>({
    queryKey: ['metrics'],
    queryFn: getMetrics,
    refetchInterval: 5000,
  });

  const error = queryError instanceof Error ? queryError.message : null;

  return { metrics, loading, error };
};
