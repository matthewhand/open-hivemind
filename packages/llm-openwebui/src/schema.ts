export interface ProviderField {
  name: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  default?: string;
  options?: string[];
}

export interface ProviderSchema {
  key: string;
  label: string;
  type: 'llm' | 'memory';
  docsUrl?: string;
  fields: {
    required: ProviderField[];
    optional: ProviderField[];
    advanced: ProviderField[];
  };
}

export const schema: ProviderSchema = {
  key: 'openwebui',
  label: 'OpenWebUI',
  type: 'llm',
  docsUrl: 'https://docs.openwebui.com',
  fields: {
    required: [
      {
        name: 'OPEN_WEBUI_API_URL',
        type: 'text',
        label: 'API URL',
        description: 'Base URL of your OpenWebUI instance (e.g. http://localhost:3000/api/)',
        default: 'http://host.docker.internal:3000/api/',
      },
    ],
    optional: [
      {
        name: 'OPEN_WEBUI_USERNAME',
        type: 'text',
        label: 'Username',
        description: 'Username for authentication with OpenWebUI',
      },
      {
        name: 'OPEN_WEBUI_PASSWORD',
        type: 'password',
        label: 'Password',
        description: 'Password for authentication with OpenWebUI',
      },
      {
        name: 'OPEN_WEBUI_MODEL',
        type: 'text',
        label: 'Default Model',
        description: 'Default model to use for completions',
        default: 'llama3.2',
      },
      {
        name: 'OPEN_WEBUI_KNOWLEDGE_FILE',
        type: 'text',
        label: 'Knowledge File Path',
        description: 'Path to a knowledge file to upload to OpenWebUI (optional)',
      },
    ],
    advanced: [],
  },
};
