import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface HealthDetails {
  guilds?: number;
  team?: string;
  error?: string;
  [key: string]: unknown;
}

interface BotStatus {
  name: string;
  provider: string;
  llmProvider: string;
  status: string;
  healthDetails?: HealthDetails;
  connected?: boolean;
  messageCount?: number;
  errorCount?: number;
  lastUpdated: string;
}

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
  activeConnections: number;
}

interface AnalyticsData {
  totalMessages: number;
  totalBots: number;
  activeConnections: number;
  averageResponseTime: number;
  errorRate: number;
  topChannels: Array<{ channelId: string; messageCount: number }>;
  providerUsage: Record<string, number>;
  dailyStats: Array<{ date: string; messages: number; errors: number }>;
}

interface DashboardState {
  bots: BotStatus[];
  systemStatus: {
    uptime: number;
    version: string;
    environment: string;
  };
  performanceMetrics: PerformanceMetrics;
  analytics: AnalyticsData;
  notifications: Array<{
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
  }>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string;
  refreshInterval: number;
  isAutoRefresh: boolean;
}

const initialState: DashboardState = {
  bots: [],
  systemStatus: {
    uptime: 0,
    version: '2.0.0',
    environment: 'development',
  },
  performanceMetrics: {
    cpuUsage: 0,
    memoryUsage: 0,
    responseTime: 0,
    errorRate: 0,
    uptime: 0,
    activeConnections: 0,
  },
  analytics: {
    totalMessages: 0,
    totalBots: 0,
    activeConnections: 0,
    averageResponseTime: 0,
    errorRate: 0,
    topChannels: [],
    providerUsage: {},
    dailyStats: [],
  },
  notifications: [],
  isLoading: false,
  error: null,
  lastUpdated: new Date().toISOString(),
  refreshInterval: 5000, // 5 seconds
  isAutoRefresh: true,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setBots: (state, action: PayloadAction<BotStatus[]>) => {
      state.bots = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    updateBotStatus: (state, action: PayloadAction<{ name: string; updates: Partial<BotStatus> }>) => {
      const { name, updates } = action.payload;
      const botIndex = state.bots.findIndex(bot => bot.name === name);
      if (botIndex !== -1) {
        state.bots[botIndex] = { ...state.bots[botIndex], ...updates, lastUpdated: new Date().toISOString() };
      }
    },
    setSystemStatus: (state, action: PayloadAction<Partial<DashboardState['systemStatus']>>) => {
      state.systemStatus = { ...state.systemStatus, ...action.payload };
    },
    setPerformanceMetrics: (state, action: PayloadAction<Partial<PerformanceMetrics>>) => {
      state.performanceMetrics = { ...state.performanceMetrics, ...action.payload };
    },
    setAnalytics: (state, action: PayloadAction<Partial<AnalyticsData>>) => {
      state.analytics = { ...state.analytics, ...action.payload };
    },
    addNotification: (state, action: PayloadAction<Omit<DashboardState['notifications'][0], 'id' | 'timestamp' | 'read'>>) => {
      const notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
      };
      state.notifications.unshift(notification);
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    clearReadNotifications: (state) => {
      state.notifications = state.notifications.filter(n => !n.read);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = Math.max(1000, action.payload); // Minimum 1 second
    },
    toggleAutoRefresh: (state) => {
      state.isAutoRefresh = !state.isAutoRefresh;
    },
    setLastUpdated: (state) => {
      state.lastUpdated = new Date().toISOString();
    },
    // Advanced analytics actions
    updateDailyStats: (state, action: PayloadAction<{ date: string; messages: number; errors: number }>) => {
      const { date, messages, errors } = action.payload;
      const existingIndex = state.analytics.dailyStats.findIndex(stat => stat.date === date);
      
      if (existingIndex !== -1) {
        state.analytics.dailyStats[existingIndex] = { date, messages, errors };
      } else {
        state.analytics.dailyStats.push({ date, messages, errors });
        // Keep only last 30 days
        if (state.analytics.dailyStats.length > 30) {
          state.analytics.dailyStats = state.analytics.dailyStats.slice(-30);
        }
      }
    },
    updateProviderUsage: (state, action: PayloadAction<{ provider: string; count: number }>) => {
      const { provider, count } = action.payload;
      state.analytics.providerUsage[provider] = count;
    },
    updateTopChannels: (state, action: PayloadAction<Array<{ channelId: string; messageCount: number }>>) => {
      state.analytics.topChannels = action.payload;
    },
    // Performance monitoring actions
    recordPerformanceMetrics: (state, action: PayloadAction<Partial<PerformanceMetrics>>) => {
      state.performanceMetrics = { ...state.performanceMetrics, ...action.payload };
    },
    recordResponseTime: (state, action: PayloadAction<number>) => {
      // Keep rolling average of last 100 response times
      const currentAvg = state.performanceMetrics.responseTime;
      const newAvg = currentAvg === 0 ? action.payload : (currentAvg * 0.9 + action.payload * 0.1);
      state.performanceMetrics.responseTime = newAvg;
    },
    incrementErrorCount: (state) => {
      // Update error rate based on recent activity
      const currentErrorRate = state.performanceMetrics.errorRate;
      state.performanceMetrics.errorRate = Math.min(1, currentErrorRate + 0.01);
    },
    resetErrorRate: (state) => {
      state.performanceMetrics.errorRate = Math.max(0, state.performanceMetrics.errorRate - 0.05);
    },
  },
});

