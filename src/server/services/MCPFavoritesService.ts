import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:MCPFavoritesService');

/**
 * A single recently-used tool entry. Mirrors the client-side
 * `RecentToolUsage` shape so the WebUI can hydrate directly from the API.
 */
export interface RecentToolUsage {
  toolId: string;
  timestamp: string;
  arguments?: Record<string, unknown>;
}

/**
 * The full set of per-user MCP tool registry preferences that previously
 * lived only in the browser's localStorage. Persisting these server-side lets
 * favorites / recents / usage counts survive across devices and sessions.
 */
export interface MCPFavoritesData {
  favorites: string[];
  recentlyUsed: RecentToolUsage[];
  usageCounts: Record<string, number>;
  lastUpdated: string;
}

const MAX_RECENT = 10;

export class MCPFavoritesService {
  private static instance: MCPFavoritesService;
  private dataFile: string;
  private data: MCPFavoritesData;
  private saveTimeout: NodeJS.Timeout | null = null;
  private initialized: Promise<void>;

  private constructor(dataFile?: string) {
    const dataDir = path.join(process.cwd(), 'data');
    this.dataFile = dataFile ?? path.join(dataDir, 'mcp-favorites.json');
    this.data = {
      favorites: [],
      recentlyUsed: [],
      usageCounts: {},
      lastUpdated: new Date().toISOString(),
    };
    this.initialized = this.initializeData();
  }

  public static getInstance(): MCPFavoritesService {
    if (!MCPFavoritesService.instance) {
      MCPFavoritesService.instance = new MCPFavoritesService();
    }
    return MCPFavoritesService.instance;
  }

  /**
   * Test helper: build an isolated instance backed by a specific file so unit
   * tests do not touch the shared singleton or the real `data/` directory.
   */
  public static createForTesting(dataFile: string): MCPFavoritesService {
    return new MCPFavoritesService(dataFile);
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
        const parsed = JSON.parse(content) as Partial<MCPFavoritesData>;
        this.data = {
          favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
          recentlyUsed: Array.isArray(parsed.recentlyUsed) ? parsed.recentlyUsed : [],
          usageCounts:
            parsed.usageCounts && typeof parsed.usageCounts === 'object' ? parsed.usageCounts : {},
          lastUpdated: parsed.lastUpdated ?? new Date().toISOString(),
        };
        debug('Loaded MCP favorites from file');
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          debug('No existing MCP favorites file, starting fresh');
          await this.saveData();
        } else {
          throw error;
        }
      }
    } catch (error) {
      debug('Failed to initialize MCP favorites data: %O', error);
    }
  }

  private async saveData(): Promise<void> {
    try {
      this.data.lastUpdated = new Date().toISOString();
      await fs.promises.writeFile(this.dataFile, JSON.stringify(this.data, null, 2), 'utf8');
      debug('Saved MCP favorites to file');
    } catch (error) {
      debug('Failed to save MCP favorites: %O', error);
      throw error;
    }
  }

  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveData().catch((error) => {
        debug('Failed to save MCP favorites: %O', error);
      });
    }, 1000);
  }

  /** Return the full preferences payload (defensive copy). */
  public getAll(): MCPFavoritesData {
    return {
      favorites: [...this.data.favorites],
      recentlyUsed: this.data.recentlyUsed.map((r) => ({ ...r })),
      usageCounts: { ...this.data.usageCounts },
      lastUpdated: this.data.lastUpdated,
    };
  }

  /**
   * Replace the stored preferences. Any field omitted from the patch is left
   * unchanged, so the WebUI can persist just the slice that changed.
   * Saves immediately (awaitable) so callers/tests can rely on durability.
   */
  public async setAll(
    patch: Partial<Omit<MCPFavoritesData, 'lastUpdated'>>
  ): Promise<MCPFavoritesData> {
    if (Array.isArray(patch.favorites)) {
      // De-duplicate while preserving insertion order.
      this.data.favorites = Array.from(new Set(patch.favorites));
    }
    if (Array.isArray(patch.recentlyUsed)) {
      this.data.recentlyUsed = patch.recentlyUsed.slice(0, MAX_RECENT).map((r) => ({ ...r }));
    }
    if (patch.usageCounts && typeof patch.usageCounts === 'object') {
      this.data.usageCounts = { ...patch.usageCounts };
    }
    await this.saveData();
    return this.getAll();
  }

  /** Toggle a tool's favorite status and persist. Returns the new list. */
  public async toggleFavorite(toolId: string): Promise<string[]> {
    if (this.data.favorites.includes(toolId)) {
      this.data.favorites = this.data.favorites.filter((id) => id !== toolId);
    } else {
      this.data.favorites = [...this.data.favorites, toolId];
    }
    await this.saveData();
    return [...this.data.favorites];
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
    debug('MCPFavoritesService shutdown completed');
  }
}

export default MCPFavoritesService;
