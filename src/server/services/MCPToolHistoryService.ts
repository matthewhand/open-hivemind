import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:MCPToolHistoryService');

/**
 * A single MCP tool execution record. Mirrors the client-side
 * `ToolExecutionRecord` shape so the WebUI can hydrate directly from the API.
 */
export interface ToolExecutionRecord {
  id: string;
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: 'success' | 'error';
  executedAt: string;
  duration: number;
  userId?: string;
}

interface MCPToolHistoryData {
  history: ToolExecutionRecord[];
  lastUpdated: string;
}

/** Cap stored history so the backing file cannot grow unbounded. */
const MAX_HISTORY = 200;

/** Default number of records returned by `list()` when no limit is given. */
const DEFAULT_LIST_LIMIT = 50;

/**
 * File-backed store for MCP tool execution history (mirrors
 * MCPFavoritesService). The MCP Tools page posts a record after every tool
 * execution and reads the list back for its "Execution History" modal, so
 * history survives across devices and sessions instead of living only in the
 * browser.
 */
export class MCPToolHistoryService {
  private static instance: MCPToolHistoryService;
  private dataFile: string;
  private data: MCPToolHistoryData;
  private saveTimeout: NodeJS.Timeout | null = null;
  private initialized: Promise<void>;

  private constructor(dataFile?: string) {
    const dataDir = path.join(process.cwd(), 'data');
    this.dataFile = dataFile ?? path.join(dataDir, 'mcp-tool-history.json');
    this.data = {
      history: [],
      lastUpdated: new Date().toISOString(),
    };
    this.initialized = this.initializeData();
  }

  public static getInstance(): MCPToolHistoryService {
    if (!MCPToolHistoryService.instance) {
      MCPToolHistoryService.instance = new MCPToolHistoryService();
    }
    return MCPToolHistoryService.instance;
  }

  /**
   * Test helper: build an isolated instance backed by a specific file so unit
   * tests do not touch the shared singleton or the real `data/` directory.
   */
  public static createForTesting(dataFile: string): MCPToolHistoryService {
    return new MCPToolHistoryService(dataFile);
  }

  /** Resolves once the backing file has been read (or created). */
  public async ready(): Promise<void> {
    return this.initialized;
  }

  private async initializeData(): Promise<void> {
    try {
      const dataDir = path.dirname(this.dataFile);
      await fs.promises.mkdir(dataDir, { recursive: true });

      try {
        const content = await fs.promises.readFile(this.dataFile, 'utf8');
        const parsed = JSON.parse(content) as Partial<MCPToolHistoryData>;
        this.data = {
          history: Array.isArray(parsed.history) ? parsed.history.slice(0, MAX_HISTORY) : [],
          lastUpdated: parsed.lastUpdated ?? new Date().toISOString(),
        };
        debug('Loaded MCP tool history from file');
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          debug('No existing MCP tool history file, starting fresh');
          await this.saveData();
        } else {
          throw error;
        }
      }
    } catch (error) {
      debug('Failed to initialize MCP tool history data: %O', error);
    }
  }

  private async saveData(): Promise<void> {
    try {
      this.data.lastUpdated = new Date().toISOString();
      await fs.promises.writeFile(this.dataFile, JSON.stringify(this.data, null, 2), 'utf8');
      debug('Saved MCP tool history to file');
    } catch (error) {
      debug('Failed to save MCP tool history: %O', error);
      throw error;
    }
  }

  /**
   * Record a tool execution. Missing optional fields are defaulted so the
   * route can pass the client payload through directly. Newest records are
   * kept first and the list is capped at MAX_HISTORY.
   * Saves immediately (awaitable) so callers/tests can rely on durability.
   */
  public async add(record: Partial<ToolExecutionRecord>): Promise<ToolExecutionRecord> {
    const stored: ToolExecutionRecord = {
      id: typeof record.id === 'string' && record.id ? record.id : crypto.randomUUID(),
      serverName: String(record.serverName),
      toolName: String(record.toolName),
      arguments:
        record.arguments && typeof record.arguments === 'object'
          ? { ...(record.arguments as Record<string, unknown>) }
          : {},
      result: record.result,
      error: typeof record.error === 'string' ? record.error : undefined,
      status: record.status === 'error' ? 'error' : 'success',
      executedAt:
        typeof record.executedAt === 'string' && record.executedAt
          ? record.executedAt
          : new Date().toISOString(),
      duration: typeof record.duration === 'number' && record.duration >= 0 ? record.duration : 0,
      userId: typeof record.userId === 'string' ? record.userId : undefined,
    };

    this.data.history = [stored, ...this.data.history].slice(0, MAX_HISTORY);
    await this.saveData();
    return { ...stored };
  }

  /** Return the most recent records (newest first), up to `limit`. */
  public list(limit: number = DEFAULT_LIST_LIMIT): ToolExecutionRecord[] {
    const capped =
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, MAX_HISTORY) : DEFAULT_LIST_LIMIT;
    return this.data.history.slice(0, capped).map((r) => ({ ...r }));
  }

  /**
   * Shutdown and cleanup resources, flushing any pending debounced write.
   */
  public async shutdown(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.saveData().catch((err) => {
      debug('Failed to save data during shutdown: %O', err);
    });
    debug('MCPToolHistoryService shutdown completed');
  }
}

export default MCPToolHistoryService;
