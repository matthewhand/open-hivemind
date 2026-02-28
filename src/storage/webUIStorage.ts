import fs from 'fs';
import path from 'path';

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
  toolUsageGuards?: any[];
  lastUpdated: string;
}

export class WebUIStorage {
  private configDir: string;
  private configFile: string;
  private guardsInitializationInProgress = false;
  private configCache: WebUIConfig | null = null;

  constructor() {
    this.configDir = path.join(process.cwd(), 'config', 'user');
    this.configFile = path.join(this.configDir, 'webui-config.json');
    this.ensureConfigDir();
  }

  /**
   * Ensure the configuration directory exists
   */
  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * Load configuration from file
   */
  public loadConfig(): WebUIConfig {
    if (this.configCache) {
      return this.configCache;
    }

    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        this.configCache = JSON.parse(data);
        return this.configCache!;
      }
    } catch (error) {
      console.error('Error loading web UI config:', error);
    }

    // Return default configuration
    const defaultConfig = {
      agents: [],
      mcpServers: [],
      llmProviders: [],
      messengerProviders: [],
      personas: [],
      guards: [],
      toolUsageGuards: [],
      lastUpdated: new Date().toISOString(),
    };

    this.configCache = defaultConfig;
    return defaultConfig;
  }

  /**
   * Save configuration to file
   */
  public saveConfig(config: WebUIConfig): void {
    try {
      config.lastUpdated = new Date().toISOString();
      this.ensureConfigDir();
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
      this.configCache = config;
    } catch (error) {
      console.error('Error saving web UI config:', error);
      throw new Error(
        `Failed to save web UI configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get all agents
   */
  public getAgents(): any[] {
    const config = this.loadConfig();
    return config.agents;
  }

  /**
   * Add or update an agent
   */
  public saveAgent(agent: any): void {
    const config = this.loadConfig();
    const existingIndex = config.agents.findIndex((a: any) => a.id === agent.id);

    if (existingIndex >= 0) {
      config.agents[existingIndex] = agent;
    } else {
      config.agents.push(agent);
    }

    this.saveConfig(config);
  }

  /**
   * Delete an agent
   */
  public deleteAgent(agentId: string): void {
    const config = this.loadConfig();
    config.agents = config.agents.filter((a: any) => a.id !== agentId);
    this.saveConfig(config);
  }

  /**
   * Get all MCP servers
   */
  public getMcps(): any[] {
    const config = this.loadConfig();
    return config.mcpServers;
  }

  /**
   * Add or update an MCP server
   */
  public saveMcp(mcp: any): void {
    const config = this.loadConfig();
    const existingIndex = config.mcpServers.findIndex((m: any) => m.name === mcp.name);

    if (existingIndex >= 0) {
      config.mcpServers[existingIndex] = mcp;
    } else {
      config.mcpServers.push(mcp);
    }

    this.saveConfig(config);
  }

  /**
   * Delete an MCP server
   */
  public deleteMcp(mcpName: string): void {
    const config = this.loadConfig();
    config.mcpServers = config.mcpServers.filter((m: any) => m.name !== mcpName);
    this.saveConfig(config);
  }

  /**
   * Get all personas
   */
  public getPersonas(): any[] {
    const config = this.loadConfig();
    return config.personas;
  }

  /**
   * Add or update a persona
   */
  public savePersona(persona: any): void {
    const config = this.loadConfig();
    const existingIndex = config.personas.findIndex((p: any) => p.key === persona.key);

    if (existingIndex >= 0) {
      config.personas[existingIndex] = persona;
    } else {
      config.personas.push(persona);
    }

    this.saveConfig(config);
  }

  /**
   * Delete a persona
   */
  public deletePersona(personaKey: string): void {
    const config = this.loadConfig();
    config.personas = config.personas.filter((p: any) => p.key !== personaKey);
    this.saveConfig(config);
  }
  /**
   * Get all LLM providers
   */
  public getLlmProviders(): any[] {
    const config = this.loadConfig();
    return config.llmProviders || [];
  }

  /**
   * Add or update an LLM provider
   */
  public saveLlmProvider(provider: any): void {
    const config = this.loadConfig();
    if (!config.llmProviders) {
      config.llmProviders = [];
    }

    const existingIndex = config.llmProviders.findIndex((p: any) => p.id === provider.id);

    if (existingIndex >= 0) {
      config.llmProviders[existingIndex] = provider;
    } else {
      config.llmProviders.push(provider);
    }

    this.saveConfig(config);
  }

  /**
   * Delete an LLM provider
   */
  public deleteLlmProvider(providerId: string): void {
    const config = this.loadConfig();
    if (!config.llmProviders) {
      return;
    }

    config.llmProviders = config.llmProviders.filter((p: any) => p.id !== providerId);
    this.saveConfig(config);
  }

  /**
   * Get all messenger providers
   */
  public getMessengerProviders(): any[] {
    const config = this.loadConfig();
    return config.messengerProviders || [];
  }

  /**
   * Add or update a messenger provider
   */
  public saveMessengerProvider(provider: any): void {
    const config = this.loadConfig();
    if (!config.messengerProviders) {
      config.messengerProviders = [];
    }

    const existingIndex = config.messengerProviders.findIndex((p: any) => p.id === provider.id);

    if (existingIndex >= 0) {
      config.messengerProviders[existingIndex] = provider;
    } else {
      config.messengerProviders.push(provider);
    }

    this.saveConfig(config);
  }

  /**
   * Delete a messenger provider
   */
  public deleteMessengerProvider(providerId: string): void {
    const config = this.loadConfig();
    if (!config.messengerProviders) {
      return;
    }

    config.messengerProviders = config.messengerProviders.filter((p: any) => p.id !== providerId);
    this.saveConfig(config);
  }

  /**
   * Get all guards
   * Uses a flag to prevent race conditions during initialization
   */
  public getGuards(): any[] {
    // Wait if initialization is already in progress
    while (this.guardsInitializationInProgress) {
      // Re-read config after initialization completes
      const config = this.loadConfig();
      if (config.guards && config.guards.length > 0) {
        return config.guards;
      }
    }

    const config = this.loadConfig();

    // Initialize default guards if they don't exist or if guards array is missing
    if (!config.guards || config.guards.length === 0) {
      // Set flag to prevent race conditions
      this.guardsInitializationInProgress = true;

      try {
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
          for (const defaultGuard of defaultGuards) {
            const exists = config.guards.find((g: any) => g.id === defaultGuard.id);
            if (!exists) {
              config.guards.push(defaultGuard);
            }
          }
        }

        // Save the defaults back to storage
        this.saveConfig(config);
      } finally {
        this.guardsInitializationInProgress = false;
      }
    }

    return config.guards;
  }

  /**
   * Save a guard
   */
  public saveGuard(guard: any): void {
    const config = this.loadConfig();
    if (!config.guards) {
      config.guards = [];
    }

    const existingIndex = config.guards.findIndex((g: any) => g.id === guard.id);

    if (existingIndex >= 0) {
      config.guards[existingIndex] = guard;
    } else {
      config.guards.push(guard);
    }

    this.saveConfig(config);
  }

  /**
   * Toggle a guard
   */
  public toggleGuard(id: string, enabled: boolean): void {
    const config = this.loadConfig();
    if (!config.guards) {
      return;
    }

    const guard = config.guards.find((g: any) => g.id === id);
    if (guard) {
      guard.enabled = enabled;
      this.saveConfig(config);
    }
  }

  /**
   * Get all tool usage guards
   */
  public getToolUsageGuards(): any[] {
    const config = this.loadConfig();

    // Initialize default tool usage guards if they don't exist
    if (!config.toolUsageGuards) {
      config.toolUsageGuards = [];
      this.saveConfig(config);
    }

    return config.toolUsageGuards;
  }

  /**
   * Save a tool usage guard
   */
  public saveToolUsageGuard(guard: any): void {
    const config = this.loadConfig();
    if (!config.toolUsageGuards) {
      config.toolUsageGuards = [];
    }

    const existingIndex = config.toolUsageGuards.findIndex((g: any) => g.id === guard.id);

    if (existingIndex >= 0) {
      config.toolUsageGuards[existingIndex] = guard;
    } else {
      config.toolUsageGuards.push(guard);
    }

    this.saveConfig(config);
  }

  /**
   * Delete a tool usage guard
   */
  public deleteToolUsageGuard(id: string): void {
    const config = this.loadConfig();
    if (!config.toolUsageGuards) {
      return;
    }

    config.toolUsageGuards = config.toolUsageGuards.filter((g: any) => g.id !== id);
    this.saveConfig(config);
  }

  /**
   * Toggle a tool usage guard active status
   */
  public toggleToolUsageGuard(id: string, isActive: boolean): void {
    const config = this.loadConfig();
    if (!config.toolUsageGuards) {
      return;
    }

    const guard = config.toolUsageGuards.find((g: any) => g.id === id);
    if (guard) {
      guard.isActive = isActive;
      this.saveConfig(config);
    }
  }
}

// Export singleton instance
export const webUIStorage = new WebUIStorage();
export default webUIStorage;
