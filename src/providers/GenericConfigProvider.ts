import { IProvider } from '../types/IProvider';

export class GenericConfigProvider implements IProvider {
  id: string;
  label: string;
  type: 'llm' | 'other' | 'messenger' | 'tool';
  docsUrl?: string;
  helpText?: string;
  private configSchema: any;

  constructor(id: string, label: string, configSchema: any, type: 'llm' | 'other' | 'messenger' | 'tool' = 'llm', docsUrl?: string, helpText?: string) {
    this.id = id;
    this.label = label;
    this.configSchema = configSchema;
    this.type = type;
    this.docsUrl = docsUrl;
    this.helpText = helpText;
  }

  getSchema() {
    return this.configSchema.getSchema ? this.configSchema.getSchema() : {};
  }

  getConfigInstance() {
    return this.configSchema;
  }

  getSensitiveKeys() {
    const schema = this.getSchema();
    const keys: string[] = [];

    // Check top level
    for (const key in schema) {
      if (this.isSensitive(key)) keys.push(key);
    }

    // Check nested 'properties' if it's a JSON schema structure
    if (schema.properties) {
        for (const key in schema.properties) {
             if (this.isSensitive(key)) keys.push(key);
        }
    }

    return keys;
  }

  private isSensitive(key: string): boolean {
    const k = key.toUpperCase();
    return k.includes('KEY') || k.includes('TOKEN') || k.includes('SECRET') || k.includes('PASSWORD');
  }
}
