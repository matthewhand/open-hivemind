import express from 'express';
import request from 'supertest';
import guardsRouter from '../../src/server/routes/guards';
import { webUIStorage } from '../../src/storage/webUIStorage';

// Mock the webUIStorage
jest.mock('../../src/storage/webUIStorage', () => ({
  webUIStorage: {
    getGuards: jest.fn(),
    saveGuard: jest.fn(),
    toggleGuard: jest.fn(),
  },
}));

describe('Guards Route', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/guards', guardsRouter);
    jest.clearAllMocks();
  });

  describe('GET /guards', () => {
    it('should return all guards', async () => {
      const mockGuards = [{ id: 'guard1', name: 'Guard 1' }];
      (webUIStorage.getGuards as jest.Mock).mockReturnValue(mockGuards);

      const response = await request(app).get('/guards');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.guards).toEqual(mockGuards);
      expect(webUIStorage.getGuards).toHaveBeenCalledTimes(1);
    });

    it('should handle errors', async () => {
      (webUIStorage.getGuards as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app).get('/guards');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve guards');
    });
  });

  describe('POST /guards', () => {
    it('should update access control configuration', async () => {
      const accessConfig = { type: 'users', users: ['alice'], ips: [] };
      const mockGuards = [
        { id: 'access-control', config: { type: 'owner' } }
      ];

      (webUIStorage.getGuards as jest.Mock).mockReturnValue(mockGuards);

      const response = await request(app)
        .post('/guards')
        .send(accessConfig);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(webUIStorage.saveGuard).toHaveBeenCalledWith({
        id: 'access-control',
        config: { type: 'users', users: ['alice'], ips: [] }
      });
    });

    it('should return 404 if access-control guard is missing', async () => {
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([]);

      const response = await request(app)
        .post('/guards')
        .send({ type: 'users' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Access control guard not found');
    });

    it('should return 400 for invalid config (array)', async () => {
      // Mock getGuards to ensure that if validation passes, we would get 404
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([]);

      const response = await request(app)
        .post('/guards')
        .send(['invalid']); // Array should be rejected

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid access configuration');
    });
  });

  describe('POST /guards/:id/toggle', () => {
    it('should toggle guard status', async () => {
      const guardId = 'test-guard';
      const mockGuard = { id: guardId, name: 'Test Guard', enabled: false };

      (webUIStorage.getGuards as jest.Mock).mockReturnValue([mockGuard]);

      const response = await request(app)
        .post(`/guards/${guardId}/toggle`)
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(webUIStorage.toggleGuard).toHaveBeenCalledWith(guardId, true);
    });

    it('should return 404 if guard not found', async () => {
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([]);

      const response = await request(app)
        .post('/guards/unknown/toggle')
        .send({ enabled: true });

      expect(response.status).toBe(404);
      expect(webUIStorage.toggleGuard).not.toHaveBeenCalled();
    });

    it('should return 400 if enabled is not boolean', async () => {
      const response = await request(app)
        .post('/guards/test/toggle')
        .send({ enabled: 'true' });

      expect(response.status).toBe(400);
    });
  });
});
