export interface IProvider {
  id: string; // 'slack', 'discord'
  label: string; // 'Slack', 'Discord'
  type: 'message' | 'llm' | string;
  description?: string;
  docsUrl?: string; // For Admin UI
  helpText?: string; // For Admin UI

  // Config / Metadata
  getSchema(): object; // Convict schema
  getSensitiveKeys(): string[];
}

export interface IMessageProvider extends IProvider {
  type: 'message';

  // Runtime Status
  getStatus(): Promise<any>;
  getBots(): Promise<any[]>;
  addBot(config: any): Promise<void>;
  reload(): Promise<any>;
}

export interface ILLMProvider extends IProvider {
  type: 'llm';
}
