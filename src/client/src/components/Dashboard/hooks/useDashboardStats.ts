import { useMemo } from 'react';

export const useDashboardStats = (
  activeBotCount: number,
  totalMessages: number,
  activeConnections: number,
  totalErrors: number,
) => {
  const statsCards = useMemo(() => [
    {
      id: 'active-bots',
      title: 'Active Bots',
      value: activeBotCount.toString(),
      icon: 'bot',
      color: 'primary' as const,
      trend: { value: 0, isPositive: true },
    },
    {
      id: 'total-messages',
      title: 'Total Messages',
      value: totalMessages.toString(),
      icon: 'message',
      color: 'secondary' as const,
    },
    {
      id: 'active-connections',
      title: 'Active Connections',
      value: activeConnections.toString(),
      icon: 'zap',
      color: 'success' as const,
    },
    {
      id: 'total-errors',
      title: 'Total Errors',
      value: totalErrors.toString(),
      icon: 'alert',
      color: 'error' as const,
    },
  ], [activeBotCount, totalMessages, activeConnections, totalErrors]);

  return { statsCards };
};
