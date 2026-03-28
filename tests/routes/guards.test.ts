import express from 'express';
import request from 'supertest';
import guardsRouter, { validateGuardInput } from '../../src/server/routes/guards';
import { webUIStorage } from '../../src/storage/webUIStorage';

// Mock webUIStorage
jest.mock('../../src/storage/webUIStorage', () => ({
  webUIStorage: {
    getGuards: jest.fn(),
    saveGuard: jest.fn(),
    saveConfig: jest.fn(),
    loadConfig: jest.fn(),
  },
}));

describe('Guards Route', () => {
  let app: express.Application;
  let mockGuards: any[];

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/guards', guardsRouter);
    jest.clearAllMocks();

    // Setup default mock guards
    mockGuards = [
      {
        id: 'access-control',
        name: 'Access Control',
        type: 'access',
        enabled: true,
        config: { type: 'users', users: [], ips: [] },
        lastUpdated: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'rate-limiter',
        name: 'Rate Limiter',
        type: 'rate',
        enabled: true,
        config: { maxRequests: 100, windowMs: 60000 },
      },
      {
        id: 'content-filter',
        name: 'Content Filter',
        type: 'content',
        enabled: false,
        config: {},
      },
    ];
    (webUIStorage.getGuards as jest.Mock).mockReturnValue(mockGuards);
  });

  describe('GET /guards', () => {
    it('should return all guards', async () => {
      const response = await request(app).get('/guards');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.guards).toEqual(mockGuards);
      expect(webUIStorage.getGuards).toHaveBeenCalled();
    });

    it('should handle errors when retrieving guards', async () => {
      (webUIStorage.getGuards as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app).get('/guards');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve guards');
    });

    it('should handle empty guards array', async () => {
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([]);

      const response = await request(app).get('/guards');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.guards).toEqual([]);
    });
  });

  describe('POST /guards', () => {
    it('should update access-control guard config', async () => {
      const newConfig = { type: 'ip', ips: ['127.0.0.1'] };
      const response = await request(app).post('/guards').send(newConfig);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.guard.config.ips).toEqual(['127.0.0.1']);
      expect(webUIStorage.saveGuard).toHaveBeenCalled();
    });

    it('should return 404 if access-control guard not found', async () => {
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([]);

      const response = await request(app).post('/guards').send({});

      expect(response.status).toBe(404);
      expect(webUIStorage.saveGuard).not.toHaveBeenCalled();
    });

    it('should handle validation errors for invalid config', async () => {
      const response = await request(app)
        .post('/guards')
        .send({ config: 'not-an-object' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should validate IP addresses', async () => {
      const response = await request(app)
        .post('/guards')
        .send({ config: { type: 'ip', ips: ['invalid-ip', '256.1.1.1'] } });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.message).toContain('Invalid IP');
    });

    it('should accept valid IPv4 addresses', async () => {
      const newConfig = { config: { type: 'ip', ips: ['192.168.1.1', '10.0.0.1'] } };
      const response = await request(app).post('/guards').send(newConfig);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept valid IPv6 addresses', async () => {
      const newConfig = { config: { type: 'ip', ips: ['::1', 'fe80::1'] } };
      const response = await request(app).post('/guards').send(newConfig);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should validate user IDs', async () => {
      const response = await request(app)
        .post('/guards')
        .send({ config: { type: 'users', users: ['valid-user', '', 123] } });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should accept valid user IDs', async () => {
      const newConfig = { config: { type: 'users', users: ['user1', 'user2', 'admin'] } };
      const response = await request(app).post('/guards').send(newConfig);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should detect concurrent modifications', async () => {
      const newConfig = { lastUpdated: '2023-01-01T00:00:00.000Z', type: 'ip' };
      const response = await request(app).post('/guards').send(newConfig);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Concurrent modification');
    });

    it('should handle empty request body', async () => {
      const response = await request(app).post('/guards').send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle storage errors', async () => {
      (webUIStorage.saveGuard as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const response = await request(app).post('/guards').send({ type: 'users' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to save access control');
    });
  });

  describe('POST /guards/:id/toggle', () => {
    it('should toggle guard status to enabled', async () => {
      const mockGuard = { id: 'test-guard', name: 'Test Guard', enabled: false };
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([mockGuard]);

      const response = await request(app)
        .post('/guards/test-guard/toggle')
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.guard.enabled).toBe(true);
      expect(webUIStorage.saveGuard).toHaveBeenCalled();
    });

    it('should toggle guard status to disabled', async () => {
      const mockGuard = { id: 'test-guard', name: 'Test Guard', enabled: true };
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([mockGuard]);

      const response = await request(app)
        .post('/guards/test-guard/toggle')
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('disabled');
    });

    it('should return 404 if guard not found', async () => {
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([]);

      const response = await request(app)
        .post('/guards/non-existent/toggle')
        .send({ enabled: true });

      expect(response.status).toBe(404);
      expect(webUIStorage.saveGuard).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid enabled value', async () => {
      const response = await request(app)
        .post('/guards/test/toggle')
        .send({ enabled: 'not-a-boolean' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 for missing enabled value', async () => {
      const response = await request(app).post('/guards/test/toggle').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should prevent disabling system-critical guards', async () => {
      const response = await request(app)
        .post('/guards/rate-limiter/toggle')
        .send({ enabled: false });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Permission denied');
      expect(webUIStorage.saveGuard).not.toHaveBeenCalled();
    });

    it('should allow enabling system-critical guards', async () => {
      const response = await request(app)
        .post('/guards/rate-limiter/toggle')
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return early if already in desired state', async () => {
      const mockGuard = { id: 'test-guard', name: 'Test Guard', enabled: true };
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([mockGuard]);

      const response = await request(app)
        .post('/guards/test-guard/toggle')
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('already');
      expect(webUIStorage.saveGuard).not.toHaveBeenCalled();
    });

    it('should validate guard ID parameter', async () => {
      const response = await request(app).post('/guards/ /toggle').send({ enabled: true });

      expect(response.status).toBe(404);
    });

    it('should handle storage errors', async () => {
      const mockGuard = { id: 'test-guard', name: 'Test Guard', enabled: false };
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([mockGuard]);
      (webUIStorage.saveGuard as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const response = await request(app)
        .post('/guards/test-guard/toggle')
        .send({ enabled: true });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to toggle guard');
    });
  });

  describe('DELETE /guards/:id', () => {
    it('should delete a custom guard', async () => {
      const customGuard = { id: 'custom-guard', name: 'Custom Guard', type: 'custom' };
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([customGuard]);

      const response = await request(app).delete('/guards/custom-guard');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
      expect(webUIStorage.saveConfig).toHaveBeenCalled();
    });

    it('should return 404 if guard not found', async () => {
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([]);

      const response = await request(app).delete('/guards/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Guard not found');
    });

    it('should prevent deletion of system guards', async () => {
      const response = await request(app).delete('/guards/access-control');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Permission denied');
      expect(webUIStorage.saveConfig).not.toHaveBeenCalled();
    });

    it('should prevent deletion of rate-limiter guard', async () => {
      const response = await request(app).delete('/guards/rate-limiter');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Permission denied');
    });

    it('should prevent deletion of content-filter guard', async () => {
      const response = await request(app).delete('/guards/content-filter');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Permission denied');
    });

    it('should validate guard ID', async () => {
      const response = await request(app).delete('/guards/ ');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should handle storage errors', async () => {
      const customGuard = { id: 'custom-guard', name: 'Custom Guard' };
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([customGuard]);
      (webUIStorage.saveConfig as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const response = await request(app).delete('/guards/custom-guard');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete guard');
    });
  });

  describe('POST /guards/create', () => {
    it('should create a new custom guard', async () => {
      const newGuard = {
        name: 'My Custom Guard',
        type: 'custom',
        description: 'A custom guard for testing',
      };

      const response = await request(app).post('/guards/create').send(newGuard);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.guard.name).toBe('My Custom Guard');
      expect(response.body.data.guard.id).toBe('my-custom-guard');
      expect(webUIStorage.saveGuard).toHaveBeenCalled();
    });

    it('should require guard name', async () => {
      const response = await request(app)
        .post('/guards/create')
        .send({ type: 'custom' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should require guard type', async () => {
      const response = await request(app)
        .post('/guards/create')
        .send({ name: 'Test Guard' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should validate guard type', async () => {
      const response = await request(app).post('/guards/create').send({
        name: 'Test Guard',
        type: 'invalid-type',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.details[0].msg).toContain('Guard type must be one of');
    });

    it('should validate guard name format', async () => {
      const response = await request(app).post('/guards/create').send({
        name: 'Test@Guard!',
        type: 'custom',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should prevent duplicate guard IDs', async () => {
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([
        { id: 'existing-guard', name: 'Existing Guard' },
      ]);

      const response = await request(app).post('/guards/create').send({
        name: 'Existing Guard',
        type: 'custom',
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Conflict');
    });

    it('should validate description length', async () => {
      const response = await request(app)
        .post('/guards/create')
        .send({
          name: 'Test Guard',
          type: 'custom',
          description: 'a'.repeat(501),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should accept optional config', async () => {
      const newGuard = {
        name: 'Config Guard',
        type: 'custom',
        config: { customKey: 'customValue' },
      };

      const response = await request(app).post('/guards/create').send(newGuard);

      expect(response.status).toBe(201);
      expect(response.body.data.guard.config).toEqual({ customKey: 'customValue' });
    });

    it('should handle storage errors', async () => {
      (webUIStorage.saveGuard as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const response = await request(app).post('/guards/create').send({
        name: 'Test Guard',
        type: 'custom',
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create guard');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/guards/test-guard/toggle')
        .send();

      expect(response.status).toBe(400);
    });

    it('should handle guards with special characters in name', async () => {
      const response = await request(app).post('/guards/create').send({
        name: 'Guard-With_Underscores 123',
        type: 'custom',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.guard.id).toBe('guard-with_underscores-123');
    });

    it('should handle concurrent access simulation', async () => {
      const newConfig = { type: 'ip', ips: ['192.168.1.1'] };

      // First request
      const response1 = await request(app).post('/guards').send(newConfig);
      expect(response1.status).toBe(200);

      // Second request with stale timestamp should be rejected
      const staleConfig = { ...newConfig, lastUpdated: '2020-01-01T00:00:00.000Z' };
      const response2 = await request(app).post('/guards').send(staleConfig);
      expect(response2.status).toBe(409);
    });

    it('should handle very long guard names', async () => {
      const response = await request(app).post('/guards/create').send({
        name: 'a'.repeat(101),
        type: 'custom',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should handle empty strings in arrays', async () => {
      const response = await request(app).post('/guards').send({
        config: { type: 'users', users: ['user1', '', 'user2'] },
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/guards')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('Input Sanitization', () => {
    it('should trim whitespace from guard names', async () => {
      const response = await request(app).post('/guards/create').send({
        name: '  My Guard  ',
        type: 'custom',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.guard.name).toBe('My Guard');
    });

    it('should handle nested config objects', async () => {
      const response = await request(app).post('/guards').send({
        config: {
          nested: {
            deep: {
              value: 'test',
            },
          },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

describe('Guard Validation Middleware', () => {
  it('should export validation middleware array', () => {
    expect(Array.isArray(validateGuardInput)).toBe(true);
    expect(validateGuardInput.length).toBeGreaterThan(0);
  });
});