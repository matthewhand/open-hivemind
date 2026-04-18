import 'reflect-metadata';
import { injectable, singleton } from 'tsyringe';
import convict from 'convict';
import Debug from 'debug';
import { isValidUrl } from '../common/urlUtils';
import { SecureConfigManager } from './SecureConfigManager';
import { ValidationError } from '../types/errorClasses';
import { type IConfigurationManager } from '../di/interfaces';
const debug = Debug('app:ConfigurationManager');

/**
 * Manages configuration and environment settings.
 *
 * This manager provides unified access to all configuration layers (environment, files, secure storage)
 * and maintains schema validation via convict.
 *
 * @singleton
 * @implements {IConfigurationManager}
 */
@singleton()
@injectable()
export class ConfigurationManager implements IConfigurationManager {
  private static instance: ConfigurationManager;
  private readonly configs: Map<string, convict.Config<any>> = new Map();
  private readonly secureManager: SecureConfigManager;
  private sessionStore: Record<string, Record<string, string>> = {};

  constructor() {
    this.secureManager = SecureConfigManager.getInstanceSync();
    
    // Initialize schema inside constructor to ensure fresh env read in tests
    const schema = convict({
      NODE_ENV: {
        doc: 'The application environment.',
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV',
      },
      VITE_API_BASE_URL: {
        doc: 'API base URL for Vite frontend',
        format: (val: any) => {
          if (typeof val !== 'string') {
            throw new ValidationError(
              'Value must be a string',
              'VITE_API_BASE_URL',
              val,
              'string',
              ['Must be a valid string'],
            );
          }
          if (!isValidUrl(val)) {
            throw new ValidationError(
              'Value must be a valid URL',
              'VITE_API_BASE_URL',
              val,
              'valid URL',
              ['Must be a properly formatted URL'],
            );
          }
        },
        default: 'http://localhost:3000/api',
        env: 'VITE_API_BASE_URL',
      },
      PLAYWRIGHT_BASE_URL: {
        doc: 'Base URL for Playwright E2E tests',
        format: (val: any) => {
          if (typeof val !== 'string') {
            throw new ValidationError(
              'Value must be a string',
              'PLAYWRIGHT_BASE_URL',
              val,
              'string',
              ['Must be a valid string'],
            );
          }
        },
        default: 'http://localhost:3000',
        env: 'PLAYWRIGHT_BASE_URL',
      },
    });

    this.configs.set('environment', schema);
    debug('ConfigurationManager initialized');
  }

  /**
   * Retrieves the singleton instance.
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Resets the singleton instance (for testing).
   */
  public static resetInstance(): void {
    ConfigurationManager.instance = undefined as any;
  }

  /**
   * Retrieves a configuration object by name.
   */
  public getConfig(name: string): convict.Config<any> | null {
    return this.configs.get(name) ?? null;
  }

  /**
   * Get a configuration value by key from a specific group.
   */
  public get(group: string, key: string): any {
    const config = this.configs.get(group);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return config ? (config as any).get(key) : undefined;
  }

  /**
   * Retrieves the secure configuration manager.
   */
  public getSecureManager(): SecureConfigManager {
    return this.secureManager;
  }

  /**
   * Refreshes all configuration sources.
   */
  public async refresh(): Promise<void> {
    for (const config of this.configs.values()) {
      try {
        config.validate({ allowed: 'warn' });
      } catch (e) {
        debug('Validation error during refresh:', e);
      }
    }
  }

  /**
   * Stores a unique session ID for an integration/channel combination
   * @param integration - Integration name (e.g., 'slack', 'discord')
   * @param channelId - Channel/conversation identifier
   * @param sessionId - Session identifier to store
   */
  public setSession(integration: string, channelId: string, sessionId: string): void {
    if (!this.sessionStore[integration]) {
      this.sessionStore[integration] = {};
    }
    const uniqueSessionId = `${integration}-${channelId}-${sessionId}`;
    this.sessionStore[integration][channelId] = uniqueSessionId;
    debug(`Session set for integration ${integration}, channel ${channelId}, session ${uniqueSessionId}`);
  }

  /**
   * Retrieves a stored session ID
   * @param integration - Integration name
   * @param channelId - Channel/conversation identifier
   * @returns Session ID if exists, undefined otherwise
   */
  public getSession(integration: string, channelId: string): string | undefined {
    return this.sessionStore[integration]?.[channelId];
  }

  /**
   * Retrieves all sessions for an integration
   * @param integration - Integration name
   * @returns All channel-session mappings or undefined
   */
  public getAllSessions(integration: string): Record<string, string> | undefined {
    return this.sessionStore[integration];
  }
}

export default ConfigurationManager;