export const {
  setBots,
  updateBotStatus,
  setSystemStatus,
  setPerformanceMetrics,
  setAnalytics,
  addNotification,
  markNotificationAsRead,
  clearAllNotifications,
  clearReadNotifications,
  setLoading,
  setError,
  setRefreshInterval,
  toggleAutoRefresh,
  setLastUpdated,
  updateDailyStats,
  updateProviderUsage,
  updateTopChannels,
  recordPerformanceMetrics,
  recordResponseTime,
  incrementErrorCount,
  resetErrorRate,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;

// Selectors
export const selectDashboard = (state: { dashboard: DashboardState }) => state.dashboard;
export const selectBots = (state: { dashboard: DashboardState }) => state.dashboard.bots;
export const selectSystemStatus = (state: { dashboard: DashboardState }) => state.dashboard.systemStatus;
export const selectPerformanceMetrics = (state: { dashboard: DashboardState }) => state.dashboard.performanceMetrics;
export const selectAnalytics = (state: { dashboard: DashboardState }) => state.dashboard.analytics;
export const selectNotifications = (state: { dashboard: DashboardState }) => state.dashboard.notifications;
export const selectUnreadNotifications = (state: { dashboard: DashboardState }) => 
  state.dashboard.notifications.filter(n => !n.read);
export const selectIsLoading = (state: { dashboard: DashboardState }) => state.dashboard.isLoading;
export const selectError = (state: { dashboard: DashboardState }) => state.dashboard.error;
export const selectRefreshInterval = (state: { dashboard: DashboardState }) => state.dashboard.refreshInterval;
export const selectIsAutoRefresh = (state: { dashboard: DashboardState }) => state.dashboard.isAutoRefresh;
export const selectLastUpdated = (state: { dashboard: DashboardState }) => state.dashboard.lastUpdated;

// Computed selectors
export const selectActiveBots = (state: { dashboard: DashboardState }) => 
  state.dashboard.bots.filter(bot => bot.status === 'active' || bot.connected === true);

export const selectBotsByProvider = (provider: string) => (state: { dashboard: DashboardState }) =>
  state.dashboard.bots.filter(bot => bot.provider === provider);

export const selectBotsWithErrors = (state: { dashboard: DashboardState }) =>
  state.dashboard.bots.filter(bot => bot.errorCount && bot.errorCount > 0);

export const selectPerformanceSummary = (state: { dashboard: DashboardState }) => {
  const metrics = state.dashboard.performanceMetrics;
  return {
    isHealthy: metrics.errorRate < 0.05 && metrics.responseTime < 1000,
    cpuStatus: metrics.cpuUsage < 80 ? 'good' : metrics.cpuUsage < 90 ? 'warning' : 'critical',
    memoryStatus: metrics.memoryUsage < 80 ? 'good' : metrics.memoryUsage < 90 ? 'warning' : 'critical',
    responseTimeStatus: metrics.responseTime < 500 ? 'good' : metrics.responseTime < 1000 ? 'warning' : 'slow',
  };
};