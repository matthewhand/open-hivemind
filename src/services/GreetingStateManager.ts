import fs from 'fs/promises';
import path from 'path';
import Logger from '@common/logger';

const appLogger = Logger.withContext('GreetingStateManager');

interface GreetingState {
  [serviceId: string]: {
    timestamp: number;
    channelId: string;
  };
}

export class GreetingStateManager {
  private static instance: GreetingStateManager;
  private stateFilePath: string;
  private state: GreetingState = {};
  private initialized: boolean = false;

  private constructor() {
    this.stateFilePath = path.join(process.cwd(), 'data', 'greeting-state.json');
  }

  public static getInstance(): GreetingStateManager {
    if (!GreetingStateManager.instance) {
      GreetingStateManager.instance = new GreetingStateManager();
    }
    return GreetingStateManager.instance;
  }

  /**
   * Initialize the state manager by loading existing state from file
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.stateFilePath);
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
        appLogger.info('Created data directory for greeting state', { path: dataDir });
      }

      // Load existing state
      try {
        const data = await fs.readFile(this.stateFilePath, 'utf-8');
        this.state = JSON.parse(data);
        appLogger.info('Loaded greeting state from file', { path: this.stateFilePath });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // File doesn't exist yet, start with empty state
          this.state = {};
          appLogger.info('No existing greeting state file found, starting fresh');
        } else {
          throw error;
        }
      }

      // Clean up expired entries
      this.cleanupExpiredEntries();

      this.initialized = true;
      appLogger.info('GreetingStateManager initialized successfully');
    } catch (error) {
      appLogger.error('Failed to initialize GreetingStateManager', { error });
      // Don't throw, just start with empty state
      this.state = {};
      this.initialized = true;
    }
  }

  /**
   * Check if a greeting has already been sent for a service
   * @param serviceId Unique identifier for the service (e.g., 'slack-#general')
   * @returns boolean indicating if greeting was sent
   */
  public hasGreetingBeenSent(serviceId: string): boolean {
    this.ensureInitialized();

    const entry = this.state[serviceId];
    if (!entry) {
      return false;
    }

    // Check if entry is expired (24 hours)
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (now - entry.timestamp > twentyFourHours) {
      // Entry is expired, remove it and return false
      delete this.state[serviceId];
      this.saveState().catch((error) => {
        appLogger.error('Failed to save state after expiration', { error, serviceId });
      });
      return false;
    }

    return true;
  }

  /**
   * Mark a greeting as sent for a service
   * @param serviceId Unique identifier for the service
   * @param channelId The channel ID where the greeting was sent
   */
  public async markGreetingAsSent(serviceId: string, channelId: string): Promise<void> {
    this.ensureInitialized();

    this.state[serviceId] = {
      timestamp: Date.now(),
      channelId,
    };

    await this.saveState();
    appLogger.info('Marked greeting as sent', { serviceId, channelId });
  }

  /**
   * Get the state for a specific service
   * @param serviceId Unique identifier for the service
   */
  public getServiceState(serviceId: string): { timestamp: number; channelId: string } | null {
    this.ensureInitialized();
    return this.state[serviceId] || null;
  }

  /**
   * Clean up expired entries from the state
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const [serviceId, entry] of Object.entries(this.state)) {
      if (now - entry.timestamp > twentyFourHours) {
        delete this.state[serviceId];
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      appLogger.info('Cleaned up expired greeting state entries', { count: cleanedCount });
      this.saveState().catch((error) => {
        appLogger.error('Failed to save state after cleanup', { error });
      });
    }
  }

  /**
   * Save the current state to file
   */
  private async saveState(): Promise<void> {
    try {
      const data = JSON.stringify(this.state, null, 2);
      await fs.writeFile(this.stateFilePath, data, 'utf-8');
    } catch (error) {
      appLogger.error('Failed to save greeting state', { error, path: this.stateFilePath });
      throw error;
    }
  }

  /**
   * Clear all greeting state (useful for testing)
   */
  public async clearAllState(): Promise<void> {
    this.ensureInitialized();
    this.state = {};
    await this.saveState();
    appLogger.info('Cleared all greeting state');
  }

  /**
   * Get all current state (useful for debugging)
   */
  public getAllState(): GreetingState {
    this.ensureInitialized();
    return { ...this.state };
  }

  /**
   * Ensure the manager is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('GreetingStateManager must be initialized before use');
    }
  }
}
