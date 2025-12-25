import { useState, useEffect } from 'react';
import type { Spec } from '../types/spec';

const useSpecs = () => {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpecs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/webui/api/specs');
        if (!response.ok) {
          throw new Error('Failed to fetch specs');
        }
        const data = await response.json();
        setSpecs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSpecs();
  }, []);

  return { specs, loading, error };
};

export default useSpecs;