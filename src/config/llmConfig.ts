import convict from 'convict';

const llmConfig = convict({
  LLM_PROVIDER: {
    doc: 'LLM provider (e.g., openai, flowise, openwebui)',
    format: String,
    default: 'openai',
    env: 'LLM_PROVIDER'
  },
  LLM_PARALLEL_EXECUTION: {
    doc: 'Whether to allow parallel execution of requests',
    format: Boolean,
    default: false,
    env: 'LLM_PARALLEL_EXECUTION'
  }
});

llmConfig.validate({ allowed: 'strict' });

export default llmConfig;
