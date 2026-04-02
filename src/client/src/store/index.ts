/**
 * Store barrel -- re-exports everything consumers need from a single import.
 *
 * The actual store creation, state versioning, and offline queue live in
 * dedicated modules; this file re-exports the public surface.
 */

export { store, setupStore, offlineQueue } from './store';
export type { RootState, AppStore, AppDispatch } from './store';
export { STATE_VERSION, migrations, migrateState, saveState, loadState, clearPersistedState } from './stateVersioning';
export { OfflineActionQueue, createOfflineMiddleware } from './offlineQueue';
export { HydrationErrorBoundary } from './hydrationErrorBoundary';
