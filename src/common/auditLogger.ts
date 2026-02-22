import fs from 'fs';
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

  private rotateLogIfNeeded(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        if (stats.size > this.maxLogSize) {
          // Rotate log files
          for (let i = this.maxLogFiles - 1; i >= 1; i--) {
            const oldFile = `${this.logFilePath}.${i}`;
            const newFile = `${this.logFilePath}.${i + 1}`;
            if (fs.existsSync(oldFile)) {
              if (i === this.maxLogFiles - 1) {
                fs.unlinkSync(oldFile); // Remove oldest
              } else {
                fs.renameSync(oldFile, newFile);
              }
            }
          }
          // Move current log to .1
          fs.renameSync(this.logFilePath, `${this.logFilePath}.1`);
        }
      }
    } catch (error) {
      debug('Failed to rotate audit log:', error);
    }
  }

  public log(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    try {
      this.rotateLogIfNeeded();

      const auditEvent: AuditEvent = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        ...event,
      };

      const logEntry = JSON.stringify(auditEvent) + '\n';

      fs.appendFileSync(this.logFilePath, logEntry);

      debug('Audit event logged:', {
        id: auditEvent.id,
        action: auditEvent.action,
        user: auditEvent.user,
        result: auditEvent.result,
      });
    } catch (error) {
      debug('Failed to log audit event:', error);
      // Fallback to console logging
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
