import fs from 'fs';
import path from 'path';
import readline from 'readline';
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

  public async getEvents(options: ActivityFilter = {}): Promise<MessageFlowEvent[]> {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const fileStream = fs.createReadStream(this.logFile, { encoding: 'utf8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      const events: MessageFlowEvent[] = [];
      const startTimeMs = options.startTime ? options.startTime.getTime() : 0;
      const endTimeMs = options.endTime ? options.endTime.getTime() : Infinity;

      for await (const line of rl) {
        if (!line.trim()) {
          continue;
        }

        try {
          const event = JSON.parse(line) as MessageFlowEvent;
          const eventTime = new Date(event.timestamp).getTime();

          if (eventTime > endTimeMs) {
            // Since we scan from oldest to newest (append-only file),
            // if we hit a time after endTime, we can theoretically stop if strictly ordered.
            // However, slight clock skews or out-of-order writes (unlikely with appendFile)
            // suggest we should be careful. But for massive logs optimization,
            // we assume chronological order.
            // If the file is extremely large, breaking early is crucial.
            // But usually we filter by Recent Time (startTime), so we scan until end.
            // If we filter by Old Time (endTime), we stop early.
            break;
          }

          if (eventTime < startTimeMs) {
            continue;
          }

          if (options.botName && event.botName !== options.botName) {
            continue;
          }

          if (options.provider && event.provider !== options.provider) {
            continue;
          }

          events.push(event);

          if (options.limit && events.length > options.limit) {
            // Keep only the most recent 'limit' events
            events.shift();
          }
        } catch (e) {
          debug('Failed to parse activity log line: %O', e);
          continue;
        }
      }

      // Events are collected Oldest -> Newest.
      // Original implementation returned Oldest -> Newest (by reversing Newest -> Oldest).
      return events;
    } catch (error) {
      debug('Failed to read activity log: %O', error);
      return [];
    }
  }
}
