import { create } from 'zustand';

export interface ErrorDetails {
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

interface ErrorActions {
  addError: (error: Omit<ErrorDetails, 'id' | 'timestamp' | 'resolved'>) => void;
  removeError: (id: string) => void;
  resolveError: (id: string) => void;
  clearAllErrors: () => void;
  clearErrorsByType: (type: ErrorDetails['type']) => void;
  clearErrorsBySeverity: (severity: ErrorDetails['severity']) => void;
  setErrorReportingEnabled: (enabled: boolean) => void;
  setMaxErrors: (max: number) => void;
  toggleAutoRefresh: () => void;
  incrementErrorCount: () => void;
  resetErrorCount: () => void;
}

export const useErrorStore = create<ErrorState & ErrorActions>((set, get) => ({
  errors: [],
  hasCriticalError: false,
  errorCount: 0,
  errorReportingEnabled: true,
  maxErrors: 100,
  autoRefresh: true,

  addError: (errorInput) => {
    const error: ErrorDetails = {
      ...errorInput,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    let errors = [error, ...get().errors];
    if (errors.length > get().maxErrors) {
      errors = errors.slice(0, get().maxErrors);
    }
    const hasCriticalError = errors.some((e) => e.severity === 'critical' && !e.resolved);
    set({ errors, errorCount: get().errorCount + 1, hasCriticalError });
  },

  removeError: (id) => {
    const errors = get().errors.filter((e) => e.id !== id);
    const hasCriticalError = errors.some((e) => e.severity === 'critical' && !e.resolved);
    set({ errors, errorCount: Math.max(0, get().errorCount - 1), hasCriticalError });
  },

  resolveError: (id) => {
    const errors = get().errors.map((e) => (e.id === id ? { ...e, resolved: true } : e));
    const hasCriticalError = errors.some((e) => e.severity === 'critical' && !e.resolved);
    set({ errors, hasCriticalError });
  },

  clearAllErrors: () => set({ errors: [], errorCount: 0, hasCriticalError: false }),

  clearErrorsByType: (type) => {
    const errors = get().errors.filter((e) => e.type !== type);
    set({
      errors,
      errorCount: errors.length,
      hasCriticalError: errors.some((e) => e.severity === 'critical' && !e.resolved),
    });
  },

  clearErrorsBySeverity: (severity) => {
    const errors = get().errors.filter((e) => e.severity !== severity);
    set({
      errors,
      errorCount: errors.length,
      hasCriticalError: severity === 'critical'
        ? false
        : errors.some((e) => e.severity === 'critical' && !e.resolved),
    });
  },

  setErrorReportingEnabled: (errorReportingEnabled) => set({ errorReportingEnabled }),

  setMaxErrors: (max) => {
    const maxErrors = Math.max(10, max);
    const errors = get().errors.slice(0, maxErrors);
    set({ maxErrors, errors });
  },

  toggleAutoRefresh: () => set({ autoRefresh: !get().autoRefresh }),

  incrementErrorCount: () => set({ errorCount: get().errorCount + 1 }),

  resetErrorCount: () => set({ errorCount: 0 }),
}));
