import { create } from 'zustand';

interface HealthDetails {
  guilds?: number;
  team?: string;
  error?: string;
  [key: string]: unknown;
}

export interface BotStatus {
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

interface DashboardNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
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
  notifications: DashboardNotification[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string;
  refreshInterval: number;
  isAutoRefresh: boolean;
}

interface DashboardActions {
  setBots: (bots: BotStatus[]) => void;
  updateBotStatus: (name: string, updates: Partial<BotStatus>) => void;
  setSystemStatus: (status: Partial<DashboardState['systemStatus']>) => void;
  setPerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  setAnalytics: (analytics: Partial<AnalyticsData>) => void;
  addNotification: (notification: Omit<DashboardNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  clearReadNotifications: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRefreshInterval: (interval: number) => void;
  toggleAutoRefresh: () => void;
  setLastUpdated: () => void;
  updateDailyStats: (stat: { date: string; messages: number; errors: number }) => void;
  updateProviderUsage: (payload: { provider: string; count: number }) => void;
  updateTopChannels: (channels: Array<{ channelId: string; messageCount: number }>) => void;
  recordPerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  recordResponseTime: (time: number) => void;
  incrementErrorCount: () => void;
  resetErrorRate: () => void;
}

export const useDashboardStore = create<DashboardState & DashboardActions>((set, get) => ({
  bots: [],
  systemStatus: { uptime: 0, version: '2.0.0', environment: 'development' },
  performanceMetrics: {
    cpuUsage: 0, memoryUsage: 0, responseTime: 0,
    errorRate: 0, uptime: 0, activeConnections: 0,
  },
  analytics: {
    totalMessages: 0, totalBots: 0, activeConnections: 0,
    averageResponseTime: 0, errorRate: 0, topChannels: [],
    providerUsage: {}, dailyStats: [],
  },
  notifications: [],
  isLoading: false,
  error: null,
  lastUpdated: new Date().toISOString(),
  refreshInterval: 5000,
  isAutoRefresh: true,

  setBots: (bots) => set({ bots, lastUpdated: new Date().toISOString() }),

  updateBotStatus: (name, updates) => {
    const bots = get().bots.map((bot) =>
      bot.name === name ? { ...bot, ...updates, lastUpdated: new Date().toISOString() } : bot,
    );
    set({ bots });
  },

  setSystemStatus: (status) => set({ systemStatus: { ...get().systemStatus, ...status } }),

  setPerformanceMetrics: (metrics) =>
    set({ performanceMetrics: { ...get().performanceMetrics, ...metrics } }),

  setAnalytics: (analytics) =>
    set({ analytics: { ...get().analytics, ...analytics } }),

  addNotification: (notification) => {
    const newNotification: DashboardNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    const notifications = [newNotification, ...get().notifications].slice(0, 50);
    set({ notifications });
  },

  markNotificationAsRead: (id) => {
    set({
      notifications: get().notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    });
  },

  clearAllNotifications: () => set({ notifications: [] }),

  clearReadNotifications: () => {
    set({ notifications: get().notifications.filter((n) => !n.read) });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  setRefreshInterval: (interval) => set({ refreshInterval: Math.max(1000, interval) }),

  toggleAutoRefresh: () => set({ isAutoRefresh: !get().isAutoRefresh }),

  setLastUpdated: () => set({ lastUpdated: new Date().toISOString() }),

  updateDailyStats: ({ date, messages, errors }) => {
    const dailyStats = [...get().analytics.dailyStats];
    const existingIndex = dailyStats.findIndex((s) => s.date === date);
    if (existingIndex !== -1) {
      dailyStats[existingIndex] = { date, messages, errors };
    } else {
      dailyStats.push({ date, messages, errors });
      if (dailyStats.length > 30) dailyStats.splice(0, dailyStats.length - 30);
    }
    set({ analytics: { ...get().analytics, dailyStats } });
  },

  updateProviderUsage: ({ provider, count }) => {
    set({
      analytics: {
        ...get().analytics,
        providerUsage: { ...get().analytics.providerUsage, [provider]: count },
      },
    });
  },

  updateTopChannels: (topChannels) => {
    set({ analytics: { ...get().analytics, topChannels } });
  },

  recordPerformanceMetrics: (metrics) =>
    set({ performanceMetrics: { ...get().performanceMetrics, ...metrics } }),

  recordResponseTime: (time) => {
    const currentAvg = get().performanceMetrics.responseTime;
    const newAvg = currentAvg === 0 ? time : currentAvg * 0.9 + time * 0.1;
    set({ performanceMetrics: { ...get().performanceMetrics, responseTime: newAvg } });
  },

  incrementErrorCount: () => {
    const currentErrorRate = get().performanceMetrics.errorRate;
    set({
      performanceMetrics: {
        ...get().performanceMetrics,
        errorRate: Math.min(1, currentErrorRate + 0.01),
      },
    });
  },

  resetErrorRate: () => {
    const currentErrorRate = get().performanceMetrics.errorRate;
    set({
      performanceMetrics: {
        ...get().performanceMetrics,
        errorRate: Math.max(0, currentErrorRate - 0.05),
      },
    });
  },
}));

// Selector helpers
export const selectDashboard = (s: DashboardState) => s;
export const selectBots = (s: DashboardState) => s.bots;
export const selectSystemStatus = (s: DashboardState) => s.systemStatus;
export const selectDashboardPerformanceMetrics = (s: DashboardState) => s.performanceMetrics;
export const selectAnalytics = (s: DashboardState) => s.analytics;
export const selectNotifications = (s: DashboardState) => s.notifications;
export const selectIsAutoRefresh = (s: DashboardState) => s.isAutoRefresh;
export const selectDashboardRefreshInterval = (s: DashboardState) => s.refreshInterval;
export const selectLastUpdated = (s: DashboardState) => s.lastUpdated;
