import { useMemo } from 'react';
import { Bot } from '../../../types';

export const useDashboardStats = (
  bots: Bot[],
  statusBots: any[],
  activeBotCount: number,
  totalMessages: number,
  activeConnections: number,
  totalErrors: number,
  uptime: number
) => {
  const statsCards = useMemo(() => [
    {
      title: 'Active Bots',
      value: `${activeBotCount} / ${bots.length}`,
      type: 'primary',
      icon: 'Bot',
    },
    {
      title: 'Total Messages',
      value: totalMessages.toString(),
      type: 'secondary',
      icon: 'MessageSquare',
    },
    {
      title: 'Connections',
      value: activeConnections.toString(),
      type: 'accent',
      icon: 'Link',
    },
    {
      title: 'Errors',
      value: totalErrors.toString(),
      type: 'error',
      icon: 'AlertTriangle',
    },
    {
      title: 'System Uptime',
      value: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      type: 'info',
      icon: 'Clock',
    },
  ], [activeBotCount, bots.length, totalMessages, activeConnections, totalErrors, uptime]);

  return { statsCards };
};
