import express from 'express';
import request from 'supertest';
import { SwarmInstaller } from '@integrations/openswarm/SwarmInstaller';
import { providerRegistry } from '../../src/registries/ProviderRegistry';

jest.mock('../../src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => next()
}));

import swarmRouter from '../../src/admin/swarmRoutes';

// Mock the SwarmInstaller to return successful responses
jest.mock('@integrations/openswarm/SwarmInstaller', () => {
  return {
    SwarmInstaller: jest.fn().mockImplementation(() => ({
      id: 'openswarm',
      checkPrerequisites: jest.fn().mockResolvedValue(true),
      checkInstalled: jest.fn().mockResolvedValue(false),
      getWebUIUrl: jest.fn().mockReturnValue('http://localhost:8000'),
      install: jest.fn().mockResolvedValue({ success: true, message: 'Installed successfully' }),
      start: jest.fn().mockResolvedValue({ success: true, message: 'Started successfully' }),
    })),
  };
});

describe('Swarm Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    // Register the mock installer – the mock SwarmInstaller implementation already matches the interface
    providerRegistry.registerInstaller(new SwarmInstaller());
    app = express();
    app.use(express.json());
    app.use('/', swarmRouter);
  });

  describe('GET /check', () => {
    it('should return 200 status code with system check results', async () => {
      const response = await request(app).get('/check');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pythonAvailable).toBe(true);
      expect(response.body.swarmInstalled).toBe(false);
      expect(response.body.webUIUrl).toBe('http://localhost:8000');
    });
  });

  describe('POST /install', () => {
    it('should return 200 status code on success', async () => {
      const response = await request(app).post('/install');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /start', () => {
    it('should return 200 status code on success', async () => {
      const response = await request(app).post('/start');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
