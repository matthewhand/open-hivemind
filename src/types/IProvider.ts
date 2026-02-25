export interface IProvider {
  id: string; // e.g. 'slack', 'openai'
  label: string; // e.g. 'Slack', 'OpenAI'
  description?: string;
  type: 'messenger' | 'llm' | 'tool' | 'other';
  docsUrl?: string;
  helpText?: string;

  /**
   * Returns the convict schema object for this provider's configuration.
   */
  getSchema(): any;

  /**
   * Returns the underlying configuration instance (e.g. Convict instance) if available.
   * Used for synchronizing global updates.
   */
  getConfigInstance?(): any;

  /**
   * Returns a list of sensitive configuration keys (e.g. 'SLACK_BOT_TOKEN') that should be redacted.
   */
  getSensitiveKeys(): string[];
}

export interface IMessageProvider extends IProvider {
  type: 'messenger';

  /**
   * Returns the current status of the provider (e.g. connected, number of bots).
   */
  getStatus(): Promise<any>;

  /**
   * Returns a list of active bots.
   */
  getBots(): Promise<any[]>;

  /**
   * Adds a new bot configuration.
   * @param config The bot configuration object.
   */
  addBot(config: any): Promise<void>;

  /**
   * Reloads the provider configuration and bots.
   */
  reload(): Promise<any>;
}

export interface ILLMProvider extends IProvider {
  type: 'llm';
  // Additional LLM-specific methods can be added here
}

export interface IToolInstaller extends IProvider {
  type: 'tool';

  checkPrerequisites(): Promise<boolean>;
  checkInstalled(): Promise<boolean>;
  install(): Promise<{ success: boolean; message: string }>;
  start(config?: any): Promise<{ success: boolean; message: string }>;
  getWebUIUrl?(): string;
}
