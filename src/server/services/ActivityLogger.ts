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
  private tailCache: MessageFlowEvent[] = [];
  private readonly MAX_CACHE_SIZE = 1000;

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
    // Add to in-memory tail cache
    this.tailCache.push(event);
    if (this.tailCache.length > this.MAX_CACHE_SIZE) {
      this.tailCache.shift();
    }

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
    // Try to satisfy from cache if possible
    // Only cache if offset is 0 and limit is within cache size
    if (this.canSatisfyFromCache(options)) {
      debug('Satisfying activity request from tail cache');
      return this.filterEvents(this.tailCache, options);
    }

    try {
      try {
        await fs.promises.access(this.logFile);
      } catch {
        return this.filterEvents(this.tailCache, options);
      }

      const fileStream = fs.createReadStream(this.logFile, { encoding: 'utf8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      const limit = options.limit || 100;
      const offset = options.offset || 0;
      const matchedEvents: MessageFlowEvent[] = [];
      let matchIndex = 0;

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

          // We have a match
          if (matchIndex >= offset) {
            matchedEvents.push(event);
            if (matchedEvents.length >= limit) {
              break; // We have enough
            }
          }
          matchIndex++;
        } catch (e) {
          debug('Failed to parse activity log line: %O', e);
          continue;
        }
      }

      return matchedEvents;
    } catch (error) {
      debug('Failed to read activity log: %O', error);
      return [];
    }
  }

  private canSatisfyFromCache(options: ActivityFilter): boolean {
    // We can only satisfy from cache if offset is 0
    if (options.offset && options.offset > 0) {
      return false;
    }

    // If no limit or limit > cache size, we need to read from disk
    if (!options.limit || options.limit > this.MAX_CACHE_SIZE) {
      return false;
    }

    // If startTime is provided, we might need older events from disk
    if (options.startTime) {
      if (this.tailCache.length === 0) return false;
      if (this.tailCache[0].timestamp > options.startTime.toISOString()) {
        return false;
      }
    }

    return true;
  }

  private filterEvents(events: MessageFlowEvent[], options: ActivityFilter): MessageFlowEvent[] {
    const startTimeMs = options.startTime ? options.startTime.getTime() : 0;
    const endTimeMs = options.endTime ? options.endTime.getTime() : Infinity;

    let filtered = events.filter((event) => {
      const eventTime = new Date(event.timestamp).getTime();

      if (eventTime > endTimeMs) return false;
      if (eventTime < startTimeMs) return false;
      if (options.botName && event.botName !== options.botName) return false;
      if (options.provider && event.provider !== options.provider) return false;
      if (options.llmProvider && event.llmProvider !== options.llmProvider) return false;

      return true;
    });

    if (options.offset) {
      filtered = filtered.slice(options.offset);
    }

    if (options.limit) {
      // Returns the last N events if limited
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }
}
