export interface ProviderMetadata {
  id: string; // 'slack', 'discord'
  name: string; // 'Slack', 'Discord'
  type: 'messenger' | 'llm' | 'tool' | 'config' | 'other';
  docsUrl?: string;
  helpText?: string;
  configSchema?: any; // Convict schema object or JSON schema
  sensitiveFields?: string[]; // Regex or list of keys to redact
}

export interface IProvider {
  /**
   * Returns metadata about the provider (id, name, type, schema, etc.)
   */
  getMetadata(): ProviderMetadata;

  /**
   * Returns the current status of the provider (e.g. connected bots, health)
   */
  getStatus(): Promise<any>;

  /**
   * Refreshes the provider configuration/status (e.g. reloads from file)
   */
  refresh?(): Promise<void>;

  /**
   * Returns the configuration object/instance (e.g. convict instance)
   */
  getConfig?(): any;

  /**
   * Updates the configuration with new values
   */
  updateConfig?(data: any): Promise<void>;
}
