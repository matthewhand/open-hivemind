import { Database } from 'sqlite';
import crypto from 'crypto';
import Debug from 'debug';
import {
  MessageRecord,
  ConversationSummary,
  Anomaly,
  ApprovalRequest,
  AIFeedback
} from '../DatabaseManager';

const debug = Debug('app:ActivityRepository');

export class ActivityRepository {
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

  async saveMessage(
    channelId: string,
    userId: string,
    content: string,
    provider = 'unknown'
  ): Promise<number> {
    if (!this.db || !this.isConnected()) {
      return Math.floor(Math.random() * 1000000);
    }

    try {
      const timestamp = new Date();
      const result = await this.db.run(
        `
        INSERT INTO messages (messageId, channelId, content, authorId, authorName, timestamp, provider)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          `${Date.now()}-${crypto.randomUUID()}`,
          channelId,
          content,
          userId,
          'Unknown User',
          timestamp.toISOString(),
          provider,
        ]
      );

      const messageId = result.lastID as number;
      debug(`Message saved with ID: ${messageId}`);
      return messageId;
    } catch (error) {
      debug('Error saving message:', error);
      return Math.floor(Math.random() * 1000000);
    }
  }

  async storeMessage(message: MessageRecord): Promise<number> {
    if (!this.db || !this.isConnected()) {
      return Math.floor(Math.random() * 1000000);
    }

    try {
      const timestamp =
        message.timestamp instanceof Date
          ? message.timestamp
          : new Date(message.timestamp || Date.now());

      const result = await this.db.run(
        `
        INSERT INTO messages (messageId, channelId, content, authorId, authorName, timestamp, provider, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          message.messageId,
          message.channelId,
          message.content,
          message.authorId,
          message.authorName,
          timestamp.toISOString(),
          message.provider,
          message.metadata ? JSON.stringify(message.metadata) : null,
        ]
      );

      const messageId = result.lastID as number;
      debug(`Message stored with ID: ${messageId}`);
      return messageId;
    } catch (error) {
      debug('Error storing message:', error);
      return Math.floor(Math.random() * 1000000);
    }
  }

  async getMessageHistory(channelId: string, limit = 10): Promise<MessageRecord[]> {
    if (!this.db || !this.isConnected()) {
      return [];
    }

    try {
      const rows = await this.db.all(
        `
        SELECT * FROM messages
        WHERE channelId = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `,
        [channelId, limit]
      );

      return rows.map((row) => ({
        id: row.id,
        messageId: row.messageId,
        channelId: row.channelId,
        content: row.content,
        authorId: row.authorId,
        authorName: row.authorName,
        timestamp: new Date(row.timestamp),
        provider: row.provider,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      }));
    } catch (error) {
      debug('Error retrieving message history:', error);
      return [];
    }
  }

