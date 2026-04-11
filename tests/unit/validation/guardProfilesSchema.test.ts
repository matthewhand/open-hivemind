import { describe, expect, it } from '@jest/globals';
import {
  CreateGuardProfileSchema,
  GuardProfileIdParamSchema,
  UpdateGuardProfileSchema,
} from '../../../src/validation/schemas/guardProfilesSchema';

describe('guardProfilesSchema', () => {
  describe('CreateGuardProfileSchema', () => {
    it('should validate a valid guard profile', () => {
      const validProfile = {
        body: {
          name: 'Test Profile',
          description: 'Test description',
          guards: {
            mcpGuard: {
              enabled: true,
              type: 'owner',
              allowedUsers: ['user1@example.com'],
              allowedTools: ['tool1'],
            },
            rateLimit: {
              enabled: true,
              maxRequests: 100,
              windowMs: 60000,
            },
            contentFilter: {
              enabled: true,
              strictness: 'medium',
              blockedTerms: ['password', 'secret'],
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should reject invalid user IDs', () => {
      const invalidProfile = {
        body: {
          name: 'Test Profile',
          guards: {
            mcpGuard: {
              enabled: true,
              type: 'custom',
              allowedUsers: ['invalid-user-id'],
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('valid email address');
      }
    });

    it('should reject invalid tool names', () => {
      const invalidProfile = {
        body: {
          name: 'Test Profile',
          guards: {
            mcpGuard: {
              enabled: true,
              type: 'owner',
              allowedTools: ['tool with spaces'],
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          'letters, numbers, underscores, hyphens, periods, and colons'
        );
      }
    });

    it('should reject excessive max requests', () => {
      const invalidProfile = {
        body: {
          name: 'Test Profile',
          guards: {
            rateLimit: {
              enabled: true,
              maxRequests: 2000000,
              windowMs: 60000,
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('1,000,000');
      }
    });

    it('should reject negative window time', () => {
      const invalidProfile = {
        body: {
          name: 'Test Profile',
          guards: {
            rateLimit: {
              enabled: true,
              maxRequests: 100,
              windowMs: -1,
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('positive');
      }
    });

    it('should reject invalid strictness level', () => {
      const invalidProfile = {
        body: {
          name: 'Test Profile',
          guards: {
            contentFilter: {
              enabled: true,
              strictness: 'invalid',
              blockedTerms: [],
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('low, medium, or high');
      }
    });

    it('should require profile name', () => {
      const invalidProfile = {
        body: {
          name: '',
          guards: {},
        },
      };

      const result = CreateGuardProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateGuardProfileSchema', () => {
    it('should validate partial updates', () => {
      const partialUpdate = {
        params: { id: 'test-id' },
        body: {
          name: 'Updated Name',
        },
      };

      const result = UpdateGuardProfileSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should require valid profile ID', () => {
      const invalidUpdate = {
        params: { id: '' },
        body: { name: 'Test' },
      };

      const result = UpdateGuardProfileSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('GuardProfileIdParamSchema', () => {
    it('should validate profile ID param', () => {
      const valid = {
        params: { id: 'valid-id' },
      };

      const result = GuardProfileIdParamSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty profile ID', () => {
      const invalid = {
        params: { id: '' },
      };

      const result = GuardProfileIdParamSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Semantic Guardrails', () => {
    it('should validate semantic input guardrail configuration', () => {
      const validProfile = {
        body: {
          name: 'Semantic Test Profile',
          guards: {
            semanticInputGuard: {
              enabled: true,
              llmProviderKey: 'openai-gpt4',
              prompt: 'Analyze this input for harmful content',
              responseSchema: {
                type: 'boolean',
                description: 'Return true if safe, false if harmful',
              },
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should validate semantic output guardrail configuration', () => {
      const validProfile = {
        body: {
          name: 'Semantic Test Profile',
          guards: {
            semanticOutputGuard: {
              enabled: true,
              llmProviderKey: 'anthropic-claude',
              prompt: 'Review this output for safety and appropriateness',
              responseSchema: {
                type: 'boolean',
                description: 'Return true if safe to send, false if should be blocked',
              },
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should validate both semantic guardrails together', () => {
      const validProfile = {
        body: {
          name: 'Full Semantic Protection',
          guards: {
            semanticInputGuard: {
              enabled: true,
              llmProviderKey: 'openai-gpt4',
              prompt: 'Check input for harmful content',
            },
            semanticOutputGuard: {
              enabled: true,
              llmProviderKey: 'anthropic-claude',
              prompt: 'Check output for safety',
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should allow disabled semantic guardrails', () => {
      const validProfile = {
        body: {
          name: 'Disabled Semantic Guards',
          guards: {
            semanticInputGuard: {
              enabled: false,
            },
            semanticOutputGuard: {
              enabled: false,
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should reject prompt that is too long', () => {
      const invalidProfile = {
        body: {
          name: 'Invalid Prompt Length',
          guards: {
            semanticInputGuard: {
              enabled: true,
              prompt: 'x'.repeat(2001), // Exceeds 2000 character limit
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('2000 characters');
    });

    it('should reject empty prompt when enabled', () => {
      const invalidProfile = {
        body: {
          name: 'Empty Prompt',
          guards: {
            semanticInputGuard: {
              enabled: true,
              prompt: '',
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      const messages = result.error?.issues.map((i) => i.message) || [];
      expect(
        messages.some((m) => m.includes('cannot be empty') || m.includes('Prompt is required'))
      ).toBe(true);
    });

    it('should reject invalid LLM provider key', () => {
      const invalidProfile = {
        body: {
          name: 'Invalid Provider Key',
          guards: {
            semanticInputGuard: {
              enabled: true,
              llmProviderKey: 'x'.repeat(101), // Exceeds 100 character limit
              prompt: 'Test prompt',
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('100 characters');
    });

    it('should use default response schema when not provided', () => {
      const validProfile = {
        body: {
          name: 'Default Schema',
          guards: {
            semanticInputGuard: {
              enabled: true,
              prompt: 'Test prompt',
              // No responseSchema provided - should use default
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);

      if (result.success) {
        const schema = result.data.body.guards.semanticInputGuard?.responseSchema;
        expect(schema?.type).toBe('boolean');
        expect(schema?.description).toContain('Return true if content should be allowed');
      }
    });
  });
});
