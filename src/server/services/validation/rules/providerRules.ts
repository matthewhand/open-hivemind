import { ValidationRule, ValidationError, ValidationWarning } from '../types';

export const providerRules: ValidationRule[] = [
  {
    id: 'openai-api-key',
    name: 'OpenAI API Key',
    description: 'OpenAI API key must be provided when using OpenAI as LLM provider',
    category: 'required',
    severity: 'error',
    validator: (config: Record<string, unknown>) => {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      if (config.llmProvider === 'openai') {
        const openai = config.openai as Record<string, unknown> | undefined;
        if (!openai || !openai.apiKey) {
          errors.push({
            id: 'openai-key-1',
            ruleId: 'openai-api-key',
            message: 'OpenAI API key is required when using OpenAI as LLM provider',
            field: 'openai.apiKey',
            value: openai?.apiKey,
            suggestions: ['Provide your OpenAI API key from the OpenAI dashboard'],
            category: 'required',
          });
        } else if (
          !/^sk-[A-Za-z0-9]+$/.test(String(openai.apiKey)) &&
          !/\${[\w-]+}/.test(String(openai.apiKey))
        ) {
          warnings.push({
            id: 'openai-key-2',
            ruleId: 'openai-api-key',
            message: 'OpenAI API key format appears invalid',
            field: 'openai.apiKey',
            value: '***REDACTED***',
            suggestions: ['Verify your OpenAI API key format: it should start with "sk-"'],
            category: 'required',
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        info: [],
        score: errors.length === 0 ? (warnings.length === 0 ? 100 : 80) : 0,
      };
    },
  },
];
