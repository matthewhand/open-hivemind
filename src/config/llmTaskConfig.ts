import convict from 'convict';

// Task-specific LLM routing overrides (provider + model).
// These are optional and default to "" (meaning: use existing routing behavior).
//
// Provider reference values can be:
// - Provider instance id (recommended): e.g. "openai-default"
// - Provider instance name: e.g. "Default OpenAI"
// - Provider type: e.g. "openai" (uses the first enabled provider of that type)
//
// Model overrides are passed via metadata to providers that support them (e.g. OpenAI).
const llmTaskConfig = convict({
  LLM_TASK_SEMANTIC_PROVIDER: {
    doc: 'Override provider for semantic relevance checks (id | name | type)',
    format: String,
    default: '',
    env: 'LLM_TASK_SEMANTIC_PROVIDER',
  },
  LLM_TASK_SEMANTIC_MODEL: {
    doc: 'Override model for semantic relevance checks (provider-specific)',
    format: String,
    default: '',
    env: 'LLM_TASK_SEMANTIC_MODEL',
  },
  LLM_TASK_SUMMARY_PROVIDER: {
    doc: 'Override provider for summarization tasks (id | name | type)',
    format: String,
    default: '',
    env: 'LLM_TASK_SUMMARY_PROVIDER',
  },
  LLM_TASK_SUMMARY_MODEL: {
    doc: 'Override model for summarization tasks (provider-specific)',
    format: String,
    default: '',
    env: 'LLM_TASK_SUMMARY_MODEL',
  },
  LLM_TASK_FOLLOWUP_PROVIDER: {
    doc: 'Override provider for follow-up generation tasks (id | name | type)',
    format: String,
    default: '',
    env: 'LLM_TASK_FOLLOWUP_PROVIDER',
  },
  LLM_TASK_FOLLOWUP_MODEL: {
    doc: 'Override model for follow-up generation tasks (provider-specific)',
    format: String,
    default: '',
    env: 'LLM_TASK_FOLLOWUP_MODEL',
  },
  LLM_TASK_IDLE_PROVIDER: {
    doc: 'Override provider for idle-response generation tasks (id | name | type)',
    format: String,
    default: '',
    env: 'LLM_TASK_IDLE_PROVIDER',
  },
  LLM_TASK_IDLE_MODEL: {
    doc: 'Override model for idle-response generation tasks (provider-specific)',
    format: String,
    default: '',
    env: 'LLM_TASK_IDLE_MODEL',
  },
});

llmTaskConfig.validate({ allowed: 'strict' });

export default llmTaskConfig;

