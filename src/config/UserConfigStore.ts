import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { HivemindError, ErrorUtils } from '@src/types/errors';

const debug = Debug('app:UserConfigStore');

export interface BotOverride {
  messageProvider?: string;
  llmProvider?: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: Array<{ name: string; serverUrl?: string; apiKey?: string }>;
  mcpGuard?: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds?: string[];
  };
  updatedAt?: string;
}

type StoreShape = Record<string, BotOverride>;

export class UserConfigStore {
  private static instance: UserConfigStore;
  private readonly filePath: string;
  private cache: StoreShape | null = null;

  private constructor() {
    const configDir = path.join(process.cwd(), 'config', 'user');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    this.filePath = path.join(configDir, 'bot-overrides.json');
  }

  public static getInstance(): UserConfigStore {
    if (!UserConfigStore.instance) {
      UserConfigStore.instance = new UserConfigStore();
    }
    return UserConfigStore.instance;
  }

  private load(): StoreShape {
    if (this.cache) {
      return this.cache;
    }

    try {
      if (!fs.existsSync(this.filePath)) {
        this.cache = {};
        return this.cache;
      }

      const raw = fs.readFileSync(this.filePath, 'utf8');
      this.cache = JSON.parse(raw) as StoreShape;
      return this.cache;
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug('Failed to load bot overrides, falling back to empty store:', {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        filePath: this.filePath
      });
      this.cache = {};
      return this.cache;
    }
  }

  private persist(data: StoreShape): void {
    this.cache = data;
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug('Failed to persist bot overrides:', {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        filePath: this.filePath
      });
      throw ErrorUtils.createError(
        'USER_CONFIG_PERSIST_FAILED',
        `Failed to persist bot overrides: ${hivemindError.message}`,
        'error',
        { originalError: hivemindError, filePath: this.filePath }
      );
    }
  }

  public getAll(): StoreShape {
    return { ...this.load() };
  }

  public getBotOverride(botName: string): BotOverride | undefined {
    const store = this.load();
    return store[botName] ? { ...store[botName] } : undefined;
  }

  public setBotOverride(botName: string, override: BotOverride): void {
    const store = this.load();
    const existing = store[botName] || {};
    const merged: BotOverride = {
      ...existing,
      ...override,
      updatedAt: new Date().toISOString(),
    };
    store[botName] = merged;
    this.persist(store);
  }

  public removeBot(botName: string): void {
    const store = this.load();
    if (store[botName]) {
      delete store[botName];
      this.persist(store);
    }
  }
}

export default UserConfigStore;
