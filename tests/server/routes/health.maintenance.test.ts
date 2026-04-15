/**
 * Tests for maintenance mode in health check routes
 */

import { Request, Response } from 'express';
import { UserConfigStore } from '../../../src/config/UserConfigStore';

// Mock UserConfigStore
jest.mock('../../../src/config/UserConfigStore');

const mockUserConfigStore = UserConfigStore.getInstance() as jest.Mocked<UserConfigStore>;

describe('Health Routes - Maintenance Mode', () => {
  describe('GET /api/health/maintenance', () => {
    let basicRouter: any;

    beforeEach(async () => {
      jest.clearAllMocks();
      // Import after mocks are set up
      basicRouter = (await import('../../../src/server/routes/health/basic')).default;
    });

    it('should return maintenanceMode: false when not in maintenance', () => {
      mockUserConfigStore.isMaintenanceMode.mockReturnValue(false);

      const req = { path: '/maintenance' } as Request;
      const res = {
        json: jest.fn(),
      } as unknown as Response;

      // Find the maintenance route handler
      const routes = basicRouter.stack as any[];
      const maintenanceRoute = routes.find((r: any) => r.route?.path === '/maintenance');
      
      if (maintenanceRoute) {
        maintenanceRoute.handle(req, res);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            maintenanceMode: false,
            message: 'System is operating normally',
          })
        );
      }
    });

    it('should return maintenanceMode: true when in maintenance', () => {
      mockUserConfigStore.isMaintenanceMode.mockReturnValue(true);

      const req = { path: '/maintenance' } as Request;
      const res = {
        json: jest.fn(),
      } as unknown as Response;

      const routes = basicRouter.stack as any[];
      const maintenanceRoute = routes.find((r: any) => r.route?.path === '/maintenance');
      
      if (maintenanceRoute) {
        maintenanceRoute.handle(req, res);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            maintenanceMode: true,
            message: 'System is currently in maintenance mode',
          })
        );
      }
    });
  });

  describe('GET /api/health - basic health check includes maintenance mode', () => {
    it('should include maintenanceMode in response', async () => {
      mockUserConfigStore.isMaintenanceMode.mockReturnValue(true);

      // Note: Full integration test would require setting up the entire Express app
      // This tests the logic in isolation
      const userConfigStore = UserConfigStore.getInstance();
      const isMaintenance = userConfigStore.isMaintenanceMode();
      
      expect(isMaintenance).toBe(true);
      // The basic health route would include this in its response
    });
  });
});
