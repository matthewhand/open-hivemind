import { BotConfigurationManager } from './BotConfigurationManager';
import UserConfigStore, { BotOverride } from './UserConfigStore';
import { WebSocketService } from '@src/server/services/WebSocketService';
import Debug from 'debug';
import fs from 'fs';
import path from 'path';

const debug = Debug('app:HotReloadManager');

export interface ConfigurationChange {
  id: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete';
  botName?: string;
  changes: Record<string, any>;
  previousConfig?: Record<string, any>;
  userId?: string;
  validated: boolean;
  applied: boolean;
  rollbackAvailable: boolean;
}

export interface HotReloadResult {
  success: boolean;
  message: string;
  affectedBots: string[];
  warnings: string[];
  errors: string[];
  rollbackId?: string;
}

export class HotReloadManager {
  private static instance: HotReloadManager;
  private changeHistory: ConfigurationChange[] = [];
  private rollbackSnapshots: Map<string, Record<string, any>> = new Map();
  private isReloading = false;
  private configWatchers: Map<string, fs.FSWatcher> = new Map();
  private userConfigStore = UserConfigStore.getInstance();

  private constructor() {
    this.initializeFileWatchers();
  }

  public static getInstance(): HotReloadManager {
    if (!HotReloadManager.instance) {
      HotReloadManager.instance = new HotReloadManager();
    }
    return HotReloadManager.instance;
  }

  private initializeFileWatchers(): void {
    // Watch configuration files for changes
    const configPaths = [
      path.join(process.cwd(), 'config'),
      path.join(process.cwd(), 'config', 'user')
    ];

    configPaths.forEach(configPath => {
      if (fs.existsSync(configPath)) {
        try {
          const watcher = fs.watch(configPath, { recursive: true }, (eventType, filename) => {
            if (filename && (filename.endsWith('.json') || filename.endsWith('.js'))) {
              debug(`Configuration file changed: ${filename}`);
              this.handleFileChange();
            }
          });
          this.configWatchers.set(configPath, watcher);
        } catch (error) {
          debug(`Failed to watch config path ${configPath}:`, error);
        }
      }
    });
  }

  private handleFileChange(): void {
    // Debounce file changes to avoid multiple reloads
    setTimeout(() => {
      this.detectConfigurationChanges();
    }, 1000);
  }

  private detectConfigurationChanges(): void {
    try {
      debug('Configuration changes detected, triggering hot reload check');
      // For now, just log the detection - full auto-reload would be implemented here

    } catch (error) {
      debug('Error detecting configuration changes:', error);
    }
  }

  public async applyConfigurationChange(
    change: Omit<ConfigurationChange, 'id' | 'timestamp' | 'validated' | 'applied' | 'rollbackAvailable'>
  ): Promise<HotReloadResult> {
    if (this.isReloading) {
      return {
        success: false,
        message: 'Hot reload already in progress',
        affectedBots: [],
        warnings: [],
        errors: ['Another reload is in progress']
      };
    }

    this.isReloading = true;

    try {
      const changeId = `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fullChange: ConfigurationChange = {
        ...change,
        id: changeId,
        timestamp: new Date().toISOString(),
        validated: false,
        applied: false,
        rollbackAvailable: false
      };

      // Validate the change
      const validation = await this.validateChange(fullChange);
      if (!validation.valid) {
        return {
          success: false,
          message: 'Configuration change validation failed',
          affectedBots: validation.affectedBots,
          warnings: validation.warnings,
          errors: validation.errors
        };
      }

      fullChange.validated = true;

      // Create rollback snapshot
      const rollbackId = await this.createRollbackSnapshot(fullChange);
      fullChange.rollbackAvailable = !!rollbackId;

      // Apply the change
      const result = await this.applyChange(fullChange);

      if (result.success) {
        fullChange.applied = true;
        this.changeHistory.push(fullChange);

        // Notify via WebSocket
        const wsService = WebSocketService.getInstance();
        wsService.recordAlert({
          level: 'info',
          title: 'Configuration Updated',
          message: `Configuration change applied successfully`,
          botName: change.botName,
          metadata: { changeId, affectedBots: result.affectedBots }
        });

        return {
          ...result,
          rollbackId: rollbackId || undefined
        };
      } else {
        // Attempt rollback if application failed
        if (rollbackId) {
          await this.rollbackToSnapshot(rollbackId);
        }
        return result;
      }

    } catch (error) {
      debug('Error applying configuration change:', error);
      return {
        success: false,
        message: 'Unexpected error during configuration change',
        affectedBots: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    } finally {
      this.isReloading = false;
    }
  }

  private async validateChange(change: ConfigurationChange): Promise<{
    valid: boolean;
    affectedBots: string[];
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const affectedBots: string[] = [];

    try {
      const manager = BotConfigurationManager.getInstance();

      if (change.botName) {
        // Single bot change
        const bot = manager.getBot(change.botName);
        if (!bot) {
          errors.push(`Bot '${change.botName}' not found`);
          return { valid: false, affectedBots, warnings, errors };
        }
        affectedBots.push(change.botName);

        // Validate specific changes
        if (change.changes.messageProvider) {
          warnings.push('Changing message provider may require bot restart');
        }
        if (change.changes.llmProvider) {
          warnings.push('Changing LLM provider may affect response quality');
        }

      } else {
        // Global change affecting all bots
        const allBots = manager.getAllBots();
        affectedBots.push(...allBots.map(b => b.name));
        warnings.push('Global configuration change affects all bots');
      }

      // Additional validation logic would go here
      // - Check for invalid values
      // - Validate provider-specific configurations
      // - Check for circular dependencies
      // - Validate rate limits and quotas

      return {
        valid: errors.length === 0,
        affectedBots,
        warnings,
        errors
      };

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, affectedBots, warnings, errors };
    }
  }

  private async createRollbackSnapshot(change: ConfigurationChange): Promise<string | null> {
    try {
      const manager = BotConfigurationManager.getInstance();
      const snapshotId = `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (change.botName) {
        // Single bot snapshot
        const bot = manager.getBot(change.botName);
        if (bot) {
          this.rollbackSnapshots.set(snapshotId, { [change.botName]: { ...bot } });
        }
      } else {
        // Full system snapshot
        const allBots = manager.getAllBots();
        const snapshot: Record<string, any> = {};
        allBots.forEach(bot => {
          snapshot[bot.name] = { ...bot };
        });
        this.rollbackSnapshots.set(snapshotId, snapshot);
      }

      return snapshotId;
    } catch (error) {
      debug('Error creating rollback snapshot:', error);
      return null;
    }
  }

