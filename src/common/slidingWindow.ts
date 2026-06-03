// src/common/slidingWindow.ts

/**
 * Sliding-window helpers for time-ordered collections.
 *
 * These utilities replace the common `array.filter(item => now - ts <= window)`
 * pattern with a reverse scan that stops at the first out-of-window entry.
 *
 * ## Why a reverse scan?
 * Message/event histories in this codebase are append-only and therefore sorted
 * ascending by timestamp (the newest entry is always at the end). Given that
 * invariant, every in-window entry forms a contiguous suffix of the array. We
 * can walk backwards from the newest entry and stop as soon as we cross the
 * threshold, which is O(k) in the number of *kept* entries rather than O(n) over
 * the whole history. For the typical case (a short window over a long history)
 * this is a meaningful win and avoids allocating an intermediate array when
 * everything is in-window.
 *
 * ## Boundary semantics
 * An entry is *kept* when `timestamp > threshold` (strictly greater). The scan
 * therefore breaks on the first entry with `timestamp <= threshold`. Callers
 * derive `threshold = now - windowMs`, which makes the kept set equivalent to
 * `now - timestamp < windowMs`. This strict comparison is intentional and is the
 * subtle off-by-one that the `<= timeframe` → `< threshold` refactor depends on:
 * an entry sitting exactly on the threshold millisecond is treated as expired.
 *
 * @remarks The reverse-scan optimisation is only correct while the input is
 * sorted ascending by timestamp. If a caller cannot guarantee that ordering it
 * must fall back to a plain `filter`.
 */

/**
 * Counts how many trailing entries of a timestamp-ascending list fall strictly
 * within the window (`timestamp > threshold`).
 *
 * @param items - Entries sorted ascending by timestamp (newest last).
 * @param getTimestamp - Extracts a millisecond timestamp from an entry.
 * @param threshold - The exclusive lower bound; entries with a timestamp at or
 *   below this value are considered expired.
 * @returns The number of contiguous in-window entries at the end of the list.
 */
export function countWithinWindow<T>(
  items: readonly T[],
  getTimestamp: (item: T) => number,
  threshold: number
): number {
  let keepCount = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (getTimestamp(items[i]) <= threshold) {
      break;
    }
    keepCount++;
  }
  return keepCount;
}

/**
 * Returns the contiguous suffix of `items` whose timestamps are strictly within
 * the window (`timestamp > threshold`).
 *
 * When every entry is in-window the original array reference is returned (no
 * copy). Otherwise a fresh sliced array is returned, so the caller can safely
 * reassign without mutating shared state.
 *
 * @param items - Entries sorted ascending by timestamp (newest last).
 * @param getTimestamp - Extracts a millisecond timestamp from an entry.
 * @param threshold - The exclusive lower bound; entries at or below it are dropped.
 * @returns A list containing only the in-window trailing entries.
 */
export function takeWithinWindow<T>(
  items: readonly T[],
  getTimestamp: (item: T) => number,
  threshold: number
): T[] {
  const keepCount = countWithinWindow(items, getTimestamp, threshold);
  if (keepCount === items.length) {
    // Everything is in-window: avoid an allocation by reusing the reference.
    return items as T[];
  }
  return items.slice(items.length - keepCount);
}
