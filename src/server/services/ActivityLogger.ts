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
  offset?: number;
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
    this.logFile = path.join(configDir, 'activity.jsonl');
    // Initialize directory asynchronously
    this.initializeDirectory();
  }

  private async initializeDirectory(): Promise<void> {
    const configDir = path.dirname(this.logFile);
    try {
      await fs.promises.mkdir(configDir, { recursive: true });
    } catch (e) {
      debug('Failed to create config/user directory: %O', e);
    }
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

  public async getEventsCount(options: ActivityFilter = {}): Promise<number> {
    try {
      try {
        await fs.promises.access(this.logFile);
      } catch {
        return 0;
      }

      const fileStream = fs.createReadStream(this.logFile, { encoding: 'utf8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

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

          if (options.llmProvider && event.llmProvider !== options.llmProvider) {
            continue;
          }

          count++;
        } catch (e) {
          debug('Failed to parse activity log line: %O', e);
          continue;
        }
      }

      return count;
    } catch (error) {
      debug('Failed to count activity log: %O', error);
      return 0;
    }
  }

  public async getEvents(options: ActivityFilter = {}): Promise<MessageFlowEvent[]> {
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

      const bufferSize = options.limit ? options.limit : Infinity;
      const isBufferLimited = bufferSize !== Infinity;
      const offset = options.offset || 0;
      const events: MessageFlowEvent[] = isBufferLimited
        ? new Array<MessageFlowEvent>(bufferSize)
        : [];
      let count = 0;
      let matchedCount = 0;

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

          if (options.llmProvider && event.llmProvider !== options.llmProvider) {
            continue;
          }

          // Skip events before the offset
          if (matchedCount < offset) {
            matchedCount++;
            continue;
          }

          if (isBufferLimited) {
            events[count % bufferSize] = event;
          } else {
            // We know it is a dynamic array here
            (events as MessageFlowEvent[]).push(event);
          }
          count++;
          matchedCount++;
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
