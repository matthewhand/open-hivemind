import express from 'express';
import request from 'supertest';
import swarmRouter from '../../src/admin/swarmRoutes';

// Mock the SwarmInstaller to return successful responses
jest.mock('@hivemind/provider-openswarm/SwarmInstaller', () => {
  return {
    SwarmInstaller: jest.fn().mockImplementation(() => ({
      checkPython: jest.fn().mockResolvedValue(true),
      checkSwarmInstalled: jest.fn().mockResolvedValue(false),
      getSwarmWebUIUrl: jest.fn().mockReturnValue('http://localhost:8000'),
      installSwarm: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'Installed successfully' }),
      startSwarm: jest.fn().mockResolvedValue({ success: true, message: 'Started successfully' }),
    })),
  };
});

describe('Swarm Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/', swarmRouter);
  });

  describe('GET /check', () => {
    it('should return 200 status code with system check results', async () => {
      const response = await request(app).get('/check');
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.pythonAvailable).toBe(true);
      expect(response.body.swarmInstalled).toBe(false);
      expect(response.body.webUIUrl).toBe('http://localhost:8000');
    });
  });

  describe('POST /install', () => {
    it('should return 200 status code on success', async () => {
      const response = await request(app).post('/install');
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });

  describe('POST /start', () => {
    it('should return 200 status code on success', async () => {
      const response = await request(app).post('/start');
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });
});
