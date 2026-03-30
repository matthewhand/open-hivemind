/**
 * A strongly-typed, singleton event bus for the open-hivemind message pipeline.
 *
 * Design goals:
 *  - **Type safety** — event names are constrained to `MessageEvents` keys and
 *    listener signatures are inferred from the corresponding payload type.
 *  - **Error isolation** — a throwing listener never prevents other listeners
 *    from executing.  Errors are logged via `debug('app:message-bus')`.
 *  - **Async support** — `emitAsync()` waits for every listener (sync or async)
 *    to settle via `Promise.allSettled`, so callers can await the full fan-out.
 *  - **Deterministic ordering** — listeners fire in registration order.
 *  - **Zero external deps** — only `debug` (already used project-wide).
 *
 * ```ts
 * const bus = MessageBus.getInstance();
 *
 * bus.on('message:incoming', (ctx) => {
 *   console.log('New message from', ctx.platform);
 * });
 *
 * bus.emit('message:incoming', ctx);
 * await bus.emitAsync('message:incoming', ctx);
 * ```
 *
 * @module events/MessageBus
 */

import Debug from 'debug';
import type { MessageEvents } from './types';

const debug = Debug('app:message-bus');

// ---------------------------------------------------------------------------
// Listener type helpers
// ---------------------------------------------------------------------------

/** A listener callback for a given event name. */
type Listener<E extends keyof MessageEvents> = (payload: MessageEvents[E]) => void | Promise<void>;

/** Internal wrapper that tracks whether a listener should auto-remove after one call. */
interface ListenerEntry<E extends keyof MessageEvents> {
  fn: Listener<E>;
  once: boolean;
}

// ---------------------------------------------------------------------------
// MessageBus
// ---------------------------------------------------------------------------

export class MessageBus {
  // -- Singleton -------------------------------------------------------------

  private static instance: MessageBus | null = null;

  /**
   * Returns the shared MessageBus instance, creating it on first access.
   */
  static getInstance(): MessageBus {
    if (!MessageBus.instance) {
      MessageBus.instance = new MessageBus();
      debug('MessageBus singleton created');
    }
    return MessageBus.instance;
  }

  // -- Internal state --------------------------------------------------------

  /**
   * Map from event name to an ordered array of listener entries.
   *
   * Using `Map<string, ListenerEntry<any>[]>` internally because TypeScript
   * cannot maintain per-key generics inside a single Map.  Type safety is
   * enforced at the public API boundary instead.
   */
  private listeners = new Map<string, ListenerEntry<any>[]>();

  /** Private constructor — use `MessageBus.getInstance()`. */
  private constructor() {}

  // -- Subscribe / unsubscribe ----------------------------------------------

  /**
   * Register a listener for `event`.  The listener will be called every time
   * the event is emitted, in registration order.
   *
   * @returns `this` for chaining.
   */
  on<E extends keyof MessageEvents>(event: E, fn: Listener<E>): this {
    this.addListener(event, fn, false);
    return this;
  }

  /**
   * Register a one-shot listener.  It is automatically removed after its
   * first invocation.
   *
   * @returns `this` for chaining.
   */
  once<E extends keyof MessageEvents>(event: E, fn: Listener<E>): this {
    this.addListener(event, fn, true);
    return this;
  }

  /**
   * Remove a previously registered listener.
   *
   * If the same function reference was registered more than once, only the
   * first match is removed (consistent with Node's EventEmitter).
   *
   * @returns `this` for chaining.
   */
  off<E extends keyof MessageEvents>(event: E, fn: Listener<E>): this {
    const entries = this.listeners.get(event as string);
    if (!entries) return this;

    const idx = entries.findIndex((entry) => entry.fn === fn);
    if (idx !== -1) {
      entries.splice(idx, 1);
      debug('Listener removed for %s (remaining: %d)', event, entries.length);
    }
    return this;
  }

  // -- Emit ------------------------------------------------------------------

