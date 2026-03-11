import { DatabaseManager } from '../../database/DatabaseManager';
import { clearRequireCache } from './requireCache';

export async function clearAllSystemCaches(): Promise<void> {
  // Clear require cache for plugins/modules if needed
  clearRequireCache();

  // Clear any database-level caches if they exist
  const dbManager = DatabaseManager.getInstance();
  if (typeof (dbManager as any).clearCache === 'function') {
    await (dbManager as any).clearCache();
  }
}
