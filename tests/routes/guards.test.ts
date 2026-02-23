import request from 'supertest';
import express from 'express';
import guardsRouter from '../../src/server/routes/guards';
import { webUIStorage } from '../../src/storage/webUIStorage';

// Mock the webUIStorage
jest.mock('../../src/storage/webUIStorage', () => ({
  webUIStorage: {
    getGuards: jest.fn(),
    saveGuard: jest.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/guards', guardsRouter);

describe('Guards Routes', () => {
  let mockGuards: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGuards = [
      {
        id: 'access-control',
        name: 'Access Control',
        type: 'access',
        enabled: true,
        config: { type: 'users', users: [], ips: [] },
      },
      {
        id: 'rate-limiter',
        name: 'Rate Limiter',
        type: 'rate',
        enabled: true,
        config: { maxRequests: 100 },
      },
    ];
    (webUIStorage.getGuards as jest.Mock).mockReturnValue(mockGuards);
  });

  describe('GET /api/guards', () => {
    it('should return all guards', async () => {
      const response = await request(app).get('/api/guards');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.guards).toHaveLength(2);
      expect(response.body.guards[0].id).toBe('access-control');
    });

    it('should handle errors', async () => {
      (webUIStorage.getGuards as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });
      const response = await request(app).get('/api/guards');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve guards');
    });
  });

  describe('POST /api/guards', () => {
    it('should update access control configuration', async () => {
      const newConfig = {
        type: 'ip',
        users: [],
        ips: ['127.0.0.1'],
      };

      const response = await request(app).post('/api/guards').send(newConfig);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(webUIStorage.saveGuard).toHaveBeenCalledTimes(1);

      const savedGuard = (webUIStorage.saveGuard as jest.Mock).mock.calls[0][0];
      expect(savedGuard.id).toBe('access-control');
      expect(savedGuard.config).toEqual(newConfig);
    });
  });

  describe('POST /api/guards/:id/toggle', () => {
    it('should toggle guard status when no body provided', async () => {
      const response = await request(app)
        .post('/api/guards/rate-limiter/toggle')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(webUIStorage.saveGuard).toHaveBeenCalledTimes(1);

      const savedGuard = (webUIStorage.saveGuard as jest.Mock).mock.calls[0][0];
      expect(savedGuard.id).toBe('rate-limiter');
      expect(savedGuard.enabled).toBe(false); // Was true, toggled to false
    });

    it('should set specific status when enabled is provided', async () => {
      const response = await request(app)
        .post('/api/guards/rate-limiter/toggle')
        .send({ enabled: true });

      expect(response.status).toBe(200);

      const savedGuard = (webUIStorage.saveGuard as jest.Mock).mock.calls[0][0];
      expect(savedGuard.id).toBe('rate-limiter');
      expect(savedGuard.enabled).toBe(true); // Should remain true
    });

    it('should return 404 for non-existent guard', async () => {
      const response = await request(app).post('/api/guards/non-existent/toggle');

      expect(response.status).toBe(404);
    });
  });
});
