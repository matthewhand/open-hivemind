import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Logger } from '../common/logger';
import { SecureConfigManager } from '../config/SecureConfigManager';

const debug = Debug('app:storage:webUIStorage');
const logger = Logger.withContext('app:storage:webUIStorage');

interface WebUIAgent {
  id: string;
  name?: string;
  [key: string]: any;
}

interface WebUIMcpServer {
  name: string;
  [key: string]: unknown;
}

interface WebUIPersona {
  key: string;
  [key: string]: unknown;
}

interface WebUILlmProvider {
  id: string;
  [key: string]: unknown;
}

interface WebUIMessengerProvider {
  id: string;
  [key: string]: unknown;
}

interface WebUIGuard {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Simple persistent storage for web UI configurations
 * Stores data in JSON files in the config/user directory
 */
export interface WebUIConfig {
  agents: WebUIAgent[];
  mcpServers: WebUIMcpServer[];
  llmProviders: WebUILlmProvider[];
  messengerProviders: WebUIMessengerProvider[];
  personas: WebUIPersona[];
  guards: WebUIGuard[];
  layout?: string[];
  lastUpdated: string;
}

export class WebUIStorage {
  private static instance: WebUIStorage | null = null;
  private guardsInitializationInProgress = false;
  private configCache: WebUIConfig | null = null;
  private loadPromise: Promise<WebUIConfig> | null = null;
  private saveQueue: Promise<void> = Promise.resolve();

  private get configDir(): string {
    return path.join(process.cwd(), 'config', 'user');
  }

  private get configFile(): string {
    return path.join(this.configDir, 'webui-config.json');
  }

  public constructor() {
    this.ensureConfigDirSync();
  }

  public static getInstance(): WebUIStorage {
    if (!WebUIStorage.instance) {
      WebUIStorage.instance = new WebUIStorage();
    }
    return WebUIStorage.instance;
  }

  /**
   * Ensure the configuration directory exists synchronously
   */
  private ensureConfigDirSync(): void {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
    } catch (err) {
      debug('ERROR:', 'Failed to create config directory:', err);
    }
  }

  /**
   * Ensure the configuration directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.promises.access(this.configDir);
    } catch {
      await fs.promises.mkdir(this.configDir, { recursive: true });
    }
  }

  /**
   * Load configuration from file
   */
  public async loadConfig(): Promise<WebUIConfig> {
    if (this.configCache) {
      return this.configCache;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      // Default configuration
      const defaultConfig: WebUIConfig = {
        agents: [],
        mcpServers: [],
        llmProviders: [],
        messengerProviders: [],
        personas: [],
        guards: [],
        lastUpdated: new Date().toISOString(),
      };

      try {
        if (!fs.existsSync(this.configFile)) {
          return defaultConfig;
        }

        const rawData = await fs.promises.readFile(this.configFile, 'utf8');
        let parsedData: any;

        // Detect if file is encrypted (contains multiple colon-separated segments and doesn't look like JSON)
        // Encrypted format is iv:authTag:encryptedData or similar
        const isEncrypted = rawData.includes(':') && !rawData.trim().startsWith('{');

        if (isEncrypted) {
          debug('Loading encrypted web UI configuration');
          const secureManager = await SecureConfigManager.getInstance();
          const decryptedData = secureManager.decrypt(rawData);
          parsedData = JSON.parse(decryptedData);
        } else {
          debug('Loading legacy plain-text web UI configuration');
          parsedData = JSON.parse(rawData);

          // Migrate to encrypted format on next save (only if encryption is enabled)
          const encryptionEnabled = process.env.DISABLE_ENCRYPTION !== 'true';
          if (encryptionEnabled) {
            setTimeout(() => {
              if (this.configCache) {
                this.saveConfig(this.configCache).catch((err) =>
                  logger.error('Failed to migrate config to encrypted format', {
                    error: err.message,
                  })
                );
              }
            }, 1000);
          }
        }

        return { ...defaultConfig, ...parsedData };
      } catch (error: unknown) {
        debug('ERROR:', 'Error loading web UI config, using defaults:', error);
        logger.error('Failed to load web UI configuration', {
          error: error instanceof Error ? error.message : String(error),
        });
        return defaultConfig;
      } finally {
        this.loadPromise = null;
      }
    })();

