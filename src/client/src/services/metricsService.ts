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
  const res = await fetch('/health/metrics');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
