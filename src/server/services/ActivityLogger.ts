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

      const bufferSize = options.limit ? options.limit : Infinity;
      const isBufferLimited = bufferSize !== Infinity;
      const events: MessageFlowEvent[] = isBufferLimited
        ? new Array<MessageFlowEvent>(bufferSize)
        : [];
      let count = 0;

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
            continue;
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

          if (isBufferLimited) {
            events[count % bufferSize] = event;
          } else {
            // We know it is a dynamic array here
            (events as MessageFlowEvent[]).push(event);
          }
          count++;
        } catch (e) {
          debug('Failed to parse activity log line: %O', e);
          continue;
        }
      }

      // Convert circular buffer [Oldest ... Newest]
      if (isBufferLimited) {
        const results: MessageFlowEvent[] = [];
        const totalElements = Math.min(count, bufferSize);
        for (let i = 0; i < totalElements; i++) {
          const index = count > bufferSize ? (count + i) % bufferSize : i;
          results.push(events[index]);
        }
        return results;
      }

      return events;
    } catch (error) {
      debug('Failed to read activity log: %O', error);
      return [];
    }
  }
}
