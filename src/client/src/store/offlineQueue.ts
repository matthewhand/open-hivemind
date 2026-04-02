/**
 * Offline Action Queue
 *
 * Intercepts API-calling Redux actions when the browser is offline, queues
 * them in localStorage, and replays them once the connection is restored.
 */

import type { Middleware, AnyAction, Dispatch } from '@reduxjs/toolkit';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueuedAction {
  /** Serialised action object. */
  action: AnyAction;
  /** ISO-8601 timestamp of when the action was enqueued. */
  queuedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'hivemind_offline_queue';
const DEFAULT_MAX_QUEUE_SIZE = 100;

// ---------------------------------------------------------------------------
// OfflineActionQueue
// ---------------------------------------------------------------------------

export class OfflineActionQueue {
  private queue: QueuedAction[] = [];
  private maxSize: number;
  private _listening = false;

  constructor(maxSize = DEFAULT_MAX_QUEUE_SIZE) {
    this.maxSize = maxSize;
    this.queue = OfflineActionQueue.loadFromStorage();
  }

  // ---- Persistence --------------------------------------------------------

  private static loadFromStorage(): QueuedAction[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // localStorage may be full or unavailable.
    }
  }

  // ---- Public API ---------------------------------------------------------

  /** Enqueue an action. Deduplicates by type + stringified payload. */
  enqueue(action: AnyAction): void {
    // Dedup: drop if an identical action is already in the queue.
    const key = actionKey(action);
    if (this.queue.some((q) => actionKey(q.action) === key)) {
      return;
    }

    if (this.queue.length >= this.maxSize) {
      // Drop the oldest action to make room.
      this.queue.shift();
    }

    this.queue.push({ action, queuedAt: new Date().toISOString() });
    this.persist();
  }

  /** Replay all queued actions through the given dispatch, then clear. */
  replay(dispatch: Dispatch): void {
    const snapshot = [...this.queue];
    this.queue = [];
    this.persist();

    for (const { action } of snapshot) {
      try {
        dispatch(action);
      } catch (err) {
        logger.error('[offlineQueue] Failed to replay action:', action.type, err);
      }
    }
  }

  /** Return a shallow copy of the current queue (useful for debugging). */
  getQueue(): ReadonlyArray<QueuedAction> {
    return [...this.queue];
  }

  /** Number of queued actions. */
  get size(): number {
    return this.queue.length;
  }

  /** Remove all queued actions. */
  clear(): void {
    this.queue = [];
    this.persist();
  }

  // ---- Connectivity listeners ---------------------------------------------

  /**
   * Start listening to browser online/offline events.
   * `dispatch` is called on reconnect to replay the queue.
   */
  startListening(dispatch: Dispatch): void {
    if (this._listening) return;
    this._listening = true;

    const handleOnline = () => {
      this.replay(dispatch);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Produce a deterministic string key for deduplication. */
function actionKey(action: AnyAction): string {
  const { type, meta: _meta, ...rest } = action;
  try {
    return `${type}::${JSON.stringify(rest)}`;
  } catch {
    return type;
  }
}

/**
 * Returns true when the action looks like an RTK Query API call that
 * should be queued when offline (mutations only — queries are idempotent
 * and will be refetched automatically).
 */
function isOfflineQueueable(action: AnyAction): boolean {
  const type = action.type as string;
  if (typeof type !== 'string') return false;

  if (type.includes('/executeMutation/') || type.includes('Mutation/pending')) {
    return true;
  }

  if (action.meta?.offline === true) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Redux middleware
// ---------------------------------------------------------------------------

/**
 * Create the offline-queue middleware. It intercepts queueable actions when
 * the browser reports offline and enqueues them for later replay.
 */
export function createOfflineMiddleware(
  offlineQueue: OfflineActionQueue,
): Middleware {
  return (_storeApi) => (next: Dispatch) => (action: AnyAction) => {
    const isOffline =
      typeof navigator !== 'undefined' && navigator.onLine === false;

    if (isOffline && isOfflineQueueable(action)) {
      offlineQueue.enqueue(action);
      return undefined;
    }

    return next(action);
  };
}
