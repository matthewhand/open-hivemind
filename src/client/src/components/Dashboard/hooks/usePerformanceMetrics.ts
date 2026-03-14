import { useState, useEffect } from 'react';
import { apiService } from '../../../services/api';

export const usePerformanceMetrics = (refreshing: boolean) => {
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchPerformanceMetrics = async () => {
      try {
        const metrics = await apiService.request('/dashboard/performance');
        setPerformanceMetrics(metrics);
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error);
      }
    };
    fetchPerformanceMetrics();
  }, [refreshing]);

  return { performanceMetrics };
};
