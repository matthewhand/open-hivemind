import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

import type { Spec } from '../types/spec';

export const useSpecs = () => {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpecs = async () => {
      try {
        const response = await apiService.request<{ success: boolean; data: Spec[]; error?: string }>('/api/specs');
        if (response.success && response.data) {
          setSpecs(response.data);
        } else {
          throw new Error(response.error || 'Failed to fetch specs');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch specs');
      } finally {
        setLoading(false);
      }
    };

    fetchSpecs();
  }, []);

  return { specs, loading, error };
};

export default useSpecs;