    this.configCache = await this.loadPromise;
    return this.configCache;
  }

  /**
   * Save configuration to file
   */
  public saveConfig(config: WebUIConfig): Promise<void> {
    config.lastUpdated = new Date().toISOString();
    this.ensureConfigDirSync();

    // Update cache immediately so subsequent synchronous reads get the new state
    this.configCache = config;

    // Return a new promise that resolves or rejects based on this specific write
    return new Promise((resolve, reject) => {
      this.saveQueue = this.saveQueue
        .then(async () => {
          try {
            const dataToSave = JSON.stringify(config, null, 2);
            let finalData: string;

            // Allow disabling encryption for tests to simplify them
            const encryptionEnabled = process.env.DISABLE_ENCRYPTION !== 'true';

            if (encryptionEnabled) {
              const secureManager = await SecureConfigManager.getInstance();
              finalData = secureManager.encrypt(dataToSave);
              debug('Web UI configuration saved (encrypted)');
            } else {
              finalData = dataToSave;
              debug('Web UI configuration saved (plain-text)');
            }

            await fs.promises.writeFile(this.configFile, finalData, 'utf8');
            resolve();
          } catch (error) {
            debug('ERROR:', 'Error saving web UI config:', error);
            reject(
              new Error(
                `Failed to save web UI configuration: ${error instanceof Error ? error.message : String(error)}`
              )
            );
          }
        })
        .catch((err) => {
          debug('Queue error:', err);
          // Don't block the queue
        });
    });
  }

  /**
   * Get all agents
   */
  public async getAgents(): Promise<WebUIAgent[]> {
    const config = await this.loadConfig();
    return config.agents || [];
  }

  /**
   * Save a single agent
   */
  public async saveAgent(agent: WebUIAgent): Promise<void> {
    const config = await this.loadConfig();
    const index = config.agents.findIndex((a) => a.id === agent.id);
    if (index >= 0) {
      config.agents[index] = agent;
    } else {
      config.agents.push(agent);
    }
    await this.saveConfig(config);
  }

  /**
   * Delete an agent
   */
  public async deleteAgent(id: string): Promise<void> {
    const config = await this.loadConfig();
    config.agents = config.agents.filter((a) => a.id !== id);
    await this.saveConfig(config);
  }

  /**
   * Get all personas
   */
  public async getPersonas(): Promise<WebUIPersona[]> {
    const config = await this.loadConfig();
    return config.personas || [];
  }

  /**
   * Save a persona
   */
  public async savePersona(persona: WebUIPersona): Promise<void> {
    const config = await this.loadConfig();
    if (!config.personas) config.personas = [];
    const index = config.personas.findIndex((p) => p.key === persona.key);
    if (index >= 0) {
      config.personas[index] = persona;
    } else {
      config.personas.push(persona);
    }
    await this.saveConfig(config);
  }

  /**
   * Delete a persona
   */
  public async deletePersona(key: string): Promise<void> {
    const config = await this.loadConfig();
    if (config.personas) {
      config.personas = config.personas.filter((p) => p.key !== key);
      await this.saveConfig(config);
    }
  }

  /**
   * Get all MCP servers
   */
  public async getMcpServers(): Promise<WebUIMcpServer[]> {
    const config = await this.loadConfig();
    return config.mcpServers || [];
  }

  /**
   * Get all Mcps (alias for getMcpServers)
   */
  public async getMcps(): Promise<WebUIMcpServer[]> {
    return this.getMcpServers();
  }

  /**
   * Save an MCP server
   */
  public async saveMcp(mcp: WebUIMcpServer): Promise<void> {
    const config = await this.loadConfig();
    if (!config.mcpServers) config.mcpServers = [];
    const index = config.mcpServers.findIndex((m) => m.name === mcp.name);
    if (index >= 0) {
      config.mcpServers[index] = mcp;
    } else {
      config.mcpServers.push(mcp);
    }
    await this.saveConfig(config);
  }

  /**
   * Delete an MCP server
   */
  public async deleteMcp(name: string): Promise<void> {
    const config = await this.loadConfig();
    if (config.mcpServers) {
      config.mcpServers = config.mcpServers.filter((m) => m.name !== name);
      await this.saveConfig(config);
    }
  }

  /**
   * Get all LLM providers
   */
  public async getLlmProviders(): Promise<WebUILlmProvider[]> {
    const config = await this.loadConfig();
    return config.llmProviders || [];
  }

  /**
   * Save an LLM provider
   */
  public async saveLlmProvider(provider: WebUILlmProvider): Promise<void> {
    const config = await this.loadConfig();
    if (!config.llmProviders) config.llmProviders = [];
    const index = config.llmProviders.findIndex((p) => p.id === provider.id);
    if (index >= 0) {
      config.llmProviders[index] = provider;
    } else {
      config.llmProviders.push(provider);
    }
    await this.saveConfig(config);
  }

  /**
   * Delete an LLM provider
   */
  public async deleteLlmProvider(id: string): Promise<void> {
    const config = await this.loadConfig();
    if (config.llmProviders) {
      config.llmProviders = config.llmProviders.filter((p) => p.id !== id);
      await this.saveConfig(config);
    }
  }

  /**
   * Get all messenger providers
   */
  public async getMessengerProviders(): Promise<WebUIMessengerProvider[]> {
    const config = await this.loadConfig();
    return config.messengerProviders || [];
  }

  /**
   * Save a messenger provider
   */
  public async saveMessengerProvider(provider: WebUIMessengerProvider): Promise<void> {
    const config = await this.loadConfig();
    if (!config.messengerProviders) config.messengerProviders = [];
    const index = config.messengerProviders.findIndex((p) => p.id === provider.id);
    if (index >= 0) {
      config.messengerProviders[index] = provider;
    } else {
      config.messengerProviders.push(provider);
    }
    await this.saveConfig(config);
  }

  /**
   * Delete a messenger provider
   */
  public async deleteMessengerProvider(id: string): Promise<void> {
    const config = await this.loadConfig();
    if (config.messengerProviders) {
      config.messengerProviders = config.messengerProviders.filter((p) => p.id !== id);
      await this.saveConfig(config);
    }
  }

  /**
   * Get all guards
   */
  public async getGuards(): Promise<WebUIGuard[]> {
    const config = await this.loadConfig();

    // Initialize default guards if they don't exist or if guards array is missing
    if (!config.guards || config.guards.length === 0) {
      // Bolt Optimization: Don't run multiple initializations in parallel
      if (this.guardsInitializationInProgress) {
        return config.guards || [];
      }
      this.guardsInitializationInProgress = true;

      const defaultGuards = [
        {
          id: 'access-control',
          name: 'Access Control',
          description: 'User and IP-based access restrictions',
          enabled: true,
          type: 'access',
          config: {
            users: [],
            ips: [],
            type: 'users',
          },
        },
        {
          id: 'rate-limiting',
          name: 'Rate Limiting',
          description: 'Prevents abuse by limiting message frequency',
          enabled: false,
          type: 'rate-limit',
          config: {
            windowMs: 60000,
            max: 10,
          },
        },
        {
          id: 'content-filtering',
          name: 'Content Filtering',
          description: 'Blocks messages containing prohibited language',
          enabled: false,
          type: 'content',
          config: {
            blockedWords: [],
          },
        },
      ];

      try {
        if (!config.guards) {
          config.guards = defaultGuards;
        } else {
          // Merge defaults: if a guard with same ID exists, keep it, otherwise add default
          const existingIds = new Set(config.guards.map((g: { id: string }) => g.id));
          for (const defaultGuard of defaultGuards) {
            if (!existingIds.has(defaultGuard.id)) {
              config.guards.push(defaultGuard);
              existingIds.add(defaultGuard.id);
            }
          }
        }

        // Save the defaults back to storage
        this.saveConfig(config).catch((err) => {
          debug('ERROR:', 'Failed to save default guards:', err);
          logger.warn('Failed to persist default guards to storage:', err);
        });
      } finally {
        this.guardsInitializationInProgress = false;
      }
    }

    return config.guards;
  }

  /**
   * Save a single guard
   */
  public async saveGuard(guard: WebUIGuard): Promise<void> {
    const config = await this.loadConfig();
    const index = config.guards.findIndex((g) => g.id === guard.id);
    if (index >= 0) {
      config.guards[index] = guard;
    } else {
      config.guards.push(guard);
    }
    await this.saveConfig(config);
  }

  /**
   * Toggle a guard's enabled status
   */
  public async toggleGuard(id: string, enabled: boolean): Promise<void> {
    const config = await this.loadConfig();
    const guard = config.guards.find((g) => g.id === id);
    if (guard) {
      guard.enabled = enabled;
      await this.saveConfig(config);
    }
  }
}

// Export singleton instance
export const webUIStorage = WebUIStorage.getInstance();
export default webUIStorage;
