/**
 * Centralized singleton reset helper for test isolation.
 * Import and call resetSingletons() in beforeEach/afterEach to ensure
 * each test starts with a fresh singleton instance.
 */

type SingletonClass = { instance?: unknown };

const registry: SingletonClass[] = [];

export function registerSingleton(cls: SingletonClass): void {
  if (!registry.includes(cls)) registry.push(cls);
}

export function resetSingletons(): void {
  for (const cls of registry) {
    cls.instance = null;
  }
}

/**
 * Reset a specific list of singleton classes by nulling their .instance property.
 * Use this when you don't want to register globally.
 */
export function resetInstances(...classes: SingletonClass[]): void {
  for (const cls of classes) {
    (cls as any).instance = null;
  }
}
