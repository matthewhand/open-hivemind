import { useState, useEffect } from 'react';
import type { SpecDetailResponse } from '../types/spec';
import { apiService } from '../services/api';

const useSpec = (id: string) => {
  const [spec, setSpec] = useState<SpecDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpec = async () => {
      if (!id) { return; }

      setLoading(true);
      setError(null);
      try {
        const json = await apiService.get<any>(`/api/specs/${id}`);
        if (json.success && json.data) {
          setSpec(json.data);
        } else {
          throw new Error(json.error || 'Failed to fetch spec');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSpec();
  }, [id]);

  return { spec, loading, error };
};

export default useSpec;