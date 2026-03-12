import { useMemo } from 'react';
import type { Bot, StatusResponse } from '../../../services/api';

export const usePerformanceMetrics = (
  bots: Bot[],
  activeConnections: number,
  totalMessages: number,
  totalErrors: number
) => {
  const performanceMetrics = useMemo(() => {
    return {
      cpuUsage: 10,
      memoryUsage: 20,
      responseTime: 100,
      stabilityScore: totalMessages ? (totalErrors / totalMessages) * 100 : 0,
      throughput: 50
    };
  }, [totalErrors, totalMessages]);

  const performanceCards = useMemo(() => {
    return [
      {
        id: 'cpu',
        label: 'CPU Usage',
        value: \`\${performanceMetrics.cpuUsage}%\`,
        helper: 'Average CPU load',
        icon: null,
      },
      {
        id: 'memory',
        label: 'Memory Usage',
        value: \`\${performanceMetrics.memoryUsage}MB\`,
        helper: 'Total memory consumed',
        icon: null,
      },
      {
        id: 'response',
        label: 'Response Time',
        value: \`\${performanceMetrics.responseTime}ms\`,
        helper: 'Average response time',
        icon: null,
      },
    ];
  }, [performanceMetrics]);

  return { performanceMetrics, performanceCards };
};
