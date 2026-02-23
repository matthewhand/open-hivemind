import express from 'express';
import request from 'supertest';
import guardsRouter from '../../src/server/routes/guards';
import { webUIStorage } from '../../src/storage/webUIStorage';

// Mock webUIStorage
jest.mock('../../src/storage/webUIStorage', () => ({
  webUIStorage: {
    getGuards: jest.fn(),
    saveGuard: jest.fn(),
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
      const mockGuards = [{ id: 'test', name: 'Test Guard' }];
      (webUIStorage.getGuards as jest.Mock).mockReturnValue(mockGuards);

      const response = await request(app).get('/guards');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.guards).toEqual(mockGuards);
      expect(webUIStorage.getGuards).toHaveBeenCalled();
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
    it('should update access-control guard config', async () => {
      const mockGuards = [
        { id: 'access-control', config: { type: 'users', users: [] } },
        { id: 'other', config: {} },
      ];
      (webUIStorage.getGuards as jest.Mock).mockReturnValue(mockGuards);

      const newConfig = { type: 'ip', ips: ['127.0.0.1'] };
      const response = await request(app).post('/guards').send(newConfig);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(webUIStorage.saveGuard).toHaveBeenCalledWith({
        id: 'access-control',
        config: { type: 'ip', users: [], ips: ['127.0.0.1'] },
      });
    });

    it('should return 404 if access-control guard not found', async () => {
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([]);

      const response = await request(app).post('/guards').send({});

      expect(response.status).toBe(404);
      expect(webUIStorage.saveGuard).not.toHaveBeenCalled();
    });
  });

  describe('POST /guards/:id/toggle', () => {
    it('should toggle guard status', async () => {
      const mockGuard = { id: 'test-guard', enabled: false };
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([mockGuard]);

      const response = await request(app).post('/guards/test-guard/toggle').send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(webUIStorage.saveGuard).toHaveBeenCalledWith({
        id: 'test-guard',
        enabled: true,
      });
    });

    it('should return 404 if guard not found', async () => {
      (webUIStorage.getGuards as jest.Mock).mockReturnValue([]);

      const response = await request(app)
        .post('/guards/non-existent/toggle')
        .send({ enabled: true });

      expect(response.status).toBe(404);
      expect(webUIStorage.saveGuard).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/guards/test/toggle')
        .send({ enabled: 'not-a-boolean' });

      expect(response.status).toBe(400);
    });
  });
});
