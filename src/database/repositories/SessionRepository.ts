import { Database } from 'sqlite';
import Debug from 'debug';

const debug = Debug('app:SessionRepository');

export class SessionRepository {
  private db: Database | null;
  private isConnected: () => boolean;

  constructor(db: Database | null, isConnected: () => boolean) {
    this.db = db;
    this.isConnected = isConnected;
  }

  setDb(db: Database | null) {
    this.db = db;
  }

  private ensureConnected(): void {
    if (!this.db || !this.isConnected()) {
      throw new Error('Database not connected');
    }
  }

  // Placeholder for any specific bot_sessions CRUD.
  // DatabaseManager doesn't seem to have specific methods for bot_sessions,
  // but it does create the table. We'll leave it prepared.
}
