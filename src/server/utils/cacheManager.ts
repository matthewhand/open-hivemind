
import { DatabaseManager } from '../../database/DatabaseManager';

export function clearRequireCache(): void {
  // Safe require cache clearing if needed
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('src/plugins') || key.includes('src/modules')) {
      delete require.cache[key];
    }
  });
}

export async function clearAllSystemCaches(): Promise<void> {
  // Clear require cache for plugins/modules if needed
  clearRequireCache();

  // Clear any database-level caches if they exist
  const dbManager = DatabaseManager.getInstance();
  if (typeof (dbManager as any).clearCache === 'function') {
    await (dbManager as any).clearCache();
  }


}
