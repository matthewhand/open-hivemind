import Debug from 'debug';
import { IDatabase, InferenceLog } from '../types';

const debug = Debug('app:InferenceRepository');

export class InferenceRepository {
  constructor(
    private getDb: () => IDatabase | null,
    private isConnected: () => boolean
  ) {}

  async logInference(log: InferenceLog): Promise<number | string> {
    if (!this.isConnected()) return 0;
    const db = this.getDb();
    if (!db) return 0;

    try {
      const sql = `
        INSERT INTO inference_logs 
        (botName, prompt, response, tokensUsed, latencyMs, provider, status, errorMessage) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        log.botName,
        log.prompt,
        log.response || null,
        log.tokensUsed || null,
        log.latencyMs || null,
        log.provider || null,
        log.status,
        log.errorMessage || null
      ];

      const result = await db.run(sql, params);
      return result.lastID;
    } catch (error) {
      debug('Error logging inference:', error);
      return 0;
    }
  }
}