  /**
   * Fire all listeners for `event` **synchronously**.
   *
   * - Listeners are called in registration order.
   * - If a listener returns a Promise it is treated as fire-and-forget.
   * - If a listener throws synchronously, the error is caught and logged;
   *   remaining listeners still execute.
   *
   * @returns `true` if the event had at least one listener, `false` otherwise.
   */
  emit<E extends keyof MessageEvents>(event: E, payload: MessageEvents[E]): boolean {
    const entries = this.getEntries(event);
    if (entries.length === 0) return false;

    const toRemove: ListenerEntry<E>[] = [];

    for (const entry of entries) {
      try {
        const result = entry.fn(payload);
        // Fire-and-forget for async listeners — but still catch rejections.
        if (result && typeof (result as any).catch === 'function') {
          (result as Promise<void>).catch((err) => {
            debug('Async listener error on %s: %O', event, err);
          });
        }
      } catch (err) {
        debug('Listener error on %s: %O', event, err);
      }

      if (entry.once) {
        toRemove.push(entry);
      }
    }

    this.pruneOnce(event, toRemove);
    return true;
  }

  /**
   * Fire all listeners for `event` and **await** every one of them.
   *
   * Uses `Promise.allSettled` so that a failing listener does not prevent
   * others from completing.  Rejected results are logged via `debug`.
   *
   * @returns A promise that resolves once all listeners have settled.
   */
  async emitAsync<E extends keyof MessageEvents>(
    event: E,
    payload: MessageEvents[E],
  ): Promise<void> {
    const entries = this.getEntries(event);
    if (entries.length === 0) return;

    const promises = entries.map((entry) => {
      try {
        const result = entry.fn(payload);
        // Normalise sync returns into resolved promises.
        return Promise.resolve(result);
      } catch (err) {
        // Sync throw — wrap so allSettled can handle it uniformly.
        return Promise.reject(err);
      }
    });

    const results = await Promise.allSettled(promises);

    // Log any rejections.
    for (const r of results) {
      if (r.status === 'rejected') {
        debug('Async listener error on %s: %O', event, r.reason);
      }
    }

    // Clean up once-listeners.
    const toRemove = entries.filter((e) => e.once);
    this.pruneOnce(event, toRemove);
  }

  // -- Utility ---------------------------------------------------------------

  /**
   * Returns the number of listeners currently registered for `event`.
   */
  listenerCount<E extends keyof MessageEvents>(event: E): number {
    return this.listeners.get(event as string)?.length ?? 0;
  }

  /**
   * Remove **all** listeners for **all** events and reset the singleton so
   * that the next `getInstance()` call returns a fresh bus.
   *
   * Primarily useful in tests.
   */
  reset(): void {
    this.listeners.clear();
    MessageBus.instance = null;
    debug('MessageBus reset — all listeners cleared, singleton released');
  }

  // -- Private helpers -------------------------------------------------------

  /**
   * Append a listener entry, creating the backing array if needed.
   */
  private addListener<E extends keyof MessageEvents>(
    event: E,
    fn: Listener<E>,
    once: boolean,
  ): void {
    const key = event as string;
    let entries = this.listeners.get(key);
    if (!entries) {
      entries = [];
      this.listeners.set(key, entries);
    }
    entries.push({ fn, once });
    debug('Listener registered for %s (total: %d, once: %s)', event, entries.length, once);
  }

  /**
   * Return a **shallow copy** of the entries array for `event`.
   *
   * We copy so that listeners that call `off()` during emission don't
   * corrupt the iteration.
   */
  private getEntries<E extends keyof MessageEvents>(event: E): ListenerEntry<E>[] {
    return [...(this.listeners.get(event as string) ?? [])];
  }

  /**
   * Remove entries flagged with `once` from the canonical list.
   */
  private pruneOnce<E extends keyof MessageEvents>(
    event: E,
    toRemove: ListenerEntry<E>[],
  ): void {
    if (toRemove.length === 0) return;

    const entries = this.listeners.get(event as string);
    if (!entries) return;

    for (const entry of toRemove) {
      const idx = entries.indexOf(entry);
      if (idx !== -1) entries.splice(idx, 1);
    }
  }
}
