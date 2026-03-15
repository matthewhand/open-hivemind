import debugModule from 'debug';

const debug = debugModule('hivemind:cache');

/**
 * Clears the require.cache to force modules to reload on next require.
 * Useful for hot-reloading plugins or configurations.
 */
export function clearRequireCache(): void {
  let clearedCount = 0;
  for (const key of Object.keys(require.cache)) {
    // Only evict application modules, skip node_modules to avoid breaking core dependencies
    if (!key.includes('node_modules')) {
      delete require.cache[key];
      clearedCount++;
    }
  }
  debug(`Evicted ${clearedCount} modules from require cache.`);
}
