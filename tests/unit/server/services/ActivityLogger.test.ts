import fs from 'fs';
import os from 'os';
import path from 'path';
import { ActivityLogger } from '../../../../src/server/services/ActivityLogger';
import type { MessageFlowEvent } from '../../../../src/server/services/WebSocketService';

const makeEvent = (i: number, baseTime: number): MessageFlowEvent =>
  ({
    id: `evt-${i}`,
    timestamp: new Date(baseTime + i * 1000).toISOString(),
    botName: `bot-${i % 3}`,
    provider: 'discord',
    llmProvider: 'openai',
    channelId: 'chan',
    userId: 'user',
    messageType: 'incoming',
    contentLength: 10,
    status: 'success',
  }) as MessageFlowEvent;

/**
 * Build an isolated ActivityLogger instance (bypassing the singleton) whose
 * log file points at a temp path and whose tail cache starts empty.
 */
const makeLogger = (logFile: string, cachedEvents: MessageFlowEvent[] = []): ActivityLogger => {
  const logger = new (ActivityLogger as any)() as ActivityLogger;
  (logger as any).logFile = logFile;
  (logger as any).tailCache = [...cachedEvents];
  return logger;
};

describe('ActivityLogger.getEvents', () => {
  let tmpDir: string;
  let logFile: string;
  const baseTime = Date.now() - 10 * 60 * 1000;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'activity-logger-test-'));
    logFile = path.join(tmpDir, 'activity.jsonl');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeEvents = (events: MessageFlowEvent[]) => {
    fs.writeFileSync(logFile, events.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
  };

  it('reads persisted events from disk when the tail cache is empty (fresh process)', async () => {
    // Regression: a fresh process (empty cache) used to short-circuit to the
    // empty cache and report "no activity" despite a populated JSONL file.
    const events = Array.from({ length: 10 }, (_, i) => makeEvent(i, baseTime));
    writeEvents(events);

    const logger = makeLogger(logFile);
    const result = await logger.getEvents({ limit: 5 });

    expect(result).toHaveLength(5);
  });

  it('returns the NEWEST matching events from disk, in chronological order', async () => {
    // Regression: the disk path used to stop at the first `limit` matches,
    // returning the OLDEST events in the file.
    const events = Array.from({ length: 300 }, (_, i) => makeEvent(i, baseTime));
    writeEvents(events);

    const logger = makeLogger(logFile);
    const result = await logger.getEvents({ limit: 200 });

    expect(result).toHaveLength(200);
    expect(result[0].id).toBe('evt-100'); // oldest of the newest 200
    expect(result[result.length - 1].id).toBe('evt-299'); // most recent overall
  });

  it('falls back to disk when the cache holds fewer events than the requested limit', async () => {
    const events = Array.from({ length: 10 }, (_, i) => makeEvent(i, baseTime));
    writeEvents(events);

    // Cache only knows about the 2 newest events (logged by this process).
    const logger = makeLogger(logFile, events.slice(-2));
    const result = await logger.getEvents({ limit: 5 });

    expect(result).toHaveLength(5);
    expect(result[result.length - 1].id).toBe('evt-9');
  });

  it('serves from the tail cache when it can satisfy the request', async () => {
    const events = Array.from({ length: 10 }, (_, i) => makeEvent(i, baseTime));

    // No log file on disk — result can only come from the cache.
    const logger = makeLogger(path.join(tmpDir, 'missing.jsonl'), events);
    const result = await logger.getEvents({ limit: 3 });

    expect(result).toHaveLength(3);
    expect(result.map((e) => e.id)).toEqual(['evt-7', 'evt-8', 'evt-9']);
  });

  it('applies bot/provider filters on the disk path', async () => {
    const events = Array.from({ length: 9 }, (_, i) => makeEvent(i, baseTime));
    writeEvents(events);

    const logger = makeLogger(logFile);
    const result = await logger.getEvents({ limit: 100, botName: 'bot-1' });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((e) => e.botName === 'bot-1')).toBe(true);
  });
});
