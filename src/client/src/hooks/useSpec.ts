import { useState, useEffect } from 'react';
import { SpecDetailResponse } from '../types/spec';

const useSpec = (id: string) => {
  const [spec, setSpec] = useState<SpecDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpec = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/webui/api/specs/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch spec');
        }
        const data = await response.json();
        setSpec(data);
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