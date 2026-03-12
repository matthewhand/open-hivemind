import { useMemo } from 'react';

export const useDashboardStats = (
  bots: any[],
  statusBots: any[],
  activeBotCount: number,
  totalMessages: number,
  activeConnections: number,
  totalErrors: number,
  uptime: number
) => {
  const errorRate = useMemo(
    () => (totalMessages > 0 ? ((totalErrors / totalMessages) * 100).toFixed(1) : '0.0'),
    [totalErrors, totalMessages]
  );

  const statsCards = useMemo(() => [
    {
      title: 'Total Bots',
      value: bots.length,
      description: `${activeBotCount} active`,
      icon: '🤖',
    },
    {
      title: 'Active Connections',
      value: activeConnections,
      description: 'Current active connections',
      icon: '🔌',
    },
    {
      title: 'Total Messages',
      value: totalMessages,
      description: 'Messages processed',
      icon: '💬',
    },
    {
      title: 'Total Errors',
      value: totalErrors,
      description: `${errorRate}% error rate`,
      icon: '⚠️',
    },
    {
      title: 'Uptime',
      value: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      description: 'System uptime',
      icon: '⏱️',
    },
  ], [bots.length, activeBotCount, activeConnections, totalMessages, totalErrors, errorRate, uptime]);

  return { statsCards, errorRate };
};
