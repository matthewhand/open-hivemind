import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface PerformanceMetric {
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
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
    timestamp: string;
  }>;
  isLoading: boolean;
  error: string | null;
  recordingInterval: number;
  maxHistoryEntries: number;
}

const initialState: PerformanceState = {
  currentMetrics: [],
  history: [],
  isRecording: false,
  performanceBudget: {
    maxResponseTime: 1000, // 1 second
    maxMemoryUsage: 80, // 80%
    maxCpuUsage: 80, // 80%
    maxErrorRate: 5, // 5%
  },
  alerts: [],
  isLoading: false,
  error: null,
  recordingInterval: 1000, // 1 second
  maxHistoryEntries: 1000, // Keep last 1000 entries
};

const performanceSlice = createSlice({
  name: 'performance',
  initialState,
  reducers: {
    startRecording: (state) => {
      state.isRecording = true;
    },
    
    stopRecording: (state) => {
      state.isRecording = false;
    },
    
    addMetric: (state, action: PayloadAction<PerformanceMetric>) => {
      // Remove old metric with same name if exists
      state.currentMetrics = state.currentMetrics.filter(
        metric => metric.name !== action.payload.name,
      );
      
      // Add new metric
      state.currentMetrics.push(action.payload);
      
      // Add to history if recording
      if (state.isRecording) {
        const historyEntry: PerformanceHistory = {
          timestamp: action.payload.timestamp,
          metrics: [...state.currentMetrics],
        };
        
        state.history.push(historyEntry);
        
        // Keep only max history entries
        if (state.history.length > state.maxHistoryEntries) {
          state.history = state.history.slice(-state.maxHistoryEntries);
        }
      }
      
      // Check against performance budget
      checkPerformanceBudget(state, action.payload);
    },
    
    addMetrics: (state, action: PayloadAction<PerformanceMetric[]>) => {
      action.payload.forEach(metric => {
        // Remove old metric with same name if exists
        state.currentMetrics = state.currentMetrics.filter(
          m => m.name !== metric.name,
        );
        
        // Add new metric
        state.currentMetrics.push(metric);
      });
      
      // Add to history if recording
      if (state.isRecording && action.payload.length > 0) {
        const historyEntry: PerformanceHistory = {
          timestamp: action.payload[0].timestamp,
          metrics: [...state.currentMetrics],
        };
        
        state.history.push(historyEntry);
        
        // Keep only max history entries
        if (state.history.length > state.maxHistoryEntries) {
          state.history = state.history.slice(-state.maxHistoryEntries);
        }
        
        // Check performance budget for all new metrics
        action.payload.forEach(metric => {
          checkPerformanceBudget(state, metric);
        });
      }
    },
    
    clearHistory: (state) => {
      state.history = [];
    },
    
    clearMetricsByCategory: (state, action: PayloadAction<PerformanceMetric['category']>) => {
      state.currentMetrics = state.currentMetrics.filter(
        metric => metric.category !== action.payload,
      );
      state.history = state.history.map(entry => ({
        ...entry,
        metrics: entry.metrics.filter(metric => metric.category !== action.payload),
      }));
    },
    
    setPerformanceBudget: (state, action: PayloadAction<Partial<PerformanceState['performanceBudget']>>) => {
      state.performanceBudget = { ...state.performanceBudget, ...action.payload };
    },
    
    addAlert: (state, action: PayloadAction<Omit<PerformanceState['alerts'][0], 'id' | 'timestamp'>>) => {
      const alert = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };
      
      state.alerts.unshift(alert);
      
      // Keep only last 50 alerts
      if (state.alerts.length > 50) {
        state.alerts = state.alerts.slice(0, 50);
      }
    },
    
    dismissAlert: (state, action: PayloadAction<string>) => {
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload);
    },
    
    clearAllAlerts: (state) => {
      state.alerts = [];
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    setRecordingInterval: (state, action: PayloadAction<number>) => {
      state.recordingInterval = Math.max(100, action.payload); // Minimum 100ms
    },
    
    setMaxHistoryEntries: (state, action: PayloadAction<number>) => {
      state.maxHistoryEntries = Math.max(100, action.payload); // Minimum 100 entries
    },
  },
});

