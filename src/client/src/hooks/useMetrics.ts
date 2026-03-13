import { useState, useEffect , useRef} from 'react';
import type { Metrics } from '../services/metricsService';
import { getMetrics } from '../services/metricsService';

export const useMetrics = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const metricsData = await getMetrics();
        setMetrics(metricsData);
      } catch {
        setError('Failed to fetch metrics');
      }
      setLoading(false);
    };

    fetchMetrics();
    timerRef.current = window.setInterval(fetchMetrics, 5000); // Refresh every 5 seconds

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { metrics, loading, error };
};
