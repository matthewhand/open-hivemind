import { promises as fs } from 'fs';
import path from 'path';
import Debug from 'debug';
import { Logger } from '../common/logger';

const debug = Debug('app:storage:webUIStorage');

/**
 * Simple persistent storage for web UI configurations
 * Stores data in JSON files in the config/user directory
 */

interface WebUIConfig {
  agents: any[];
  mcpServers: any[];
  llmProviders: any[];
  messengerProviders: any[];
  personas: any[];
  guards: any[];
  lastUpdated: string;
}

export class WebUIStorage {
  private configDir: string;
  private configFile: string;
  private guardsInitializationInProgress = false;
  private configCache: WebUIConfig | null = null;
  private saveQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.configDir = path.join(process.cwd(), 'config', 'user');
    this.configFile = path.join(this.configDir, 'webui-config.json');
    this.ensureConfigDir();
  }

  /**
   * Ensure the configuration directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.access(this.configDir);
    } catch {
      await fs.mkdir(this.configDir, { recursive: true });
    }
  }

  /**
   * Load configuration from file
   */
  public async loadConfig(): Promise<WebUIConfig> {
    if (this.configCache) {
      return this.configCache;
    }

    try {
      await fs.access(this.configFile);
      const data = await fs.readFile(this.configFile, 'utf8');
      this.configCache = JSON.parse(data);
      return this.configCache!;
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        debug('ERROR:', 'Error loading web UI config:', error);
      }
    }

    // Return default configuration
    const defaultConfig = {
      agents: [],
      mcpServers: [],
      llmProviders: [],
      messengerProviders: [],
      personas: [],
      guards: [],
      lastUpdated: new Date().toISOString(),
    };

    this.configCache = defaultConfig;
    return defaultConfig;
  }

  /**
   * Save configuration to file
   */
  public saveConfig(config: WebUIConfig): Promise<void> {
    config.lastUpdated = new Date().toISOString();
    this.ensureConfigDir();

    // Update cache immediately so subsequent synchronous reads get the new state
    this.configCache = config;

    // Enqueue the async write to prevent concurrent file corruption
    const dataToWrite = JSON.stringify(config, null, 2);

    // Return a new promise that resolves or rejects based on this specific write
    return new Promise((resolve, reject) => {
      this.saveQueue = this.saveQueue
        .then(async () => {
          try {
            await fs.writeFile(this.configFile, dataToWrite);
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
        .catch(() => {
          // Reset queue on failure so subsequent writes aren't blocked
          // by a previous caller's rejection. Each caller's promise
          // rejects independently via the try/catch above.
        });
    });
  }

  /**
   * Get all agents
   */
  public async getAgents(): Promise<any[]> {
    const config = await this.loadConfig();
    return config.agents;
  }

  /**
   * Add or update an agent
   */
  public async saveAgent(agent: any): Promise<void> {
    const config = await this.loadConfig();
    const existingIndex = config.agents.findIndex((a: any) => a.id === agent.id);

    if (existingIndex >= 0) {
      config.agents[existingIndex] = agent;
    } else {
      config.agents.push(agent);
    }

    await this.saveConfig(config);
  }

  /**
   * Delete an agent
   */
  public async deleteAgent(agentId: string): Promise<void> {
    const config = await this.loadConfig();
    config.agents = config.agents.filter((a: any) => a.id !== agentId);
    await this.saveConfig(config);
  }

  /**
   * Get all MCP servers
   */
  public async getMcps(): Promise<any[]> {
    const config = await this.loadConfig();
    return config.mcpServers;
  }

  /**
   * Add or update an MCP server
   */
  public async saveMcp(mcp: any): Promise<void> {
    const config = await this.loadConfig();
    const existingIndex = config.mcpServers.findIndex((m: any) => m.name === mcp.name);

    if (existingIndex >= 0) {
      config.mcpServers[existingIndex] = mcp;
    } else {
      config.mcpServers.push(mcp);
    }

    await this.saveConfig(config);
  }

  /**
   * Delete an MCP server
   */
  public async deleteMcp(mcpName: string): Promise<void> {
    const config = await this.loadConfig();
    config.mcpServers = config.mcpServers.filter((m: any) => m.name !== mcpName);
    await this.saveConfig(config);
  }

  /**
   * Get all personas
   */
  public async getPersonas(): Promise<any[]> {
    const config = await this.loadConfig();
    return config.personas;
  }

  /**
   * Add or update a persona
   */
  public async savePersona(persona: any): Promise<void> {
    const config = await this.loadConfig();
    const existingIndex = config.personas.findIndex((p: any) => p.key === persona.key);

    if (existingIndex >= 0) {
      config.personas[existingIndex] = persona;
    } else {
      config.personas.push(persona);
    }

    await this.saveConfig(config);
  }

  /**
   * Delete a persona
   */
  public async deletePersona(personaKey: string): Promise<void> {
    const config = await this.loadConfig();
    config.personas = config.personas.filter((p: any) => p.key !== personaKey);
    await this.saveConfig(config);
  }
  /**
   * Get all LLM providers
   */
  public async getLlmProviders(): Promise<any[]> {
    const config = await this.loadConfig();
    return config.llmProviders || [];
  }

  /**
   * Add or update an LLM provider
   */
  public async saveLlmProvider(provider: any): Promise<void> {
    const config = await this.loadConfig();
    if (!config.llmProviders) {
      config.llmProviders = [];
    }

    const existingIndex = config.llmProviders.findIndex((p: any) => p.id === provider.id);

    if (existingIndex >= 0) {
      config.llmProviders[existingIndex] = provider;
    } else {
      config.llmProviders.push(provider);
    }

    await this.saveConfig(config);
  }

  /**
   * Delete an LLM provider
   */
  public async deleteLlmProvider(providerId: string): Promise<void> {
    const config = await this.loadConfig();
    if (!config.llmProviders) {
      return;
    }

    config.llmProviders = config.llmProviders.filter((p: any) => p.id !== providerId);
    await this.saveConfig(config);
  }

  /**
   * Get all messenger providers
   */
  public async getMessengerProviders(): Promise<any[]> {
    const config = await this.loadConfig();
    return config.messengerProviders || [];
  }

  /**
   * Add or update a messenger provider
   */
  public async saveMessengerProvider(provider: any): Promise<void> {
    const config = await this.loadConfig();
    if (!config.messengerProviders) {
      config.messengerProviders = [];
    }

    const existingIndex = config.messengerProviders.findIndex((p: any) => p.id === provider.id);

    if (existingIndex >= 0) {
      config.messengerProviders[existingIndex] = provider;
    } else {
      config.messengerProviders.push(provider);
    }

    await this.saveConfig(config);
  }

  /**
   * Delete a messenger provider
   */
  public async deleteMessengerProvider(providerId: string): Promise<void> {
    const config = await this.loadConfig();
    if (!config.messengerProviders) {
      return;
    }

    config.messengerProviders = config.messengerProviders.filter((p: any) => p.id !== providerId);
    await this.saveConfig(config);
  }

  /**
   * Get all guards
   */
  public async getGuards(): Promise<any[]> {
    const config = await this.loadConfig();

    // Initialize default guards if they don't exist or if guards array is missing
    if (!config.guards || config.guards.length === 0) {
      const defaultGuards = [
        {
          id: 'access-control',
          name: 'Access Control',
          description: 'User and IP-based access restrictions',
          type: 'access',
          enabled: true,
          config: { type: 'users', users: [], ips: [] },
        },
        {
          id: 'rate-limiter',
          name: 'Rate Limiter',
          description: 'Prevents spam and excessive requests',
          type: 'rate',
          enabled: true,
          config: { maxRequests: 100, windowMs: 60000 },
        },
        {
          id: 'content-filter',
          name: 'Content Filter',
          description: 'Filters inappropriate content',
          type: 'content',
          enabled: false,
          config: {},
        },
      ];

      // If guards is undefined, initialize it with defaults
      if (!config.guards) {
        config.guards = defaultGuards;
      } else {
        // Merge defaults: if a guard with same ID exists, keep it, otherwise add default
        // ⚡ Bolt Optimization: Use Set for O(1) lookups instead of O(n) array search
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
        Logger.warn('Failed to persist default guards to storage:', err);
      });
    }

    return config.guards;
  }

  /**
   * Save a guard
   */
  public async saveGuard(guard: any): Promise<void> {
    const config = await this.loadConfig();
    if (!config.guards) {
      config.guards = [];
    }

    const existingIndex = config.guards.findIndex((g: any) => g.id === guard.id);

    if (existingIndex >= 0) {
      config.guards[existingIndex] = guard;
    } else {
      config.guards.push(guard);
    }

    await this.saveConfig(config);
  }

  /**
   * Toggle a guard
   */
  public async toggleGuard(id: string, enabled: boolean): Promise<void> {
    const config = await this.loadConfig();
    if (!config.guards) {
      return;
    }

    const guard = config.guards.find((g: any) => g.id === id);
    if (guard) {
      guard.enabled = enabled;
      await this.saveConfig(config);
    }
  }
}

// Export singleton instance
export const webUIStorage = new WebUIStorage();
export default webUIStorage;
