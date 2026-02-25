/**
 * Interface for provider metadata.
 * Describes the capabilities and configuration requirements of a provider.
 */
export interface ProviderMetadata {
  id: string; // e.g. 'slack', 'discord', 'openai'
  name: string; // Display name e.g. 'Slack'
  type: 'messenger' | 'llm' | 'tool' | 'other';
  docsUrl?: string;
  helpText?: string;
  /**
   * Configuration schema (Convict or JSON Schema object)
   */
  configSchema?: Record<string, any>;
  /**
   * Sensitive fields to redact (e.g. 'token', 'secret', regex patterns)
   */
  sensitiveFields?: (string | RegExp)[];
}

/**
 * Interface for a generic provider integration.
 * Allows the core system to interact with providers in a uniform way.
 */
export interface IProvider {
  /**
   * Returns metadata about the provider.
   */
  getMetadata(): ProviderMetadata;

  /**
   * Returns current status of the provider (e.g. connected bots, health).
   */
  getStatus(): Promise<any>;

  /**
   * Optional: Reload configuration or reconnect.
   */
  refresh?(): Promise<void>;

  /**
   * Optional: Runtime add a new bot/instance.
   */
  addBot?(config: any): Promise<void>;
}