  async getMessages(channelId: string, limit = 50, offset = 0): Promise<MessageRecord[]> {
    if (!this.db || !this.isConnected()) {
      return [];
    }

    try {
      const rows = await this.db.all(
        `SELECT * FROM messages WHERE channelId = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
        [channelId, limit, offset]
      );

      return rows.map((row) => ({
        id: row.id,
        messageId: row.messageId,
        channelId: row.channelId,
        content: row.content,
        authorId: row.authorId,
        authorName: row.authorName,
        timestamp: new Date(row.timestamp),
        provider: row.provider,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      }));
    } catch (error) {
      debug('Error retrieving messages with offset:', error);
      return [];
    }
  }

  async storeConversationSummary(summary: ConversationSummary): Promise<number> {
    this.ensureConnected();

    try {
      const result = await this.db!.run(
        `
        INSERT INTO conversation_summaries (channelId, summary, messageCount, startTimestamp, endTimestamp, provider)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          summary.channelId,
          summary.summary,
          summary.messageCount,
          summary.startTimestamp.toISOString(),
          summary.endTimestamp.toISOString(),
          summary.provider,
        ]
      );

      const summaryId = result.lastID as number;
      debug(`Conversation summary stored with ID: ${summaryId}`);
      return summaryId;
    } catch (error) {
      debug('Error storing conversation summary:', error);
      throw new Error(`Failed to store conversation summary: ${error}`);
    }
  }

  async getStats(): Promise<{
    totalMessages: number;
    totalChannels: number;
    totalAuthors: number;
    providers: Record<string, number>;
  }> {
    this.ensureConnected();

    try {
      const [totalMessages, totalChannels, totalAuthors, providerStats] = await Promise.all([
        this.db!.get('SELECT COUNT(*) as count FROM messages'),
        this.db!.get('SELECT COUNT(DISTINCT channelId) as count FROM messages'),
        this.db!.get('SELECT COUNT(DISTINCT authorId) as count FROM messages'),
        this.db!.all('SELECT provider, COUNT(*) as count FROM messages GROUP BY provider'),
      ]);

      const providers: Record<string, number> = {};
      providerStats.forEach((row: any) => {
        providers[row.provider] = row.count;
      });

      return {
        totalMessages: totalMessages.count,
        totalChannels: totalChannels.count,
        totalAuthors: totalAuthors.count,
        providers,
      };
    } catch (error) {
      debug('Error getting stats:', error);
      throw new Error(`Failed to get database stats: ${error}`);
    }
  }

  async storeAnomaly(anomaly: Anomaly): Promise<void> {
    if (!this.db || !this.isConnected()) {
      debug('Database not connected, anomaly not stored');
      return;
    }

    try {
      await this.db.run(
        `
        INSERT OR REPLACE INTO anomalies (
          id, timestamp, metric, value, expectedMean, standardDeviation,
          zScore, threshold, severity, explanation, resolved, tenantId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          anomaly.id,
          anomaly.timestamp.toISOString(),
          anomaly.metric,
          anomaly.value,
          anomaly.expectedMean,
          anomaly.standardDeviation,
          anomaly.zScore,
          anomaly.threshold,
          anomaly.severity,
          anomaly.explanation,
          anomaly.resolved ? 1 : 0,
          anomaly.tenantId,
        ]
      );

      debug(`Anomaly stored: ${anomaly.id}`);
    } catch (error) {
      debug('Error storing anomaly:', error);
      throw error;
    }
  }

  async getAnomalies(tenantId?: string): Promise<Anomaly[]> {
    if (!this.db || !this.isConnected()) {
      return [];
    }

    try {
      let query = `SELECT * FROM anomalies`;
      const params: any[] = [];

      if (tenantId) {
        query += ` WHERE tenantId = ?`;
        params.push(tenantId);
      }

      query += ` ORDER BY timestamp DESC`;

      const rows = await this.db.all(query, params);

      return rows.map((row) => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        metric: row.metric,
        value: row.value,
        expectedMean: row.expectedMean,
        standardDeviation: row.standardDeviation,
        zScore: row.zScore,
        threshold: row.threshold,
        severity: row.severity,
        explanation: row.explanation,
        resolved: !!row.resolved,
        tenantId: row.tenantId,
      }));
    } catch (error) {
      debug('Error getting anomalies:', error);
      throw error;
    }
  }

  async getActiveAnomalies(tenantId?: string): Promise<Anomaly[]> {
    if (!this.db || !this.isConnected()) {
      return [];
    }

    try {
      let query = `SELECT * FROM anomalies WHERE resolved = 0`;
      const params: any[] = [];

      if (tenantId) {
        query += ` AND tenantId = ?`;
        params.push(tenantId);
      }

      query += ` ORDER BY timestamp DESC`;

      const rows = await this.db.all(query, params);

      return rows.map((row) => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        metric: row.metric,
        value: row.value,
        expectedMean: row.expectedMean,
        standardDeviation: row.standardDeviation,
        zScore: row.zScore,
        threshold: row.threshold,
        severity: row.severity,
        explanation: row.explanation,
        resolved: !!row.resolved,
        tenantId: row.tenantId,
      }));
    } catch (error) {
      debug('Error getting active anomalies:', error);
      throw error;
    }
  }

  async resolveAnomaly(id: string, tenantId?: string): Promise<boolean> {
    if (!this.db || !this.isConnected()) {
      return false;
    }

    try {
      let query = `UPDATE anomalies SET resolved = 1 WHERE id = ?`;
      const params: any[] = [id];

      if (tenantId) {
        query += ` AND tenantId = ?`;
        params.push(tenantId);
      }

      const result = await this.db.run(query, params);

      return (result.changes ?? 0) > 0;
    } catch (error) {
      debug('Error resolving anomaly:', error);
      throw error;
    }
  }

  async createApprovalRequest(request: Omit<ApprovalRequest, 'id' | 'createdAt'>): Promise<number> {
    this.ensureConnected();

    try {
      const result = await this.db!.run(
        `
        INSERT INTO approval_requests (
          resourceType, resourceId, changeType, requestedBy, diff, status,
          reviewedBy, reviewedAt, reviewComments, tenantId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          request.resourceType,
          request.resourceId,
          request.changeType,
          request.requestedBy,
          request.diff,
          request.status,
          request.reviewedBy,
          request.reviewedAt ? request.reviewedAt.toISOString() : null,
          request.reviewComments,
          request.tenantId,
        ]
      );

      debug(`Approval request created with ID: ${result.lastID}`);
      return result.lastID as number;
    } catch (error) {
      debug('Error creating approval request:', error);
      throw new Error(`Failed to create approval request: ${error}`);
    }
  }

  async getApprovalRequest(id: number): Promise<ApprovalRequest | null> {
    this.ensureConnected();

    try {
      const row = await this.db!.get('SELECT * FROM approval_requests WHERE id = ?', [id]);

      if (!row) return null;

      return {
        id: row.id,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        changeType: row.changeType,
        requestedBy: row.requestedBy,
        diff: row.diff,
        status: row.status,
        reviewedBy: row.reviewedBy,
        reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : undefined,
        reviewComments: row.reviewComments,
        createdAt: new Date(row.createdAt),
        tenantId: row.tenantId,
      };
    } catch (error) {
      debug('Error getting approval request:', error);
      throw new Error(`Failed to get approval request: ${error}`);
    }
  }

  async getApprovalRequests(
    resourceType?: string,
    resourceId?: number,
    status?: string
  ): Promise<ApprovalRequest[]> {
    this.ensureConnected();

    try {
      let query = `SELECT * FROM approval_requests WHERE 1=1`;
      const params: any[] = [];

      if (resourceType) {
        query += ` AND resourceType = ?`;
        params.push(resourceType);
      }

      if (resourceId) {
        query += ` AND resourceId = ?`;
        params.push(resourceId);
      }

      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }

      query += ` ORDER BY createdAt DESC`;

      const rows = await this.db!.all(query, params);

      return rows.map((row) => ({
        id: row.id,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        changeType: row.changeType,
        requestedBy: row.requestedBy,
        diff: row.diff,
        status: row.status,
        reviewedBy: row.reviewedBy,
        reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : undefined,
        reviewComments: row.reviewComments,
        createdAt: new Date(row.createdAt),
        tenantId: row.tenantId,
      }));
    } catch (error) {
      debug('Error getting approval requests:', error);
      throw new Error(`Failed to get approval requests: ${error}`);
    }
  }

  async updateApprovalRequest(
    id: number,
    updates: Partial<
      Pick<ApprovalRequest, 'status' | 'reviewedBy' | 'reviewedAt' | 'reviewComments'>
    >
  ): Promise<boolean> {
    this.ensureConnected();

    try {
      const updateFields = [];
      const values = [];

      if (updates.status !== undefined) {
        updateFields.push('status = ?');
        values.push(updates.status);
      }

      if (updates.reviewedBy !== undefined) {
        updateFields.push('reviewedBy = ?');
        values.push(updates.reviewedBy);
      }

      if (updates.reviewedAt !== undefined) {
        updateFields.push('reviewedAt = ?');
        values.push(updates.reviewedAt.toISOString());
      }

      if (updates.reviewComments !== undefined) {
        updateFields.push('reviewComments = ?');
        values.push(updates.reviewComments);
      }

      if (updateFields.length === 0) {
        return true;
      }

      values.push(id);

      const result = await this.db!.run(
        `UPDATE approval_requests SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );

      const updated = (result.changes ?? 0) > 0;

      if (updated) {
        debug(`Approval request updated: ${id}`);
      }

      return updated;
    } catch (error) {
      debug('Error updating approval request:', error);
      throw new Error(`Failed to update approval request: ${error}`);
    }
  }

  async deleteApprovalRequest(id: number): Promise<boolean> {
    this.ensureConnected();

    try {
      const result = await this.db!.run('DELETE FROM approval_requests WHERE id = ?', [id]);
      const deleted = (result.changes ?? 0) > 0;

      if (deleted) {
        debug(`Approval request deleted: ${id}`);
      }

      return deleted;
    } catch (error) {
      debug('Error deleting approval request:', error);
      throw new Error(`Failed to delete approval request: ${error}`);
    }
  }

  async storeAIFeedback(feedback: {
    recommendationId: string;
    feedback: string;
    metadata?: Record<string, unknown>;
  }): Promise<number> {
    this.ensureConnected();

    try {
      const result = await this.db!.run(
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
      const result = await this.db!.run('DELETE FROM ai_feedback');
      const deletedCount = result.changes ?? 0;
      debug(`Cleared ${deletedCount} AI feedback records`);
      return deletedCount;
    } catch (error) {
      debug('Error clearing AI feedback:', error);
      throw new Error(`Failed to clear AI feedback: ${error}`);
    }
  }
}
