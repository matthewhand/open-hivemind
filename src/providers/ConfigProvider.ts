import { IProvider, ProviderMetadata } from '@hivemind/shared-types';
import convict from 'convict';

export class ConfigProvider implements IProvider {
  constructor(
    private id: string,
    private name: string,
    private config: convict.Config<any>,
    private type: ProviderMetadata['type'] = 'config',
    private docsUrl?: string,
    private helpText?: string
  ) {}

  public getMetadata(): ProviderMetadata {
    const schema = this.config.getSchema();
    const sensitiveFields: string[] = [];

    // Auto-detect sensitive fields based on keys in schema or simple heuristics
    const findSensitive = (obj: any, prefix = '') => {
      for (const key in obj) {
        if (
          typeof obj[key] === 'object' &&
          obj[key] !== null &&
          !obj[key].doc &&
          !obj[key].default &&
          !obj[key].format
        ) {
          // likely nested object structure in schema
          findSensitive(obj[key], prefix ? `${prefix}.${key}` : key);
        } else {
          // leaf node (property definition)
          const fullKey = prefix ? `${prefix}.${key}` : key;
          const env = obj[key]?.env || '';
          if (
            /token|key|secret|password/i.test(fullKey) ||
            /token|key|secret|password/i.test(env)
          ) {
            sensitiveFields.push(fullKey);
          }
          if (obj[key]?.sensitive) {
            sensitiveFields.push(fullKey);
          }
        }
      }
    };
    findSensitive(schema);

    return {
      id: this.id,
      name: this.name,
      type: this.type,
      configSchema: schema,
      sensitiveFields,
      docsUrl: this.docsUrl,
      helpText: this.helpText,
    };
  }

  public async getStatus(): Promise<any> {
    return {
      ok: true,
      source: 'config',
      configured: true,
    };
  }

  public getConfig(): any {
    return this.config;
  }

  public async updateConfig(data: any): Promise<void> {
    this.config.load(data);
    this.config.validate({ allowed: 'warn' });
  }
}
