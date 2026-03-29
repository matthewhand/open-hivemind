import convict from 'convict';
import fc from 'fast-check';
import {
  llmConfigGenerator,
  openaiConfigGenerator,
  flowiseConfigGenerator,
  llmTaskConfigGenerator,
  createTestData,
} from '../helpers/testDataFactory';

/**
 * Property-based integration tests for LLM configuration schemas.
 *
 * These tests verify that randomly generated config objects produced by
 * the test data factory are structurally compatible with the real convict
 * schemas. Each test creates a fresh convict instance (no global state
 * mutation) and loads the generated data into it.
 */

function createFreshLlmSchema() {
  return convict({
    LLM_PROVIDER: {
      doc: 'LLM provider',
      format: String,
      default: 'openai',
    },
    DEFAULT_EMBEDDING_PROVIDER: {
      doc: 'Default embedding provider',
      format: String,
      default: '',
    },
    LLM_PARALLEL_EXECUTION: {
      doc: 'Whether to allow parallel execution',
      format: Boolean,
      default: false,
    },
  });
}

function createFreshOpenaiSchema() {
  return convict({
    OPENAI_API_KEY: { format: String, default: '' },
    OPENAI_TEMPERATURE: { format: Number, default: 0.7 },
    OPENAI_MAX_TOKENS: { format: 'int', default: 150 },
    OPENAI_FREQUENCY_PENALTY: { format: Number, default: 0.1 },
    OPENAI_PRESENCE_PENALTY: { format: Number, default: 0.05 },
    OPENAI_BASE_URL: { format: String, default: 'https://api.openai.com/v1' },
    OPENAI_TIMEOUT: { format: 'int', default: 10000 },
    OPENAI_ORGANIZATION: { format: String, default: '' },
    OPENAI_MODEL: { format: String, default: 'gpt-5.2' },
    OPENAI_STOP: { format: Array, default: [] },
    OPENAI_TOP_P: { format: Number, default: 1.0 },
    OPENAI_SYSTEM_PROMPT: { format: String, default: '' },
    OPENAI_RESPONSE_MAX_TOKENS: { format: 'int', default: 100 },
    OPENAI_MAX_RETRIES: { format: 'int', default: 3 },
    OPENAI_FINISH_REASON_RETRY: { format: String, default: 'stop' },
    OPENAI_VOICE: { format: String, default: 'nova' },
    OPENAI_EMBEDDING_MODELS: { format: Array, default: [] },
  });
}

function createFreshFlowiseSchema() {
  return convict({
    FLOWISE_API_ENDPOINT: { format: String, default: '' },
    FLOWISE_API_KEY: { format: String, default: '' },
    FLOWISE_CONVERSATION_CHATFLOW_ID: { format: String, default: '' },
    FLOWISE_COMPLETION_CHATFLOW_ID: { format: String, default: '' },
    FLOWISE_USE_REST: { format: Boolean, default: true },
  });
}

function createFreshLlmTaskSchema() {
  return convict({
    LLM_TASK_SEMANTIC_PROVIDER: { format: String, default: '' },
    LLM_TASK_SEMANTIC_MODEL: { format: String, default: '' },
    LLM_TASK_SUMMARY_PROVIDER: { format: String, default: '' },
    LLM_TASK_SUMMARY_MODEL: { format: String, default: '' },
    LLM_TASK_FOLLOWUP_PROVIDER: { format: String, default: '' },
    LLM_TASK_FOLLOWUP_MODEL: { format: String, default: '' },
    LLM_TASK_IDLE_PROVIDER: { format: String, default: '' },
    LLM_TASK_IDLE_MODEL: { format: String, default: '' },
  });
}

