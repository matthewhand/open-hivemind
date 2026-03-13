/**
 * Resets the singleton instance of a class that uses the standard
 * `private static instance: T | null` pattern.
 *
 * Usage:
 *   beforeEach(() => resetSingleton(MyService));
 */
export function resetSingleton(cls: { instance?: unknown }): void {
  cls.instance = null;
}

/**
 * Resets multiple singletons in one call.
 *
 * Usage:
 *   beforeEach(() => resetSingletons(ServiceA, ServiceB));
 */
export function resetSingletons(...classes: Array<{ instance?: unknown }>): void {
  for (const cls of classes) {
    cls.instance = null;
  }
}
