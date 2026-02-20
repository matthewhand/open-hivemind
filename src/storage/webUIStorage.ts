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
  lastUpdated: string;
}

class WebUIStorage {
  private configDir: string;
  private configFile: string;

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
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading web UI config:', error);
    }

    // Return default configuration
    return {
      agents: [],
      mcpServers: [],
      llmProviders: [],
      messengerProviders: [],
      personas: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Save configuration to file
   */
  public saveConfig(config: WebUIConfig): void {
    try {
      config.lastUpdated = new Date().toISOString();
      this.ensureConfigDir();
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
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
}

// Export singleton instance
export const webUIStorage = new WebUIStorage();
export default webUIStorage;
