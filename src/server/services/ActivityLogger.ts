import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { type MessageFlowEvent } from './WebSocketService';

const debug = Debug('app:ActivityLogger');

export interface ActivityFilter {
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  botName?: string;
  provider?: string;
  llmProvider?: string;
}

export class ActivityLogger {
  private static instance: ActivityLogger;
  private logFile: string;

  private constructor() {
    // Store in config/user/activity.jsonl as it is a persistent location for user data
    const configDir = path.join(process.cwd(), 'config', 'user');
    if (!fs.existsSync(configDir)) {
      try {
        fs.mkdirSync(configDir, { recursive: true });
      } catch (e) {
        debug('Failed to create config/user directory: %O', e);
      }
    }
    this.logFile = path.join(configDir, 'activity.jsonl');
  }

  public static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  public log(event: MessageFlowEvent): void {
    const line = JSON.stringify(event) + '\n';
    fs.appendFile(this.logFile, line, 'utf8', (error) => {
      if (error) {
        debug('Failed to log activity: %O', error);
      }
    });
  }

  public getEvents(options: ActivityFilter = {}): MessageFlowEvent[] {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      // Read file content
      // TODO: For production with large files, use readline or streams
      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.split('\n').filter((line) => line.trim());

      const events: MessageFlowEvent[] = [];

      // Process in reverse to get newest first, allowing early exit
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const event = JSON.parse(lines[i]) as MessageFlowEvent;
          const eventTime = new Date(event.timestamp).getTime();

          if (options.startTime && eventTime < options.startTime.getTime()) {
            // Since we scan from newest to oldest, if we hit a time before startTime,
            // all remaining events are also before startTime.
            break;
          }

          if (options.endTime && eventTime > options.endTime.getTime()) {
            continue;
          }

          if (options.botName && event.botName !== options.botName) {
            continue;
          }

          if (options.provider && event.provider !== options.provider) {
            continue;
          }

          // Note: MessageFlowEvent doesn't strictly have llmProvider in definition in WebSocketService
          // but dashboard.ts annotates it. We rely on what's logged.
          // If the logged event has it, we can filter.
          // But looking at WebSocketService, MessageFlowEvent doesn't have llmProvider.
          // It's added in dashboard.ts via annotateEvent.
          // So filtering by llmProvider here might not work if it's not in the log.
          // We will handle llmProvider filtering in the dashboard router after annotation.

          events.push(event);

          if (options.limit && events.length >= options.limit) {
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Return in chronological order (oldest to newest)
      return events.reverse();
    } catch (error) {
      debug('Failed to read activity log: %O', error);
      return [];
    }
  }
}
