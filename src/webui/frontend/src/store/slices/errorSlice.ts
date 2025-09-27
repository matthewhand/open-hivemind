import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ErrorDetails {
  id: string;
  type: 'runtime' | 'api' | 'validation' | 'network';
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
  resolved: boolean;
}

interface ErrorState {
  errors: ErrorDetails[];
  hasCriticalError: boolean;
  errorCount: number;
  errorReportingEnabled: boolean;
  maxErrors: number;
  autoRefresh: boolean;
}

const initialState: ErrorState = {
  errors: [],
  hasCriticalError: false,
  errorCount: 0,
  errorReportingEnabled: true,
  maxErrors: 100,
  autoRefresh: true,
};

const errorSlice = createSlice({
  name: 'error',
  initialState,
  reducers: {
    addError: (state, action: PayloadAction<Omit<ErrorDetails, 'id' | 'timestamp' | 'resolved'>>) => {
      const error: ErrorDetails = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        resolved: false,
      };
      
      // Add to beginning of array
      state.errors.unshift(error);
      
      // Remove oldest errors if we exceed max
      if (state.errors.length > state.maxErrors) {
        state.errors = state.errors.slice(0, state.maxErrors);
      }
      
      state.errorCount++;
      
      // Check if we have critical errors
      if (error.severity === 'critical') {
        state.hasCriticalError = true;
      }
    },
    
    removeError: (state, action: PayloadAction<string>) => {
      const errorIndex = state.errors.findIndex(err => err.id === action.payload);
      if (errorIndex !== -1) {
        state.errors.splice(errorIndex, 1);
        state.errorCount = Math.max(0, state.errorCount - 1);
        
        // Check if we still have critical errors
        state.hasCriticalError = state.errors.some(err => err.severity === 'critical' && !err.resolved);
      }
    },
    
    resolveError: (state, action: PayloadAction<string>) => {
      const error = state.errors.find(err => err.id === action.payload);
      if (error) {
        error.resolved = true;
        
        // Check if we still have critical errors
        state.hasCriticalError = state.errors.some(err => err.severity === 'critical' && !err.resolved);
      }
    },
    
    clearAllErrors: (state) => {
      state.errors = [];
      state.errorCount = 0;
      state.hasCriticalError = false;
    },
    
    clearErrorsByType: (state, action: PayloadAction<ErrorDetails['type']>) => {
      state.errors = state.errors.filter(err => err.type !== action.payload);
      state.errorCount = state.errors.length;
      state.hasCriticalError = state.errors.some(err => err.severity === 'critical' && !err.resolved);
    },
    
    clearErrorsBySeverity: (state, action: PayloadAction<ErrorDetails['severity']>) => {
      state.errors = state.errors.filter(err => err.severity !== action.payload);
      state.errorCount = state.errors.length;
      
      if (action.payload === 'critical') {
        state.hasCriticalError = false;
      } else {
        state.hasCriticalError = state.errors.some(err => err.severity === 'critical' && !err.resolved);
      }
    },
    
    setErrorReportingEnabled: (state, action: PayloadAction<boolean>) => {
      state.errorReportingEnabled = action.payload;
    },
    
    setMaxErrors: (state, action: PayloadAction<number>) => {
      state.maxErrors = Math.max(10, action.payload);
      
      // Trim existing errors if necessary
      if (state.errors.length > state.maxErrors) {
        state.errors = state.errors.slice(0, state.maxErrors);
      }
    },
    
    toggleAutoRefresh: (state) => {
      state.autoRefresh = !state.autoRefresh;
    },
    
    // Analytics actions
    incrementErrorCount: (state) => {
      state.errorCount++;
    },
    
    resetErrorCount: (state) => {
      state.errorCount = 0;
    },
  },
});

export const {
  addError,
  removeError,
  resolveError,
  clearAllErrors,
  clearErrorsByType,
  clearErrorsBySeverity,
  setErrorReportingEnabled,
  setMaxErrors,
  toggleAutoRefresh,
  incrementErrorCount,
  resetErrorCount,
} = errorSlice.actions;

export default errorSlice.reducer;

// Selectors
export const selectError = (state: { error: ErrorState }) => state.error;
export const selectErrors = (state: { error: ErrorState }) => state.error.errors;
export const selectHasCriticalError = (state: { error: ErrorState }) => state.error.hasCriticalError;
export const selectErrorCount = (state: { error: ErrorState }) => state.error.errorCount;
export const selectErrorReportingEnabled = (state: { error: ErrorState }) => state.error.errorReportingEnabled;
export const selectMaxErrors = (state: { error: ErrorState }) => state.error.maxErrors;
export const selectAutoRefresh = (state: { error: ErrorState }) => state.error.autoRefresh;

// Computed selectors
export const selectErrorsByType = (type: ErrorDetails['type']) => (state: { error: ErrorState }) =>
  state.error.errors.filter(err => err.type === type);

export const selectErrorsBySeverity = (severity: ErrorDetails['severity']) => (state: { error: ErrorState }) =>
  state.error.errors.filter(err => err.severity === severity);

export const selectUnresolvedErrors = (state: { error: ErrorState }) =>
  state.error.errors.filter(err => !err.resolved);

export const selectResolvedErrors = (state: { error: ErrorState }) =>
  state.error.errors.filter(err => err.resolved);

export const selectRecentErrors = (limit: number = 10) => (state: { error: ErrorState }) =>
  state.error.errors.slice(0, limit);

export const selectErrorsByTimeRange = (startTime: string, endTime: string) => (state: { error: ErrorState }) =>
  state.error.errors.filter(err => 
    err.timestamp >= startTime && err.timestamp <= endTime
  );

export const selectErrorStats = (state: { error: ErrorState }) => {
  const total = state.error.errors.length;
  const byType = state.error.errors.reduce((acc, err) => {
    acc[err.type] = (acc[err.type] || 0) + 1;
    return acc;
  }, {} as Record<ErrorDetails['type'], number>);
  
  const bySeverity = state.error.errors.reduce((acc, err) => {
    acc[err.severity] = (acc[err.severity] || 0) + 1;
    return acc;
  }, {} as Record<ErrorDetails['severity'], number>);
  
  const unresolved = state.error.errors.filter(err => !err.resolved).length;
  const resolved = state.error.errors.filter(err => err.resolved).length;
  
  return {
    total,
    byType,
    bySeverity,
    unresolved,
    resolved,
    errorRate: total > 0 ? (unresolved / total) * 100 : 0,
  };
};