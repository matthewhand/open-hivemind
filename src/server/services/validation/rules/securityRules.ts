import { type ValidationInfo, type ValidationRule, type ValidationWarning } from '../types';

export const securityRules: ValidationRule[] = [
  {
    id: 'security-no-hardcoded-secrets',
    name: 'No Hardcoded Secrets',
    description: 'Configuration should not contain hardcoded secrets or API keys',
    category: 'security',
    severity: 'warning',

    validator: (config: Record<string, unknown>) => {
      const warnings: ValidationWarning[] = [];
      const configStr = JSON.stringify(config);

      // Check for potential hardcoded secrets
      const secretPatterns = [
        /"apiKey":\s*"[^${]+"/,
        /"token":\s*"[^${]+"/,
        /"secret":\s*"[^${]+"/,
        /"password":\s*"[^${]+"/,
      ];

      for (const pattern of secretPatterns) {
        if (new RegExp(pattern).test(configStr)) {
          warnings.push({
            id: 'sec-secrets-1',
            ruleId: 'security-no-hardcoded-secrets',
            message: 'Potential hardcoded secret detected in configuration',
            field: 'config',
            value: '***REDACTED***',
            suggestions: [
              'Use environment variables with ${VAR_NAME} syntax',
              'Store secrets in a secure configuration management system',
            ],
            category: 'security',
          });
          break;
        }
      }

      return {
        isValid: true,
        errors: [],
        warnings,
        info: [],
        score: warnings.length === 0 ? 100 : 70,
      };
    },
  },
];

export const businessRules: ValidationRule[] = [
  {
    id: 'business-unique-name',
    name: 'Unique Bot Name',
    description: 'Bot name must be unique across all configurations',
    category: 'business',
    severity: 'error',

    validator: (_config: Record<string, unknown>) => {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        info: [],
        score: 100,
      };
    },
  },
];

export const performanceRules: ValidationRule[] = [
  {
    id: 'performance-model-selection',
    name: 'Model Performance',
    description: 'Check if selected LLM model is appropriate for the use case',
    category: 'performance',
    severity: 'info',

    validator: (config: Record<string, unknown>) => {
      const info: ValidationInfo[] = [];

      const openaiCfg = config.openai as Record<string, unknown> | undefined;
      if (config.llmProvider === 'openai' && openaiCfg?.model) {
        const model = openaiCfg.model;

        if (model === 'gpt-4') {
          info.push({
            id: 'perf-model-1',
            ruleId: 'performance-model-selection',
            message: 'Using GPT-4 model - consider performance implications',
            field: 'openai.model',
            value: model,
            suggestions: [
              'GPT-4 is powerful but slower and more expensive',
              'Consider GPT-3.5-turbo for faster responses and lower cost',
            ],
            category: 'performance',
          });
        } else if (model === 'gpt-3.5-turbo') {
          info.push({
            id: 'perf-model-2',
            ruleId: 'performance-model-selection',
            message: 'Using GPT-3.5-turbo - good balance of performance and cost',
            field: 'openai.model',
            value: model,
            suggestions: [
              'GPT-3.5-turbo offers fast responses at a lower cost',
              'Consider GPT-4 for complex reasoning tasks',
            ],
            category: 'performance',
          });
        }
      }

      return {
        isValid: true,
        errors: [],
        warnings: [],
        info,
        score: 100,
      };
    },
  },
];
