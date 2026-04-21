import { type ValidationError, type ValidationRule } from '../types';

export const basicRules: ValidationRule[] = [
  {
    id: 'required-name',
    name: 'Bot Name Required',
    description: 'Bot configuration must have a name',
    category: 'required',
    severity: 'error',
    validator: (config: Record<string, unknown>) => {
      const errors: ValidationError[] = [];
      if (!config.name || String(config.name).trim() === '') {
        errors.push({
          id: 'req-name-1',
          ruleId: 'required-name',
          message: 'Bot name is required',
          field: 'name',
          value: config.name,
          suggestions: ['Provide a unique name for your bot configuration'],
          category: 'required',
        });
      }
      return {
        isValid: errors.length === 0,
        errors,
        warnings: [],
        info: [],
        score: errors.length === 0 ? 100 : 0,
      };
    },
  },
  {
    id: 'required-provider',
    name: 'Message Provider Required',
    description: 'Bot must have a message provider configured',
    category: 'required',
    severity: 'error',
    validator: (config: Record<string, unknown>) => {
      const errors: ValidationError[] = [];
      if (!config.messageProvider) {
        errors.push({
          id: 'req-prov-1',
          ruleId: 'required-provider',
          message: 'Message provider is required',
          field: 'messageProvider',
          value: config.messageProvider,
          suggestions: ['Select a platform like Discord, Slack, or Telegram'],
          category: 'required',
        });
      }
      return {
        isValid: errors.length === 0,
        errors,
        warnings: [],
        info: [],
        score: errors.length === 0 ? 100 : 0,
      };
    },
  },
  {
    id: 'required-llm',
    name: 'LLM Provider Required',
    description: 'Bot must have an LLM provider configured',
    category: 'required',
    severity: 'error',
    validator: (config: Record<string, unknown>) => {
      const errors: ValidationError[] = [];
      if (!config.llmProvider) {
        errors.push({
          id: 'req-llm-1',
          ruleId: 'required-llm',
          message: 'LLM provider is required',
          field: 'llmProvider',
          value: config.llmProvider,
          suggestions: ['Select an LLM engine like OpenAI, Flowise, or OpenWebUI'],
          category: 'required',
        });
      }
      return {
        isValid: errors.length === 0,
        errors,
        warnings: [],
        info: [],
        score: errors.length === 0 ? 100 : 0,
      };
    },
  },
];
