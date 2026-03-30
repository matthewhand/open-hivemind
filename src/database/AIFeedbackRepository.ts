import Debug from 'debug';
import type { Database } from 'sqlite';

const debug = Debug('app:AIFeedbackRepository');

/**
 * Repository responsible for AI feedback CRUD operations.
 */
export class AIFeedbackRepository {
  constructor(
    private getDb: () => Database | null,
    private ensureConnected: () => void
  ) {}

  async storeAIFeedback(feedback: {
    recommendationId: string;
    feedback: string;
    metadata?: Record<string, unknown>;
  }): Promise<number> {
    this.ensureConnected();

    try {
      const db = this.getDb()!;
      const result = await db.run(
        `
        INSERT INTO ai_feedback (
          recommendationId, feedback, metadata
        ) VALUES (?, ?, ?)
      `,
        [
          feedback.recommendationId,
          feedback.feedback,
          feedback.metadata ? JSON.stringify(feedback.metadata) : null,
        ]
      );

      debug(`AI feedback stored with ID: ${result.lastID}`);
      return result.lastID as number;
    } catch (error) {
      debug('Error storing AI feedback:', error);
      throw new Error(`Failed to store AI feedback: ${error}`);
    }
  }

  async clearAIFeedback(): Promise<number> {
    this.ensureConnected();

    try {
      const db = this.getDb()!;
      const result = await db.run('DELETE FROM ai_feedback');
      const deletedCount = result.changes ?? 0;
      debug(`Cleared ${deletedCount} AI feedback records`);
      return deletedCount;
    } catch (error) {
      debug('Error clearing AI feedback:', error);
      throw new Error(`Failed to clear AI feedback: ${error}`);
    }
  }
}
