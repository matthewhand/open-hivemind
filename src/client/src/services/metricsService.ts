import axios from 'axios';

export interface Metrics {
  timestamp: string;
  system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
    version: string;
  };
  application: {
    bots: {
      total: number;
      active: number;
    };
    database: {
      connected: boolean;
      stats: unknown;
    };
  };
}

export const getMetrics = async (): Promise<Metrics> => {
  const response = await axios.get('/health/metrics');
  return response.data;
};
