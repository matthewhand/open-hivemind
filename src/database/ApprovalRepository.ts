import Debug from 'debug';
import type { Database } from 'sqlite';
import type { ApprovalRequest } from './types';

const debug = Debug('app:ApprovalRepository');

/**
 * Repository responsible for approval-request CRUD operations.
 */
export class ApprovalRepository {
  constructor(
    private getDb: () => Database | null,
    private ensureConnected: () => void
  ) {}

  async createApprovalRequest(request: Omit<ApprovalRequest, 'id' | 'createdAt'>): Promise<number> {
    this.ensureConnected();

    try {
      const db = this.getDb()!;
      const result = await db.run(
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

  private mapRowToApprovalRequest(row: Record<string, any>): ApprovalRequest {
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
  }

  async getApprovalRequest(id: number): Promise<ApprovalRequest | null> {
    this.ensureConnected();

    try {
      const db = this.getDb()!;
      const row = await db.get('SELECT * FROM approval_requests WHERE id = ?', [id]);

      if (!row) return null;

      return this.mapRowToApprovalRequest(row);
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
      const db = this.getDb()!;
      let query = `SELECT * FROM approval_requests WHERE 1=1`;
      const params: (string | number | boolean | null)[] = [];

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

      const rows = await db.all(query, params);

      return rows.map((row) => this.mapRowToApprovalRequest(row));
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
      const db = this.getDb()!;
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

      const result = await db.run(
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
      const db = this.getDb()!;
      const result = await db.run('DELETE FROM approval_requests WHERE id = ?', [id]);
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
}
