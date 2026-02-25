export interface IProvider {
  /**
   * Unique identifier for the provider (e.g., 'slack', 'openai').
   */
  id: string;

  /**
   * Human-readable label for the provider (e.g., 'Slack', 'OpenAI').
   */
  label: string;

  /**
   * Description of the provider.
   */
  description?: string;

  /**
   * Documentation URL for the provider.
   */
  docsUrl?: string;

  /**
   * Help text for configuring the provider.
   */
  helpText?: string;

  /**
   * Returns the configuration schema for this provider.
   * This should be a convict schema object or similar.
   */
  getSchema(): Record<string, any>;

  /**
   * Returns a list of sensitive configuration keys that should be redacted.
   */
  getSensitiveKeys(): string[];

  /**
   * Returns the configuration object (e.g. convict instance).
   */
  getConfig(): any;
}

export interface IMessageProvider extends IProvider {
  readonly type: 'message';

  /**
   * Returns the status of the provider/bots.
   */
  getStatus(): Promise<any>;

  /**
   * Returns a list of bots managed by this provider.
   */
  getBots(): Promise<any[]>;

  /**
   * Adds a new bot with the given configuration.
   */
  addBot(config: any): Promise<void>;

  /**
   * Reloads the provider configuration.
   */
  reload?(): Promise<void>;
}

export interface ILLMProvider extends IProvider {
  readonly type: 'llm';
}
