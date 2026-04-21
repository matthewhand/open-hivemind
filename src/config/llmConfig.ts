import convict from 'convict';

convict.addFormat({
  name: 'strict-bool',
  validate: (val) => {
    if (typeof val !== 'boolean') {
      throw new Error('must be a boolean');
    }
  },
  coerce: (val) => {
    if (val === '0' || val === 0 || val === 'false' || val === false) { return false; }
    if (val === '1' || val === 1 || val === 'true' || val === true) { return true; }
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
    doc: 'Default embedding-capable LLM provider/profile id',
    format: String,
    default: '',
    env: 'DEFAULT_EMBEDDING_PROVIDER',
  },
  LLM_PARALLEL_EXECUTION: {
    doc: 'Whether to allow parallel execution of requests',
    format: 'strict-bool',
    default: false,
    env: 'LLM_PARALLEL_EXECUTION',
  },
});

llmConfig.validate({ allowed: 'strict' });

export default llmConfig;
