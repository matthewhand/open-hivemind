
import { DatabaseManager } from '../../database/DatabaseManager';

export async function clearAllSystemCaches(): Promise<void> {

  // Clear any database-level caches if they exist
  const dbManager = DatabaseManager.getInstance();
  if (typeof (dbManager as any).clearCache === 'function') {
    await (dbManager as any).clearCache();
  }


}