// Helper function to check performance budget
function checkPerformanceBudget(state: PerformanceState, metric: PerformanceMetric) {
  const { performanceBudget } = state;
  
  // Check response time budget
  if (metric.category === 'response_time' && metric.value > performanceBudget.maxResponseTime) {
    state.alerts.push({
      id: `${metric.name}-${Date.now()}`,
      type: 'warning',
      message: `${metric.name} exceeded budget: ${metric.value}ms > ${performanceBudget.maxResponseTime}ms`,
      metric: metric.name,
      value: metric.value,
      threshold: performanceBudget.maxResponseTime,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Check memory usage budget
  if (metric.category === 'memory' && metric.value > performanceBudget.maxMemoryUsage) {
    state.alerts.push({
      id: `${metric.name}-${Date.now()}`,
      type: 'error',
      message: `${metric.name} exceeded budget: ${metric.value}% > ${performanceBudget.maxMemoryUsage}%`,
      metric: metric.name,
      value: metric.value,
      threshold: performanceBudget.maxMemoryUsage,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Check CPU usage budget
  if (metric.category === 'cpu' && metric.value > performanceBudget.maxCpuUsage) {
    state.alerts.push({
      id: `${metric.name}-${Date.now()}`,
      type: 'error',
      message: `${metric.name} exceeded budget: ${metric.value}% > ${performanceBudget.maxCpuUsage}%`,
      metric: metric.name,
      value: metric.value,
      threshold: performanceBudget.maxCpuUsage,
      timestamp: new Date().toISOString(),
    });
  }
}

export const {
  startRecording,
  stopRecording,
  addMetric,
  addMetrics,
  clearHistory,
  clearMetricsByCategory,
  setPerformanceBudget,
  addAlert,
  dismissAlert,
  clearAllAlerts,
  setLoading,
  setError,
  setRecordingInterval,
  setMaxHistoryEntries,
} = performanceSlice.actions;

export default performanceSlice.reducer;

// Selectors
export const selectPerformance = (state: { performance: PerformanceState }) => state.performance;
export const selectCurrentMetrics = (state: { performance: PerformanceState }) => state.performance.currentMetrics;
export const selectHistory = (state: { performance: PerformanceState }) => state.performance.history;
export const selectIsRecording = (state: { performance: PerformanceState }) => state.performance.isRecording;
export const selectPerformanceBudget = (state: { performance: PerformanceState }) => state.performance.performanceBudget;
export const selectAlerts = (state: { performance: PerformanceState }) => state.performance.alerts;
export const selectIsLoading = (state: { performance: PerformanceState }) => state.performance.isLoading;
export const selectPerformanceError = (state: { performance: PerformanceState }) => state.performance.error;
export const selectRecordingInterval = (state: { performance: PerformanceState }) => state.performance.recordingInterval;
export const selectMaxHistoryEntries = (state: { performance: PerformanceState }) => state.performance.maxHistoryEntries;

// Computed selectors
export const selectMetricsByCategory = (category: PerformanceMetric['category']) => (state: { performance: PerformanceState }) =>
  state.performance.currentMetrics.filter(metric => metric.category === category);

export const selectMetricsByName = (name: string) => (state: { performance: PerformanceState }) =>
  state.performance.currentMetrics.find(metric => metric.name === name);

export const selectCriticalAlerts = (state: { performance: PerformanceState }) =>
  state.performance.alerts.filter(alert => alert.type === 'critical');

export const selectActiveAlerts = (state: { performance: PerformanceState }) =>
  state.performance.alerts.filter(alert => alert.type !== 'warning');

export const selectPerformanceSummary = (state: { performance: PerformanceState }) => {
  const metrics = state.performance.currentMetrics;
  const alerts = state.performance.alerts;
  
  const responseTimeMetric = metrics.find(m => m.category === 'response_time');
  const memoryMetric = metrics.find(m => m.category === 'memory');
  const cpuMetric = metrics.find(m => m.category === 'cpu');
  const errorRateMetric = metrics.find(m => m.category === 'network');
  
  return {
    isHealthy: alerts.filter(a => a.type === 'error').length === 0,
    responseTime: responseTimeMetric?.value || 0,
    memoryUsage: memoryMetric?.value || 0,
    cpuUsage: cpuMetric?.value || 0,
    errorRate: errorRateMetric?.value || 0,
    alertCount: alerts.length,
    criticalAlertCount: alerts.filter(a => a.type === 'critical').length,
  };
};

export const selectHistoricalData = (metricName: string, timeRange: number = 24) => (state: { performance: PerformanceState }) => {
  const cutoffTime = Date.now() - (timeRange * 60 * 60 * 1000);
  
  return state.performance.history
    .filter(entry => new Date(entry.timestamp).getTime() > cutoffTime)
    .map(entry => {
      const metric = entry.metrics.find(m => m.name === metricName);
      return {
        timestamp: entry.timestamp,
        value: metric?.value || 0,
      };
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};