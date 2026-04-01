import { create } from 'zustand';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  category: 'cpu' | 'memory' | 'network' | 'disk' | 'response_time';
}

interface PerformanceHistory {
  timestamp: string;
  metrics: PerformanceMetric[];
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
}

interface PerformanceState {
  currentMetrics: PerformanceMetric[];
  history: PerformanceHistory[];
  isRecording: boolean;
  performanceBudget: {
    maxResponseTime: number;
    maxMemoryUsage: number;
    maxCpuUsage: number;
    maxErrorRate: number;
  };
  alerts: PerformanceAlert[];
  isLoading: boolean;
  error: string | null;
  recordingInterval: number;
  maxHistoryEntries: number;
}

interface PerformanceActions {
  startRecording: () => void;
  stopRecording: () => void;
  addMetric: (metric: PerformanceMetric) => void;
  addMetrics: (metrics: PerformanceMetric[]) => void;
  clearHistory: () => void;
  clearMetricsByCategory: (category: PerformanceMetric['category']) => void;
  setPerformanceBudget: (budget: Partial<PerformanceState['performanceBudget']>) => void;
  addAlert: (alert: Omit<PerformanceAlert, 'id' | 'timestamp'>) => void;
  dismissAlert: (id: string) => void;
  clearAllAlerts: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRecordingInterval: (interval: number) => void;
  setMaxHistoryEntries: (max: number) => void;
}

function checkBudget(
  currentMetrics: PerformanceMetric[],
  metric: PerformanceMetric,
  budget: PerformanceState['performanceBudget'],
  alerts: PerformanceAlert[],
): PerformanceAlert[] {
  const newAlerts = [...alerts];
  if (metric.category === 'response_time' && metric.value > budget.maxResponseTime) {
    newAlerts.unshift({
      id: `${metric.name}-${Date.now()}`,
      type: 'warning',
      message: `${metric.name} exceeded budget: ${metric.value}ms > ${budget.maxResponseTime}ms`,
      metric: metric.name,
      value: metric.value,
      threshold: budget.maxResponseTime,
      timestamp: new Date().toISOString(),
    });
  }
  if (metric.category === 'memory' && metric.value > budget.maxMemoryUsage) {
    newAlerts.unshift({
      id: `${metric.name}-${Date.now()}`,
      type: 'error',
      message: `${metric.name} exceeded budget: ${metric.value}% > ${budget.maxMemoryUsage}%`,
      metric: metric.name,
      value: metric.value,
      threshold: budget.maxMemoryUsage,
      timestamp: new Date().toISOString(),
    });
  }
  if (metric.category === 'cpu' && metric.value > budget.maxCpuUsage) {
    newAlerts.unshift({
      id: `${metric.name}-${Date.now()}`,
      type: 'error',
      message: `${metric.name} exceeded budget: ${metric.value}% > ${budget.maxCpuUsage}%`,
      metric: metric.name,
      value: metric.value,
      threshold: budget.maxCpuUsage,
      timestamp: new Date().toISOString(),
    });
  }
  return newAlerts.slice(0, 50);
}

export const usePerformanceStore = create<PerformanceState & PerformanceActions>((set, get) => ({
  currentMetrics: [],
  history: [],
  isRecording: false,
  performanceBudget: {
    maxResponseTime: 1000,
    maxMemoryUsage: 80,
    maxCpuUsage: 80,
    maxErrorRate: 5,
  },
  alerts: [],
  isLoading: false,
  error: null,
  recordingInterval: 1000,
  maxHistoryEntries: 1000,

  startRecording: () => set({ isRecording: true }),
  stopRecording: () => set({ isRecording: false }),

  addMetric: (metric) => {
    const state = get();
    const currentMetrics = [
      ...state.currentMetrics.filter((m) => m.name !== metric.name),
      metric,
    ];
    let history = state.history;
    let alerts = state.alerts;
    if (state.isRecording) {
      history = [...history, { timestamp: metric.timestamp, metrics: [...currentMetrics] }];
      if (history.length > state.maxHistoryEntries) {
        history = history.slice(-state.maxHistoryEntries);
      }
    }
    alerts = checkBudget(currentMetrics, metric, state.performanceBudget, alerts);
    set({ currentMetrics, history, alerts });
  },

  addMetrics: (metrics) => {
    const state = get();
    let currentMetrics = [...state.currentMetrics];
    metrics.forEach((metric) => {
      currentMetrics = [...currentMetrics.filter((m) => m.name !== metric.name), metric];
    });
    let history = state.history;
    let alerts = state.alerts;
    if (state.isRecording && metrics.length > 0) {
      history = [...history, { timestamp: metrics[0].timestamp, metrics: [...currentMetrics] }];
      if (history.length > state.maxHistoryEntries) {
        history = history.slice(-state.maxHistoryEntries);
      }
      metrics.forEach((metric) => {
        alerts = checkBudget(currentMetrics, metric, state.performanceBudget, alerts);
      });
    }
    set({ currentMetrics, history, alerts });
  },

  clearHistory: () => set({ history: [] }),

  clearMetricsByCategory: (category) => {
    set({
      currentMetrics: get().currentMetrics.filter((m) => m.category !== category),
      history: get().history.map((entry) => ({
        ...entry,
        metrics: entry.metrics.filter((m) => m.category !== category),
      })),
    });
  },

  setPerformanceBudget: (budget) =>
    set({ performanceBudget: { ...get().performanceBudget, ...budget } }),

  addAlert: (alert) => {
    const newAlert: PerformanceAlert = {
      ...alert,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    const alerts = [newAlert, ...get().alerts].slice(0, 50);
    set({ alerts });
  },

  dismissAlert: (id) => set({ alerts: get().alerts.filter((a) => a.id !== id) }),

  clearAllAlerts: () => set({ alerts: [] }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  setRecordingInterval: (interval) => set({ recordingInterval: Math.max(100, interval) }),

  setMaxHistoryEntries: (max) => {
    const maxHistoryEntries = Math.max(100, max);
    set({
      maxHistoryEntries,
      history: get().history.slice(-maxHistoryEntries),
    });
  },
}));
