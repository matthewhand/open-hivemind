import Debug from 'debug';
import { type IMemoryProvider, type MemoryMessage } from '../IMemoryProvider';

const debug = Debug('app:memory:MemVaultProvider');

export class MemVaultProvider implements IMemoryProvider {
  private endpoint: string;
  private token: string;

  private ttlDays: number;

  constructor(config: Record<string, any>) {
    this.endpoint = config.endpoint || config.apiUrl || 'http://localhost:3000/api/v1';
    this.token = config.token || config.apiKey || process.env.MEMVAULT_TOKEN || '';
    this.ttlDays = config.ttlDays || 0;
  }

  async searchMemory(
    userId: string,
    query: string,
    metadata?: Record<string, any>
  ): Promise<string[]> {
    if (!this.token) return [];
    debug(`Searching MemVault for user ${userId}`);

    try {
      const response = await fetch(`${this.endpoint}/memory/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          query,
          metadata: metadata,
        }),
      });
      if (response.ok) {
        const data: any = await response.json();
        return Array.isArray(data?.results) ? data.results : [];
      }
    } catch (e) {
      debug('MemVault search error', e);
    }
    return [];
  }

  async storeMemory(
    userId: string,
    messages: MemoryMessage[],
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.token || messages.length === 0) return;
    debug(`Storing memories in MemVault for user ${userId}`);

    try {
      await fetch(`${this.endpoint}/memory/ingest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          messages: messages,
          metadata: {
            ...metadata,
            _timestamp: Date.now(),
            _expires_at: this.ttlDays > 0 ? Date.now() + this.ttlDays * 24 * 60 * 60 * 1000 : null,
          },
        }),
      });
    } catch (e) {
      debug('MemVault store error', e);
    }
  }
}
