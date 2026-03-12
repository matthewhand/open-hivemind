export const useDashboardStats = (
  bots: any[],
  statusBots: any[],
  activeBotCount: number,
  totalMessages: number,
  activeConnections: number,
  totalErrors: number,
  uptime: number
) => {
  return {
    statsCards: [
      {
        id: '1',
        title: 'Active Bots',
        value: activeBotCount,
        description: 'Currently running bots',
      },
      {
        id: '2',
        title: 'Total Messages',
        value: totalMessages,
        description: 'Processed messages',
      },
      {
        id: '3',
        title: 'Connections',
        value: activeConnections,
        description: 'Active connections',
      },
      {
        id: '4',
        title: 'Errors',
        value: totalErrors,
        description: 'Errors recorded',
      },
    ]
  };
};
