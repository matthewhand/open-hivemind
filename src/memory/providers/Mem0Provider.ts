import Debug from 'debug';
import { type IMemoryProvider, type MemoryMessage } from '../IMemoryProvider';

const debug = Debug('app:memory:Mem0Provider');

export class Mem0Provider implements IMemoryProvider {
  private apiKey: string;
  private endpoint: string;
  private ttlDays: number;

  constructor(config: Record<string, any>) {
    this.apiKey = config.apiKey || process.env.MEM0_API_KEY || '';
    this.endpoint = config.endpoint || 'https://api.mem0.ai/v1/memories';
    this.ttlDays = config.ttlDays || 0;
  }

  async searchMemory(
    userId: string,
    query: string,
    metadata?: Record<string, any>
  ): Promise<string[]> {
    if (!this.apiKey) {
      debug('No Mem0 API Key configured, returning empty memories.');
      return [];
    }

    try {
      debug(`Searching Mem0 for user ${userId} with query: "${query}"`);
      const response = await fetch(`${this.endpoint}/search/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          user_id: userId,
          // Optional metadata filters
          ...metadata,
        }),
      });

      if (!response.ok) {
        debug(`Mem0 search failed with status ${response.status}`);
        return [];
      }

      const data = await response.json();
      // Assuming Mem0 returns { results: [{ memory: "...", score: 0.9 }] } or similar
      const results = (data as any).results || data || [];
      if (Array.isArray(results)) {
        return results
          .map((r: any) => (typeof r === 'string' ? r : r.memory || r.text || ''))
          .filter(Boolean);
      }
      return [];
    } catch (e) {
      debug('Mem0 searchError:', e);
      return [];
    }
  }

  async storeMemory(
    userId: string,
    messages: MemoryMessage[],
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.apiKey || messages.length === 0) return;

    try {
      debug(`Storing memories in Mem0 for user ${userId}`);
      // Mem0 generally accepts a messages array
      const response = await fetch(`${this.endpoint}/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          user_id: userId,
          metadata: {
            ...metadata,
            _timestamp: Date.now(),
            _expires_at: this.ttlDays > 0 ? Date.now() + this.ttlDays * 24 * 60 * 60 * 1000 : null,
          },
        }),
      });

      if (!response.ok) {
        debug(`Mem0 store failed with status ${response.status}`);
      } else {
        debug(`Successfully stored memory in Mem0 for user ${userId}`);
      }
    } catch (e) {
      debug('Mem0 storeError:', e);
    }
  }
}
