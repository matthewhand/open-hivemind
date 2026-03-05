import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export interface Spec {
  id: string;
  name: string;
  content: string;
}

export const useSpecs = () => {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpecs = async () => {
      try {
        const data = await apiService.request<Spec[]>('/api/specs');
        setSpecs(data);
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