export type ConfigLevel = 'basic' | 'advanced' | 'experimental';

export interface ConfigKeyMeta {
  key: string;
  group: string;
  level: ConfigLevel;
  doc?: string;
  env?: string;
  format?: string;
  default?: unknown;
  sensitive?: boolean;
  deprecated?: { since: string; replacement?: string };
  examples?: string[];
  links?: string[];
}

export interface ConfigModuleMeta {
  module: string; // e.g. 'messageConfig'
  keys: ConfigKeyMeta[];
}

