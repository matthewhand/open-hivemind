import { useQuery } from '@tanstack/react-query';
import type { SpecDetailResponse } from '../types/spec';
import { apiService } from '../services/api';

const useSpec = (id: string) => {
  const {
    data: spec = null,
    isLoading: loading,
    error: queryError,
  } = useQuery<SpecDetailResponse | null>({
    queryKey: ['spec', id],
    queryFn: async () => {
      const json = await apiService.get<any>(`/api/specs/${id}`);
      if (json.success && json.data) {
        return json.data;
      }
      throw new Error(json.error || 'Failed to fetch spec');
    },
    enabled: !!id,
  });

  const error = queryError instanceof Error ? queryError.message : null;

  return { spec, loading, error };
};

export default useSpec;
