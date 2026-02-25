export interface ProviderMetadata {
  id: string;
  label: string;
  docsUrl?: string;
  helpText?: string;
  configSchema?: any;
  sensitiveFields?: string[];
}

export interface IProvider {
  id: string;
  label: string;
  type: 'message' | 'llm' | 'tool';
  getMetadata(): ProviderMetadata;
  getStatus(): Promise<any>;
  refresh?(): Promise<any>;
}
