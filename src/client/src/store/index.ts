/**
 * Store barrel -- re-exports everything consumers need from a single import.
 *
 * Plain UI/domain state lives in Zustand stores (uiStore, authStore, etc.).
 * RTK Query (apiSlice) retains a minimal Redux store for its cache.
 */

export { store } from './store';
export type { RootState, AppStore, AppDispatch } from './store';
export { HydrationErrorBoundary } from './hydrationErrorBoundary';

// Zustand stores
export { useUIStore } from './uiStore';
export { useAuthStore } from './authStore';
export { useDashboardStore } from './dashboardStore';
export { useConfigStore } from './configStore';
export { useErrorStore } from './errorStore';
export { usePerformanceStore } from './performanceStore';
export { useWebSocketStore } from './websocketStore';
