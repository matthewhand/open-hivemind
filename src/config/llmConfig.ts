import convict from 'convict';

// Add custom format for boolean coercion from strings
convict.addFormat({
  name: 'boolean-string',
  validate: () => {},
  coerce: (val: any) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const s = val.toLowerCase().trim();
      return s === 'true' || s === '1' || s === 'yes' || s === 'on';
    }
    return !!val;
  }
});

const llmConfig = convict({
  LLM_PROVIDER: {
    doc: 'LLM provider (e.g., openai, flowise, openwebui)',
    format: String,
    default: 'openai',
    env: 'LLM_PROVIDER',
  },
  DEFAULT_EMBEDDING_PROVIDER: {
    doc: 'Default LLM provider for embeddings',
    format: String,
    default: '',
    env: 'DEFAULT_EMBEDDING_PROVIDER',
  },
  LLM_PARALLEL_EXECUTION: {
    doc: 'Whether to allow parallel execution of requests',
    format: 'boolean-string',
    default: false,
    env: 'LLM_PARALLEL_EXECUTION',
  },
});

llmConfig.validate({ allowed: 'strict' });

export default llmConfig;
