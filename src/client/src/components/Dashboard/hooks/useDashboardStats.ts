import { useMemo } from 'react';
import type { Bot, StatusResponse } from '../../../services/api';

export const useDashboardStats = (
  bots: Bot[],
  statusBots: any[],
  activeBotCount: number,
  totalMessages: number,
  activeConnections: number,
  totalErrors: number,
  uptimeSeconds: number
) => {
  const statsCards = useMemo(() => {
    return [
      {
        id: 'activeBots',
        title: 'Active Bots',
        value: activeBotCount,
        description: 'Total bots running',
      },
      {
        id: 'totalMessages',
        title: 'Total Messages',
        value: totalMessages,
        description: 'Messages processed',
      },
      {
        id: 'totalErrors',
        title: 'Total Errors',
        value: totalErrors,
        description: 'Errors encountered',
      },
      {
        id: 'uptime',
        title: 'Uptime',
        value: Math.floor(uptimeSeconds / 3600) + 'h',
        description: 'Total uptime',
      },
    ];
  }, [activeBotCount, totalMessages, totalErrors, uptimeSeconds]);

  return { statsCards };
};
