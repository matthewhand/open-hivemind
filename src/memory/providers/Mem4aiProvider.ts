import Debug from 'debug';
import { type IMemoryProvider, type MemoryMessage } from '../IMemoryProvider';

const debug = Debug('app:memory:Mem4aiProvider');

export class Mem4aiProvider implements IMemoryProvider {
  private apiUrl: string;
  private apiKey: string;
  private tenantId: string;

  private ttlDays: number;

  constructor(config: Record<string, any>) {
    this.apiUrl = config.endpoint || config.apiUrl || 'https://api.mem4.ai/v1';
    this.apiKey = config.apiKey || config.token || process.env.MEM4AI_API_KEY || '';
    this.tenantId = config.tenantId || '';
    this.ttlDays = config.ttlDays || 0;
  }

  async searchMemory(
    userId: string,
    query: string,
    metadata?: Record<string, any>
  ): Promise<string[]> {
    if (!this.apiKey) return [];
    debug(`Searching mem4ai for user ${userId} with query: "${query}"`);

    try {
      const response = await fetch(`${this.apiUrl}/memories/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          query: query,
          tenant_id: this.tenantId,
          metadata,
        }),
      });
      if (response.ok) {
        const data: any = await response.json();
        const results = data.memories || data.results || [];
        return results
          .map((r: any) => (typeof r === 'string' ? r : r.text || r.content))
          .filter(Boolean);
      }
    } catch (e) {
      debug('mem4ai search error', e);
    }
    return [];
  }

  async storeMemory(
    userId: string,
    messages: MemoryMessage[],
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.apiKey || messages.length === 0) return;
    debug(`Storing memories in mem4ai for user ${userId}`);

    try {
      await fetch(`${this.apiUrl}/memories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          messages: messages,
          tenant_id: this.tenantId,
          metadata: {
            ...metadata,
            _timestamp: Date.now(),
            _expires_at: this.ttlDays > 0 ? Date.now() + this.ttlDays * 24 * 60 * 60 * 1000 : null,
          },
        }),
      });
    } catch (e) {
      debug('mem4ai store error', e);
    }
  }
}
