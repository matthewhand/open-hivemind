/**
 * Tests for maintenance mode middleware
 * Tests the middleware that checks if system is in maintenance mode
 * and blocks requests accordingly.
 */

import { Request, Response, NextFunction } from 'express';
import { maintenanceModeMiddleware } from '../../src/middleware/maintenanceMiddleware';
import { UserConfigStore } from '../../src/config/UserConfigStore';

// Mock UserConfigStore
const mockUserConfigStore = {
  isMaintenanceMode: jest.fn(),
};

jest.mock('../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn(() => mockUserConfigStore),
  },
}));

describe('Maintenance Mode Middleware', () => {
  let req: any;
  let res: any;
  let next: jest.Mock<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      path: '/',
      method: 'GET',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('when maintenance mode is disabled', () => {
    beforeEach(() => {
      mockUserConfigStore.isMaintenanceMode.mockReturnValue(false);
    });

    it('should call next() to allow the request to proceed', async () => {
      await maintenanceModeMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should add maintenanceMode=false to request object', async () => {
      await maintenanceModeMiddleware(req, res, next);
      expect(req.maintenanceMode).toBe(false);
    });
  });

  describe('when maintenance mode is enabled', () => {
    beforeEach(() => {
      mockUserConfigStore.isMaintenanceMode.mockReturnValue(true);
    });

    describe('for blocked paths', () => {
      it('should return 503 for POST /api/messages', async () => {
        req.path = '/api/messages';
        req.method = 'POST';
        
        await maintenanceModeMiddleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Maintenance Mode',
            maintenanceMode: true,
          })
        );
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 503 for GET /api/bots', async () => {
        req.path = '/api/bots';
        req.method = 'GET';
        
        await maintenanceModeMiddleware(req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(503);
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('for allowed paths', () => {
      const allowedPaths = [
        '/api/health',
        '/api/health/',
        '/api/health/detailed',
        '/api/maintenance/status',
        '/api/maintenance',
        '/api/demo/status',
        '/api/config/global',
        '/api/config',
        '/admin',
      ];

      allowedPaths.forEach((path) => {
        it(`should allow ${path}`, async () => {
          req.path = path;
          
          await maintenanceModeMiddleware(req, res, next);
          
          expect(next).toHaveBeenCalled();
          expect(res.status).not.toHaveBeenCalled();
        });
      });
    });

    it('should allow admin routes', async () => {
      req.path = '/api/admin/settings';
      
      await maintenanceModeMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow auth routes', async () => {
      req.path = '/api/auth/login';
      
      await maintenanceModeMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow static assets', async () => {
      req.path = '/assets/main.js';
      
      await maintenanceModeMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should add maintenanceMode=true to request object', async () => {
      req.path = '/admin';
      
      await maintenanceModeMiddleware(req, res, next);
      
      expect(req.maintenanceMode).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should call next() if checking maintenance mode throws an error', async () => {
      mockUserConfigStore.isMaintenanceMode.mockImplementation(() => {
        throw new Error('Config error');
      });

      await maintenanceModeMiddleware(req, res, next);
      
      // Should let the request proceed even if config can't be read
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
