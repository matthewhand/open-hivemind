import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:auditLogger');

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  details: string;
  ipAddress?: string;
  userAgent?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private logFilePath: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles = 5;
  private logQueue: string[] = [];
  private isProcessing: boolean = false;

  private constructor() {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    this.logFilePath = path.join(configDir, 'audit.log');
    this.ensureLogDirectory();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private ensureLogDirectory(): void {
    const dir = path.dirname(this.logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private async rotateLogIfNeeded(): Promise<void> {
    try {
      // Check if file exists
      try {
        await fsPromises.access(this.logFilePath);
      } catch {
        return; // File does not exist
      }

      const stats = await fsPromises.stat(this.logFilePath);
      if (stats.size > this.maxLogSize) {
        // Rotate log files
        for (let i = this.maxLogFiles - 1; i >= 1; i--) {
          const oldFile = `${this.logFilePath}.${i}`;
          const newFile = `${this.logFilePath}.${i + 1}`;

          try {
            await fsPromises.access(oldFile);
            // File exists
            if (i === this.maxLogFiles - 1) {
              await fsPromises.unlink(oldFile); // Remove oldest
            } else {
              await fsPromises.rename(oldFile, newFile);
            }
          } catch {
            // File does not exist, skip
          }
        }
        // Move current log to .1
        await fsPromises.rename(this.logFilePath, `${this.logFilePath}.1`);
      }
    } catch (error) {
      debug('Failed to rotate audit log:', error);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.logQueue.length > 0) {
        await this.rotateLogIfNeeded();

        // Process all currently queued items
        const batch = this.logQueue.splice(0, this.logQueue.length);
        if (batch.length === 0) break;

        const data = batch.join('');

        try {
          await fsPromises.appendFile(this.logFilePath, data);
        } catch (error) {
          debug('Failed to write to audit log:', error);
          console.error('AUDIT LOG WRITE ERROR:', error);
          // In case of write error, we lose these logs.
          // In a robust system we might retry or write to a fallback,
          // but for now we just log the error to stderr.
        }
      }
    } catch (error) {
      debug('Error in processQueue:', error);
    } finally {
      this.isProcessing = false;
      // Check if new items arrived while we were finishing
      if (this.logQueue.length > 0) {
        this.processQueue();
      }
    }
  }

  public async waitForQueueDrain(timeoutMs = 5000): Promise<void> {
    const start = Date.now();
    while (this.isProcessing || this.logQueue.length > 0) {
      if (Date.now() - start > timeoutMs) {
        debug('Timeout waiting for queue drain');
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  public log(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    try {
      const auditEvent: AuditEvent = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        ...event,
      };

      const logEntry = JSON.stringify(auditEvent) + '\n';
      this.logQueue.push(logEntry);

      debug('Audit event queued:', {
        id: auditEvent.id,
        action: auditEvent.action,
        user: auditEvent.user,
        result: auditEvent.result,
      });

      this.processQueue();
    } catch (error) {
      debug('Failed to queue audit event:', error);
      console.error('AUDIT LOG ERROR:', event, error);
    }
  }

  public logConfigChange(
    user: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RELOAD',
    resource: string,
    result: 'success' | 'failure',
    details: string,
    options: {
      ipAddress?: string;
      userAgent?: string;
      oldValue?: any;
      newValue?: any;
      metadata?: Record<string, any>;
    } = {}
  ): void {
    this.log({
      user,
      action: `CONFIG_${action}`,
      resource,
      result,
      details,
      ...options,
    });
  }

  public logBotAction(
    user: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'START' | 'STOP' | 'CLONE',
    botName: string,
    result: 'success' | 'failure',
    details: string,
    options: {
      ipAddress?: string;
      userAgent?: string;
      oldValue?: any;
      newValue?: any;
      metadata?: Record<string, any>;
    } = {}
  ): void {
    this.log({
      user,
      action: `BOT_${action}`,
      resource: `bots/${botName}`,
      result,
      details,
      ...options,
    });
  }

  public logAdminAction(
    user: string,
    action: string,
    resource: string,
    result: 'success' | 'failure',
    details: string,
    options: {
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    } = {}
  ): void {
    this.log({
      user,
      action: `ADMIN_${action}`,
      resource,
      result,
      details,
      ...options,
    });
  }

  public getAuditEvents(limit = 100, offset = 0): AuditEvent[] {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }

      const content = fs.readFileSync(this.logFilePath, 'utf8');
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.trim());

      const events: AuditEvent[] = lines
        .map((line) => {
          try {
            return JSON.parse(line) as AuditEvent;
          } catch {
            return null;
          }
        })
        .filter((event): event is AuditEvent => event !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return events.slice(offset, offset + limit);
    } catch (error) {
      debug('Failed to read audit events:', error);
      return [];
    }
  }

  public getAuditEventsByUser(user: string, limit = 100): AuditEvent[] {
    const allEvents = this.getAuditEvents(1000); // Get more to filter
    return allEvents.filter((event) => event.user === user).slice(0, limit);
  }

  public getAuditEventsByAction(action: string, limit = 100): AuditEvent[] {
    const allEvents = this.getAuditEvents(1000); // Get more to filter
    return allEvents.filter((event) => event.action === action).slice(0, limit);
  }

  public getBotActivity(botId: string, limit = 50): AuditEvent[] {
    const allEvents = this.getAuditEvents(2000);
    const resourceKey = `bots/${botId}`;
    return allEvents
      .filter(
        (event) =>
          event.resource === resourceKey || (event.metadata && event.metadata.botId === botId)
      )
      .slice(0, limit);
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getLogFilePath(): string {
    return this.logFilePath;
  }
}

export default AuditLogger;
