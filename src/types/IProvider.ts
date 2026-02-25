export interface IProvider {
  /**
   * Unique identifier for the provider (e.g., 'slack', 'openai')
   */
  id: string;

  /**
   * Human-readable label for the provider (e.g., 'Slack', 'OpenAI')
   */
  label: string;

  /**
   * Type of provider
   */
  type: 'message' | 'llm' | 'other';

  /**
   * Description of the provider
   */
  description?: string;

  /**
   * URL to documentation for configuring this provider
   */
  docsUrl?: string;

  /**
   * Help text for configuring this provider
   */
  helpText?: string;

  /**
   * Get the convict schema for this provider's configuration
   */
  getSchema(): object;

  /**
   * Get a list of sensitive configuration keys (e.g., tokens, secrets) to be redacted
   */
  getSensitiveKeys(): string[];
}

export interface IMessageProvider extends IProvider {
  readonly type: 'message';

  /**
   * Get the current status of bots for this provider
   */
  getStatus(): Promise<any>;

  /**
   * Get a list of active bots
   */
  getBots(): Promise<any[]>;

  /**
   * Add a new bot configuration (runtime only)
   */
  addBot(config: any): Promise<void>;

  /**
   * Create a new bot (persist and add to runtime)
   */
  createBot(config: any): Promise<{ success: boolean; message?: string; error?: string }>;

  /**
   * Reload bots from configuration
   */
  reload(): Promise<any>;
}

export interface ILLMProvider extends IProvider {
  readonly type: 'llm';
}
