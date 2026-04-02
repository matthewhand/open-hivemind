import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express, { type Express } from 'express';
import guardProfilesRouter from '../../src/server/routes/guardProfiles';

describe('Guard Profiles Test Endpoint', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin/guard-profiles', guardProfilesRouter);
  });

  describe('POST /test', () => {
    it('should allow access when access control is disabled', async () => {
      const response = await request(app)
        .post('/api/admin/guard-profiles/test')
        .send({
          guards: {
            mcpGuard: {
              enabled: false,
              type: 'owner',
            },
          },
          testInput: {
            userId: 'test-user',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallResult).toBe('allowed');
      expect(response.body.data.results).toHaveLength(1);
      expect(response.body.data.results[0].guard).toBe('Access Control');
      expect(response.body.data.results[0].enabled).toBe(false);
    });

    it('should block non-owner when owner-only access control is enabled', async () => {
      const response = await request(app)
        .post('/api/admin/guard-profiles/test')
        .send({
          guards: {
            mcpGuard: {
              enabled: true,
              type: 'owner',
            },
          },
          testInput: {
            userId: 'test-user',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallResult).toBe('blocked');
      expect(response.body.data.results[0].result).toBe('blocked');
      expect(response.body.data.results[0].reason).toContain('Only the owner');
    });

    it('should allow owner when owner-only access control is enabled', async () => {
      const response = await request(app)
        .post('/api/admin/guard-profiles/test')
        .send({
          guards: {
            mcpGuard: {
              enabled: true,
              type: 'owner',
            },
          },
          testInput: {
            userId: 'owner',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallResult).toBe('allowed');
      expect(response.body.data.results[0].result).toBe('allowed');
    });

    it('should block users not in allowed list', async () => {
      const response = await request(app)
        .post('/api/admin/guard-profiles/test')
        .send({
          guards: {
            mcpGuard: {
              enabled: true,
              type: 'custom',
              allowedUsers: ['user1', 'user2'],
            },
          },
          testInput: {
            userId: 'user3',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallResult).toBe('blocked');
      expect(response.body.data.results[0].reason).toContain('not in the allowed users list');
    });

    it('should block tools not in allowed list', async () => {
      const response = await request(app)
        .post('/api/admin/guard-profiles/test')
        .send({
          guards: {
            mcpGuard: {
              enabled: true,
              type: 'custom',
              allowedTools: ['tool1', 'tool2'],
            },
          },
          testInput: {
            userId: 'user1',
            toolName: 'tool3',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallResult).toBe('blocked');
      expect(response.body.data.results[0].reason).toContain('not in the allowed tools list');
    });

    it('should allow when rate limit is not exceeded', async () => {
      const response = await request(app)
        .post('/api/admin/guard-profiles/test')
        .send({
          guards: {
            rateLimit: {
              enabled: true,
              maxRequests: 100,
              windowMs: 60000,
            },
          },
          testInput: {
            requestCount: 50,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.results[0].result).toBe('allowed');
      expect(response.body.data.results[0].reason).toContain('Within rate limit');
    });

    it('should block when rate limit is exceeded', async () => {
      const response = await request(app)
        .post('/api/admin/guard-profiles/test')
        .send({
          guards: {
            rateLimit: {
              enabled: true,
              maxRequests: 100,
              windowMs: 60000,
            },
          },
          testInput: {
            requestCount: 150,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallResult).toBe('blocked');
      expect(response.body.data.results[0].result).toBe('blocked');
      expect(response.body.data.results[0].reason).toContain('Rate limit exceeded');
    });

    it('should block content with blocked terms', async () => {
      const response = await request(app)
        .post('/api/admin/guard-profiles/test')
        .send({
          guards: {
            contentFilter: {
              enabled: true,
              strictness: 'high',
              blockedTerms: ['password', 'secret', 'token'],
            },
          },
          testInput: {
            content: 'Here is my password: 12345',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallResult).toBe('blocked');
      expect(response.body.data.results[0].result).toBe('blocked');
      expect(response.body.data.results[0].reason).toContain('Found blocked terms: password');
    });

    it('should allow content without blocked terms', async () => {
      const response = await request(app)
        .post('/api/admin/guard-profiles/test')
        .send({
          guards: {
            contentFilter: {
              enabled: true,
              strictness: 'medium',
              blockedTerms: ['password', 'secret'],
            },
          },
          testInput: {
            content: 'This is safe content',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.results[0].result).toBe('allowed');
      expect(response.body.data.results[0].reason).toContain('No blocked terms found');
    });

    it('should test multiple guards together', async () => {
      const response = await request(app)
        .post('/api/admin/guard-profiles/test')
        .send({
          guards: {
            mcpGuard: {
              enabled: true,
              type: 'custom',
              allowedUsers: ['user1'],
            },
            rateLimit: {
              enabled: true,
              maxRequests: 100,
              windowMs: 60000,
            },
            contentFilter: {
              enabled: true,
              strictness: 'low',
              blockedTerms: ['bad'],
            },
          },
          testInput: {
            userId: 'user1',
            requestCount: 50,
            content: 'Good content',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toHaveLength(3);
      expect(response.body.data.overallResult).toBe('allowed');
    });

    it('should block when any guard fails', async () => {
      const response = await request(app)
        .post('/api/admin/guard-profiles/test')
        .send({
          guards: {
            mcpGuard: {
              enabled: true,
              type: 'custom',
              allowedUsers: ['user1'],
            },
            rateLimit: {
              enabled: true,
              maxRequests: 100,
              windowMs: 60000,
            },
          },
          testInput: {
            userId: 'user2',
            requestCount: 50,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallResult).toBe('blocked');
    });

    it('should handle case-insensitive content filtering', async () => {
      const response = await request(app)
        .post('/api/admin/guard-profiles/test')
        .send({
          guards: {
            contentFilter: {
              enabled: true,
              strictness: 'high',
              blockedTerms: ['PASSWORD'],
            },
          },
          testInput: {
            content: 'My password is secret',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallResult).toBe('blocked');
    });
  });
});