  private async applyChange(change: ConfigurationChange): Promise<HotReloadResult> {
    try {
      const manager = BotConfigurationManager.getInstance();
      const affectedBots: string[] = [];
      const warnings: string[] = [];
      const errors: string[] = [];

      if (change.botName) {
        // Apply change to specific bot
        const success = await this.applyBotChange(change.botName, change.changes);
        if (success) {
          affectedBots.push(change.botName);
        } else {
          errors.push(`Failed to apply changes to bot '${change.botName}'`);
        }
      } else {
        // Apply global changes
        const allBots = manager.getAllBots();
        for (const bot of allBots) {
          const success = await this.applyBotChange(bot.name, change.changes);
          if (success) {
            affectedBots.push(bot.name);
          } else {
            warnings.push(`Failed to apply changes to bot '${bot.name}'`);
          }
        }
      }

      return {
        success: errors.length === 0,
        message: errors.length === 0 ? 'Configuration changes applied successfully' : 'Some changes failed to apply',
        affectedBots,
        warnings,
        errors
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to apply configuration changes',
        affectedBots: [],
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async applyBotChange(botName: string, changes: Record<string, any>): Promise<boolean> {
    try {
      debug(`Applying changes to bot '${botName}':`, changes);

      const allowedFields: (keyof BotOverride)[] = [
        'messageProvider',
        'llmProvider',
        'persona',
        'systemInstruction',
        'mcpServers',
        'mcpGuard',
      ];

      const sanitizedChanges: Partial<BotOverride> = {};

      for (const [key, value] of Object.entries(changes)) {
        if (!allowedFields.includes(key as keyof BotOverride)) {
          continue;
        }

        if (key === 'mcpGuard' && value) {
          const guard = value as BotOverride['mcpGuard'];
          sanitizedChanges.mcpGuard = {
            enabled: Boolean(guard?.enabled),
            type: guard?.type === 'custom' ? 'custom' : 'owner',
            allowedUserIds: Array.isArray(guard?.allowedUserIds)
              ? guard?.allowedUserIds.filter(Boolean)
              : typeof guard?.allowedUserIds === 'string'
                ? (guard?.allowedUserIds as string).split(',').map((id: string) => id.trim()).filter(Boolean)
                : undefined,
          };
          continue;
        }

        (sanitizedChanges as any)[key] = value;
      }

      if (Object.keys(sanitizedChanges).length > 0) {
        this.userConfigStore.setBotOverride(botName, sanitizedChanges);

        // Reload configuration so changes take effect immediately
        const manager = BotConfigurationManager.getInstance();
        manager.reload();
      }

      return true;
    } catch (error) {
      debug(`Error applying changes to bot '${botName}':`, error);
      return false;
    }
  }

  public async rollbackToSnapshot(snapshotId: string): Promise<boolean> {
    try {
      const snapshot = this.rollbackSnapshots.get(snapshotId);
      if (!snapshot) {
        debug(`Rollback snapshot '${snapshotId}' not found`);
        return false;
      }

      // Restore the snapshot
      for (const [botName, botConfig] of Object.entries(snapshot)) {
        await this.applyBotChange(botName, botConfig as Record<string, any>);
      }

      // Remove the snapshot after successful rollback
      this.rollbackSnapshots.delete(snapshotId);

      debug(`Successfully rolled back to snapshot '${snapshotId}'`);
      return true;
    } catch (error) {
      debug('Error during rollback:', error);
      return false;
    }
  }

  public getChangeHistory(limit = 50): ConfigurationChange[] {
    return this.changeHistory.slice(-limit);
  }

  public getAvailableRollbacks(): string[] {
    return Array.from(this.rollbackSnapshots.keys());
  }

  public shutdown(): void {
    // Clean up file watchers
    this.configWatchers.forEach((watcher, path) => {
      try {
        watcher.close();
        debug(`Closed file watcher for ${path}`);
      } catch (error) {
        debug(`Error closing file watcher for ${path}:`, error);
      }
    });
    this.configWatchers.clear();

    debug('HotReloadManager shut down');
  }
}
