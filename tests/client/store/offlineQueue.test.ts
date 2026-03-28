/**
 * Tests for the offline action queue and middleware.
 */

// Minimal localStorage polyfill for Node
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: jest.fn((key: string) => storage[key] ?? null),
  setItem: jest.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: jest.fn((key: string) => { delete storage[key]; }),
  clear: jest.fn(() => { for (const k of Object.keys(storage)) delete storage[k]; }),
  get length() { return Object.keys(storage).length; },
  key: jest.fn((_i: number) => null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

import { OfflineActionQueue, createOfflineMiddleware } from '../../../src/client/src/store/offlineQueue';

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
});

// ---------------------------------------------------------------------------
// OfflineActionQueue
// ---------------------------------------------------------------------------

describe('OfflineActionQueue', () => {
  it('enqueues actions', () => {
    const q = new OfflineActionQueue();
    q.enqueue({ type: 'test/action', payload: 1 });
    expect(q.size).toBe(1);
  });

  it('deduplicates identical actions', () => {
    const q = new OfflineActionQueue();
    q.enqueue({ type: 'test/action', payload: 1 });
    q.enqueue({ type: 'test/action', payload: 1 });
    expect(q.size).toBe(1);
  });

  it('does not dedup actions with different payloads', () => {
    const q = new OfflineActionQueue();
    q.enqueue({ type: 'test/action', payload: 1 });
    q.enqueue({ type: 'test/action', payload: 2 });
    expect(q.size).toBe(2);
  });

  it('respects max queue size by dropping oldest', () => {
    const q = new OfflineActionQueue(3);
    q.enqueue({ type: 'a', payload: 1 });
    q.enqueue({ type: 'b', payload: 2 });
    q.enqueue({ type: 'c', payload: 3 });
    q.enqueue({ type: 'd', payload: 4 });

    expect(q.size).toBe(3);
    const types = q.getQueue().map((i) => i.action.type);
    expect(types).toEqual(['b', 'c', 'd']);
  });

  it('persists to localStorage on enqueue', () => {
    const q = new OfflineActionQueue();
    q.enqueue({ type: 'x' });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'hivemind_offline_queue',
      expect.any(String),
    );
  });

  it('replays queued actions through dispatch', () => {
    const q = new OfflineActionQueue();
    q.enqueue({ type: 'first' });
    q.enqueue({ type: 'second' });

    const dispatch = jest.fn();
    q.replay(dispatch);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'first' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'second' }));
    expect(q.size).toBe(0);
  });

  it('clears the queue', () => {
    const q = new OfflineActionQueue();
    q.enqueue({ type: 'a' });
    q.enqueue({ type: 'b' });
    q.clear();
    expect(q.size).toBe(0);
  });

  it('loads previously persisted queue on construction', () => {
    // Seed localStorage directly
    storage['hivemind_offline_queue'] = JSON.stringify([
      { action: { type: 'persisted' }, queuedAt: new Date().toISOString() },
    ]);

    const q = new OfflineActionQueue();
    expect(q.size).toBe(1);
    expect(q.getQueue()[0].action.type).toBe('persisted');
  });
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

describe('createOfflineMiddleware', () => {
  const makeMiddleware = () => {
    const queue = new OfflineActionQueue();
    const middleware = createOfflineMiddleware(queue);
    const next = jest.fn((action) => action);
    const storeApi = { getState: jest.fn(), dispatch: jest.fn() };
    return { queue, handler: middleware(storeApi as any)(next), next };
  };

  it('passes non-queueable actions through when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { handler, next } = makeMiddleware();

    handler({ type: 'ui/setTheme', payload: 'dark' });
    expect(next).toHaveBeenCalled();

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('queues mutation actions when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { handler, next, queue } = makeMiddleware();

    handler({ type: 'api/executeMutation/pending', payload: {} });
    expect(next).not.toHaveBeenCalled();
    expect(queue.size).toBe(1);

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('queues actions marked with meta.offline when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { handler, next, queue } = makeMiddleware();

    handler({ type: 'custom/action', meta: { offline: true } });
    expect(next).not.toHaveBeenCalled();
    expect(queue.size).toBe(1);

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('lets all actions through when online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { handler, next, queue } = makeMiddleware();

    handler({ type: 'api/executeMutation/pending', payload: {} });
    expect(next).toHaveBeenCalled();
    expect(queue.size).toBe(0);
  });
});