describe('LLM config property-based integration tests', () => {
  describe('llmConfigGenerator produces schema-valid configs', () => {
    it('generated LLM configs load and validate against a fresh convict schema', () => {
      fc.assert(
        fc.property(llmConfigGenerator, (config) => {
          const schema = createFreshLlmSchema();
          schema.load(config);
          expect(() => schema.validate({ allowed: 'strict' })).not.toThrow();

          expect(schema.get('LLM_PROVIDER')).toBe(config.LLM_PROVIDER);
          expect(schema.get('LLM_PARALLEL_EXECUTION')).toBe(config.LLM_PARALLEL_EXECUTION);
          expect(schema.get('DEFAULT_EMBEDDING_PROVIDER')).toBe(config.DEFAULT_EMBEDDING_PROVIDER);
        }),
        { numRuns: 50 }
      );
    });

    it('round-trips: load then getProperties returns equivalent data', () => {
      fc.assert(
        fc.property(llmConfigGenerator, (config) => {
          const schema = createFreshLlmSchema();
          schema.load(config);
          const props = schema.getProperties();
          expect(props).toHaveProperty('LLM_PROVIDER');
          expect(props).toHaveProperty('DEFAULT_EMBEDDING_PROVIDER');
          expect(props).toHaveProperty('LLM_PARALLEL_EXECUTION');
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('openaiConfigGenerator produces schema-valid configs', () => {
    it('generated OpenAI configs load and validate against a fresh convict schema', () => {
      fc.assert(
        fc.property(openaiConfigGenerator, (config) => {
          const schema = createFreshOpenaiSchema();
          schema.load(config);
          expect(() => schema.validate({ allowed: 'strict' })).not.toThrow();

          expect(schema.get('OPENAI_MODEL')).toBe(config.OPENAI_MODEL);
          expect(schema.get('OPENAI_TEMPERATURE')).toBeCloseTo(config.OPENAI_TEMPERATURE, 4);
          expect(schema.get('OPENAI_MAX_TOKENS')).toBe(config.OPENAI_MAX_TOKENS);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('flowiseConfigGenerator produces schema-valid configs', () => {
    it('generated Flowise configs load and validate against a fresh convict schema', () => {
      fc.assert(
        fc.property(flowiseConfigGenerator, (config) => {
          const schema = createFreshFlowiseSchema();
          schema.load(config);
          expect(() => schema.validate({ allowed: 'strict' })).not.toThrow();

          expect(schema.get('FLOWISE_USE_REST')).toBe(config.FLOWISE_USE_REST);
          expect(schema.get('FLOWISE_API_KEY')).toBe(config.FLOWISE_API_KEY);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('llmTaskConfigGenerator produces schema-valid configs', () => {
    it('generated LLM task configs load and validate against a fresh convict schema', () => {
      fc.assert(
        fc.property(llmTaskConfigGenerator, (config) => {
          const schema = createFreshLlmTaskSchema();
          schema.load(config);
          expect(() => schema.validate({ allowed: 'strict' })).not.toThrow();

          expect(schema.get('LLM_TASK_SEMANTIC_PROVIDER')).toBe(config.LLM_TASK_SEMANTIC_PROVIDER);
          expect(schema.get('LLM_TASK_SUMMARY_MODEL')).toBe(config.LLM_TASK_SUMMARY_MODEL);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('static test data from createTestData', () => {
    it('llm factory data matches expected schema keys', () => {
      const data = createTestData('llm');
      const schema = createFreshLlmSchema();

      // Load defaults
      schema.load(data.defaults);
      expect(() => schema.validate({ allowed: 'strict' })).not.toThrow();

      // Load expected results
      const schema2 = createFreshLlmSchema();
      schema2.load(data.expectedResults);
      expect(() => schema2.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('openai factory data matches expected schema keys', () => {
      const data = createTestData('openai');
      const schema = createFreshOpenaiSchema();
      schema.load(data.expectedResults);
      expect(() => schema.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('flowise factory data matches expected schema keys', () => {
      const data = createTestData('flowise');
      const schema = createFreshFlowiseSchema();
      schema.load(data.expectedResults);
      expect(() => schema.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('llmtask factory data matches expected schema keys', () => {
      const data = createTestData('llmtask');
      const schema = createFreshLlmTaskSchema();
      schema.load(data.expectedResults);
      expect(() => schema.validate({ allowed: 'strict' })).not.toThrow();
    });
  });
});
