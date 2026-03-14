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
  const statsCards = useMemo(() => [
    {
      title: 'Total Bots',
      value: bots.length,
      description: 'Configured bots',
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
      description: 'Errors encountered',
      icon: '⚠️',
    },
    {
      title: 'Uptime',
      value: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      description: 'System uptime',
      icon: '⏱️',
    },
  ], [bots.length, activeConnections, totalMessages, totalErrors, uptime]);

  return { statsCards };
};
