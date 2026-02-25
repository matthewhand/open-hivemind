export interface IProviderMetadata {
  id: string;
  label: string;
  type: 'message' | 'llm';
  configSchema: any; // Convict schema object
  sensitiveFields: string[]; // List of fields to redact
  documentationUrl?: string;
  helpText?: string;
}

export interface IBotStatus {
  name: string;
  provider: string;
  connected: boolean;
  metadata?: any;
}

export interface IProvider {
  /**
   * Returns metadata about the provider (id, label, schema, etc.)
   */
  getMetadata(): IProviderMetadata;

  /**
   * Returns the general status of the provider (e.g., connection health)
   */
  getStatus(): Promise<any>;

  /**
   * Returns a list of active bots managed by this provider
   */
  getBots(): Promise<IBotStatus[]>;

  /**
   * Adds a new bot instance at runtime
   */
  addBot?(config: any): Promise<void>;

  /**
   * Refreshes the provider configuration/instances (e.g. from file)
   */
  refresh?(): Promise<void>;
}
