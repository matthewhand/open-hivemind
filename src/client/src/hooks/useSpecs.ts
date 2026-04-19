import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { Spec } from '../types/spec';

export const useSpecs = (): {
  specs: Spec[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} => {
  const {
    data: specs = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<Spec[]>({
    queryKey: ['specs'],
    queryFn: async (): Promise<Spec[]> => {
      const response = await apiService.request<{ success: boolean; data: Spec[]; error?: string }>('/api/specs');
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch specs');
    },
  });

  const error = queryError instanceof Error ? queryError.message : null;

  return { specs, loading, error, refetch };
};

export default useSpecs;
