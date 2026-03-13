import { useMemo } from 'react';
import { Bot, StatusResponse } from '../../../../services/api';

export function useDashboardStats(
  bots: Bot[],
  statusBots: StatusResponse[],
  activeBotCount: number,
  totalMessages: number,
  activeConnections: number,
  totalErrors: number,
  uptime: number
) {
  const statsCards = useMemo(() => {
    return [
      {
        title: 'Active Bots',
        value: activeBotCount.toString(),
        description: `${bots.length} total configured`,
        color: 'primary',
      },
      {
        title: 'Connected',
        value: activeConnections.toString(),
        description: 'Currently online',
        color: 'success',
      },
      {
        title: 'Messages Processed',
        value: totalMessages.toString(),
        description: 'Total messages handled',
        color: 'info',
      },
      {
        title: 'Error Rate',
        value: totalMessages > 0 ? `${((totalErrors / totalMessages) * 100).toFixed(2)}%` : '0%',
        description: `${totalErrors} total errors`,
        color: totalErrors > 0 ? 'error' : 'success',
      },
    ];
  }, [activeBotCount, bots.length, activeConnections, totalMessages, totalErrors]);

  return { statsCards };
}
