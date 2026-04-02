import { describe, expect, it } from '@jest/globals';
import {
  CreateGuardProfileSchema,
  GuardProfileIdParamSchema,
  TestGuardProfileSchema,
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
              allowedUsers: ['user1'],
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
              allowedUsers: ['user@invalid'],
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          'letters, numbers, dashes, and underscores'
        );
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
          'letters, numbers, dashes, and underscores'
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
              maxRequests: 20000,
              windowMs: 60000,
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('10,000');
      }
    });

    it('should reject excessive window time', () => {
      const invalidProfile = {
        body: {
          name: 'Test Profile',
          guards: {
            rateLimit: {
              enabled: true,
              maxRequests: 100,
              windowMs: 5000000,
            },
          },
        },
      };

      const result = CreateGuardProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('1 hour');
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

  describe('TestGuardProfileSchema', () => {
    it('should validate test input', () => {
      const validTest = {
        body: {
          guards: {
            mcpGuard: {
              enabled: true,
              type: 'owner',
            },
          },
          testInput: {
            userId: 'test-user',
            toolName: 'test-tool',
            content: 'test content',
            requestCount: 5,
          },
        },
      };

      const result = TestGuardProfileSchema.safeParse(validTest);
      expect(result.success).toBe(true);
    });

    it('should allow optional test input fields', () => {
      const minimalTest = {
        body: {
          guards: {},
          testInput: {},
        },
      };

      const result = TestGuardProfileSchema.safeParse(minimalTest);
      expect(result.success).toBe(true);
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
});
