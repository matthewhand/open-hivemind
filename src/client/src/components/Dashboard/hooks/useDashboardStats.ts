import { useMemo } from 'react';

export interface DashboardBot {
  id: string;
  name: string;
  status: string;
  [key: string]: unknown;
}

export interface StatCard {
  title: string;
  value: number | string;
  description: string;
  icon: string;
}

export const useDashboardStats = (
  bots: DashboardBot[],
  statusBots: DashboardBot[],
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

  const statsCards = useMemo((): StatCard[] => [
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

  return { statsCards, errorRate, activeBotCount };
};
