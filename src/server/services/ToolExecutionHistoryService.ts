import fs from 'fs';
import path from 'path';
import readline from 'readline';
import Debug from 'debug';

const debug = Debug('app:ToolExecutionHistoryService');

export interface ToolExecutionRecord {
  id: string;
  serverName: string;
  toolName: string;
  arguments: Record<string, any>;
  result: any;
  error?: string;
  status: 'success' | 'error';
  executedAt: string;
  duration: number;
  userId?: string;
}

export interface ToolExecutionFilter {
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
  serverName?: string;
  toolName?: string;
  status?: 'success' | 'error';
}

export class ToolExecutionHistoryService {
  private static instance: ToolExecutionHistoryService;
  private logFile: string;
  private readonly MAX_RECORDS = 1000; // Retention policy: keep last 1000 executions

  private constructor() {
    // Store in data/tool-execution-history.jsonl for persistence
    const dataDir = path.join(process.cwd(), 'data');
    this.logFile = path.join(dataDir, 'tool-execution-history.jsonl');
    // Initialize directory asynchronously
    this.initializeDirectory();
  }

  private async initializeDirectory(): Promise<void> {
    const dataDir = path.dirname(this.logFile);
    try {
      await fs.promises.mkdir(dataDir, { recursive: true });
    } catch (e) {
      debug('Failed to create data directory: %O', e);
    }
  }

  public static getInstance(): ToolExecutionHistoryService {
    if (!ToolExecutionHistoryService.instance) {
      ToolExecutionHistoryService.instance = new ToolExecutionHistoryService();
    }
    return ToolExecutionHistoryService.instance;
  }

  public async logExecution(record: ToolExecutionRecord): Promise<void> {
    await this.initializeDirectory();
    const line = JSON.stringify(record) + '\n';

    // Append the new record
    await new Promise<void>((resolve, reject) => {
      fs.appendFile(this.logFile, line, 'utf8', (error) => {
        if (error) {
          debug('Failed to log tool execution: %O', error);
          reject(error);
        } else {
          resolve();
        }
      });
    });

    // Apply retention policy asynchronously (don't block the response)
    this.applyRetentionPolicy().catch(error => {
      debug('Failed to apply retention policy: %O', error);
    });
  }

  /**
   * Apply retention policy: keep only the last MAX_RECORDS executions.
   * Reads all records, keeps the most recent ones, and rewrites the file.
   */
  private async applyRetentionPolicy(): Promise<void> {
    try {
      // Check if file exists
      try {
        await fs.promises.access(this.logFile);
      } catch {
        return; // File doesn't exist yet
      }

      const fileStream = fs.createReadStream(this.logFile, { encoding: 'utf8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      const allRecords: ToolExecutionRecord[] = [];

      for await (const line of rl) {
        if (!line.trim()) {
          continue;
        }

        try {
          const record = JSON.parse(line) as ToolExecutionRecord;
          allRecords.push(record);
        } catch (parseError) {
          debug('Failed to parse line during retention policy: %O', parseError);
        }
      }

      // If we're under the limit, no need to rewrite
      if (allRecords.length <= this.MAX_RECORDS) {
        return;
      }

      // Sort by executedAt descending and keep only the last MAX_RECORDS
      allRecords.sort((a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
      );

      const recordsToKeep = allRecords.slice(0, this.MAX_RECORDS);

      // Rewrite the file with only the records to keep
      const newContent = recordsToKeep.map(r => JSON.stringify(r)).join('\n') + '\n';
      await fs.promises.writeFile(this.logFile, newContent, 'utf8');

      debug(`Applied retention policy: kept ${recordsToKeep.length} of ${allRecords.length} records`);
    } catch (error) {
      debug('Error applying retention policy: %O', error);
      throw error;
    }
  }

  public async getExecutions(options: ToolExecutionFilter = {}): Promise<ToolExecutionRecord[]> {
    try {
      try {
        await fs.promises.access(this.logFile);
      } catch {
        return [];
      }

      const fileStream = fs.createReadStream(this.logFile, { encoding: 'utf8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      const allRecords: ToolExecutionRecord[] = [];
      const startTimeMs = options.startTime ? options.startTime.getTime() : 0;
      const endTimeMs = options.endTime ? options.endTime.getTime() : Infinity;

      for await (const line of rl) {
        if (!line.trim()) {
          continue;
        }

        try {
          const record = JSON.parse(line) as ToolExecutionRecord;
          const recordTime = new Date(record.executedAt).getTime();

          // Apply time filters
          if (recordTime < startTimeMs || recordTime > endTimeMs) {
            continue;
          }

          // Apply server name filter
          if (options.serverName && record.serverName !== options.serverName) {
            continue;
          }

          // Apply tool name filter
          if (options.toolName && record.toolName !== options.toolName) {
            continue;
          }

          // Apply status filter
          if (options.status && record.status !== options.status) {
            continue;
          }

          allRecords.push(record);
        } catch (parseError) {
          debug('Failed to parse line: %O', parseError);
        }
      }

      // Sort by executedAt descending (most recent first)
      allRecords.sort((a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
      );

      // Apply offset and limit
      const offset = options.offset || 0;
      const limit = options.limit || allRecords.length;

      return allRecords.slice(offset, offset + limit);
    } catch (error) {
      debug('Failed to read tool execution history: %O', error);
      return [];
    }
  }

  public async getExecutionById(id: string): Promise<ToolExecutionRecord | null> {
    try {
      try {
        await fs.promises.access(this.logFile);
      } catch {
        return null;
      }

      const fileStream = fs.createReadStream(this.logFile, { encoding: 'utf8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) {
          continue;
        }

        try {
          const record = JSON.parse(line) as ToolExecutionRecord;
          if (record.id === id) {
            return record;
          }
        } catch (parseError) {
          debug('Failed to parse line: %O', parseError);
        }
      }

      return null;
    } catch (error) {
      debug('Failed to read tool execution by ID: %O', error);
      return null;
    }
  }

  public async getStats(): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
    toolUsage: Record<string, number>;
    serverUsage: Record<string, number>;
  }> {
    const allRecords = await this.getExecutions();

    const stats = {
      totalExecutions: allRecords.length,
      successfulExecutions: allRecords.filter(r => r.status === 'success').length,
      failedExecutions: allRecords.filter(r => r.status === 'error').length,
      averageDuration: 0,
      toolUsage: {} as Record<string, number>,
      serverUsage: {} as Record<string, number>,
    };

    if (allRecords.length > 0) {
      const totalDuration = allRecords.reduce((sum, r) => sum + r.duration, 0);
      stats.averageDuration = totalDuration / allRecords.length;

      // Calculate tool usage
      allRecords.forEach(record => {
        const toolKey = `${record.serverName}/${record.toolName}`;
        stats.toolUsage[toolKey] = (stats.toolUsage[toolKey] || 0) + 1;
        stats.serverUsage[record.serverName] = (stats.serverUsage[record.serverName] || 0) + 1;
      });
    }

    return stats;
  }
}
