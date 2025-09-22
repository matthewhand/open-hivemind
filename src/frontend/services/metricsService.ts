import axios from 'axios';

export interface Metrics {
  messagesProcessed: number;
  activeConnections: number;
  responseTime: number[];
  errors: number;
  uptime: number;
}

export const getMetrics = async (): Promise<Metrics> => {
  const response = await axios.get('/api/metrics/json');
  return response.data;
};
