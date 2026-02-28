import { Config } from 'convict';

export interface IProvider<TConfig = any> {
  /**
   * Unique identifier for the provider (e.g., 'slack', 'discord', 'openai').
   */
  id: string;

  /**
   * Display label for the provider (e.g., 'Slack', 'Discord', 'OpenAI').
   */
  label: string;

  /**
   * Type of provider.
   */
  type: 'messenger' | 'llm';

  /**
   * Returns the Convict schema object for this provider's configuration.
   */
  getSchema(): any;

  /**
   * Returns the Convict configuration instance.
   */
  getConfig(): Config<TConfig>;

  /**
   * Returns a list of sensitive configuration keys (e.g., tokens, secrets) that should be redacted.
   */
  getSensitiveKeys(): string[];

  /**
   * Documentation URL for the provider.
   */
  docsUrl?: string;

  /**
   * Help text for configuring the provider.
   */
  helpText?: string;
}

export interface IMessageProvider<TConfig = any> extends IProvider<TConfig> {
  type: 'messenger';

  /**
   * Returns the status of the provider (e.g., connected bots).
   */
  getStatus(): Promise<any>;

  /**
   * Returns a list of configured bot names.
   */
  getBotNames(): string[];

  /**
   * Returns detailed bot information.
   */
  getBots(): Promise<any[]>;

  /**
   * Adds a new bot configuration.
   */
  addBot(config: any): Promise<void>;

  /**
   * Reloads the provider configuration.
   */
  reload?(): Promise<any>;
}

export interface ILLMProvider<TConfig = any> extends IProvider<TConfig> {
  type: 'llm';
}
