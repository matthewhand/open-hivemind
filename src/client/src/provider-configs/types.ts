// Provider-specific configuration types - separate from core bot types
// This allows for a pluggable architecture where providers can define their own configs

export interface ProviderConfigSchema {
  type: 'message' | 'llm' | 'mcp';
  providerType: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  fields: ProviderConfigField[];
  defaultConfig?: Record<string, any>;
}

export interface ProviderConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'url' | 'json' | 'select' | 'multiselect' | 'boolean' | 'textarea' | 'model-autocomplete' | 'keyvalue' | 'checkbox';
  required: boolean;
  description?: string;
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    maxItems?: number;
    pattern?: string;
    custom?: (value: any) => string | null;
  };
  options?: Array<{ label: string; value: any; description?: string }>;
  defaultValue?: any;
  group?: string;
  // Additional props for custom field types
  component?: React.ComponentType<any>;
  componentProps?: Record<string, any>;
  dependsOn?: string | { field: string; value: any }; // Field dependency
}

export interface ProviderConfigFormProps {
  providerType: string;
  schema: ProviderConfigSchema;
  initialConfig?: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
  onTestConnection?: (config: Record<string, any>) => Promise<boolean>;
  onAvatarLoad?: (config: Record<string, any>) => Promise<string | null>;
}

export interface ProviderConfigModalProps {
  isOpen: boolean;
  providerType: 'message' | 'llm';
  initialProvider?: string;
  initialConfig?: Record<string, any>;
  onClose: () => void;
  onSave: (providerType: string, config: Record<string, any>) => void;
}

// Avatar retrieval service interface
export interface AvatarService {
  loadAvatar(providerType: string, config: Record<string, any>): Promise<string | null>;
  getSupportedProviders(): string[];
}

// Provider schema interface for MCP providers
export interface ProviderSchema {
  type: 'message' | 'llm' | 'mcp';
  providerType: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  fields: ProviderConfigField[];
  defaultConfig?: Record<string, any>;
  examples?: Array<Record<string, any>>;
}